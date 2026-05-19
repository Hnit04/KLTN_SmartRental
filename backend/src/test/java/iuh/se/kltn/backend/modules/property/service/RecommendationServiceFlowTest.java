package iuh.se.kltn.backend.modules.property.service;

import iuh.se.kltn.backend.modules.contract.repository.BillRepository;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.interaction.repository.ReviewRepository;
import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.subscription.enums.VipTier;
import iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import iuh.se.kltn.backend.modules.user.service.TenantPreferenceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceFlowTest {

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomService roomService;
    @Mock
    private TenantPreferenceService tenantPreferenceService;
    @Mock
    private ReviewRepository reviewRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private BillRepository billRepository;
    @Mock
    private VipSubscriptionService vipSubscriptionService;

    @InjectMocks
    private RecommendationService recommendationService;

    @Test
    void shouldApplyVipTieBreakerWhenScoresAreNearEqual() {
        when(tenantPreferenceService.getPreference(1L)).thenReturn(null);

        Room goldRoom = buildRoom(101L, 11L, 1L, 3_000_000d, PropertyStatus.APPROVED, PropertyStatus.APPROVED, null, null, LocalDateTime.now().minusDays(2));
        Room freeRoom = buildRoom(102L, 12L, 2L, 3_000_000d, PropertyStatus.APPROVED, PropertyStatus.APPROVED, null, null, LocalDateTime.now().minusDays(1));

        when(roomRepository.findByStatus(RoomStatus.AVAILABLE)).thenReturn(List.of(freeRoom, goldRoom));
        when(reviewRepository.aggregateRatingsByPropertyIds(any())).thenReturn(List.of(
                new Object[]{11L, 4.0, 10L},
                new Object[]{12L, 4.0, 10L}
        ));
        when(reviewRepository.findSystemAverageRating()).thenReturn(4.2);
        when(contractRepository.countByRoom_Property_Landlord_IdAndStatusIn(anyLong(), any())).thenReturn(10L);
        when(billRepository.countOnTimePaidBillsByLandlordId(anyLong())).thenReturn(20L);

        when(vipSubscriptionService.getCurrentTier(1L)).thenReturn(VipTier.GOLD);
        when(vipSubscriptionService.getCurrentTier(2L)).thenReturn(VipTier.FREE);

        when(roomService.mapToRoomResponse(any(Room.class))).thenAnswer(invocation -> {
            Room room = invocation.getArgument(0);
            RoomResponse response = new RoomResponse();
            response.setId(room.getId());
            return response;
        });

        List<RoomResponse> result = recommendationService.getRecommendedRoomsForTenant(1L, null, null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(101L);
        assertThat(result.get(1).getId()).isEqualTo(102L);
    }

    @Test
    void shouldFilterOutRoomsNotApprovedForPublic() {
        when(tenantPreferenceService.getPreference(1L)).thenReturn(null);

        Room eligible = buildRoom(201L, 21L, 21L, 2_800_000d, PropertyStatus.APPROVED, PropertyStatus.APPROVED, null, null, LocalDateTime.now());
        Room roomPendingApproval = buildRoom(202L, 22L, 22L, 2_900_000d, PropertyStatus.APPROVED, PropertyStatus.PENDING, null, null, LocalDateTime.now());
        Room propertyRejected = buildRoom(203L, 23L, 23L, 3_000_000d, PropertyStatus.REJECTED, PropertyStatus.APPROVED, null, null, LocalDateTime.now());

        when(roomRepository.findByStatus(RoomStatus.AVAILABLE)).thenReturn(List.of(eligible, roomPendingApproval, propertyRejected));
        when(reviewRepository.aggregateRatingsByPropertyIds(any())).thenReturn(Collections.singletonList(new Object[]{21L, 4.2, 8L}));
        when(reviewRepository.findSystemAverageRating()).thenReturn(4.2);
        when(contractRepository.countByRoom_Property_Landlord_IdAndStatusIn(anyLong(), any())).thenReturn(8L);
        when(billRepository.countOnTimePaidBillsByLandlordId(anyLong())).thenReturn(10L);
        when(vipSubscriptionService.getCurrentTier(anyLong())).thenReturn(VipTier.FREE);

        when(roomService.mapToRoomResponse(any(Room.class))).thenAnswer(invocation -> {
            Room room = invocation.getArgument(0);
            RoomResponse response = new RoomResponse();
            response.setId(room.getId());
            return response;
        });

        List<RoomResponse> result = recommendationService.getRecommendedRoomsForTenant(1L, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(201L);
    }

    @Test
    void shouldPrioritizeCloserRoomWhenLatLngProvided() {
        when(tenantPreferenceService.getPreference(1L)).thenReturn(null);

        Room nearRoom = buildRoom(301L, 31L, 31L, 3_100_000d, PropertyStatus.APPROVED, PropertyStatus.APPROVED,
                10.762622d, 106.660172d, LocalDateTime.now().minusHours(2));
        Room farRoom = buildRoom(302L, 32L, 32L, 3_100_000d, PropertyStatus.APPROVED, PropertyStatus.APPROVED,
                10.900000d, 106.800000d, LocalDateTime.now().minusHours(1));

        when(roomRepository.findByStatus(RoomStatus.AVAILABLE)).thenReturn(List.of(farRoom, nearRoom));
        when(reviewRepository.aggregateRatingsByPropertyIds(any())).thenReturn(List.of(
                new Object[]{31L, 4.0, 10L},
                new Object[]{32L, 4.0, 10L}
        ));
        when(reviewRepository.findSystemAverageRating()).thenReturn(4.2);
        when(contractRepository.countByRoom_Property_Landlord_IdAndStatusIn(anyLong(), any())).thenReturn(10L);
        when(billRepository.countOnTimePaidBillsByLandlordId(anyLong())).thenReturn(20L);
        when(vipSubscriptionService.getCurrentTier(anyLong())).thenReturn(VipTier.FREE);

        when(roomService.mapToRoomResponse(any(Room.class))).thenAnswer(invocation -> {
            Room room = invocation.getArgument(0);
            RoomResponse response = new RoomResponse();
            response.setId(room.getId());
            return response;
        });

        List<RoomResponse> result = recommendationService.getRecommendedRoomsForTenant(1L, 10.762622d, 106.660172d);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(301L);
        assertThat(result.get(1).getId()).isEqualTo(302L);
    }

    @Test
    void shouldFallbackToDefaultSystemAverageRatingWhenMissing() {
        when(tenantPreferenceService.getPreference(1L)).thenReturn(null);

        Room room = buildRoom(401L, 41L, 41L, 3_000_000d, PropertyStatus.APPROVED, PropertyStatus.APPROVED, null, null, LocalDateTime.now());

        when(roomRepository.findByStatus(RoomStatus.AVAILABLE)).thenReturn(List.of(room));
        when(reviewRepository.aggregateRatingsByPropertyIds(any())).thenReturn(Collections.emptyList());
        when(reviewRepository.findSystemAverageRating()).thenReturn(null);
        when(contractRepository.countByRoom_Property_Landlord_IdAndStatusIn(anyLong(), any())).thenReturn(0L);
        when(billRepository.countOnTimePaidBillsByLandlordId(anyLong())).thenReturn(0L);
        when(vipSubscriptionService.getCurrentTier(anyLong())).thenReturn(VipTier.FREE);

        when(roomService.mapToRoomResponse(any(Room.class))).thenAnswer(invocation -> {
            Room mappedRoom = invocation.getArgument(0);
            RoomResponse response = new RoomResponse();
            response.setId(mappedRoom.getId());
            return response;
        });

        List<RoomResponse> result = recommendationService.getRecommendedRoomsForTenant(1L, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(401L);
        assertThat(result.get(0).getMatchScore()).isBetween(71.0, 71.5);
    }

    private Room buildRoom(
            Long roomId,
            Long propertyId,
            Long landlordId,
            Double price,
            PropertyStatus propertyStatus,
            PropertyStatus roomApprovalStatus,
            Double lat,
            Double lng,
            LocalDateTime propertyCreatedAt
    ) {
        Landlord landlord = new Landlord();
        landlord.setId(landlordId);
        landlord.setReputationScore(80);
        landlord.setKycStatus(KYCStatus.VERIFIED);
        landlord.setCreatedAt(LocalDateTime.now().minusMonths(12));

        Property property = new Property();
        property.setId(propertyId);
        property.setStatus(propertyStatus);
        property.setLandlord(landlord);
        property.setLatitude(lat);
        property.setLongitude(lng);
        property.setCreatedAt(propertyCreatedAt);
        property.setAddress("12 Nguyen Van Bao");
        property.setDistrict("Go Vap");
        property.setCity("Ho Chi Minh");

        Room room = new Room();
        room.setId(roomId);
        room.setPrice(price);
        room.setStatus(RoomStatus.AVAILABLE);
        room.setApprovalStatus(roomApprovalStatus);
        room.setProperty(property);
        room.setAmenities("[\"May lanh\",\"Wifi\"]");
        return room;
    }
}
