package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.BlockchainNonce;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BlockchainNonceRepository extends JpaRepository<BlockchainNonce, String> {

    /**
     * 🛡️ Atomic nonce reservation: SELECT FOR UPDATE prevents concurrent
     * instances from getting the same nonce.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT n FROM BlockchainNonce n WHERE n.walletAddress = :walletAddress")
    Optional<BlockchainNonce> findByWalletAddressForUpdate(String walletAddress);
}
