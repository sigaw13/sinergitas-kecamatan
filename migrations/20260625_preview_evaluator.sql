-- SI ESELON - Preview Evaluator + Audit Log + Railway Safe Storage
-- Jalankan di PostgreSQL Railway: psql $DATABASE_URL -f migrations/20260625_preview_evaluator.sql

BEGIN;

-- Tambahan kolom yang aman: tidak mengubah rumus / nilai / verifikasi existing.
ALTER TABLE assessment_files
  ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(30) DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120),
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS preview_only BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS uploaded_by INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Audit trail preview file bukti.
CREATE TABLE IF NOT EXISTS assessment_file_access_logs (
  id BIGSERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL,
  user_id INTEGER,
  user_role VARCHAR(50),
  kecamatan_id INTEGER,
  action VARCHAR(40) NOT NULL DEFAULT 'VIEW',
  ip_address VARCHAR(80),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_file_access_logs_file_id
  ON assessment_file_access_logs(file_id);

CREATE INDEX IF NOT EXISTS idx_assessment_file_access_logs_user_id
  ON assessment_file_access_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_assessment_file_access_logs_created_at
  ON assessment_file_access_logs(created_at DESC);

-- Untuk file lama: biarkan local. Kalau kolom path/nama lama berbeda, sesuaikan sekali saja.
-- Contoh opsional:
-- UPDATE assessment_files SET file_path = path WHERE file_path IS NULL AND path IS NOT NULL;
-- UPDATE assessment_files SET original_filename = filename WHERE original_filename IS NULL AND filename IS NOT NULL;

COMMIT;
