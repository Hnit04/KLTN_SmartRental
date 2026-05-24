package iuh.se.kltn.backend.modules.property.service;

import iuh.se.kltn.backend.common.utils.JsonUtil;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.repository.BillRepository;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.interaction.repository.ReviewRepository;
import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.subscription.enums.VipTier;
import iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.TenantPreference;
import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import iuh.se.kltn.backend.modules.user.service.TenantPreferenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private static final double FALLBACK_SYSTEM_AVERAGE_RATING = 4.0;
    private static final double DISTANCE_MAX_KM = 20.0;
    private static final double RATING_PRIOR_COUNT = 12.0;

    private static final double WEIGHT_DISTANCE = 0.40;
    private static final double WEIGHT_TRUST_WITH_LOCATION = 0.35;
    private static final double WEIGHT_RATING_WITH_LOCATION = 0.25;
    private static final double WEIGHT_TRUST_NO_LOCATION = 0.55;
    private static final double WEIGHT_RATING_NO_LOCATION = 0.45;

    private static final double WEIGHT_PREF_PRICE = 0.45;
    private static final double WEIGHT_PREF_LOCATION = 0.30;
    private static final double WEIGHT_PREF_AMENITIES = 0.20;
    private static final double WEIGHT_PREF_PET = 0.05;

    private static final EnumSet<ContractStatus> TRUST_EVIDENCE_CONTRACT_STATUSES =
            EnumSet.of(ContractStatus.ACTIVE, ContractStatus.EXPIRED, ContractStatus.TERMINATED_EARLY);

    private static final List<String> PET_FORBID_KEYWORDS = List.of(
            "khong nuoi thu cung",
            "cam thu cung",
            "khong cho nuoi pet",
            "khong pet",
            "khong duoc nuoi"
    );

    private static final List<String> PET_ALLOW_KEYWORDS = List.of(
            "cho nuoi thu cung",
            "duoc nuoi thu cung",
            "pet friendly",
            "cho nuoi pet",
            "duoc nuoi pet",
            "co the nuoi thu cung"
    );

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomService roomService;

    @Autowired
    private TenantPreferenceService tenantPreferenceService;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private VipSubscriptionService vipSubscriptionService;

    @Transactional(readOnly = true)
    public List<RoomResponse> getRecommendedRoomsForTenant(Long tenantId, Double lat, Double lng) {
        TenantPreference preference = tenantPreferenceService.getPreference(tenantId);

        List<Room> candidateRooms = roomRepository.findByStatus(RoomStatus.AVAILABLE).stream()
                .filter(this::isEligiblePublicRoom)
                .collect(Collectors.toList());

        if (candidateRooms.isEmpty()) {
            return List.of();
        }

        List<Long> propertyIds = candidateRooms.stream()
                .map(Room::getProperty)
                .filter(p -> p != null && p.getId() != null)
                .map(Property::getId)
                .distinct()
                .toList();

        Map<Long, RatingAggregate> ratingsByProperty = buildRatingAggregateMap(propertyIds);
        double systemAverageRating = resolveSystemAverageRating();
        Map<Long, LandlordEvidence> landlordEvidenceById = buildLandlordEvidenceMap(candidateRooms);
        Map<Long, Integer> vipTierRankByLandlord = buildVipTierRankMap(candidateRooms);

        List<RankedRoom> ranked = new ArrayList<>(candidateRooms.size());
        for (Room room : candidateRooms) {
            Property property = room.getProperty();
            Long propertyId = property == null ? null : property.getId();
            Long landlordId = (property == null || property.getLandlord() == null) ? null : property.getLandlord().getId();

            RatingAggregate ratingAggregate = propertyId == null
                    ? RatingAggregate.empty()
                    : ratingsByProperty.getOrDefault(propertyId, RatingAggregate.empty());
            LandlordEvidence landlordEvidence = landlordId == null
                    ? LandlordEvidence.empty()
                    : landlordEvidenceById.getOrDefault(landlordId, LandlordEvidence.empty());

            QualityOutcome quality = computeQualityOutcome(room, ratingAggregate, landlordEvidence, systemAverageRating, lat, lng);
            PreferenceOutcome pref = computePreferenceOutcome(room, preference);

            double qualityScoreClamped = clamp01(quality.qualityScore());
            double preferenceScoreClamped = clamp01(pref.preferenceScore());
            double betaClamped = clamp01(pref.beta());
            double finalScore = clamp01(
                    ((1.0 - betaClamped) * qualityScoreClamped) + (betaClamped * preferenceScoreClamped)
            );
            double scoreBucket = round2(finalScore);

            int vipTierRank = landlordId == null ? 0 : vipTierRankByLandlord.getOrDefault(landlordId, 0);
            LocalDateTime createdAt = property == null ? null : property.getCreatedAt();

            RoomResponse response = roomService.mapToRoomResponse(room);
            response.setMatchScore(round2(finalScore * 100.0));
            response.setMatchReason(buildMatchReason(quality, pref));

            ranked.add(new RankedRoom(response, finalScore, scoreBucket, vipTierRank, createdAt));
        }

        ranked.sort((a, b) -> {
            int cmp = Double.compare(b.scoreBucket(), a.scoreBucket());
            if (cmp != 0) {
                return cmp;
            }

            cmp = Integer.compare(b.vipTierRank(), a.vipTierRank());
            if (cmp != 0) {
                return cmp;
            }

            cmp = Double.compare(b.finalScore(), a.finalScore());
            if (cmp != 0) {
                return cmp;
            }

            if (a.createdAt() == null && b.createdAt() == null) {
                return 0;
            }
            if (a.createdAt() == null) {
                return 1;
            }
            if (b.createdAt() == null) {
                return -1;
            }
            return b.createdAt().compareTo(a.createdAt());
        });

        return ranked.stream()
                .limit(10)
                .map(RankedRoom::response)
                .collect(Collectors.toList());
    }

    private boolean isEligiblePublicRoom(Room room) {
        if (room == null) {
            return false;
        }
        if (room.getStatus() != RoomStatus.AVAILABLE) {
            return false;
        }
        if (room.getApprovalStatus() != PropertyStatus.APPROVED) {
            return false;
        }
        Property property = room.getProperty();
        return property != null && property.getStatus() == PropertyStatus.APPROVED;
    }

    private QualityOutcome computeQualityOutcome(
            Room room,
            RatingAggregate ratingAggregate,
            LandlordEvidence landlordEvidence,
            double systemAverageRating,
            Double lat,
            Double lng
    ) {
        Property property = room.getProperty();
        Landlord landlord = property == null ? null : property.getLandlord();

        double landlordReputation = landlord == null ? 50.0 : landlord.getReputationScore();
        double trustRaw = clamp01(landlordReputation / 100.0);
        double trustEffective = clamp01(trustRaw * (0.75 + (0.25 * landlordEvidence.trustEvidence())));

        double reviewCount = Math.max(0, ratingAggregate.reviewCount());
        double rawAverage = ratingAggregate.averageRating() > 0 ? ratingAggregate.averageRating() : systemAverageRating;
        double bayesRaw = ((reviewCount / (reviewCount + RATING_PRIOR_COUNT)) * rawAverage)
                + ((RATING_PRIOR_COUNT / (reviewCount + RATING_PRIOR_COUNT)) * systemAverageRating);
        double ratingBayes = clamp01(bayesRaw / 5.0);

        boolean hasLocation = lat != null
                && lng != null
                && property != null
                && property.getLatitude() != null
                && property.getLongitude() != null;

        Double distanceKm = null;
        double distanceScore = 0.0;
        if (hasLocation) {
            distanceKm = haversineKm(lat, lng, property.getLatitude(), property.getLongitude());
            distanceScore = clamp01(1.0 - (Math.min(distanceKm, DISTANCE_MAX_KM) / DISTANCE_MAX_KM));
        }

        double qualityScore = hasLocation
                ? (distanceScore * WEIGHT_DISTANCE)
                + (trustEffective * WEIGHT_TRUST_WITH_LOCATION)
                + (ratingBayes * WEIGHT_RATING_WITH_LOCATION)
                : (trustEffective * WEIGHT_TRUST_NO_LOCATION)
                + (ratingBayes * WEIGHT_RATING_NO_LOCATION);

        return new QualityOutcome(
                clamp01(qualityScore),
                hasLocation,
                distanceKm,
                distanceScore,
                trustEffective,
                ratingBayes
        );
    }

    private PreferenceOutcome computePreferenceOutcome(Room room, TenantPreference preference) {
        if (preference == null) {
            return new PreferenceOutcome(0.0, 0.0, 0, "Chua co so thich ca nhan, uu tien diem chat luong.");
        }

        double weightedScore = 0.0;
        double activeWeightSum = 0.0;
        int activeCriteria = 0;
        List<String> reasons = new ArrayList<>();

        if (isPricePreferenceActive(preference)) {
            double priceFit = computePriceFit(room.getPrice(), preference.getTargetPriceMin(), preference.getTargetPriceMax());
            weightedScore += WEIGHT_PREF_PRICE * priceFit;
            activeWeightSum += WEIGHT_PREF_PRICE;
            activeCriteria++;
            if (priceFit >= 0.7) {
                reasons.add("Gia phu hop ngan sach");
            }
        }

        if (isPreferredLocationActive(preference)) {
            double locationFit = computePreferredLocationFit(room, preference.getPreferredLocation());
            weightedScore += WEIGHT_PREF_LOCATION * locationFit;
            activeWeightSum += WEIGHT_PREF_LOCATION;
            activeCriteria++;
            if (locationFit >= 0.7) {
                reasons.add("Dung khu vuc mong muon");
            }
        }

        List<String> requestedAmenities = parsePreferenceAmenities(preference.getAmenitiesRef());
        if (!requestedAmenities.isEmpty()) {
            double amenityFit = computeAmenityFit(room, requestedAmenities);
            weightedScore += WEIGHT_PREF_AMENITIES * amenityFit;
            activeWeightSum += WEIGHT_PREF_AMENITIES;
            activeCriteria++;
            if (amenityFit >= 0.5) {
                reasons.add("Co tien ich theo so thich");
            }
        }

        if (Boolean.TRUE.equals(preference.getHasPet())) {
            double petFit = computePetFit(room);
            weightedScore += WEIGHT_PREF_PET * petFit;
            activeWeightSum += WEIGHT_PREF_PET;
            activeCriteria++;
            if (petFit >= 0.9) {
                reasons.add("Ho tro nuoi thu cung");
            }
        }

        if (activeWeightSum <= 0.0) {
            return new PreferenceOutcome(0.0, 0.0, 0, "So thich chua du du lieu, uu tien diem chat luong.");
        }

        double preferenceScore = clamp01(weightedScore / activeWeightSum);
        double beta = resolveDynamicBeta(activeCriteria);
        String reason = reasons.isEmpty()
                ? "Da ca nhan hoa theo " + activeCriteria + " tieu chi so thich."
                : String.join("; ", reasons) + ".";

        return new PreferenceOutcome(preferenceScore, beta, activeCriteria, reason);
    }

    private boolean isPricePreferenceActive(TenantPreference preference) {
        if (preference == null || preference.getTargetPriceMin() == null || preference.getTargetPriceMax() == null) {
            return false;
        }
        return preference.getTargetPriceMin() >= 0
                && preference.getTargetPriceMax() >= 0
                && preference.getTargetPriceMax() >= preference.getTargetPriceMin();
    }

    private boolean isPreferredLocationActive(TenantPreference preference) {
        return preference != null && !normalizeText(preference.getPreferredLocation()).isBlank();
    }

    private double computePriceFit(Double roomPrice, Double targetMin, Double targetMax) {
        if (roomPrice == null || targetMin == null || targetMax == null) {
            return 0.0;
        }

        double targetAvg = (targetMin + targetMax) / 2.0;
        double effectiveRange = Math.max(targetMax - targetMin, targetAvg * 0.15);
        if (effectiveRange <= 0.0) {
            effectiveRange = Math.max(1.0, roomPrice * 0.15);
        }

        return clamp01(1.0 - (Math.abs(roomPrice - targetAvg) / effectiveRange));
    }

    private double computePreferredLocationFit(Room room, String preferredLocation) {
        if (room == null || room.getProperty() == null) {
            return 0.0;
        }

        String prefNorm = normalizeText(preferredLocation);
        if (prefNorm.isBlank()) {
            return 0.0;
        }

        Property property = room.getProperty();
        String propertyNorm = normalizeText(
                safeText(property.getAddress()) + " "
                        + safeText(property.getDistrict()) + " "
                        + safeText(property.getCity())
        );

        if (propertyNorm.isBlank()) {
            return 0.0;
        }

        if (propertyNorm.contains(prefNorm)) {
            return 1.0;
        }

        String[] tokens = prefNorm.split("\\s+");
        int total = 0;
        int matched = 0;
        for (String token : tokens) {
            if (token.length() < 2) {
                continue;
            }
            total++;
            if (propertyNorm.contains(token)) {
                matched++;
            }
        }

        if (total == 0) {
            return 0.0;
        }
        return clamp01((double) matched / total);
    }

    private List<String> parsePreferenceAmenities(String amenitiesRef) {
        if (amenitiesRef == null || amenitiesRef.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(amenitiesRef.split("[,;|]"))
                .map(this::normalizeText)
                .filter(token -> !token.isBlank())
                .distinct()
                .toList();
    }

    private double computeAmenityFit(Room room, List<String> requestedAmenities) {
        if (room == null || requestedAmenities == null || requestedAmenities.isEmpty()) {
            return 0.0;
        }

        Set<String> roomAmenities = new HashSet<>();
        for (String amenity : JsonUtil.convertJsonToList(room.getAmenities())) {
            String normalized = normalizeText(amenity);
            if (!normalized.isBlank()) {
                roomAmenities.add(normalized);
            }
        }

        if (roomAmenities.isEmpty()) {
            return 0.0;
        }

        int matched = 0;
        for (String expected : requestedAmenities) {
            boolean hit = roomAmenities.stream().anyMatch(actual -> actual.contains(expected) || expected.contains(actual));
            if (hit) {
                matched++;
            }
        }

        return clamp01((double) matched / requestedAmenities.size());
    }

    private double computePetFit(Room room) {
        if (room == null) {
            return 0.5;
        }

        List<String> rawAmenities = JsonUtil.convertJsonToList(room.getAmenities());
        String combined = normalizeText(String.join(" ", rawAmenities)
                + " " + safeText(room.getDefaultTerms())
                + " " + safeText(room.getDescription()));

        for (String keyword : PET_FORBID_KEYWORDS) {
            if (combined.contains(keyword)) {
                return 0.0;
            }
        }
        for (String keyword : PET_ALLOW_KEYWORDS) {
            if (combined.contains(keyword)) {
                return 1.0;
            }
        }
        return 0.5;
    }

    private double resolveDynamicBeta(int activeCriteria) {
        if (activeCriteria <= 0) {
            return 0.0;
        }
        if (activeCriteria == 1) {
            return 0.20;
        }
        if (activeCriteria <= 3) {
            return 0.30;
        }
        return 0.35;
    }

    private String buildMatchReason(QualityOutcome quality, PreferenceOutcome preference) {
        List<String> parts = new ArrayList<>();

        if (quality.hasLocation() && quality.distanceKm() != null) {
            parts.add("Gan vi tri hien tai (" + round2(quality.distanceKm()) + " km)");
        }

        parts.add("Do tin cay chu tro: " + round2(quality.trustScore() * 100.0) + "/100");
        parts.add("Danh gia phong: " + round2(quality.ratingScore() * 100.0) + "/100");

        if (preference.activeCriteria() > 0) {
            parts.add(preference.reason());
            parts.add("Muc ca nhan hoa: " + round2(preference.beta() * 100.0) + "%");
        } else {
            parts.add("Khong co so thich kha dung, uu tien diem chat luong");
        }

        return String.join(". ", parts) + ".";
    }

    private Map<Long, RatingAggregate> buildRatingAggregateMap(List<Long> propertyIds) {
        if (propertyIds == null || propertyIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, RatingAggregate> result = new HashMap<>();
        for (Object[] row : reviewRepository.aggregateRatingsByPropertyIds(propertyIds)) {
            Long propertyId = row[0] != null ? ((Number) row[0]).longValue() : null;
            if (propertyId == null) {
                continue;
            }
            double averageRating = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
            int reviewCount = row[2] != null ? ((Number) row[2]).intValue() : 0;
            result.put(propertyId, new RatingAggregate(averageRating, reviewCount));
        }
        return result;
    }

    private double resolveSystemAverageRating() {
        Double avg = reviewRepository.findSystemAverageRating();
        if (avg == null || avg <= 0) {
            return FALLBACK_SYSTEM_AVERAGE_RATING;
        }
        return avg;
    }

    private Map<Long, LandlordEvidence> buildLandlordEvidenceMap(List<Room> rooms) {
        Map<Long, LandlordEvidence> result = new HashMap<>();
        for (Room room : rooms) {
            Property property = room.getProperty();
            Landlord landlord = property == null ? null : property.getLandlord();
            if (landlord == null || landlord.getId() == null || result.containsKey(landlord.getId())) {
                continue;
            }

            Long landlordId = landlord.getId();
            long completedContracts = safeLong(
                    contractRepository.countByRoom_Property_Landlord_IdAndStatusIn(
                            landlordId,
                            TRUST_EVIDENCE_CONTRACT_STATUSES
                    )
            );
            long onTimePaidBills = safeLong(billRepository.countOnTimePaidBillsByLandlordId(landlordId));

            double kycFactor;
            KYCStatus kycStatus = landlord.getKycStatus();
            if (kycStatus == KYCStatus.VERIFIED) {
                kycFactor = 1.0;
            } else if (kycStatus == KYCStatus.PENDING) {
                kycFactor = 0.85;
            } else {
                kycFactor = 0.70;
            }

            long activeMonths = landlord.getCreatedAt() == null
                    ? 0
                    : Math.max(0, ChronoUnit.MONTHS.between(landlord.getCreatedAt(), LocalDateTime.now()));

            double tenureFactor = clamp01(activeMonths / 24.0);
            double historyFactor = clamp01(
                    Math.log1p(completedContracts + (onTimePaidBills * 0.35)) / Math.log1p(120.0)
            );
            double trustEvidence = clamp01((historyFactor * 0.70) + (tenureFactor * 0.20) + (kycFactor * 0.10));

            result.put(landlordId, new LandlordEvidence(trustEvidence));
        }
        return result;
    }

    private Map<Long, Integer> buildVipTierRankMap(List<Room> rooms) {
        Map<Long, Integer> result = new HashMap<>();
        for (Room room : rooms) {
            Property property = room.getProperty();
            Landlord landlord = property == null ? null : property.getLandlord();
            if (landlord == null || landlord.getId() == null || result.containsKey(landlord.getId())) {
                continue;
            }

            VipTier tier = vipSubscriptionService.getCurrentTier(landlord.getId());
            result.put(landlord.getId(), vipTierToRank(tier));
        }
        return result;
    }

    private int vipTierToRank(VipTier tier) {
        if (tier == null) {
            return 0;
        }
        return tier.getSearchBoostWeight();
    }

    private String normalizeText(String input) {
        if (input == null) {
            return "";
        }

        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        return normalized;
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double earthRadius = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }

    private double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }

    private record RatingAggregate(double averageRating, int reviewCount) {
        private static RatingAggregate empty() {
            return new RatingAggregate(0.0, 0);
        }
    }

    private record LandlordEvidence(double trustEvidence) {
        private static LandlordEvidence empty() {
            return new LandlordEvidence(0.0);
        }
    }

    private record QualityOutcome(
            double qualityScore,
            boolean hasLocation,
            Double distanceKm,
            double distanceScore,
            double trustScore,
            double ratingScore
    ) {
    }

    private record PreferenceOutcome(
            double preferenceScore,
            double beta,
            int activeCriteria,
            String reason
    ) {
    }

    private record RankedRoom(
            RoomResponse response,
            double finalScore,
            double scoreBucket,
            int vipTierRank,
            LocalDateTime createdAt
    ) {
    }
}

