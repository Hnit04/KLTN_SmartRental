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
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
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

    // 1. API MỚI: Lấy tất cả danh sách nhà trọ (Public)
    public List<PropertyResponse> getAllProperties() {
        List<Property> properties = propertyRepository.findAll();

        // Convert từng Entity sang Response (đã bao gồm tính toán giá)
        return properties.stream()
                .map(this::mapToPropertyResponse)
                .collect(Collectors.toList());
    }

    // TẠO KHU TRỌ MỚI
    @Transactional
    public PropertyResponse createProperty(Long landlordId, PropertyRequest request) {
        User user = userRepository.findById(landlordId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        if (user.getRole() != Role.LANDLORD) {
            throw new RuntimeException("Chỉ chủ trọ mới được đăng bài!");
        }

        Property property = modelMapper.map(request, Property.class);
        property.setLandlord((Landlord) user);
        property.setImages(JsonUtil.convertListToJson(request.getImages()));

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

        Room room = modelMapper.map(request, Room.class);
        room.setProperty(property);
        room.setStatus(RoomStatus.AVAILABLE);
        room.setImages(JsonUtil.convertListToJson(request.getImages()));
        room.setAmenities(JsonUtil.convertListToJson(request.getAmenities()));

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
    public List<RoomResponse> getRoomsByProperty(Long propertyId) {
        return roomRepository.findByPropertyId(propertyId).stream()
                .map(this::mapToRoomResponse)
                .collect(Collectors.toList());
    }



    // === MAPPER & TÍNH TOÁN LOGIC ===
    private PropertyResponse mapToPropertyResponse(Property p) {
        PropertyResponse res = modelMapper.map(p, PropertyResponse.class);

        // Convert chuỗi JSON ảnh thành List
        res.setImages(JsonUtil.convertJsonToList(p.getImages()));

        if (p.getLandlord() != null) {
            res.setLandlordName(p.getLandlord().getFullName());
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
        // 1. Tìm khu trọ theo ID
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Khu trọ không tồn tại với ID: " + propertyId));

        // 2. Kiểm tra quyền sở hữu (Chỉ cho phép Chủ trọ sở hữu mới được sửa)
        if (!property.getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa khu trọ này!");
        }

        // 3. Cập nhật dữ liệu từ request
        property.setName(request.getName());
        property.setCity(request.getCity());
        property.setDistrict(request.getDistrict());
        property.setAddress(request.getAddress());
        property.setDescription(request.getDescription());

        property.setElecPrice(request.getElecPrice());
        property.setWaterPrice(request.getWaterPrice());
        property.setInternetPrice(request.getInternetPrice());

        // Cập nhật list hình ảnh (nếu có gửi lên)
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            property.setImages(JsonUtil.convertListToJson(request.getImages()));
        }

        // 4. Lưu vào Database và trả về
        Property saved = propertyRepository.save(property);
        return mapToPropertyResponse(saved);
    }
    public String reverseGeocode(double lat, double lon) {
        String url = String.format("https://nominatim.openstreetmap.org/reverse?format=json&lat=%s&lon=%s&addressdetails=1&accept-language=vi", lat, lon);

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