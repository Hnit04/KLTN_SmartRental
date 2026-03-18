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

import java.util.HashMap;
import java.util.Map;

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
     * Hàm convert Entity -> DTO
     */
    public RoomResponse mapToRoomResponse(Room r) {
        RoomResponse res = modelMapper.map(r, RoomResponse.class);

        // Convert chuỗi JSON trong DB thành List Java
        res.setImages(JsonUtil.convertJsonToList(r.getImages()));
        res.setAmenities(JsonUtil.convertJsonToList(r.getAmenities()));

        if (r.getProperty() != null) {
            res.setPropertyName(r.getProperty().getName());
            String fullAddress = r.getProperty().getAddress() + ", " + r.getProperty().getDistrict() + ", " + r.getProperty().getCity();
            res.setPropertyAddress(fullAddress);
            res.setElecPrice(r.getProperty().getElecPrice());
            res.setWaterPrice(r.getProperty().getWaterPrice());
            res.setInternetPrice(r.getProperty().getInternetPrice());

            if (r.getProperty().getLandlord() != null) {
                res.setLandlordName(r.getProperty().getLandlord().getFullName());
            }
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

        if (request.getDefaultTerms() != null) {
            room.setDefaultTerms(request.getDefaultTerms());
        }

        Room savedRoom = roomRepository.save(room);
        return mapToRoomResponse(savedRoom);
    }

    // Trong RoomService.java (hoặc tạo file mới LandlordStatsService.java)


    public Map<String, Long> getRoomStatsForLandlord(Long landlordId) {
        Long totalRooms = roomRepository.countTotalRoomsByLandlord(landlordId);
        Long rentedRooms = roomRepository.countRentedRoomsByLandlord(landlordId);
        Long totalTenants  = roomRepository.sumCurrentOccupantsByLandlord(landlordId);

        Map<String, Long> stats = new HashMap<>();
        stats.put("totalRooms", totalRooms != null ? totalRooms : 0L);
        stats.put("rentedRooms", rentedRooms != null ? rentedRooms : 0L);
        stats.put("totalTenants",  totalTenants  != null ? totalTenants  : 0L);
        return stats;
    }
}