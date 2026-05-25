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
        return String.format("TĂªn khu trá»: %s\nÄá»‹a chỉ: %s, %s, %s\nMĂ´ táº£: %s\nGiá điện: %s\nGiá nước: %s\nInternet: %s",
                request.getName(), request.getAddress(), request.getDistrict(), request.getCity(),
                request.getDescription(), request.getElecPrice(), request.getWaterPrice(), request.getInternetPrice());
    }

    private String buildRoomContentCheck(RoomRequest request) {
        return String.format("Tên/Số phòng: %s\nGiá phòng: %s\nDiện tích: %s\nLoại phòng: %s\nTiện ích: %s\nMô tả/Nội quy: %s",
                request.getName(), request.getPrice(), request.getArea(), request.getType(),
                request.getAmenities(), request.getDefaultTerms());
    }

    private boolean shouldAutoApprove(Long landlordId, ModerationResult modResult) {
        iuh.se.kltn.backend.modules.subscription.enums.VipTier tier = vipSubscriptionService.getCurrentTier(landlordId);
        if (!tier.isAutoApproveWhenSafe()) return false;
        if (modResult.getScore() < 90) return false;
        
        String reasonStr = modResult.getReason() != null ? modResult.getReason().toLowerCase() : "";
        boolean hasPolicyViolation = reasonStr.contains("policy") || 
                                     reasonStr.contains("vi phạm") || 
                                     reasonStr.contains("số điện thoại") || 
                                     reasonStr.contains("zalo") ||
                                     reasonStr.contains("nghi ngờ");
        
        return modResult.isSafe() && !hasPolicyViolation;
    }

    // TẠO KHU TRỌ Má»šI
    @Transactional
    public PropertyResponse createProperty(Long landlordId, PropertyRequest request) {
        User user = userRepository.findById(landlordId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        if (user.getRole() != Role.LANDLORD) {
            throw new RuntimeException("Chá»‰ chủ trá» mới được đăng bài!");
        }

        // KIỂM TRA GIá»I Háº N VIP
        vipSubscriptionService.checkPropertyLimit(landlordId);
        if (request.getImages() != null) {
            vipSubscriptionService.checkPropertyImageLimit(landlordId, request.getImages().size());
        }

        // KIỂM DUYỆT NỘI DUNG (AI Moderation) - Chá»‰ để gợi ý cho Admin
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
        if (shouldAutoApprove(landlordId, modResult)) {
            aiStatus = PropertyStatus.APPROVED;
        }

        Property property = modelMapper.map(request, Property.class);
        property.setLandlord((Landlord) user);
        property.setImages(JsonUtil.convertListToJson(request.getImages()));
        property.setStatus(aiStatus);
        property.setSafetyScore(modResult.getScore());
        property.setModerationReason(modResult.getReason());

        Property saved = propertyRepository.save(property);

        // Thông báo cho Admin có tin đăng mới
        List<User> admins = userRepository.findAllByRole(Role.ADMIN);
        for (User admin : admins) {
            notificationService.createNotification(admin, "Yêu cầu duyệt khu trọ mới 🏠", "Chủ trọ " + user.getFullName() + " vừa đăng khu trọ mới: " + saved.getName(), NotificationType.PROPERTY_APPROVED, saved.getId());
        }

        return mapToPropertyResponse(saved);
    }

    // THÊM PHÒNG VÀO KHU TRỌ
    @Transactional
    public RoomResponse addRoom(Long landlordId, Long propertyId, RoomRequest request) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trọ không tồn tại"));

        if (!property.getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không phải chủ khu trọ này!");
        }

        // KIỂM TRA GIỚI HẠN VIP
        vipSubscriptionService.checkRoomLimit(landlordId, propertyId);
        if (request.getImages() != null) {
            vipSubscriptionService.checkRoomImageLimit(landlordId, request.getImages().size());
        }

        // KIỂM DUYỆT NỘI DUNG PHÒNG - Gộp ảnh thường + ảnh 360 để AI kiểm duyệt toàn bộ
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
        if (shouldAutoApprove(landlordId, modResult)) {
            aiStatus = PropertyStatus.APPROVED;
        }

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

        // Map maxOccupants nếu có
        if (request.getMaxOccupants() != null) {
            room.setMaxOccupants(request.getMaxOccupants());
        }

        Room savedRoom = roomRepository.save(room);

        // Thông báo cho Admin có phòng mới cần duyệt
        List<User> admins = userRepository.findAllByRole(Role.ADMIN);
        for (User admin : admins) {
            notificationService.createNotification(admin, "Yêu cầu duyệt phòng mới 🚪", "Chủ trọ " + property.getLandlord().getFullName() + " vừa thêm phòng mới: " + savedRoom.getName() + " tại " + property.getName(), NotificationType.PROPERTY_APPROVED, property.getId());
        }

        return mapToRoomResponse(savedRoom);
    }

    // LẤY DANH SĂCH NHÀ CỦA CHỦ TRỌ
    @Transactional(readOnly = true)
    public List<PropertyResponse> getMyProperties(Long landlordId) {
        return propertyRepository.findByLandlordIdOrderByCreatedAtDesc(landlordId).stream()
                .map(this::mapToPropertyResponse)
                .collect(Collectors.toList());
    }

    // LẤY DANH SĂCH NHÀ CỦA CHỦ TRỌ (DÙNG CHO PUBLIC)
    @Transactional(readOnly = true)
    public List<PropertyResponse> getPropertiesByUsername(String username) {
        return propertyRepository.findByLandlordUsername(username).stream()
                .map(this::mapToPropertyResponse)
                .collect(Collectors.toList());
    }

    // LẤY DANH SĂCH PHÒNG CỦA 1 KHU TRỌ
    @Transactional(readOnly = true)
    public List<RoomResponse> getRoomsByProperty(Long propertyId, Long currentUserId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trá» không tồn tại"));

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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khu trá» với ID: " + id));
        return mapToPropertyResponse(property);
    }

    @Transactional
    public PropertyResponse updateProperty(Long landlordId, Long propertyId, PropertyRequest request) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trọ không tồn tại với ID: " + propertyId));

        if (!property.getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa khu trọ nĂ y!");
        }

        if (request.getVersion() == null) {
            throw new iuh.se.kltn.backend.common.exception.ResourceVersionConflictException("Dữ liệu cập nhật thiếu thông tin version. Vui lòng tải lại trang.");
        }
        if (!request.getVersion().equals(property.getVersion())) {
            throw new iuh.se.kltn.backend.common.exception.ResourceVersionConflictException("Dữ liệu đã được thay đổi ở nơi khác. Vui lòng tải lại trước khi lưu.");
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
        if (shouldAutoApprove(landlordId, modResult)) {
            aiStatus = PropertyStatus.APPROVED;
        }

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

    // === ADMIN Duyệt tin ===
    @Transactional(readOnly = true)
    public List<PropertyResponse> getPropertiesByStatus(PropertyStatus status) {
        return propertyRepository.findByStatus(status).stream()
                .map(this::mapToPropertyResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateStatus(Long propertyId, PropertyStatus status, String rejectionReason) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trá» không tồn tại"));
        property.setStatus(status);

        // LÆ°u lĂ½ do từ chối náº¿u có
        if (status == PropertyStatus.REJECTED && rejectionReason != null && !rejectionReason.isBlank()) {
            property.setModerationReason("Admin từ chối: " + rejectionReason);
        }

        propertyRepository.save(property);

        // Gá»­i thông báo cho chủ trá»
        try {
            User landlord = property.getLandlord();
            if (status == PropertyStatus.APPROVED) {
                notificationService.createNotification(
                        landlord,
                        "Khu trá» đã được duyệt âœ…",
                        "Khu trá» \"" + property.getName() + "\" của bạn đã được Admin duyệt vĂ  hiển thị công khai.",
                        NotificationType.PROPERTY_APPROVED,
                        property.getId()
                );
            } else if (status == PropertyStatus.REJECTED) {
                String msg = "Khu trá» \"" + property.getName() + "\" của bạn đã bị Admin từ chối.";
                if (rejectionReason != null && !rejectionReason.isBlank()) {
                    msg += "\nLý do: " + rejectionReason;
                }
                notificationService.createNotification(
                        landlord,
                        "Khu trá» bị từ chối âŒ",
                        msg,
                        NotificationType.PROPERTY_REJECTED,
                        property.getId()
                );
            }
        } catch (Exception e) {
            System.err.println("â ï¸ Lỗi gửi notification: " + e.getMessage());
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
                .orElseThrow(() -> new RuntimeException("Khu trá» không tồn tại"));

        if (!property.getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không có quyá»n thực hiện thao tác nĂ y!");
        }
        if(newStatus== PropertyStatus.HIDDEN){
            List<Room> rooms = roomRepository.findByPropertyId(propertyId);

            boolean hasActiveRooms = rooms.stream().anyMatch(room ->
                    room.getStatus() == RoomStatus.RENTED || room.getStatus() == RoomStatus.RESERVED
            );

            if (hasActiveRooms) {
                throw new RuntimeException("Không thể ẩn khu trá» vì hiện tại có phòng đang được thuê hoặc đã được Ä‘áº·t cá»c.");
            }
        }
        property.setStatus(newStatus);
        Property saved = propertyRepository.save(property);

        return mapToPropertyResponse(saved);
    }
}
