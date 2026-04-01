package iuh.se.kltn.backend.modules.property.service;

import iuh.se.kltn.backend.common.utils.JsonUtil;
import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.ai.dto.ModerationResult;
import iuh.se.kltn.backend.modules.ai.service.ModerationService;
import iuh.se.kltn.backend.modules.user.dto.response.UserProfileResponse;
import iuh.se.kltn.backend.modules.interaction.service.NotificationService;
import iuh.se.kltn.backend.modules.interaction.enums.NotificationType;
import iuh.se.kltn.backend.modules.user.entity.User;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import iuh.se.kltn.backend.modules.property.dto.request.RoomRequest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import java.util.HashMap;
import java.util.Map;

@Service
public class RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private ModerationService moderationService;

    @Autowired
    private NotificationService notificationService;

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
            String fullAddress = r.getProperty().getAddress() + ", " + r.getProperty().getDistrict() + ", "
                    + r.getProperty().getCity();
            res.setPropertyAddress(fullAddress);
            res.setElecPrice(r.getProperty().getElecPrice());
            res.setWaterPrice(r.getProperty().getWaterPrice());
            res.setInternetPrice(r.getProperty().getInternetPrice());

            if (r.getProperty().getLandlord() != null) {
                res.setLandlordName(r.getProperty().getLandlord().getFullName());
            }
        }
        res.setApprovalStatus(r.getApprovalStatus());
        res.setSafetyScore(r.getSafetyScore());
        res.setModerationReason(r.getModerationReason());
        return res;
    }

    private String buildRoomContentCheck(RoomRequest request) {
        return String.format("Tên/Số phòng: %s\nGiá phòng: %s\nDiện tích: %s\nLoại phòng: %s\nTiện ích: %s\nMô tả/Nội quy: %s",
                request.getName(), request.getPrice(), request.getArea(), request.getType(),
                request.getAmenities(), request.getDefaultTerms());
    }

    @Transactional
    public RoomResponse updateRoom(Long id, RoomRequest request) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + id));

        // KIỂM DUYỆT NỘI DUNG - Chỉ để gợi ý cho Admin
        ModerationResult modResult = moderationService
                .checkContent("Phòng trọ", buildRoomContentCheck(request), request.getImages());
        
        PropertyStatus aiStatus = PropertyStatus.PENDING;

        room.setName(request.getName());
        room.setPrice(request.getPrice());
        room.setArea(request.getArea());
        room.setDescription(request.getDescription());
        room.setApprovalStatus(aiStatus); // Duyệt lại khi sửa
        room.setSafetyScore(modResult.getScore());
        room.setModerationReason(modResult.getReason());


        if (request.getAmenities() != null) {
            room.setAmenities(JsonUtil.convertListToJson(request.getAmenities()));
        }
        if (request.getImages() != null) {
            room.setImages(JsonUtil.convertListToJson(request.getImages()));
        }

        if (request.getDefaultTerms() != null) {
            room.setDefaultTerms(request.getDefaultTerms());
        }

        // Map maxOccupants nếu có
        if (request.getMaxOccupants() != null) {
            room.setMaxOccupants(request.getMaxOccupants());
        }

        Room savedRoom = roomRepository.save(room);
        return mapToRoomResponse(savedRoom);
    }

    public Map<String, Long> getRoomStatsForLandlord(Long landlordId) {
        Long totalRooms = roomRepository.countTotalRoomsByLandlord(landlordId);
        Long rentedRooms = roomRepository.countRentedRoomsByLandlord(landlordId);
        Long totalTenants = roomRepository.sumCurrentOccupantsByLandlord(landlordId);

        Map<String, Long> stats = new HashMap<>();
        stats.put("totalRooms", totalRooms != null ? totalRooms : 0L);
        stats.put("rentedRooms", rentedRooms != null ? rentedRooms : 0L);
        stats.put("totalTenants", totalTenants != null ? totalTenants : 0L);
        return stats;
    }

    // === ADMIN Duyệt phòng ===
    public List<RoomResponse> getPendingRooms() {
        return roomRepository.findByApprovalStatus(PropertyStatus.PENDING).stream()
                .map(this::mapToRoomResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateApprovalStatus(Long roomId, PropertyStatus status, String rejectionReason) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + roomId));
        room.setApprovalStatus(status);

        // Lưu lý do từ chối nếu có
        if (status == PropertyStatus.REJECTED && rejectionReason != null && !rejectionReason.isBlank()) {
            room.setModerationReason("Admin từ chối: " + rejectionReason);
        }

        roomRepository.save(room);

        // Gửi thông báo cho chủ trọ
        try {
            User landlord = room.getProperty().getLandlord();
            String roomLabel = "Phòng \"" + room.getName() + "\" (Khu trọ " + room.getProperty().getName() + ")";
            
            if (status == PropertyStatus.APPROVED) {
                notificationService.createNotification(
                        landlord,
                        "Phòng đã được duyệt ✅",
                        roomLabel + " đã được Admin duyệt và hiển thị công khai.",
                        NotificationType.ROOM_APPROVED,
                        room.getId()
                );
            } else if (status == PropertyStatus.REJECTED) {
                String msg = roomLabel + " đã bị Admin từ chối.";
                if (rejectionReason != null && !rejectionReason.isBlank()) {
                    msg += "\nLý do: " + rejectionReason;
                }
                notificationService.createNotification(
                        landlord,
                        "Phòng bị từ chối ❌",
                        msg,
                        NotificationType.ROOM_REJECTED,
                        room.getId()
                );
            }
        } catch (Exception e) {
            System.err.println("⚠️ Lỗi gửi notification phòng: " + e.getMessage());
        }
    }
    public List<UserProfileResponse> getTenantsByRoomId(Long roomId) {
        // Kiểm tra phòng có tồn tại không
        roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + roomId));

        // Lấy danh sách từ hợp đồng (Cần inject ContractRepository)
        List<User> tenants = roomRepository.findTenantsByRoomId(roomId);

        // Map sang DTO để trả về
        return tenants.stream()
                .map(user -> modelMapper.map(user, UserProfileResponse.class))
                .collect(Collectors.toList());
    }
}