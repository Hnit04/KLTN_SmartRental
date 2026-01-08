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

    private PropertyResponse mapToPropertyResponse(Property p) {
        PropertyResponse res = modelMapper.map(p, PropertyResponse.class);
        res.setImages(JsonUtil.convertJsonToList(p.getImages()));
        res.setLandlordName(p.getLandlord().getFullName());
        return res;
    }

    private RoomResponse mapToRoomResponse(Room r) {
        RoomResponse res = modelMapper.map(r, RoomResponse.class);
        res.setImages(JsonUtil.convertJsonToList(r.getImages()));
        res.setAmenities(JsonUtil.convertJsonToList(r.getAmenities()));
        res.setPropertyName(r.getProperty().getName());
        return res;
    }
}