package iuh.se.kltn.backend.modules.user.repository;

import iuh.se.kltn.backend.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    Optional<User> findByWalletAddress(String walletAddress);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByWalletAddress(String walletAddress);
    Optional<User> findByEmail(String email);
}