-- ================================================================
-- PHASE 3: Production Hardening — Database Migration
-- Run this on Supabase SQL Editor BEFORE deploying new code
-- ================================================================

-- 1. OUTBOX PATTERN: Blockchain event queue
CREATE TABLE IF NOT EXISTS blockchain_outbox_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,          -- DEPLOY_CONTRACT, END_CONTRACT, PROPOSE_DEDUCTION, CONSENT_END, RECORD_BILL
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, CONFIRMED, FAILED, DEAD_LETTER
    contract_id BIGINT,
    payload JSONB NOT NULL,                   -- Full parameters for blockchain call
    tx_hash VARCHAR(100),                     -- Populated after successful submission
    result TEXT,                              -- Success result (contract address, etc)
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    correlation_id VARCHAR(100),              -- For traceability
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    confirmed_at TIMESTAMP
);

CREATE INDEX idx_outbox_status ON blockchain_outbox_events(status);
CREATE INDEX idx_outbox_contract ON blockchain_outbox_events(contract_id);
CREATE INDEX idx_outbox_created ON blockchain_outbox_events(created_at);

-- 2. SHEDLOCK: Distributed lock for @Scheduled jobs
CREATE TABLE IF NOT EXISTS shedlock (
    name VARCHAR(64) NOT NULL PRIMARY KEY,
    lock_until TIMESTAMP NOT NULL,
    locked_at TIMESTAMP NOT NULL,
    locked_by VARCHAR(255) NOT NULL
);

-- 3. PGVECTOR: AI Embedding Store (persistent)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    embedding vector(384),                    -- AllMiniLmL6V2 outputs 384 dimensions
    text_content TEXT NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- IVFFlat index for fast ANN search (requires data to exist first, so create after initial load)
-- CREATE INDEX idx_embeddings_vector ON ai_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. BLOCKCHAIN NONCE: Distributed nonce management
CREATE TABLE IF NOT EXISTS blockchain_nonces (
    wallet_address VARCHAR(42) PRIMARY KEY,
    current_nonce BIGINT NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMP DEFAULT NOW()
);
