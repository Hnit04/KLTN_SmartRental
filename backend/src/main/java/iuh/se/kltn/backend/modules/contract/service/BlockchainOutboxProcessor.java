package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.entity.BlockchainOutboxEvent;
import iuh.se.kltn.backend.modules.contract.entity.Contract;

import iuh.se.kltn.backend.modules.contract.repository.BlockchainOutboxRepository;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;

/**
 * 🛡️ Blockchain Outbox Processor
 * 
 * Polls outbox_events table every 10 seconds, picks up PENDING events,
 * executes blockchain calls, and updates status.
 * 
 * Uses SELECT FOR UPDATE SKIP LOCKED for exactly-once semantics
 * across multiple application instances.
 */
@Service
public class BlockchainOutboxProcessor {

    private static final Logger log = LoggerFactory.getLogger(BlockchainOutboxProcessor.class);
    private static final int BATCH_SIZE = 20; // 🛡️ Phase 2: Batch limit

    @Autowired
    private BlockchainOutboxRepository outboxRepository;

    @Autowired
    private BlockchainService blockchainService;

    @Autowired
    private ContractRepository contractRepository;

    /**
     * Poll every 10 seconds for pending blockchain events.
     * ShedLock ensures only one instance processes at a time.
     * ✅ FIX: Batch limit + respects nextAttemptAt for exponential backoff.
     */
    @Scheduled(fixedDelay = 10000)
    @Transactional
    public void processOutboxEvents() {
        List<BlockchainOutboxEvent> pendingEvents = outboxRepository.findPendingEventsForProcessing(PageRequest.of(0, BATCH_SIZE));

        for (BlockchainOutboxEvent event : pendingEvents) {
            processEvent(event);
        }
    }

    private void processEvent(BlockchainOutboxEvent event) {
        event.markProcessing();
        outboxRepository.save(event);

        try {
            // 🛡️ Phase 3: Record tx submission timestamp for latency benchmark
            event.setTxSubmittedAt(java.time.LocalDateTime.now());
            
            String result = switch (event.getEventType()) {
                case "DEPLOY_CONTRACT" -> handleDeployContract(event);
                case "END_CONTRACT" -> handleEndContract(event);
                case "PROPOSE_DEDUCTION" -> handleProposeDeduction(event);
                case "CONSENT_END" -> handleConsentEnd(event);
                case "RECORD_BILL" -> handleRecordBill(event);
                default -> throw new RuntimeException("Unknown event type: " + event.getEventType());
            };

            event.markConfirmed(result);
            outboxRepository.save(event);
            
            // 🛡️ Phase 3: Log latency for monitoring
            long latencyMs = java.time.Duration.between(event.getCreatedAt(), java.time.LocalDateTime.now()).toMillis();
            log.info("✅ [Outbox] Event #{} ({}) confirmed in {}ms. Result: {}", event.getId(), event.getEventType(), latencyMs, result);

            // Post-confirmation: update contract state in DB
            postConfirmation(event, result);

        } catch (Exception e) {
            log.error("❌ [Outbox] Event #{} ({}) failed (attempt {}/{}): {}",
                    event.getId(), event.getEventType(), event.getRetryCount() + 1, event.getMaxRetries(), e.getMessage());
            event.markFailed(e.getMessage());
            outboxRepository.save(event);

            if ("DEAD_LETTER".equals(event.getStatus())) {
                log.error("🚨 [Outbox] Event #{} moved to DEAD_LETTER after {} retries. Manual intervention required!",
                        event.getId(), event.getMaxRetries());
            }
        }
    }

    // ======================== HANDLERS ========================

    private String handleDeployContract(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String landlordWallet = (String) p.get("landlordWallet");
        String tenantWallet = (String) p.get("tenantWallet");
        String roomName = (String) p.get("roomName");
        String contractHash = (String) p.get("contractHash");

        BigInteger rentWei = new BigInteger(p.get("rentWei").toString());
        BigInteger depositWei = new BigInteger(p.get("depositWei").toString());
        BigInteger elecWei = new BigInteger(p.get("elecWei").toString());
        BigInteger waterWei = new BigInteger(p.get("waterWei").toString());
        BigInteger internetWei = new BigInteger(p.get("internetWei").toString());
        BigInteger startWei = new BigInteger(p.get("startWei").toString());
        BigInteger endWei = new BigInteger(p.get("endWei").toString());
        BigInteger penaltyWei = new BigInteger(p.get("penaltyWei").toString());

        return blockchainService.deployRentalContract(
                landlordWallet, tenantWallet, roomName, contractHash,
                rentWei, depositWei, elecWei, waterWei, internetWei, startWei, endWei, penaltyWei);
    }

    private String handleEndContract(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String contractAddress = (String) p.get("contractAddress");
        blockchainService.endContractOnChain(contractAddress);
        return "ended";
    }

    private String handleProposeDeduction(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String contractAddress = (String) p.get("contractAddress");
        long deductionAmount = ((Number) p.get("deductionAmount")).longValue();
        boolean earlyTermination = (Boolean) p.get("earlyTermination");
        blockchainService.proposeDeductionOnChain(contractAddress, deductionAmount, earlyTermination);
        return "proposed";
    }

    private String handleConsentEnd(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String contractAddress = (String) p.get("contractAddress");
        blockchainService.consentEndContractOnChain(contractAddress);
        return "consented";
    }

    private String handleRecordBill(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String contractAddress = (String) p.get("contractAddress");
        long billId = ((Number) p.get("billId")).longValue();
        BigInteger amount = new BigInteger(p.get("amount").toString());
        return blockchainService.registerExternalBill(contractAddress, billId, amount);
    }

    // ======================== POST-CONFIRMATION ========================

    /**
     * After blockchain tx is confirmed, update the DB state accordingly.
     * This runs within the same transaction as the outbox status update.
     */
    private void postConfirmation(BlockchainOutboxEvent event, String result) {
        if (event.getContractId() == null) return;

        Contract contract = contractRepository.findById(event.getContractId()).orElse(null);
        if (contract == null) return;

        switch (event.getEventType()) {
            case "DEPLOY_CONTRACT" -> {
                contract.setSmartContractAddress(result);
                contract.setContractHash((String) event.getPayload().get("contractHash"));
                contract.setDeployTxHash("Deployed via Outbox #" + event.getId());
                contractRepository.save(contract);
                log.info("📝 Contract #{} updated with blockchain address: {}", contract.getId(), result);
            }
            case "END_CONTRACT" -> {
                // Settlement already updated DB state before outbox write
                log.info("📝 Contract #{} blockchain settlement confirmed", contract.getId());
            }
        }
    }
}
