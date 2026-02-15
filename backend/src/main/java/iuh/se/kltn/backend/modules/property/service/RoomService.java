package iuh.se.kltn.backend.modules.property.service;

import iuh.se.kltn.backend.common.utils.JsonUtil;
import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import iuh.se.kltn.backend.modules.property.dto.request.RoomRequest;
import org.springframework.transaction.annotation.Transactional;
@Service
public class RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private ModelMapper modelMapper;

    /**
     * Lấy chi tiết phòng theo ID
     */
    public RoomResponse getRoomById(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + id));

        return mapToRoomResponse(room);
    }

    /**
     * Hàm convert Entity -> DTO (Copy logic từ PropertyService sang để tái sử dụng)
     */
    private RoomResponse mapToRoomResponse(Room r) {
        RoomResponse res = modelMapper.map(r, RoomResponse.class);

        // Convert chuỗi JSON trong DB thành List Java
        res.setImages(JsonUtil.convertJsonToList(r.getImages()));
        res.setAmenities(JsonUtil.convertJsonToList(r.getAmenities()));

        if (r.getProperty() != null) {
            res.setPropertyName(r.getProperty().getName());
        }
        return res;
    }
    @Transactional
    public RoomResponse updateRoom(Long id, RoomRequest request) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + id));

        room.setName(request.getName());
        room.setPrice(request.getPrice());
        room.setArea(request.getArea());

        if (request.getAmenities() != null) {
            room.setAmenities(JsonUtil.convertListToJson(request.getAmenities()));
        }
        if (request.getImages() != null) {
            room.setImages(JsonUtil.convertListToJson(request.getImages()));
        }

        Room savedRoom = roomRepository.save(room);
        return mapToRoomResponse(savedRoom);
    }
}