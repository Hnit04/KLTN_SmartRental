package iuh.se.kltn.backend.modules.property.service;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.common.utils.JsonUtil;
import iuh.se.kltn.backend.modules.property.dto.request.PropertyRequest;
import iuh.se.kltn.backend.modules.property.dto.request.RoomRequest;
import iuh.se.kltn.backend.modules.property.dto.response.PropertyResponse;
import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import iuh.se.kltn.backend.modules.ai.dto.ModerationResult;
import iuh.se.kltn.backend.modules.ai.service.ModerationService;
import iuh.se.kltn.backend.modules.interaction.service.NotificationService;
import iuh.se.kltn.backend.modules.interaction.enums.NotificationType;

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
import org.springframework.data.domain.Pageable;
import java.util.List;
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

    // 1. API MỚI: Lấy tất cả danh sách nhà trọ (Public) - CHỈ LẤY "APPROVED"
    public Page<PropertyResponse> getAllProperties(Pageable pageable) {
        Page<Property> properties = propertyRepository.findByStatus(PropertyStatus.APPROVED, pageable);
        return properties.map(this::mapToPropertyResponse);
    }

    private String buildPropertyContentCheck(PropertyRequest request) {
        return String.format("Tên khu trọ: %s\nĐịa chỉ: %s, %s, %s\nMô tả: %s\nGiá điện: %s\nGiá nước: %s\nInternet: %s",
                request.getName(), request.getAddress(), request.getDistrict(), request.getCity(),
                request.getDescription(), request.getElecPrice(), request.getWaterPrice(), request.getInternetPrice());
    }

    private String buildRoomContentCheck(RoomRequest request) {
        return String.format("Tên/Số phòng: %s\nGiá phòng: %s\nDiện tích: %s\nLoại phòng: %s\nTiện ích: %s\nMô tả/Nội quy: %s",
                request.getName(), request.getPrice(), request.getArea(), request.getType(),
                request.getAmenities(), request.getDefaultTerms());
    }

    // TẠO KHU TRỌ MỚI
    @Transactional
    public PropertyResponse createProperty(Long landlordId, PropertyRequest request) {
        User user = userRepository.findById(landlordId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        if (user.getRole() != Role.LANDLORD) {
            throw new RuntimeException("Chỉ chủ trọ mới được đăng bài!");
        }

        // KIỂM DUYỆT NỘI DUNG (AI Moderation) - Chỉ để gợi ý cho Admin
        ModerationResult modResult = moderationService
                .checkContent("Khu trọ", buildPropertyContentCheck(request), request.getImages());
        
        PropertyStatus aiStatus = PropertyStatus.PENDING;

        Property property = modelMapper.map(request, Property.class);
        property.setLandlord((Landlord) user);
        property.setImages(JsonUtil.convertListToJson(request.getImages()));
        property.setStatus(aiStatus);
        property.setSafetyScore(modResult.getScore());
        property.setModerationReason(modResult.getReason());

        System.out
                .println(" [DEBUG] AI Result for property '" + request.getName() + "': Score=" + modResult.getScore());

        Property saved = propertyRepository.save(property);
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

        // KIỂM DUYỆT NỘI DUNG PHÒNG - Chỉ để gợi ý cho Admin
        ModerationResult modResult = moderationService.checkContent(
                "Phòng trọ", buildRoomContentCheck(request), request.getImages());
        
        PropertyStatus aiStatus = PropertyStatus.PENDING;

        Room room = modelMapper.map(request, Room.class);
        room.setProperty(property);
        room.setStatus(RoomStatus.AVAILABLE);
        room.setApprovalStatus(aiStatus);
        room.setDescription(request.getDescription());
        room.setImages(JsonUtil.convertListToJson(request.getImages()));
        room.setAmenities(JsonUtil.convertListToJson(request.getAmenities()));
        room.setSafetyScore(modResult.getScore());
        room.setModerationReason(modResult.getReason());

        // Map maxOccupants nếu có
        if (request.getMaxOccupants() != null) {
            room.setMaxOccupants(request.getMaxOccupants());
        }

        Room savedRoom = roomRepository.save(room);
        return mapToRoomResponse(savedRoom);
    }

    // LẤY DANH SÁCH NHÀ CỦA CHU TRO
    public List<PropertyResponse> getMyProperties(Long landlordId) {
        return propertyRepository.findByLandlordId(landlordId).stream()
                .map(this::mapToPropertyResponse)
                .collect(Collectors.toList());
    }

    // LẤY DANH SÁCH PHÒNG CỦA 1 KHU TRỌ
    public List<RoomResponse> getRoomsByProperty(Long propertyId, Long currentUserId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trọ không tồn tại"));

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

    // === MAPPER & TÍNH TOÁN LOGIC ===
    private PropertyResponse mapToPropertyResponse(Property p) {
        PropertyResponse res = modelMapper.map(p, PropertyResponse.class);
        res.setImages(JsonUtil.convertJsonToList(p.getImages()));

        if (p.getLandlord() != null) {
            res.setLandlordId(p.getLandlord().getId());
            res.setLandlordName(p.getLandlord().getFullName());
            res.setLandlordPhone(p.getLandlord().getPhoneNumber());
        }

        List<Room> rooms = p.getRooms();
        if (rooms != null && !rooms.isEmpty()) {
            double min = rooms.stream().mapToDouble(Room::getPrice).min().orElse(0.0);
            double max = rooms.stream().mapToDouble(Room::getPrice).max().orElse(0.0);
            long available = rooms.stream()
                    .filter(r -> r.getStatus() == RoomStatus.AVAILABLE)
                    .count();

            res.setMinPrice(min);
            res.setMaxPrice(max);
            res.setAvailableRooms((int) available);
            res.setTotalRooms(rooms.size());
        } else {
            res.setMinPrice(0.0);
            res.setMaxPrice(0.0);
            res.setAvailableRooms(0);
            res.setTotalRooms(0);
        }

        res.setSafetyScore(p.getSafetyScore());
        res.setModerationReason(p.getModerationReason());
        return res;
    }

    private RoomResponse mapToRoomResponse(Room r) {
        RoomResponse res = modelMapper.map(r, RoomResponse.class);
        res.setImages(JsonUtil.convertJsonToList(r.getImages()));
        res.setAmenities(JsonUtil.convertJsonToList(r.getAmenities()));
        if (r.getProperty() != null) {
            res.setPropertyName(r.getProperty().getName());
        }
        return res;
    }

    public PropertyResponse getPropertyById(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khu trọ với ID: " + id));
        return mapToPropertyResponse(property);
    }

    @Transactional
    public PropertyResponse updateProperty(Long landlordId, Long propertyId, PropertyRequest request) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trọ không tồn tại với ID: " + propertyId));

        if (!property.getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa khu trọ này!");
        }

        ModerationResult modResult = moderationService
                .checkContent("Khu trọ", buildPropertyContentCheck(request), request.getImages());
        
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

    // === ADMIN Duyệt tin ===
    public List<PropertyResponse> getPropertiesByStatus(PropertyStatus status) {
        return propertyRepository.findByStatus(status).stream()
                .map(this::mapToPropertyResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateStatus(Long propertyId, PropertyStatus status, String rejectionReason) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trọ không tồn tại"));
        property.setStatus(status);

        // Lưu lý do từ chối nếu có
        if (status == PropertyStatus.REJECTED && rejectionReason != null && !rejectionReason.isBlank()) {
            property.setModerationReason("Admin từ chối: " + rejectionReason);
        }

        propertyRepository.save(property);

        // Gửi thông báo cho chủ trọ
        try {
            User landlord = property.getLandlord();
            if (status == PropertyStatus.APPROVED) {
                notificationService.createNotification(
                        landlord,
                        "Khu trọ đã được duyệt ✅",
                        "Khu trọ \"" + property.getName() + "\" của bạn đã được Admin duyệt và hiển thị công khai.",
                        NotificationType.PROPERTY_APPROVED,
                        property.getId()
                );
            } else if (status == PropertyStatus.REJECTED) {
                String msg = "Khu trọ \"" + property.getName() + "\" của bạn đã bị Admin từ chối.";
                if (rejectionReason != null && !rejectionReason.isBlank()) {
                    msg += "\nLý do: " + rejectionReason;
                }
                notificationService.createNotification(
                        landlord,
                        "Khu trọ bị từ chối ❌",
                        msg,
                        NotificationType.PROPERTY_REJECTED,
                        property.getId()
                );
            }
        } catch (Exception e) {
            System.err.println("⚠️ Lỗi gửi notification: " + e.getMessage());
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
}