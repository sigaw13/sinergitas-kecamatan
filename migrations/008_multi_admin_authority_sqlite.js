'use strict';

const db = require('../database/database');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, error => (error ? reject(error) : resolve()));
  });
}

async function migrate() {
  if (db.ready) await db.ready;
  try {
    await run("ALTER TABLE kecamatan ADD COLUMN role TEXT NOT NULL DEFAULT 'kecamatan'");
  } catch (error) {
    if (!String(error.message).toLowerCase().includes('duplicate column')) throw error;
  }
  await run("UPDATE kecamatan SET role = 'superadmin' WHERE username = 'admin'");
  await run(`CREATE TABLE IF NOT EXISTS admin_kecamatan_assignments (
    admin_id INTEGER NOT NULL,
    kecamatan_id INTEGER NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_id, kecamatan_id),
    FOREIGN KEY (admin_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE
  )`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_one_evaluator
    ON admin_kecamatan_assignments(kecamatan_id)`);
  console.log('✅ Migrasi multiadmin dan wilayah kerja selesai.');
}

migrate().catch(error => {
  console.error('❌ Migrasi multiadmin gagal:', error);
  process.exitCode = 1;
});
