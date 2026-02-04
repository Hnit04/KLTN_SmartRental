package iuh.se.kltn.backend.modules.property.repository;


import iuh.se.kltn.backend.modules.property.dto.response.PropertyLandlordInfo;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByPropertyId(Long propertyId);

    List<Room> findByStatus(RoomStatus status);


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



}