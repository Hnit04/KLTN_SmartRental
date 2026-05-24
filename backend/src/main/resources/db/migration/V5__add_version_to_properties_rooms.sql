-- Add version column for optimistic locking to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Add version column for optimistic locking to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Update existing records to have version 0 (if any were null)
UPDATE properties SET version = 0 WHERE version IS NULL;
UPDATE rooms SET version = 0 WHERE version IS NULL;
