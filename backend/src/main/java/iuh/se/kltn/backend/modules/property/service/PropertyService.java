package iuh.se.kltn.backend.modules.property.service;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.common.utils.JsonUtil;
import iuh.se.kltn.backend.modules.property.dto.request.PropertyRequest;
import iuh.se.kltn.backend.modules.property.dto.request.RoomRequest;
import iuh.se.kltn.backend.modules.property.dto.response.PropertyResponse;
import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.repository.BillRepository;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.interaction.repository.ReviewRepository;
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import iuh.se.kltn.backend.modules.ai.dto.ModerationResult;
import iuh.se.kltn.backend.modules.ai.service.ModerationService;
import iuh.se.kltn.backend.modules.interaction.service.NotificationService;
import iuh.se.kltn.backend.modules.interaction.enums.NotificationType;

import iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PropertyService {

    @Autowired
    private PropertyRepository propertyRepository;
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ModelMapper modelMapper;
    @Autowired
    private ModerationService moderationService;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private VipSubscriptionService vipSubscriptionService;
    @Autowired
    private ReviewRepository reviewRepository;
    @Autowired
    private ContractRepository contractRepository;
    @Autowired
    private BillRepository billRepository;

    // 1. API Má»I: Láº¥y táº¥t cáº£ danh sĂ¡ch nhĂ  trá» (Public) - CHá»ˆ Láº¤Y "APPROVED"
    private static final double FALLBACK_SYSTEM_AVERAGE_RATING = 4.2;
    private static final double DISTANCE_MAX_KM = 20.0;
    private static final double RATING_PRIOR_COUNT = 12.0;
    private static final double WEIGHT_DISTANCE = 0.40;
    private static final double WEIGHT_TRUST_WITH_LOCATION = 0.35;
    private static final double WEIGHT_RATING_WITH_LOCATION = 0.25;
    private static final double WEIGHT_TRUST_NO_LOCATION = 0.55;
    private static final double WEIGHT_RATING_NO_LOCATION = 0.45;
    private static final EnumSet<ContractStatus> TRUST_EVIDENCE_CONTRACT_STATUSES =
            EnumSet.of(ContractStatus.ACTIVE, ContractStatus.EXPIRED, ContractStatus.TERMINATED_EARLY);

    @Transactional(readOnly = true)
    public Page<PropertyResponse> getAllProperties(Pageable pageable, Double lat, Double lng) {
        List<Property> approvedProperties = propertyRepository.findByStatus(PropertyStatus.APPROVED);
        if (approvedProperties.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Long> propertyIds = approvedProperties.stream().map(Property::getId).toList();
        Map<Long, RatingAggregate> ratingsByProperty = buildRatingAggregateMap(propertyIds);
        double systemAverageRating = resolveSystemAverageRating();
        Map<Long, LandlordEvidence> landlordEvidenceById = buildLandlordEvidenceMap(approvedProperties);

        List<PropertyResponse> rankedResponses = new ArrayList<>(approvedProperties.size());
        for (Property property : approvedProperties) {
            RatingAggregate ratingAggregate = ratingsByProperty.getOrDefault(property.getId(), RatingAggregate.empty());
            Long landlordId = property.getLandlord() == null ? null : property.getLandlord().getId();
            LandlordEvidence landlordEvidence = landlordId == null
                    ? LandlordEvidence.empty()
                    : landlordEvidenceById.getOrDefault(landlordId, LandlordEvidence.empty());
            RankingResult rankingResult = computeRanking(property, ratingAggregate, landlordEvidence, systemAverageRating, lat, lng);
            rankedResponses.add(mapToPropertyResponse(property, rankingResult));
        }

        rankedResponses.sort(
                Comparator.comparing((PropertyResponse p) -> safeDouble(p.getRankScore())).reversed()
                        .thenComparing((PropertyResponse p) -> safeInt(p.getAvailableRooms()), Comparator.reverseOrder())
                        .thenComparing(p -> safeDouble(p.getMinPrice()))
                        .thenComparing((PropertyResponse p) -> safeLong(p.getId()), Comparator.reverseOrder())
        );

        int fromIndex = (int) pageable.getOffset();
        if (fromIndex >= rankedResponses.size()) {
            return new PageImpl<>(Collections.emptyList(), pageable, rankedResponses.size());
        }
        int toIndex = Math.min(fromIndex + pageable.getPageSize(), rankedResponses.size());
        return new PageImpl<>(rankedResponses.subList(fromIndex, toIndex), pageable, rankedResponses.size());
    }

    private Map<Long, RatingAggregate> buildRatingAggregateMap(List<Long> propertyIds) {
        if (propertyIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<Long, RatingAggregate> result = new HashMap<>();
        for (Object[] row : reviewRepository.aggregateRatingsByPropertyIds(propertyIds)) {
            Long propertyId = row[0] != null ? ((Number) row[0]).longValue() : null;
            if (propertyId == null) {
                continue;
            }
            double avgRating = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
            int reviewCount = row[2] != null ? ((Number) row[2]).intValue() : 0;
            result.put(propertyId, new RatingAggregate(avgRating, reviewCount));
        }
        return result;
    }

    private Map<Long, LandlordEvidence> buildLandlordEvidenceMap(List<Property> properties) {
        Map<Long, LandlordEvidence> result = new HashMap<>();
        for (Property property : properties) {
            if (property.getLandlord() == null || property.getLandlord().getId() == null) {
                continue;
            }
            Long landlordId = property.getLandlord().getId();
            if (result.containsKey(landlordId)) {
                continue;
            }

            long completedContracts = safeLong(
                    contractRepository.countByRoom_Property_Landlord_IdAndStatusIn(
                            landlordId,
                            TRUST_EVIDENCE_CONTRACT_STATUSES
                    )
            );
            long onTimePaidBills = safeLong(billRepository.countOnTimePaidBillsByLandlordId(landlordId));
            KYCStatus kycStatus = property.getLandlord().getKycStatus();
            LocalDateTime createdAt = property.getLandlord().getCreatedAt();

            double kycFactor;
            if (kycStatus == KYCStatus.VERIFIED) {
                kycFactor = 1.0;
            } else if (kycStatus == KYCStatus.PENDING) {
                kycFactor = 0.85;
            } else {
                kycFactor = 0.70;
            }

            long activeMonths = createdAt == null
                    ? 0
                    : Math.max(0, ChronoUnit.MONTHS.between(createdAt, LocalDateTime.now()));
            double tenureFactor = clamp01(activeMonths / 24.0);
            double historyFactor = clamp01(
                    Math.log1p(completedContracts + (onTimePaidBills * 0.35)) / Math.log1p(120.0)
            );

            double trustEvidence = clamp01((historyFactor * 0.70) + (tenureFactor * 0.20) + (kycFactor * 0.10));

            result.put(landlordId, new LandlordEvidence(completedContracts, onTimePaidBills, trustEvidence));
        }
        return result;
    }

    private RankingResult computeRanking(
            Property property,
            RatingAggregate ratingAggregate,
            LandlordEvidence landlordEvidence,
            double systemAverageRating,
            Double lat,
            Double lng
    ) {
        double landlordReputation = property.getLandlord() == null ? 50.0 : property.getLandlord().getReputationScore();
        double trustRaw = clamp01(landlordReputation / 100.0);
        double trustEffective = clamp01(trustRaw * (0.75 + (0.25 * landlordEvidence.trustEvidence())));

        double reviewCount = Math.max(0, ratingAggregate.reviewCount());
        double rawAverage = ratingAggregate.averageRating() > 0 ? ratingAggregate.averageRating() : systemAverageRating;
        double averageForDisplay = reviewCount > 0 ? ratingAggregate.averageRating() : 0.0;
        double bayesRaw = ((reviewCount / (reviewCount + RATING_PRIOR_COUNT)) * rawAverage)
                + ((RATING_PRIOR_COUNT / (reviewCount + RATING_PRIOR_COUNT)) * systemAverageRating);
        double ratingBayesNormalized = clamp01(bayesRaw / 5.0);

        Double distanceKm = null;
        double distanceScoreNormalized = 0.0;
        boolean hasLocation = lat != null && lng != null && property.getLatitude() != null && property.getLongitude() != null;
        if (hasLocation) {
            distanceKm = haversineKm(lat, lng, property.getLatitude(), property.getLongitude());
            distanceScoreNormalized = clamp01(1.0 - (Math.min(distanceKm, DISTANCE_MAX_KM) / DISTANCE_MAX_KM));
        }

        double rankScoreNormalized = hasLocation
                ? (distanceScoreNormalized * WEIGHT_DISTANCE)
                    + (trustEffective * WEIGHT_TRUST_WITH_LOCATION)
                    + (ratingBayesNormalized * WEIGHT_RATING_WITH_LOCATION)
                : (trustEffective * WEIGHT_TRUST_NO_LOCATION)
                    + (ratingBayesNormalized * WEIGHT_RATING_NO_LOCATION);

        return new RankingResult(
                averageForDisplay,
                (int) reviewCount,
                landlordEvidence.trustEvidence() * 100.0,
                trustEffective * 100.0,
                bayesRaw,
                distanceKm,
                distanceScoreNormalized * 100.0,
                rankScoreNormalized * 100.0
        );
    }

    private double resolveSystemAverageRating() {
        Double avg = reviewRepository.findSystemAverageRating();
        if (avg == null || avg <= 0) {
            return FALLBACK_SYSTEM_AVERAGE_RATING;
        }
        return avg;
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

    private double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private record RatingAggregate(double averageRating, int reviewCount) {
        private static RatingAggregate empty() {
            return new RatingAggregate(0.0, 0);
        }
    }

    private record LandlordEvidence(long completedContracts, long onTimePaidBills, double trustEvidence) {
        private static LandlordEvidence empty() {
            return new LandlordEvidence(0L, 0L, 0.0);
        }
    }

    private record RankingResult(
            double averageRating,
            int reviewCount,
            double trustEvidence,
            double trustEffectiveScore,
            double ratingBayesScore,
            Double distanceKm,
            double distanceScore,
            double rankScore
    ) {}

    private String buildPropertyContentCheck(PropertyRequest request) {
        return String.format("TĂªn khu trá»: %s\nÄá»‹a chá»‰: %s, %s, %s\nMĂ´ táº£: %s\nGiĂ¡ Ä‘iá»‡n: %s\nGiĂ¡ nÆ°á»›c: %s\nInternet: %s",
                request.getName(), request.getAddress(), request.getDistrict(), request.getCity(),
                request.getDescription(), request.getElecPrice(), request.getWaterPrice(), request.getInternetPrice());
    }

    private String buildRoomContentCheck(RoomRequest request) {
        return String.format("TĂªn/Sá»‘ phĂ²ng: %s\nGiĂ¡ phĂ²ng: %s\nDiá»‡n tĂ­ch: %s\nLoáº¡i phĂ²ng: %s\nTiá»‡n Ă­ch: %s\nMĂ´ táº£/Ná»™i quy: %s",
                request.getName(), request.getPrice(), request.getArea(), request.getType(),
                request.getAmenities(), request.getDefaultTerms());
    }

    // Táº O KHU TRá»Œ Má»I
    @Transactional
    public PropertyResponse createProperty(Long landlordId, PropertyRequest request) {
        User user = userRepository.findById(landlordId)
                .orElseThrow(() -> new RuntimeException("User khĂ´ng tá»“n táº¡i"));

        if (user.getRole() != Role.LANDLORD) {
            throw new RuntimeException("Chá»‰ chá»§ trá» má»›i Ä‘Æ°á»£c Ä‘Äƒng bĂ i!");
        }

        // KIá»‚M TRA GIá»I Háº N VIP
        vipSubscriptionService.checkPropertyLimit(landlordId);
        if (request.getImages() != null) {
            vipSubscriptionService.checkPropertyImageLimit(landlordId, request.getImages().size());
        }

        // KIá»‚M DUYá»†T Ná»˜I DUNG (AI Moderation) - Chá»‰ Ä‘á»ƒ gá»£i Ă½ cho Admin
        ModerationResult modResult = moderationService
                .checkContent(
                        "Khu tro",
                        buildPropertyContentCheck(request),
                        request.getImages(),
                        null,
                        null,
                        null,
                        request.getAddress(),
                        request.getDistrict(),
                        request.getCity(),
                        null,
                        null,
                        null,
                        request.getElecPrice(),
                        request.getWaterPrice(),
                        request.getInternetPrice()
                );
        
        PropertyStatus aiStatus = PropertyStatus.PENDING;

        Property property = modelMapper.map(request, Property.class);
        property.setLandlord((Landlord) user);
        property.setImages(JsonUtil.convertListToJson(request.getImages()));
        property.setStatus(aiStatus);
        property.setSafetyScore(modResult.getScore());
        property.setModerationReason(modResult.getReason());

        Property saved = propertyRepository.save(property);

        // ThĂ´ng bĂ¡o cho Admin cĂ³ tin Ä‘Äƒng má»›i
        List<User> admins = userRepository.findAllByRole(Role.ADMIN);
        for (User admin : admins) {
            notificationService.createNotification(admin, "YĂªu cáº§u duyá»‡t khu trá» má»›i đŸ ", "Chá»§ trá» " + user.getFullName() + " vá»«a Ä‘Äƒng khu trá» má»›i: " + saved.getName(), NotificationType.PROPERTY_APPROVED, saved.getId());
        }

        return mapToPropertyResponse(saved);
    }

    // THĂM PHĂ’NG VĂ€O KHU TRá»Œ
    @Transactional
    public RoomResponse addRoom(Long landlordId, Long propertyId, RoomRequest request) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trá» khĂ´ng tá»“n táº¡i"));

        if (!property.getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Báº¡n khĂ´ng pháº£i chá»§ khu trá» nĂ y!");
        }

        // KIá»‚M TRA GIá»I Háº N VIP
        vipSubscriptionService.checkRoomLimit(landlordId, propertyId);
        if (request.getImages() != null) {
            vipSubscriptionService.checkRoomImageLimit(landlordId, request.getImages().size());
        }

        // KIá»‚M DUYá»†T Ná»˜I DUNG PHĂ’NG - Gá»™p áº£nh thÆ°á»ng + áº£nh 360 Ä‘á»ƒ AI kiá»ƒm duyá»‡t toĂ n bá»™
        List<String> allImages = new java.util.ArrayList<>();
        if (request.getImages() != null) allImages.addAll(request.getImages());
        if (request.getPanoramaImages() != null) allImages.addAll(request.getPanoramaImages());
        ModerationResult modResult = moderationService.checkContent(
                "Phong tro",
                buildRoomContentCheck(request),
                allImages,
                request.getPanoramaImages(),
                request.getPrice(),
                request.getArea(),
                property.getAddress(),
                property.getDistrict(),
                property.getCity(),
                request.getAmenities(),
                request.getType(),
                request.getMaxOccupants(),
                property.getElecPrice(),
                property.getWaterPrice(),
                property.getInternetPrice()
        );
        
        PropertyStatus aiStatus = PropertyStatus.PENDING;

        Room room = modelMapper.map(request, Room.class);
        room.setProperty(property);
        room.setStatus(RoomStatus.AVAILABLE);
        room.setApprovalStatus(aiStatus);
        room.setDescription(request.getDescription());
        room.setImages(JsonUtil.convertListToJson(request.getImages()));
        room.setAmenities(JsonUtil.convertListToJson(request.getAmenities()));
        if (request.getPanoramaImages() != null) {
            room.setPanoramaImages(JsonUtil.convertListToJson(request.getPanoramaImages()));
        }
        room.setSafetyScore(modResult.getScore());
        room.setModerationReason(modResult.getReason());

        // Map maxOccupants náº¿u cĂ³
        if (request.getMaxOccupants() != null) {
            room.setMaxOccupants(request.getMaxOccupants());
        }

        Room savedRoom = roomRepository.save(room);

        // ThĂ´ng bĂ¡o cho Admin cĂ³ phĂ²ng má»›i cáº§n duyá»‡t
        List<User> admins = userRepository.findAllByRole(Role.ADMIN);
        for (User admin : admins) {
            notificationService.createNotification(admin, "YĂªu cáº§u duyá»‡t phĂ²ng má»›i đŸª", "Chá»§ trá» " + property.getLandlord().getFullName() + " vá»«a thĂªm phĂ²ng má»›i: " + savedRoom.getName() + " táº¡i " + property.getName(), NotificationType.PROPERTY_APPROVED, property.getId());
        }

        return mapToRoomResponse(savedRoom);
    }

    // Láº¤Y DANH SĂCH NHĂ€ Cá»¦A CHU TRO
    @Transactional(readOnly = true)
    public List<PropertyResponse> getMyProperties(Long landlordId) {
        return propertyRepository.findByLandlordIdOrderByCreatedAtDesc(landlordId).stream()
                .map(this::mapToPropertyResponse)
                .collect(Collectors.toList());
    }

    // Láº¤Y DANH SĂCH NHĂ€ Cá»¦A CHU TRO (DĂ™NG CHO PUBLIC)
    @Transactional(readOnly = true)
    public List<PropertyResponse> getPropertiesByUsername(String username) {
        return propertyRepository.findByLandlordUsername(username).stream()
                .map(this::mapToPropertyResponse)
                .collect(Collectors.toList());
    }

    // Láº¤Y DANH SĂCH PHĂ’NG Cá»¦A 1 KHU TRá»Œ
    @Transactional(readOnly = true)
    public List<RoomResponse> getRoomsByProperty(Long propertyId, Long currentUserId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trá» khĂ´ng tá»“n táº¡i"));

        if (currentUserId != null && property.getLandlord().getId().equals(currentUserId)) {
            return roomRepository.findByPropertyId(propertyId).stream()
                    .map(this::mapToRoomResponse)
                    .collect(Collectors.toList());
        } else {
            return roomRepository.findByPropertyIdAndApprovalStatus(propertyId, PropertyStatus.APPROVED).stream()
                    .map(this::mapToRoomResponse)
                    .collect(Collectors.toList());
        }
    }

    // === MAPPER & TĂNH TOĂN LOGIC ===
    private PropertyResponse mapToPropertyResponse(Property p) {
        return mapToPropertyResponse(p, null);
    }

    private PropertyResponse mapToPropertyResponse(Property p, RankingResult ranking) {
        PropertyResponse res = modelMapper.map(p, PropertyResponse.class);
        res.setImages(JsonUtil.convertJsonToList(p.getImages()));

        if (p.getLandlord() != null) {
            res.setLandlordId(p.getLandlord().getId());
            res.setLandlordUsername(p.getLandlord().getUsername());
            res.setLandlordName(p.getLandlord().getFullName());
            res.setLandlordPhone(p.getLandlord().getPhoneNumber());
            res.setLandlordAvatar(p.getLandlord().getAvatarUrl());
            res.setLandlordEmail(p.getLandlord().getEmail());
            res.setLandlordZalo(p.getLandlord().getZaloPhone());
            res.setLandlordReputationScore(p.getLandlord().getReputationScore());
        }

        List<Room> rooms = p.getRooms();
        if (rooms != null && !rooms.isEmpty()) {
            List<Room> approvedRooms = rooms.stream()
                    .filter(r -> r.getApprovalStatus() == PropertyStatus.APPROVED)
                    .toList();
            List<Room> availableApprovedRooms = approvedRooms.stream()
                    .filter(r -> r.getStatus() == RoomStatus.AVAILABLE)
                    .toList();

            double min = availableApprovedRooms.stream().mapToDouble(Room::getPrice).min().orElse(0.0);
            double max = availableApprovedRooms.stream().mapToDouble(Room::getPrice).max().orElse(0.0);
            long available = availableApprovedRooms.size();

            res.setMinPrice(min);
            res.setMaxPrice(max);
            res.setAvailableRooms((int) available);
            res.setTotalRooms(approvedRooms.size());
        } else {
            res.setMinPrice(0.0);
            res.setMaxPrice(0.0);
            res.setAvailableRooms(0);
            res.setTotalRooms(0);
        }

        if (ranking != null) {
            res.setAverageRating(round2(ranking.averageRating()));
            res.setReviewCount(ranking.reviewCount());
            res.setTrustEvidence(round2(ranking.trustEvidence()));
            res.setTrustEffectiveScore(round2(ranking.trustEffectiveScore()));
            res.setRatingBayesScore(round2(ranking.ratingBayesScore()));
            res.setDistanceKm(ranking.distanceKm() == null ? null : round2(ranking.distanceKm()));
            res.setDistanceScore(round2(ranking.distanceScore()));
            res.setRankScore(round2(ranking.rankScore()));
        }

        res.setSafetyScore(p.getSafetyScore());
        res.setModerationReason(p.getModerationReason());
        return res;
    }

    public RoomResponse mapToRoomResponse(Room r) {
        RoomResponse res = modelMapper.map(r, RoomResponse.class);
        res.setImages(JsonUtil.convertJsonToList(r.getImages()));
        res.setAmenities(JsonUtil.convertJsonToList(r.getAmenities()));
        res.setPanoramaImages(JsonUtil.convertJsonToList(r.getPanoramaImages()));
        if (r.getProperty() != null) {
            res.setPropertyName(r.getProperty().getName());
            res.setPropertyId(r.getProperty().getId());
            String fullAddress = r.getProperty().getAddress() + ", " + r.getProperty().getDistrict() + ", "
                    + r.getProperty().getCity();
            res.setPropertyAddress(fullAddress);
            res.setElecPrice(r.getProperty().getElecPrice());
            res.setWaterPrice(r.getProperty().getWaterPrice());
            res.setInternetPrice(r.getProperty().getInternetPrice());
            if (r.getProperty().getLandlord() != null) {
                res.setLandlordUsername(r.getProperty().getLandlord().getUsername());
                res.setLandlordName(r.getProperty().getLandlord().getFullName());
                res.setLandlordPhone(r.getProperty().getLandlord().getPhoneNumber());
                res.setLandlordAvatar(r.getProperty().getLandlord().getAvatarUrl());
                res.setLandlordReputationScore(r.getProperty().getLandlord().getReputationScore());
            }
        }
        return res;
    }

    @Transactional(readOnly = true)
    public PropertyResponse getPropertyById(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("KhĂ´ng tĂ¬m tháº¥y khu trá» vá»›i ID: " + id));
        return mapToPropertyResponse(property);
    }

    @Transactional
    public PropertyResponse updateProperty(Long landlordId, Long propertyId, PropertyRequest request) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trá» khĂ´ng tá»“n táº¡i vá»›i ID: " + propertyId));

        if (!property.getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Báº¡n khĂ´ng cĂ³ quyá»n chá»‰nh sá»­a khu trá» nĂ y!");
        }

        ModerationResult modResult = moderationService
                .checkContent(
                        "Khu tro",
                        buildPropertyContentCheck(request),
                        request.getImages(),
                        null,
                        null,
                        null,
                        request.getAddress(),
                        request.getDistrict(),
                        request.getCity(),
                        null,
                        null,
                        null,
                        request.getElecPrice(),
                        request.getWaterPrice(),
                        request.getInternetPrice()
                );
        
        PropertyStatus aiStatus = PropertyStatus.PENDING;

        property.setName(request.getName());
        property.setCity(request.getCity());
        property.setDistrict(request.getDistrict());
        property.setAddress(request.getAddress());
        property.setDescription(request.getDescription());
        property.setStatus(aiStatus);
        property.setSafetyScore(modResult.getScore());
        property.setModerationReason(modResult.getReason());

        property.setElecPrice(request.getElecPrice());
        property.setWaterPrice(request.getWaterPrice());
        property.setInternetPrice(request.getInternetPrice());

        if (request.getImages() != null && !request.getImages().isEmpty()) {
            property.setImages(JsonUtil.convertListToJson(request.getImages()));
        }

        Property saved = propertyRepository.save(property);
        return mapToPropertyResponse(saved);
    }

    // === ADMIN Duyá»‡t tin ===
    @Transactional(readOnly = true)
    public List<PropertyResponse> getPropertiesByStatus(PropertyStatus status) {
        return propertyRepository.findByStatus(status).stream()
                .map(this::mapToPropertyResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateStatus(Long propertyId, PropertyStatus status, String rejectionReason) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trá» khĂ´ng tá»“n táº¡i"));
        property.setStatus(status);

        // LÆ°u lĂ½ do tá»« chá»‘i náº¿u cĂ³
        if (status == PropertyStatus.REJECTED && rejectionReason != null && !rejectionReason.isBlank()) {
            property.setModerationReason("Admin tá»« chá»‘i: " + rejectionReason);
        }

        propertyRepository.save(property);

        // Gá»­i thĂ´ng bĂ¡o cho chá»§ trá»
        try {
            User landlord = property.getLandlord();
            if (status == PropertyStatus.APPROVED) {
                notificationService.createNotification(
                        landlord,
                        "Khu trá» Ä‘Ă£ Ä‘Æ°á»£c duyá»‡t âœ…",
                        "Khu trá» \"" + property.getName() + "\" cá»§a báº¡n Ä‘Ă£ Ä‘Æ°á»£c Admin duyá»‡t vĂ  hiá»ƒn thá»‹ cĂ´ng khai.",
                        NotificationType.PROPERTY_APPROVED,
                        property.getId()
                );
            } else if (status == PropertyStatus.REJECTED) {
                String msg = "Khu trá» \"" + property.getName() + "\" cá»§a báº¡n Ä‘Ă£ bá»‹ Admin tá»« chá»‘i.";
                if (rejectionReason != null && !rejectionReason.isBlank()) {
                    msg += "\nLĂ½ do: " + rejectionReason;
                }
                notificationService.createNotification(
                        landlord,
                        "Khu trá» bá»‹ tá»« chá»‘i âŒ",
                        msg,
                        NotificationType.PROPERTY_REJECTED,
                        property.getId()
                );
            }
        } catch (Exception e) {
            System.err.println("â ï¸ Lá»—i gá»­i notification: " + e.getMessage());
        }
    }

    public String reverseGeocode(double lat, double lon) {
        String url = String.format(
                "https://nominatim.openstreetmap.org/reverse?format=json&lat=%s&lon=%s&addressdetails=1&accept-language=vi",
                lat, lon);

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "KLTN_SmartRental_App_Version_1.0");

        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

        return response.getBody();
    }
    public PropertyResponse updatePropertyStatus(Long landlordId, Long propertyId, PropertyStatus newStatus) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trá» khĂ´ng tá»“n táº¡i"));

        if (!property.getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Báº¡n khĂ´ng cĂ³ quyá»n thá»±c hiá»‡n thao tĂ¡c nĂ y!");
        }
        if(newStatus== PropertyStatus.HIDDEN){
            List<Room> rooms = roomRepository.findByPropertyId(propertyId);

            boolean hasActiveRooms = rooms.stream().anyMatch(room ->
                    room.getStatus() == RoomStatus.RENTED || room.getStatus() == RoomStatus.RESERVED
            );

            if (hasActiveRooms) {
                throw new RuntimeException("KhĂ´ng thá»ƒ áº©n khu trá» vĂ¬ hiá»‡n táº¡i cĂ³ phĂ²ng Ä‘ang Ä‘Æ°á»£c thuĂª hoáº·c Ä‘Ă£ Ä‘Æ°á»£c Ä‘áº·t cá»c.");
            }
        }
        property.setStatus(newStatus);
        Property saved = propertyRepository.save(property);

        return mapToPropertyResponse(saved);
    }
}
