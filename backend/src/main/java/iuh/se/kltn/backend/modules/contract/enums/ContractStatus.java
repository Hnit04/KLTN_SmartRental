package iuh.se.kltn.backend.modules.contract.enums;

public enum ContractStatus {
    PENDING_APPROVAL,
    PENDING_SIGNATURE,
    LANDLORD_SIGNED,
    FULLY_SIGNED,
    AWAITING_DEPOSIT,
    ACTIVE,
    DISPUTE,
    EXPIRED,
    TERMINATED_EARLY,
    CANCELLED
}