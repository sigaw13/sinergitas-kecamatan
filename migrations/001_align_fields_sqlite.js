const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'database', 'sinergitas.db');
const db = new sqlite3.Database(dbPath);

const migrations = {
  aspect_b: {
    ind_26a_status: "TEXT DEFAULT 'tidak'",
    ind_26c_status: "TEXT DEFAULT 'tidak'", ind_26c_jumlah: 'INTEGER DEFAULT 0',
    ind_26d_status: "TEXT DEFAULT 'tidak'", ind_26d_jumlah: 'INTEGER DEFAULT 0',
    ind_26e_status: "TEXT DEFAULT 'tidak'", ind_26e_jumlah: 'INTEGER DEFAULT 0',
    ind_26f_status: "TEXT DEFAULT 'tidak'", ind_26f_jumlah: 'INTEGER DEFAULT 0',
    ind_33e_jumlah: 'INTEGER DEFAULT 0', ind_33f_jumlah: 'INTEGER DEFAULT 0',
    ind_38b_jumlah: 'INTEGER DEFAULT 0',
    ind_43a_status: "TEXT DEFAULT 'tidak'", ind_43b_status: "TEXT DEFAULT 'tidak'",
    ind_43c_status: "TEXT DEFAULT 'tidak'", ind_43d_status: "TEXT DEFAULT 'tidak'",
    ind_43e_status: "TEXT DEFAULT 'tidak'"
  },
  aspect_c: {
    ind_2a_program: 'INTEGER DEFAULT 0', ind_2a_indikator: 'INTEGER DEFAULT 0',
    ind_2b_program: 'INTEGER DEFAULT 0', ind_2b_indikator: 'INTEGER DEFAULT 0'
  }
};

function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}
function run(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, err => err ? reject(err) : resolve()));
}

(async () => {
  try {
    for (const [table, columns] of Object.entries(migrations)) {
      const info = await all(`PRAGMA table_info(${table})`);
      const existing = new Set(info.map(row => row.name));
      for (const [column, definition] of Object.entries(columns)) {
        if (!existing.has(column)) {
          await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
          console.log(`Added ${table}.${column}`);
        }
      }
    }

    await run(`CREATE TABLE IF NOT EXISTS assessment_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kecamatan_id INTEGER NOT NULL,
      instrument TEXT NOT NULL,
      indicator_key TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      mime_type TEXT,
      size_bytes INTEGER DEFAULT 0,
      uploaded_by INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES kecamatan(id)
    )`);
    await run(`CREATE INDEX IF NOT EXISTS idx_assessment_files_owner ON assessment_files(kecamatan_id, instrument, indicator_key)`);
    console.log('SQLite migration completed.');
  } catch (error) {
    console.error('SQLite migration failed:', error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
