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
                // Phase 1 MVP: State Machine events
                case "CONFIRM_LANDLORD_SIG" -> handleConfirmLandlordSig(event);
                case "CONFIRM_TENANT_SIG" -> handleConfirmTenantSig(event);
                case "CANCEL_CONTRACT" -> handleCancelContract(event);
                case "OPEN_DISPUTE" -> handleOpenDispute(event);
                case "RESOLVE_DISPUTE" -> handleResolveDispute(event);
                case "APPLY_PENALTY" -> handleApplyPenalty(event);
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

    // ======================== PHASE 1 MVP HANDLERS ========================

    private String handleConfirmLandlordSig(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String contractAddress = (String) p.get("contractAddress");
        byte[] sigHash = org.web3j.utils.Numeric.hexStringToByteArray((String) p.get("sigHash"));
        blockchainService.confirmLandlordSignatureOnChain(contractAddress, sigHash);
        return "landlord_signed";
    }

    private String handleConfirmTenantSig(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String contractAddress = (String) p.get("contractAddress");
        byte[] sigHash = org.web3j.utils.Numeric.hexStringToByteArray((String) p.get("sigHash"));
        blockchainService.confirmTenantSignatureOnChain(contractAddress, sigHash);
        return "tenant_signed";
    }

    private String handleCancelContract(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String contractAddress = (String) p.get("contractAddress");
        blockchainService.cancelContractOnChain(contractAddress);
        return "cancelled";
    }

    private String handleOpenDispute(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String contractAddress = (String) p.get("contractAddress");
        int violationType = ((Number) p.get("violationType")).intValue();
        byte[] evidenceHash = org.web3j.utils.Numeric.hexStringToByteArray((String) p.get("evidenceHash"));
        blockchainService.openDisputeOnChain(contractAddress, violationType, evidenceHash);
        return "dispute_opened";
    }

    private String handleResolveDispute(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String contractAddress = (String) p.get("contractAddress");
        BigInteger tenantAmount = new BigInteger(p.get("tenantAmount").toString());
        BigInteger landlordAmount = new BigInteger(p.get("landlordAmount").toString());
        byte[] resolutionHash = org.web3j.utils.Numeric.hexStringToByteArray((String) p.get("resolutionHash"));
        boolean terminate = (Boolean) p.get("terminateContract");
        blockchainService.resolveDisputeOnChain(contractAddress, tenantAmount, landlordAmount, resolutionHash, terminate);
        return terminate ? "dispute_resolved_terminated" : "dispute_resolved_active";
    }

    private String handleApplyPenalty(BlockchainOutboxEvent event) throws Exception {
        Map<String, Object> p = event.getPayload();
        String contractAddress = (String) p.get("contractAddress");
        long billId = ((Number) p.get("billId")).longValue();
        BigInteger penaltyAmount = new BigInteger(p.get("penaltyAmount").toString());
        blockchainService.applyLatePaymentPenaltyOnChain(contractAddress, billId, penaltyAmount);
        return "penalty_applied";
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
                contract.setBlockchainState("CREATED");
                contractRepository.save(contract);
                log.info("📝 Contract #{} updated with blockchain address: {}", contract.getId(), result);
            }
            case "CONFIRM_LANDLORD_SIG" -> {
                contract.setBlockchainState("LANDLORD_SIGNED");
                contract.setLandlordSigHash((String) event.getPayload().get("sigHash"));
                contractRepository.save(contract);
                log.info("✍️ Contract #{} landlord signature confirmed on-chain", contract.getId());
            }
            case "CONFIRM_TENANT_SIG" -> {
                contract.setBlockchainState("FULLY_SIGNED");
                contract.setTenantSigHash((String) event.getPayload().get("sigHash"));
                contractRepository.save(contract);
                log.info("✍️ Contract #{} tenant signature confirmed on-chain → FULLY_SIGNED", contract.getId());
            }
            case "CANCEL_CONTRACT" -> {
                contract.setBlockchainState("CANCELLED");
                contractRepository.save(contract);
                log.info("🚫 Contract #{} cancelled on-chain", contract.getId());
            }
            case "OPEN_DISPUTE" -> {
                contract.setBlockchainState("DISPUTE");
                contractRepository.save(contract);
                log.info("⚠️ Contract #{} dispute opened on-chain", contract.getId());
            }
            case "RESOLVE_DISPUTE" -> {
                String newState = result.contains("terminated") ? "TERMINATED" : "ACTIVE";
                contract.setBlockchainState(newState);
                contractRepository.save(contract);
                log.info("✅ Contract #{} dispute resolved on-chain → {}", contract.getId(), newState);
            }
            case "END_CONTRACT" -> {
                contract.setBlockchainState("TERMINATED");
                log.info("📝 Contract #{} blockchain settlement confirmed", contract.getId());
            }
        }
    }
}
