-- ================================================================
-- PHASE 4: RAG Knowledge Documents
-- ================================================================

CREATE TABLE IF NOT EXISTS knowledge_documents (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(100),
    version VARCHAR(50) NOT NULL DEFAULT 'v1',
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    content_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status ON knowledge_documents(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_updated_at ON knowledge_documents(updated_at);
