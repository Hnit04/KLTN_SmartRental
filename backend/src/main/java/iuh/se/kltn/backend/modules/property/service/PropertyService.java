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

    // 1. API MỚI: Lấy tất cả danh sách nhà trọ (Public) - CHỈ LẤY "APPROVED"
    public Page<PropertyResponse> getAllProperties(Pageable pageable) {
        Page<Property> properties = propertyRepository.findByStatus(PropertyStatus.APPROVED, pageable);

        // Convert từng Entity sang Response
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
        room.setImages(JsonUtil.convertListToJson(request.getImages()));
        room.setAmenities(JsonUtil.convertListToJson(request.getAmenities()));
        room.setSafetyScore(modResult.getScore());
        room.setModerationReason(modResult.getReason());

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
            // Chủ trọ xem tất cả phòng của mình
            return roomRepository.findByPropertyId(propertyId).stream()
                    .map(this::mapToRoomResponse)
                    .collect(Collectors.toList());
        } else {
            // User bình thường chỉ xem phòng đã duyệt
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

        // --- TÍNH TOÁN GIÁ VÀ PHÒNG TRỐNG ---
        List<Room> rooms = p.getRooms();
        if (rooms != null && !rooms.isEmpty()) {
            // Tính giá thấp nhất
            double min = rooms.stream().mapToDouble(Room::getPrice).min().orElse(0.0);

            // Tính giá cao nhất
            double max = rooms.stream().mapToDouble(Room::getPrice).max().orElse(0.0);

            // Đếm phòng còn trống (AVAILABLE)
            long available = rooms.stream()
                    .filter(r -> r.getStatus() == RoomStatus.AVAILABLE)
                    .count();

            res.setMinPrice(min);
            res.setMaxPrice(max);
            res.setAvailableRooms((int) available);
            res.setTotalRooms(rooms.size());
        } else {
            // Nếu nhà chưa có phòng nào
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
        // Có thể thêm kiểm tra nếu không phải owner thì phải được APPROVED mới xem được
        return mapToPropertyResponse(property);
    }

    @Transactional
    public PropertyResponse updateProperty(Long landlordId, Long propertyId, PropertyRequest request) {
        // 1. Tìm khu trọ theo ID
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trọ không tồn tại với ID: " + propertyId));

        // 2. Kiểm tra quyền sở hữu
        if (!property.getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa khu trọ này!");
        }

        // 3. KIỂM DUYỆT NỘI DUNG - Chỉ để gợi ý cho Admin
        ModerationResult modResult = moderationService
                .checkContent("Khu trọ", buildPropertyContentCheck(request), request.getImages());
        
        PropertyStatus aiStatus = PropertyStatus.PENDING;

        // 4. Cập nhật dữ liệu
        property.setName(request.getName());
        property.setCity(request.getCity());
        property.setDistrict(request.getDistrict());
        property.setAddress(request.getAddress());
        property.setDescription(request.getDescription());
        property.setStatus(aiStatus); // Đưa về PENDING hoặc APPROVED dựa theo AI
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
    public void updateStatus(Long propertyId, PropertyStatus status) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trọ không tồn tại"));
        property.setStatus(status);
        propertyRepository.save(property);
    }

    public String reverseGeocode(double lat, double lon) {
        String url = String.format(
                "https://nominatim.openstreetmap.org/reverse?format=json&lat=%s&lon=%s&addressdetails=1&accept-language=vi",
                lat, lon);

        RestTemplate restTemplate = new RestTemplate();

        // Khai báo User-Agent (Tên đồ án) để OpenStreetMap không chặn
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "KLTN_SmartRental_App_Version_1.0");

        HttpEntity<String> entity = new HttpEntity<>(headers);

        // Bắn request lấy dữ liệu
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

        return response.getBody(); // Trả về chuỗi JSON chuẩn
    }
}