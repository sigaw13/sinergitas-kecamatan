ALTER TABLE kecamatan
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'kecamatan';

UPDATE kecamatan SET role = 'superadmin' WHERE username = 'admin';

CREATE TABLE IF NOT EXISTS admin_kecamatan_assignments (
  admin_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
  kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id, kecamatan_id),
  UNIQUE (kecamatan_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_one_evaluator
  ON admin_kecamatan_assignments(kecamatan_id);
