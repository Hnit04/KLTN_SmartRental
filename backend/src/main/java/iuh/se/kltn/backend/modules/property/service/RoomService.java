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

    /**
     * Láº¥y chi tiáº¿t phĂ²ng theo ID
     */
    @Transactional(readOnly = true)
    public RoomResponse getRoomById(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("KhĂ´ng tĂ¬m tháº¥y phĂ²ng vá»›i ID: " + id));

        return mapToRoomResponse(room);
    }

    /**
     * HĂ m convert Entity -> DTO
     */
    public RoomResponse mapToRoomResponse(Room r) {
        RoomResponse res = modelMapper.map(r, RoomResponse.class);

        // Convert chuá»—i JSON trong DB thĂ nh List Java
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
            // đŸ›¡ï¸ DĂ¹ng query lá»c startDate <= today Ä‘á»ƒ trĂ¡nh láº¥y nháº§m Pre-booking
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
        return String.format("TĂªn/Sá»‘ phĂ²ng: %s\nGiĂ¡ phĂ²ng: %s\nDiá»‡n tĂ­ch: %s\nLoáº¡i phĂ²ng: %s\nTiá»‡n Ă­ch: %s\nMĂ´ táº£/Ná»™i quy: %s",
                request.getName(), request.getPrice(), request.getArea(), request.getType(),
                request.getAmenities(), request.getDefaultTerms());
    }

    @Transactional
    public RoomResponse updateRoom(Long id, RoomRequest request) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("KhĂ´ng tĂ¬m tháº¥y phĂ²ng vá»›i ID: " + id));

        // KIá»‚M DUYá»†T Ná»˜I DUNG - Gá»™p áº£nh thÆ°á»ng + áº£nh 360 Ä‘á»ƒ AI kiá»ƒm duyá»‡t toĂ n bá»™
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

        room.setName(request.getName());
        room.setPrice(request.getPrice());
        room.setArea(request.getArea());
        room.setDescription(request.getDescription());
        room.setApprovalStatus(aiStatus); // Duyá»‡t láº¡i khi sá»­a
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

        // Map maxOccupants náº¿u cĂ³
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

    // === ADMIN Duyá»‡t phĂ²ng ===
    @Transactional(readOnly = true)
    public List<RoomResponse> getPendingRooms() {
        return roomRepository.findByApprovalStatus(PropertyStatus.PENDING).stream()
                .map(this::mapToRoomResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateApprovalStatus(Long roomId, PropertyStatus status, String rejectionReason) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("KhĂ´ng tĂ¬m tháº¥y phĂ²ng vá»›i ID: " + roomId));
        room.setApprovalStatus(status);

        // LÆ°u lĂ½ do tá»« chá»‘i náº¿u cĂ³
        if (status == PropertyStatus.REJECTED && rejectionReason != null && !rejectionReason.isBlank()) {
            room.setModerationReason("Admin tá»« chá»‘i: " + rejectionReason);
        }

        roomRepository.save(room);

        // Gá»­i thĂ´ng bĂ¡o cho chá»§ trá»
        try {
            User landlord = room.getProperty().getLandlord();
            String roomLabel = "PhĂ²ng \"" + room.getName() + "\" (Khu trá» " + room.getProperty().getName() + ")";
            
            if (status == PropertyStatus.APPROVED) {
                notificationService.createNotification(
                        landlord,
                        "PhĂ²ng Ä‘Ă£ Ä‘Æ°á»£c duyá»‡t âœ…",
                        roomLabel + " Ä‘Ă£ Ä‘Æ°á»£c Admin duyá»‡t vĂ  hiá»ƒn thá»‹ cĂ´ng khai.",
                        NotificationType.ROOM_APPROVED,
                        room.getId()
                );
            } else if (status == PropertyStatus.REJECTED) {
                String msg = roomLabel + " Ä‘Ă£ bá»‹ Admin tá»« chá»‘i.";
                if (rejectionReason != null && !rejectionReason.isBlank()) {
                    msg += "\nLĂ½ do: " + rejectionReason;
                }
                notificationService.createNotification(
                        landlord,
                        "PhĂ²ng bá»‹ tá»« chá»‘i âŒ",
                        msg,
                        NotificationType.ROOM_REJECTED,
                        room.getId()
                );
            }
        } catch (Exception e) {
            System.err.println("â ï¸ Lá»—i gá»­i notification phĂ²ng: " + e.getMessage());
        }
    }
    @Transactional(readOnly = true)
    public List<UserProfileResponse> getTenantsByRoomId(Long roomId) {
        roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("KhĂ´ng tĂ¬m tháº¥y phĂ²ng vá»›i ID: " + roomId));

        // Láº¥y danh sĂ¡ch tá»« há»£p Ä‘á»“ng (Cáº§n inject ContractRepository)
        List<User> tenants = roomRepository.findTenantsByRoomId(roomId);

        // Map sang DTO Ä‘á»ƒ tráº£ vá»
        return tenants.stream()
                .map(user -> modelMapper.map(user, UserProfileResponse.class))
                .collect(Collectors.toList());
    }
    /**
     * Cáº­p nháº­t tráº¡ng thĂ¡i phĂ²ng (chá»‰ dĂ¹ng Ä‘á»ƒ áº©n phĂ²ng)
     */
    @Transactional
    public RoomResponse updateRoomStatus(Long roomId, RoomStatus newStatus, Long landlordId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("KhĂ´ng tĂ¬m tháº¥y phĂ²ng vá»›i ID: " + roomId));

        // Kiá»ƒm tra quyá»n
        if (!room.getProperty().getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Báº¡n khĂ´ng cĂ³ quyá»n thay Ä‘á»•i tráº¡ng thĂ¡i phĂ²ng nĂ y.");
        }

        // Kiá»ƒm tra Ä‘iá»u kiá»‡n kinh doanh trÆ°á»›c khi áº©n
        if (newStatus == RoomStatus.HIDDEN) {
            if (room.getStatus() == RoomStatus.RENTED) {
                throw new RuntimeException("KhĂ´ng thá»ƒ áº©n phĂ²ng Ä‘ang cho thuĂª. Vui lĂ²ng káº¿t thĂºc há»£p Ä‘á»“ng trÆ°á»›c.");
            }
            if (room.getStatus() == RoomStatus.RESERVED) {
                throw new RuntimeException("KhĂ´ng thá»ƒ áº©n phĂ²ng Ä‘ang giá»¯ chá»— / Ä‘Ă£ cá»c. Vui lĂ²ng há»§y giá»¯ chá»— trÆ°á»›c.");
            }
        }

        // Cáº­p nháº­t chá»‰ trÆ°á»ng status (trĂ¡nh lá»—i Data truncated)
        roomRepository.updateRoomStatus(roomId, newStatus);

        // Láº¥y láº¡i entity Ä‘á»ƒ tráº£ vá» Ä‘áº§y Ä‘á»§ thĂ´ng tin
        Room updatedRoom = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("KhĂ´ng tĂ¬m tháº¥y phĂ²ng sau khi cáº­p nháº­t"));

        return mapToRoomResponse(updatedRoom);
    }
}
