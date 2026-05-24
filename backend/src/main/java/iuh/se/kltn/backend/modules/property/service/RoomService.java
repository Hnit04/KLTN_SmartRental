package iuh.se.kltn.backend.modules.property.service;

import iuh.se.kltn.backend.common.utils.JsonUtil;
import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
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
    private iuh.se.kltn.backend.modules.contract.repository.ContractRepository contractRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private ModerationService moderationService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService vipSubscriptionService;

    private boolean shouldAutoApprove(Long landlordId, ModerationResult modResult) {
        if (landlordId == null) return false;
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

    /**
     * Lấy chi tiáº¿t phòng theo ID
     */
    @Transactional(readOnly = true)
    public RoomResponse getRoomById(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + id));

        return mapToRoomResponse(room);
    }

    /**
     * HĂ m convert Entity -> DTO
     */
    public RoomResponse mapToRoomResponse(Room r) {
        RoomResponse res = modelMapper.map(r, RoomResponse.class);

        // Convert chuỗi JSON trong DB thĂ nh List Java
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
        res.setApprovalStatus(r.getApprovalStatus());
        res.setSafetyScore(r.getSafetyScore());
        res.setModerationReason(r.getModerationReason());

        if (r.getStatus() == RoomStatus.RENTED) {
            // đŸ›¡ï¸ DĂ¹ng query lá»c startDate <= today để tránh lấy nhầm Pre-booking
            iuh.se.kltn.backend.modules.contract.entity.Contract currentContract = contractRepository.findCurrentActiveContractByRoomId(r.getId(), java.time.LocalDate.now()).orElse(null);
            if (currentContract != null && currentContract.getEndDate() != null) {
                long daysToExpiry = java.time.temporal.ChronoUnit.DAYS.between(java.time.LocalDate.now(), currentContract.getEndDate());
                if (daysToExpiry <= 15 && daysToExpiry >= 0) {
                    res.setAvailableFromDate(currentContract.getEndDate().toString());
                }
            }
        }

        System.out.println(res);
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

        if (request.getVersion() == null) {
            throw new iuh.se.kltn.backend.common.exception.ResourceVersionConflictException("Dữ liệu cập nhật thiếu thông tin version. Vui lòng tải lại trang.");
        }
        if (!request.getVersion().equals(room.getVersion())) {
            throw new iuh.se.kltn.backend.common.exception.ResourceVersionConflictException("Dữ liệu đã được thay đổi ở nơi khác. Vui lòng tải lại trước khi lưu.");
        }

        // KIỂM DUYỆT NỘI DUNG - Gộp ảnh thÆ°á»ng + ảnh 360 để AI kiá»ƒm duyệt toàn bộ
        java.util.List<String> allImages = new java.util.ArrayList<>();
        if (request.getImages() != null) allImages.addAll(request.getImages());
        if (request.getPanoramaImages() != null) allImages.addAll(request.getPanoramaImages());
        ModerationResult modResult = moderationService
                .checkContent(
                        "Phong tro",
                        buildRoomContentCheck(request),
                        allImages,
                        request.getPanoramaImages(),
                        request.getPrice(),
                        request.getArea(),
                        room.getProperty() != null ? room.getProperty().getAddress() : null,
                        room.getProperty() != null ? room.getProperty().getDistrict() : null,
                        room.getProperty() != null ? room.getProperty().getCity() : null,
                        request.getAmenities(),
                        request.getType(),
                        request.getMaxOccupants(),
                        room.getProperty() != null ? room.getProperty().getElecPrice() : null,
                        room.getProperty() != null ? room.getProperty().getWaterPrice() : null,
                        room.getProperty() != null ? room.getProperty().getInternetPrice() : null
                );
        
        PropertyStatus aiStatus = PropertyStatus.PENDING;
        Long landlordId = null;
        if (room.getProperty() != null && room.getProperty().getLandlord() != null) {
            landlordId = room.getProperty().getLandlord().getId();
        }
        if (shouldAutoApprove(landlordId, modResult)) {
            aiStatus = PropertyStatus.APPROVED;
        }

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
        if (request.getPanoramaImages() != null) {
            room.setPanoramaImages(JsonUtil.convertListToJson(request.getPanoramaImages()));
        }

        if (request.getDefaultTerms() != null) {
            room.setDefaultTerms(request.getDefaultTerms());
        }

        // Map maxOccupants náº¿u có
        if (request.getMaxOccupants() != null) {
            room.setMaxOccupants(request.getMaxOccupants());
        }

        Room savedRoom = roomRepository.save(room);
        return mapToRoomResponse(savedRoom);
    }

    @Transactional(readOnly = true)
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
    @Transactional(readOnly = true)
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

        // LÆ°u lĂ½ do từ chối náº¿u có
        if (status == PropertyStatus.REJECTED && rejectionReason != null && !rejectionReason.isBlank()) {
            room.setModerationReason("Admin từ chối: " + rejectionReason);
        }

        roomRepository.save(room);

        // Gá»­i thông báo cho chủ trá»
        try {
            User landlord = room.getProperty().getLandlord();
            String roomLabel = "Phòng \"" + room.getName() + "\" (Khu trá» " + room.getProperty().getName() + ")";
            
            if (status == PropertyStatus.APPROVED) {
                notificationService.createNotification(
                        landlord,
                        "Phòng đã được duyệt âœ…",
                        roomLabel + " đã được Admin duyệt vĂ  hiển thị công khai.",
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
                        "Phòng bị từ chối âŒ",
                        msg,
                        NotificationType.ROOM_REJECTED,
                        room.getId()
                );
            }
        } catch (Exception e) {
            System.err.println("â ï¸ Lỗi gửi notification phòng: " + e.getMessage());
        }
    }
    @Transactional(readOnly = true)
    public List<UserProfileResponse> getTenantsByRoomId(Long roomId) {
        roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + roomId));

        // Lấy danh sách tá»« hợp đồng (Cáº§n inject ContractRepository)
        List<User> tenants = roomRepository.findTenantsByRoomId(roomId);

        // Map sang DTO để tráº£ vá»
        return tenants.stream()
                .map(user -> modelMapper.map(user, UserProfileResponse.class))
                .collect(Collectors.toList());
    }
    /**
     * Cập nhật trạng thái phòng (chỉ dĂ¹ng để ẩn phòng)
     */
    @Transactional
    public RoomResponse updateRoomStatus(Long roomId, RoomStatus newStatus, Long landlordId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + roomId));

        // Kiá»ƒm tra quyá»n
        if (!room.getProperty().getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không có quyá»n thay đổi trạng thái phòng nĂ y.");
        }

        // Kiá»ƒm tra Ä‘iá»u kiá»‡n kinh doanh trước khi ẩn
        if (newStatus == RoomStatus.HIDDEN) {
            if (room.getStatus() == RoomStatus.RENTED) {
                throw new RuntimeException("Không thể ẩn phòng đang cho thuê. Vui lòng kết thúc hợp đồng trước.");
            }
            if (room.getStatus() == RoomStatus.RESERVED) {
                throw new RuntimeException("Không thể ẩn phòng đang giữ chỗ / đã cá»c. Vui lòng hủy giữ chỗ trước.");
            }
        }

        // Cập nhật chỉ trÆ°á»ng status (tránh lỗi Data truncated)
        roomRepository.updateRoomStatus(roomId, newStatus);

        // Lấy lại entity để tráº£ vá» đầy đủ thông tin
        Room updatedRoom = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng sau khi cập nhật"));

        return mapToRoomResponse(updatedRoom);
    }
}
