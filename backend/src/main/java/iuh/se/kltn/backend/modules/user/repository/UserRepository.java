package iuh.se.kltn.backend.modules.user.repository;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.user.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    Optional<User> findByWalletAddress(String walletAddress);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByWalletAddress(String walletAddress);
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.role = :role")
    List<User> findAllByRole(@Param("role") Role role);

    @Query("SELECT u FROM User u WHERE u.role = :role ORDER BY u.reputationScore DESC")
    List<User> findTopUsersByRole(@Param("role") Role role, Pageable pageable);

    List<User> findByIsLockedTrueAndLockUntilBefore(LocalDateTime dateTime);

    List<User> findByKycStatus(iuh.se.kltn.backend.modules.user.enums.KYCStatus status);
}