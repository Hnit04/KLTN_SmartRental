-- =====================================================
-- Phase 1 MVP: Blockchain State Machine Migration
-- SmartRental — May 2026
-- =====================================================

-- 1. Add blockchain state machine columns to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS blockchain_state VARCHAR(30);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS landlord_sig_hash VARCHAR(66);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tenant_sig_hash VARCHAR(66);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_nonce BIGINT DEFAULT 0;

-- 2. Contract Signatures (EIP-712)
CREATE TABLE IF NOT EXISTS contract_signatures (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES contracts(id),
    signer_role VARCHAR(20) NOT NULL,
    signer_address VARCHAR(42) NOT NULL,
    signature TEXT NOT NULL,
    sig_hash VARCHAR(66) NOT NULL,
    typed_data_json TEXT,
    nonce BIGINT NOT NULL,
    deadline TIMESTAMP NOT NULL,
    tx_hash VARCHAR(66),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_sig_unique ON contract_signatures(contract_id, signer_role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sig_nonce ON contract_signatures(contract_id, nonce);

-- 3. Contract State History (timeline)
CREATE TABLE IF NOT EXISTS contract_state_history (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES contracts(id),
    from_state VARCHAR(30),
    to_state VARCHAR(30) NOT NULL,
    actor_address VARCHAR(42),
    actor_role VARCHAR(20),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    metadata_json TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_state_history_contract ON contract_state_history(contract_id);

-- 4. Contract Disputes
CREATE TABLE IF NOT EXISTS contract_disputes (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES contracts(id),
    opened_by_id BIGINT NOT NULL REFERENCES users(id),
    violation_type VARCHAR(30) NOT NULL,
    description TEXT,
    evidence_hash VARCHAR(66),
    evidence_urls TEXT,
    status VARCHAR(20) DEFAULT 'OPEN',
    resolution_note TEXT,
    tenant_refund_amount DOUBLE PRECISION,
    landlord_deduction_amount DOUBLE PRECISION,
    resolution_hash VARCHAR(66),
    resolution_tx_hash VARCHAR(66),
    open_tx_hash VARCHAR(66),
    resolved_by_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- 5. Contract Penalties
CREATE TABLE IF NOT EXISTS contract_penalties (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES contracts(id),
    bill_id BIGINT REFERENCES bills(id),
    penalty_type VARCHAR(30) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    amount_wei VARCHAR(78),
    deducted_from_deposit BOOLEAN DEFAULT FALSE,
    tx_hash VARCHAR(66),
    applied_at TIMESTAMP DEFAULT NOW()
);
