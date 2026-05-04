package iuh.se.kltn.backend.modules.property.repository;


import iuh.se.kltn.backend.modules.property.dto.response.PropertyLandlordInfo;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id = :roomId")
    Optional<Room> findByIdForUpdate(@Param("roomId") Long roomId);

    List<Room> findByPropertyId(Long propertyId);
    
    List<Room> findByPropertyIdAndApprovalStatus(Long propertyId, iuh.se.kltn.backend.modules.property.enums.PropertyStatus approvalStatus);

    List<Room> findByStatus(RoomStatus status);
    
    List<Room> findByApprovalStatus(iuh.se.kltn.backend.modules.property.enums.PropertyStatus approvalStatus);


    @Query("""
    SELECT new iuh.se.kltn.backend.modules.property.dto.response.PropertyLandlordInfo(
        u.fullName,
        u.avatarUrl,
        u.kycStatus,
        p.id
    )
    FROM Room r
    JOIN r.property p
    JOIN p.landlord u
    WHERE r.id = :roomId
""")
    PropertyLandlordInfo findLandlordInfoByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT COUNT(r) FROM Room r WHERE r.property.landlord.id = :landlordId")
    Long countTotalRoomsByLandlord(@Param("landlordId") Long landlordId);

    @Query("""
    SELECT COUNT(r)
    FROM Room r
    JOIN r.property p
    LEFT JOIN Contract c ON c.room = r AND c.status = 'ACTIVE'
    WHERE p.landlord.id = :landlordId
      AND c.id IS NOT NULL
""")
    Long countRentedRoomsByLandlord(@Param("landlordId") Long landlordId);
    @Modifying
    @Query("UPDATE Room r SET r.status = :status WHERE r.id = :roomId")
    void updateRoomStatus(@Param("roomId") Long roomId, @Param("status") RoomStatus status);
    @Query("""
    SELECT COALESCE(SUM(r.currentOccupants), 0)
    FROM Room r
    WHERE r.property.landlord.id = :landlordId
""")
    Long sumCurrentOccupantsByLandlord(@Param("landlordId") Long landlordId);

    @Query("""
    SELECT c.tenant 
    FROM Contract c 
    WHERE c.room.id = :roomId 
      AND c.status = 'ACTIVE'
""")
    List<User> findTenantsByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT r FROM Room r WHERE r.property.landlord.id = :landlordId")
    List<Room> findAllByProperty_Landlord_Id(@Param("landlordId") Long landlordId);
}