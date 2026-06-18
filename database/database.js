const path = require('path');
const bcrypt = require('bcryptjs');

let db;

// Fungsi untuk cek apakah DATABASE_URL valid (bukan placeholder)
function isValidDatabaseUrl(url) {
  if (!url) return false;
  if (url.includes('user:pass@host')) return false;
  if (url.includes('placeholder')) return false;
  if (url === 'postgresql://user:pass@host:5432/dbname') return false;
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

// Gunakan PostgreSQL jika DATABASE_URL valid, TIDAK PEDULI NODE_ENV
const usePostgres = isValidDatabaseUrl(process.env.DATABASE_URL);

console.log('🔍 Database mode:', usePostgres ? 'PostgreSQL' : 'SQLite');
console.log('🔍 DATABASE_URL exists:', !!process.env.DATABASE_URL);

if (usePostgres) {
  // PostgreSQL untuk Production (Railway)
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  db = {
    dialect: 'postgres',
    get: (sql, params, callback) => {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }
  if (typeof callback !== 'function') {
    callback = () => {};
  }
  
  let index = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++index}`);
  pool.query(pgSql, params || [], (err, result) => {
    if (err) {
      console.error('❌ Database get error:', err.message);
      return callback(err);
    }
    callback(null, result.rows[0] || null);
  });
},
    all: (sql, params, callback) => {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }
  if (typeof callback !== 'function') {
    callback = () => {};
  }
  
  let index = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++index}`);
  pool.query(pgSql, params || [], (err, result) => {
    if (err) {
      console.error('❌ Database all error:', err.message);
      return callback(err);
    }
    callback(null, result.rows || []);
  });
},
    run: (sql, params, callback) => {
  // Handle jika params adalah callback (untuk kompatibilitas SQLite)
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }
  
  // Pastikan callback adalah function
  if (typeof callback !== 'function') {
    callback = () => {};
  }
  
  let index = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++index}`);
  
  pool.query(pgSql, params || [], (err, result) => {
    if (err) {
      console.error('❌ Database run error:', err.message);
      return callback(err);
    }
    callback(null, { 
      lastID: result.rows && result.rows[0] ? result.rows[0].id : null, 
      changes: result.rowCount || 0 
    });
  });
},
    query: (text, params) => pool.query(text, params),
    pool: pool
  };

  async function initializePostgres() {
    const client = await pool.connect();
    try {
      console.log('🔧 Creating PostgreSQL tables...');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS kecamatan (
          id SERIAL PRIMARY KEY,
          nama TEXT UNIQUE,
          username TEXT UNIQUE,
          password TEXT,
          role TEXT NOT NULL DEFAULT 'kecamatan',
          nama_pengelola TEXT,
          email TEXT,
          no_hp TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`ALTER TABLE kecamatan ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'kecamatan'`);
      await client.query(`UPDATE kecamatan SET role = 'superadmin' WHERE username = 'admin'`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_kecamatan_assignments (
          admin_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
          kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (admin_id, kecamatan_id),
          UNIQUE (kecamatan_id)
        )
      `);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_one_evaluator
        ON admin_kecamatan_assignments(kecamatan_id)`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS aspect_a (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER REFERENCES kecamatan(id),
          ind_1_status TEXT DEFAULT 'tidak', ind_1_file TEXT,
          ind_2a_status TEXT DEFAULT 'tidak', ind_2b_status TEXT DEFAULT 'tidak', ind_2c_status TEXT DEFAULT 'tidak',
          ind_2a_file TEXT, ind_2b_file TEXT, ind_2c_file TEXT,
          ind_3_status TEXT DEFAULT 'tidak', ind_3_file TEXT,
          ind_4_jumlah INTEGER DEFAULT 0, ind_4_file TEXT,
          ind_5a_jumlah INTEGER DEFAULT 0, ind_5b_jumlah INTEGER DEFAULT 0, ind_5a_file TEXT, ind_5b_file TEXT,
          ind_6_status TEXT DEFAULT 'tidak', ind_6_file TEXT,
          ind_7_jumlah INTEGER DEFAULT 0, ind_7_file TEXT,
          ind_8_status TEXT DEFAULT 'tidak', ind_8_file TEXT,
          ind_9a_status TEXT DEFAULT 'tidak', ind_9b_status TEXT DEFAULT 'tidak',
          ind_9c_status TEXT DEFAULT 'tidak', ind_9d_status TEXT DEFAULT 'tidak', ind_9e_status TEXT DEFAULT 'tidak',
          ind_9_file TEXT,
          ind_10a_status TEXT DEFAULT 'tidak', ind_10b_status TEXT DEFAULT 'tidak',
          ind_10c_status TEXT DEFAULT 'tidak', ind_10d_status TEXT DEFAULT 'tidak',
          ind_10e_status TEXT DEFAULT 'tidak', ind_10f_status TEXT DEFAULT 'tidak', ind_10g_status TEXT DEFAULT 'tidak',
          ind_10_file TEXT,
          ind_11_status TEXT DEFAULT 'Tidak Ada Data', ind_11_file TEXT,
          ind_12a_jumlah INTEGER DEFAULT 0, ind_12b_jumlah INTEGER DEFAULT 0, ind_12_file TEXT,
          ind_13_status TEXT DEFAULT 'tidak', ind_13_file TEXT,
          ind_14a_status TEXT DEFAULT 'tidak', ind_14b_status TEXT DEFAULT 'tidak', ind_14c_status TEXT DEFAULT 'tidak',
          ind_14_file TEXT,
          ind_15_persen REAL DEFAULT 0, ind_15_file TEXT,
          ind_16_persen REAL DEFAULT 0, ind_16_file TEXT,
          upload_status TEXT DEFAULT 'Belum',
          total_score REAL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS aspect_b (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER REFERENCES kecamatan(id),
          ind_1_jumlah INTEGER DEFAULT 0, ind_2_jumlah INTEGER DEFAULT 0, ind_3_jumlah INTEGER DEFAULT 0, ind_3_pilihan TEXT, ind_3_komentar TEXT,
          ind_4a_jumlah INTEGER DEFAULT 0, ind_4b_jumlah INTEGER DEFAULT 0,
          ind_5_persen REAL DEFAULT 0, ind_5_jumlah INTEGER DEFAULT 0, ind_6_jumlah INTEGER DEFAULT 0,
          ind_7a_jumlah INTEGER DEFAULT 0, ind_7b_jumlah INTEGER DEFAULT 0,
          ind_8a_jumlah INTEGER DEFAULT 0, ind_8b_jumlah INTEGER DEFAULT 0,
          ind_9a_jumlah INTEGER DEFAULT 0, ind_9b_jumlah INTEGER DEFAULT 0,
          ind_10a_status TEXT DEFAULT 'belum', ind_10b_status TEXT DEFAULT 'tidak', ind_10c_status TEXT DEFAULT 'tidak',
          ind_11a_jumlah INTEGER DEFAULT 0, ind_11b_jumlah INTEGER DEFAULT 0,
          ind_12a_jumlah INTEGER DEFAULT 0, ind_12b_jumlah INTEGER DEFAULT 0,
          ind_13a_jumlah INTEGER DEFAULT 0, ind_13b_jumlah INTEGER DEFAULT 0,
          ind_14a_jumlah INTEGER DEFAULT 0, ind_14b_jumlah INTEGER DEFAULT 0, ind_14c_jumlah INTEGER DEFAULT 0,
          ind_15a_jumlah INTEGER DEFAULT 0, ind_15b_jumlah INTEGER DEFAULT 0,
          ind_15c_jumlah INTEGER DEFAULT 0, ind_15d_jumlah INTEGER DEFAULT 0,
          ind_16a1_jumlah INTEGER DEFAULT 0, ind_16a2_jumlah INTEGER DEFAULT 0, ind_16a3_jumlah INTEGER DEFAULT 0,
          ind_16b1_jumlah INTEGER DEFAULT 0, ind_16b2_jumlah INTEGER DEFAULT 0, ind_16b3_jumlah INTEGER DEFAULT 0,
          ind_17_jumlah INTEGER DEFAULT 0,
          ind_18a_jumlah INTEGER DEFAULT 0, ind_18b_jumlah INTEGER DEFAULT 0,
          ind_19a_jumlah INTEGER DEFAULT 0, ind_19b_jumlah INTEGER DEFAULT 0,
          ind_20a_jumlah INTEGER DEFAULT 0, ind_20b_jumlah INTEGER DEFAULT 0,
          ind_20c_jumlah INTEGER DEFAULT 0, ind_20d_jumlah INTEGER DEFAULT 0, ind_20e_jumlah INTEGER DEFAULT 0,
          ind_21_jumlah INTEGER DEFAULT 0, ind_22_jumlah INTEGER DEFAULT 0,
          ind_23a_jumlah INTEGER DEFAULT 0, ind_23b_jumlah INTEGER DEFAULT 0,
          ind_24a_jumlah INTEGER DEFAULT 0, ind_24b_jumlah INTEGER DEFAULT 0,
          ind_25a_jumlah INTEGER DEFAULT 0, ind_25b_jumlah INTEGER DEFAULT 0,
          ind_26a_jumlah INTEGER DEFAULT 0, ind_26b_jumlah INTEGER DEFAULT 0,
          ind_27_jumlah INTEGER DEFAULT 0, ind_27_pilihan TEXT,
          ind_28_persen REAL DEFAULT 0, ind_29_persen REAL DEFAULT 0,
          ind_30_persen REAL DEFAULT 0, ind_31_persen REAL DEFAULT 0, ind_32_persen REAL DEFAULT 0,
          ind_33a_jumlah INTEGER DEFAULT 0, ind_33b_jumlah INTEGER DEFAULT 0,
          ind_33c_jumlah INTEGER DEFAULT 0, ind_33d_jumlah INTEGER DEFAULT 0,
          ind_34_persen REAL DEFAULT 0, ind_35_persen REAL DEFAULT 0,
          ind_36_persen REAL DEFAULT 0, ind_37_persen REAL DEFAULT 0,
          ind_38a_jumlah INTEGER DEFAULT 0,
          ind_39_persen REAL DEFAULT 0, ind_40_persen REAL DEFAULT 0,
          ind_41_nilai TEXT DEFAULT 'D', ind_41_pilihan TEXT,
          ind_42_status TEXT DEFAULT 'tidak', ind_43_status TEXT DEFAULT 'tidak',
          ind_43a_jumlah INTEGER DEFAULT 0, ind_43b_jumlah INTEGER DEFAULT 0,
          ind_43c_komentar TEXT, ind_43d_jumlah INTEGER DEFAULT 0,
          upload_status TEXT DEFAULT 'Belum',
          total_score REAL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS aspect_c (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER REFERENCES kecamatan(id),
          ind_1a TEXT, ind_1b TEXT, ind_1c TEXT, ind_1d TEXT,
          ind_2a TEXT, ind_2b TEXT,
          ind_3a TEXT, ind_3b TEXT, ind_3c TEXT, ind_3d TEXT, ind_3e TEXT, ind_3f TEXT,
          ind_4 TEXT,
          ind_5a TEXT, ind_5b TEXT, ind_5c TEXT, ind_5d TEXT, ind_5e TEXT, ind_5f TEXT, ind_5g TEXT,
          ind_6a TEXT, ind_6b TEXT,
          upload_status TEXT DEFAULT 'Belum',
          total_score REAL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS aspect_d (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER REFERENCES kecamatan(id),
          ind_1a_nama TEXT, ind_1b_nama TEXT,
          ind_2a_jumlah INTEGER DEFAULT 0, ind_2b_jumlah INTEGER DEFAULT 0, ind_2_jumlah INTEGER DEFAULT 0,
          ind_3_jumlah INTEGER DEFAULT 0, ind_3_pilihan TEXT,
          ind_4a_nasional INTEGER DEFAULT 0, ind_4a_provinsi INTEGER DEFAULT 0, ind_4a_kabupaten INTEGER DEFAULT 0,
          ind_4b_nasional INTEGER DEFAULT 0, ind_4b_provinsi INTEGER DEFAULT 0, ind_4_detail TEXT,
          upload_status TEXT DEFAULT 'Belum',
          total_score REAL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS aspect_e (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER REFERENCES kecamatan(id),
          ind_1a_sd INTEGER DEFAULT 0, ind_1b_smp INTEGER DEFAULT 0, ind_1c_sma INTEGER DEFAULT 0,
          ind_1d_d3 INTEGER DEFAULT 0, ind_1e_s1 INTEGER DEFAULT 0, ind_1f_s2 INTEGER DEFAULT 0, ind_1g_s3 INTEGER DEFAULT 0,
          ind_1_persen_tertinggi TEXT DEFAULT 'c',
          ind_2_jumlah INTEGER DEFAULT 0, ind_3_jumlah INTEGER DEFAULT 0, ind_4_jumlah INTEGER DEFAULT 0,
          ind_5_status TEXT DEFAULT 'tidak',
          upload_status TEXT DEFAULT 'Belum',
          total_score REAL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS aspect_f (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER REFERENCES kecamatan(id),
          ind_1_status TEXT DEFAULT 'tidak', ind_2_status TEXT DEFAULT 'tidak',
          ind_3_status TEXT DEFAULT 'tidak', ind_4_status TEXT DEFAULT 'tidak',
          ind_5_status TEXT DEFAULT 'tidak', ind_6_status TEXT DEFAULT 'tidak',
          ind_7_status TEXT DEFAULT 'tidak', ind_8_status TEXT DEFAULT 'tidak',
          ind_9_status TEXT DEFAULT 'tidak', ind_10_status TEXT DEFAULT 'tidak',
          ind_11_status TEXT DEFAULT 'tidak', ind_12_status TEXT DEFAULT 'tidak',
          ind_13_status TEXT DEFAULT 'tidak', ind_14_status TEXT DEFAULT 'tidak',
          ind_15_status TEXT DEFAULT 'tidak', ind_16_status TEXT DEFAULT 'tidak',
          ind_17_status TEXT DEFAULT 'tidak', ind_18_status TEXT DEFAULT 'tidak',
          ind_19_status TEXT DEFAULT 'tidak', ind_20_status TEXT DEFAULT 'tidak',
          ind_21_status TEXT DEFAULT 'tidak', ind_22_status TEXT DEFAULT 'tidak',
          ind_23_status TEXT DEFAULT 'tidak', ind_24_status TEXT DEFAULT 'tidak',
          ind_25_status TEXT DEFAULT 'tidak', ind_26_status TEXT DEFAULT 'tidak',
          ind_27_status TEXT DEFAULT 'tidak', ind_28_status TEXT DEFAULT 'tidak',
          ind_29_status TEXT DEFAULT 'tidak', ind_30_status TEXT DEFAULT 'tidak',
          ind_31_status TEXT DEFAULT 'tidak', ind_32_status TEXT DEFAULT 'tidak',
          ind_33_status TEXT DEFAULT 'tidak', ind_34_status TEXT DEFAULT 'tidak',
          ind_35_status TEXT DEFAULT 'tidak', ind_36_status TEXT DEFAULT 'tidak',
          ind_37_status TEXT DEFAULT 'tidak', ind_38_status TEXT DEFAULT 'tidak',
          ind_39_status TEXT DEFAULT 'tidak', ind_40_status TEXT DEFAULT 'tidak',
          upload_status TEXT DEFAULT 'Belum',
          total_score REAL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabel config untuk menyimpan pengaturan aplikasi, termasuk deadline pengisian.
      await client.query(`
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Default deadline hanya dibuat jika belum ada agar perubahan admin tidak tertimpa.
      await client.query(
        `INSERT INTO config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        ['deadline', process.env.DEFAULT_DEADLINE || '2026-12-31']
      );

      // Migrasi idempotent: menyelaraskan field Excel, form, database, dan scoring.
      const postgresColumnMigrations = {
        aspect_b: {
          ind_3_pilihan: 'TEXT', ind_27_pilihan: 'TEXT', ind_41_pilihan: 'TEXT', ind_3_komentar: 'TEXT', ind_5_jumlah: 'INTEGER DEFAULT 0',
          ind_43a_jumlah: 'INTEGER DEFAULT 0', ind_43b_jumlah: 'INTEGER DEFAULT 0',
          ind_43c_komentar: 'TEXT', ind_43d_jumlah: 'INTEGER DEFAULT 0',
          ind_26a_status: "TEXT DEFAULT 'tidak'",
          ind_26c_status: "TEXT DEFAULT 'tidak'", ind_26c_jumlah: 'INTEGER DEFAULT 0',
          ind_26d_status: "TEXT DEFAULT 'tidak'", ind_26d_jumlah: 'INTEGER DEFAULT 0',
          ind_26e_status: "TEXT DEFAULT 'tidak'", ind_26e_jumlah: 'INTEGER DEFAULT 0',
          ind_26f_status: "TEXT DEFAULT 'tidak'", ind_26f_jumlah: 'INTEGER DEFAULT 0',
          ind_28a_jumlah: 'INTEGER DEFAULT 0', ind_28b_jumlah: 'INTEGER DEFAULT 0',
          ind_29a_jumlah: 'INTEGER DEFAULT 0', ind_29b_jumlah: 'INTEGER DEFAULT 0',
          ind_30a_jumlah: 'INTEGER DEFAULT 0', ind_30b_jumlah: 'INTEGER DEFAULT 0',
          ind_30_klasifikasi: 'TEXT',
          ind_31a_jumlah: 'INTEGER DEFAULT 0', ind_31b_jumlah: 'INTEGER DEFAULT 0',
          ind_32a_jumlah: 'INTEGER DEFAULT 0', ind_32b_jumlah: 'INTEGER DEFAULT 0',
          ind_33e_jumlah: 'INTEGER DEFAULT 0', ind_33f_jumlah: 'INTEGER DEFAULT 0',
          ind_34a_jumlah: 'INTEGER DEFAULT 0', ind_34b_jumlah: 'INTEGER DEFAULT 0',
          ind_35a_jumlah: 'INTEGER DEFAULT 0', ind_35b_jumlah: 'INTEGER DEFAULT 0',
          ind_36a_jumlah: 'INTEGER DEFAULT 0', ind_36b_jumlah: 'INTEGER DEFAULT 0',
          ind_37a_jumlah: 'INTEGER DEFAULT 0', ind_37b_jumlah: 'INTEGER DEFAULT 0',
          ind_38_persen: 'REAL DEFAULT 0', ind_38b_jumlah: 'INTEGER DEFAULT 0',
          ind_39a_jumlah: 'INTEGER DEFAULT 0', ind_39b_jumlah: 'INTEGER DEFAULT 0',
          ind_40a_jumlah: 'INTEGER DEFAULT 0', ind_40b_jumlah: 'INTEGER DEFAULT 0',
          ind_43a_status: "TEXT DEFAULT 'tidak'", ind_43b_status: "TEXT DEFAULT 'tidak'",
          ind_43c_status: "TEXT DEFAULT 'tidak'", ind_43d_status: "TEXT DEFAULT 'tidak'",
          ind_43e_status: "TEXT DEFAULT 'tidak'"
        },
        aspect_c: {
          ind_2a_program: 'INTEGER DEFAULT 0', ind_2a_indikator: 'INTEGER DEFAULT 0',
          ind_2b_program: 'INTEGER DEFAULT 0', ind_2b_indikator: 'INTEGER DEFAULT 0'
        },
        aspect_d: {
          ind_3_pilihan: 'TEXT', ind_2_detail: 'TEXT', ind_2_jumlah: 'INTEGER DEFAULT 0', ind_4_detail: 'TEXT'
        }
      };

      for (const [tableName, columns] of Object.entries(postgresColumnMigrations)) {
        for (const [columnName, definition] of Object.entries(columns)) {
          await client.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${definition}`);
        }
      }

      // Tabel bukti terpisah mendukung banyak file per indikator tanpa menambah ratusan kolom *_file.
      await client.query(`
        CREATE TABLE IF NOT EXISTS assessment_files (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
          instrument TEXT NOT NULL,
          indicator_key TEXT NOT NULL,
          original_name TEXT NOT NULL,
          stored_name TEXT NOT NULL UNIQUE,
          relative_path TEXT,
          mime_type TEXT,
          size_bytes INTEGER DEFAULT 0,
          uploaded_by INTEGER REFERENCES kecamatan(id),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_assessment_files_owner ON assessment_files(kecamatan_id, instrument, indicator_key)`);
      await client.query(`ALTER TABLE assessment_files ADD COLUMN IF NOT EXISTS relative_path TEXT`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS assessment_progress (
          kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
          instrument TEXT NOT NULL,
          filled_fields TEXT NOT NULL DEFAULT '[]',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (kecamatan_id, instrument)
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS evaluation_reviews (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
          instrument TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Belum Dinilai',
          notes TEXT,
          reviewed_by INTEGER REFERENCES kecamatan(id),
          reviewed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (kecamatan_id, instrument)
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_evaluation_reviews_kecamatan ON evaluation_reviews(kecamatan_id, instrument)`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS evaluation_item_scores (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
          instrument TEXT NOT NULL,
          indicator_key TEXT NOT NULL,
          standard_score REAL NOT NULL DEFAULT 0,
          awarded_score REAL NOT NULL DEFAULT 0,
          notes TEXT,
          reviewed_by INTEGER REFERENCES kecamatan(id),
          reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (kecamatan_id, instrument, indicator_key)
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_evaluation_item_scores_owner ON evaluation_item_scores(kecamatan_id, instrument)`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS evaluation_results (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER NOT NULL UNIQUE REFERENCES kecamatan(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'Belum Final',
          score_a REAL DEFAULT 0,
          score_b REAL DEFAULT 0,
          score_c REAL DEFAULT 0,
          score_d REAL DEFAULT 0,
          score_e REAL DEFAULT 0,
          score_f REAL DEFAULT 0,
          total_score REAL DEFAULT 0,
          max_score REAL DEFAULT 100,
          percentage REAL DEFAULT 0,
          category TEXT,
          score_snapshot TEXT,
          finalized_by INTEGER REFERENCES kecamatan(id),
          finalized_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_evaluation_results_status ON evaluation_results(status, total_score DESC)`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS workbook_baselines (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER NOT NULL UNIQUE REFERENCES kecamatan(id) ON DELETE CASCADE,
          score_a REAL DEFAULT 0,
          score_b REAL DEFAULT 0,
          score_c REAL DEFAULT 0,
          score_d REAL DEFAULT 0,
          score_e REAL DEFAULT 0,
          score_f REAL DEFAULT 0,
          total_score REAL DEFAULT 0,
          source_file TEXT,
          imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS evaluation_history (
          id SERIAL PRIMARY KEY,
          kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
          instrument TEXT,
          action TEXT NOT NULL,
          previous_status TEXT,
          new_status TEXT,
          notes TEXT,
          actor_id INTEGER REFERENCES kecamatan(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_evaluation_history_kecamatan ON evaluation_history(kecamatan_id, created_at DESC)`);

      console.log('✅ PostgreSQL tables and migrations applied successfully');

      // Insert default data
      const result = await client.query('SELECT COUNT(*) as count FROM kecamatan');
      if (parseInt(result.rows[0].count) === 0) {
        console.log('📝 Inserting default data...');
        
        const adminPassword = bcrypt.hashSync(process.env.INITIAL_ADMIN_PASSWORD || 'admin123', 10);
        await client.query(
          `INSERT INTO kecamatan (nama, username, password, nama_pengelola, email) 
           VALUES ($1, $2, $3, $4, $5)`,
          ['Admin Pusat', 'admin', adminPassword, 'Administrator', 'admin@sumedangkab.go.id']
        );

        const kecamatans = [
          'Wado','Jatinunggal','Darmaraja','Cibugel','Cisitu','Situraja',
          'Conggeang','Paseh','Surian','Buahdua','Tanjungsari','Sukasari',
          'Pamulihan','Cimanggung','Jatinangor','Rancakalong','Sumedang Selatan',
          'Sumedang Utara','Ganeas','Tanjungkerta','Tanjungmedar','Cimalaka',
          'Cisarua','Tomo','Ujung Jaya','Jatigede'
        ];

        for (const nama of kecamatans) {
          const username = nama.toLowerCase().replace(/\s+/g, '');
          const password = bcrypt.hashSync(username + (process.env.INITIAL_USER_PASSWORD_SUFFIX || '123'), 10);
          await client.query(
            `INSERT INTO kecamatan (nama, username, password) VALUES ($1, $2, $3)`,
            [nama, username, password]
          );
        }
        console.log('✅ Default data inserted (admin + 26 kecamatan)');
      } else {
        console.log('✅ Data already exists, skipping insert');
      }
    } catch (err) {
      console.error('❌ Error initializing PostgreSQL:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  db.ready = initializePostgres();

} else {
  // SQLite untuk Development (Lokal)
  console.log('⚠️  Using SQLite (DATABASE_URL not set or invalid)');
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = process.env.SQLITE_DB_PATH
    ? path.resolve(process.env.SQLITE_DB_PATH)
    : path.join(__dirname, 'sinergitas.db');
  const sqliteDb = new sqlite3.Database(dbPath);
  sqliteDb.run('PRAGMA foreign_keys = ON');

  let resolveSqliteReady;
  let rejectSqliteReady;
  let sqliteReadySettled = false;
  db = {
    dialect: 'sqlite',
    get: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      sqliteDb.get(sql, params || [], callback || (() => {}));
    },
    all: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      sqliteDb.all(sql, params || [], callback || (() => {}));
    },
    run: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      sqliteDb.run(sql, params || [], callback || (() => {}));
    }
  };

  db.ready = new Promise((resolve, reject) => {
    resolveSqliteReady = resolve;
    rejectSqliteReady = reject;
  });

  function settleSqliteReady(error) {
    if (sqliteReadySettled) return;
    sqliteReadySettled = true;
    if (error) {
      rejectSqliteReady(error);
      return;
    }
    resolveSqliteReady();
  }

  function verifyRequiredSqliteTables() {
    const requiredTables = [
      'kecamatan',
      'assessment_files',
      'assessment_progress',
      'evaluation_reviews',
      'evaluation_item_scores',
      'evaluation_results',
      'evaluation_history'
      ,'admin_kecamatan_assignments'
    ];
    const placeholders = requiredTables.map(() => '?').join(', ');
    sqliteDb.all(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`,
      requiredTables,
      (error, rows) => {
        if (error) return settleSqliteReady(error);
        const found = new Set((rows || []).map(row => row.name));
        const missing = requiredTables.filter(name => !found.has(name));
        if (missing.length) {
          return settleSqliteReady(new Error(`SQLite schema belum lengkap. Tabel hilang: ${missing.join(', ')}`));
        }
        console.log('✅ SQLite tables and migrations applied successfully');
        settleSqliteReady();
      }
    );
  }

  sqliteDb.serialize(() => {
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS kecamatan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT UNIQUE, username TEXT UNIQUE, password TEXT,
      role TEXT NOT NULL DEFAULT 'kecamatan',
      nama_pengelola TEXT, email TEXT, no_hp TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS admin_kecamatan_assignments (
      admin_id INTEGER NOT NULL,
      kecamatan_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (admin_id, kecamatan_id),
      UNIQUE (kecamatan_id),
      FOREIGN KEY (admin_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE
    )`);
    sqliteDb.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_one_evaluator
      ON admin_kecamatan_assignments(kecamatan_id)`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS aspect_a (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kecamatan_id INTEGER,
      ind_1_status TEXT DEFAULT 'tidak', ind_1_file TEXT,
      ind_2a_status TEXT DEFAULT 'tidak', ind_2b_status TEXT DEFAULT 'tidak', ind_2c_status TEXT DEFAULT 'tidak',
      ind_2a_file TEXT, ind_2b_file TEXT, ind_2c_file TEXT,
      ind_3_status TEXT DEFAULT 'tidak', ind_3_file TEXT,
      ind_4_jumlah INTEGER DEFAULT 0, ind_4_file TEXT,
      ind_5a_jumlah INTEGER DEFAULT 0, ind_5b_jumlah INTEGER DEFAULT 0, ind_5a_file TEXT, ind_5b_file TEXT,
      ind_6_status TEXT DEFAULT 'tidak', ind_6_file TEXT,
      ind_7_jumlah INTEGER DEFAULT 0, ind_7_file TEXT,
      ind_8_status TEXT DEFAULT 'tidak', ind_8_file TEXT,
      ind_9a_status TEXT DEFAULT 'tidak', ind_9b_status TEXT DEFAULT 'tidak',
      ind_9c_status TEXT DEFAULT 'tidak', ind_9d_status TEXT DEFAULT 'tidak', ind_9e_status TEXT DEFAULT 'tidak',
      ind_9_file TEXT,
      ind_10a_status TEXT DEFAULT 'tidak', ind_10b_status TEXT DEFAULT 'tidak',
      ind_10c_status TEXT DEFAULT 'tidak', ind_10d_status TEXT DEFAULT 'tidak',
      ind_10e_status TEXT DEFAULT 'tidak', ind_10f_status TEXT DEFAULT 'tidak', ind_10g_status TEXT DEFAULT 'tidak',
      ind_10_file TEXT,
      ind_11_status TEXT DEFAULT 'Tidak Ada Data', ind_11_file TEXT,
      ind_12a_jumlah INTEGER DEFAULT 0, ind_12b_jumlah INTEGER DEFAULT 0, ind_12_file TEXT,
      ind_13_status TEXT DEFAULT 'tidak', ind_13_file TEXT,
      ind_14a_status TEXT DEFAULT 'tidak', ind_14b_status TEXT DEFAULT 'tidak', ind_14c_status TEXT DEFAULT 'tidak',
      ind_14_file TEXT,
      ind_15_persen REAL DEFAULT 0, ind_15_file TEXT,
      ind_16_persen REAL DEFAULT 0, ind_16_file TEXT,
      upload_status TEXT DEFAULT 'Belum', total_score REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS aspect_b (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kecamatan_id INTEGER,
      ind_1_jumlah INTEGER DEFAULT 0, ind_2_jumlah INTEGER DEFAULT 0, ind_3_jumlah INTEGER DEFAULT 0, ind_3_pilihan TEXT, ind_3_komentar TEXT,
      ind_4a_jumlah INTEGER DEFAULT 0, ind_4b_jumlah INTEGER DEFAULT 0,
      ind_5_persen REAL DEFAULT 0, ind_5_jumlah INTEGER DEFAULT 0, ind_6_jumlah INTEGER DEFAULT 0,
      ind_7a_jumlah INTEGER DEFAULT 0, ind_7b_jumlah INTEGER DEFAULT 0,
      ind_8a_jumlah INTEGER DEFAULT 0, ind_8b_jumlah INTEGER DEFAULT 0,
      ind_9a_jumlah INTEGER DEFAULT 0, ind_9b_jumlah INTEGER DEFAULT 0,
      ind_10a_status TEXT DEFAULT 'belum', ind_10b_status TEXT DEFAULT 'tidak', ind_10c_status TEXT DEFAULT 'tidak',
      ind_11a_jumlah INTEGER DEFAULT 0, ind_11b_jumlah INTEGER DEFAULT 0,
      ind_12a_jumlah INTEGER DEFAULT 0, ind_12b_jumlah INTEGER DEFAULT 0,
      ind_13a_jumlah INTEGER DEFAULT 0, ind_13b_jumlah INTEGER DEFAULT 0,
      ind_14a_jumlah INTEGER DEFAULT 0, ind_14b_jumlah INTEGER DEFAULT 0, ind_14c_jumlah INTEGER DEFAULT 0,
      ind_15a_jumlah INTEGER DEFAULT 0, ind_15b_jumlah INTEGER DEFAULT 0,
      ind_15c_jumlah INTEGER DEFAULT 0, ind_15d_jumlah INTEGER DEFAULT 0,
      ind_16a1_jumlah INTEGER DEFAULT 0, ind_16a2_jumlah INTEGER DEFAULT 0, ind_16a3_jumlah INTEGER DEFAULT 0,
      ind_16b1_jumlah INTEGER DEFAULT 0, ind_16b2_jumlah INTEGER DEFAULT 0, ind_16b3_jumlah INTEGER DEFAULT 0,
      ind_17_jumlah INTEGER DEFAULT 0,
      ind_18a_jumlah INTEGER DEFAULT 0, ind_18b_jumlah INTEGER DEFAULT 0,
      ind_19a_jumlah INTEGER DEFAULT 0, ind_19b_jumlah INTEGER DEFAULT 0,
      ind_20a_jumlah INTEGER DEFAULT 0, ind_20b_jumlah INTEGER DEFAULT 0,
      ind_20c_jumlah INTEGER DEFAULT 0, ind_20d_jumlah INTEGER DEFAULT 0, ind_20e_jumlah INTEGER DEFAULT 0,
      ind_21_jumlah INTEGER DEFAULT 0, ind_22_jumlah INTEGER DEFAULT 0,
      ind_23a_jumlah INTEGER DEFAULT 0, ind_23b_jumlah INTEGER DEFAULT 0,
      ind_24a_jumlah INTEGER DEFAULT 0, ind_24b_jumlah INTEGER DEFAULT 0,
      ind_25a_jumlah INTEGER DEFAULT 0, ind_25b_jumlah INTEGER DEFAULT 0,
      ind_26a_jumlah INTEGER DEFAULT 0, ind_26b_jumlah INTEGER DEFAULT 0,
      ind_27_jumlah INTEGER DEFAULT 0, ind_27_pilihan TEXT,
      ind_28_persen REAL DEFAULT 0, ind_29_persen REAL DEFAULT 0,
      ind_30_persen REAL DEFAULT 0, ind_31_persen REAL DEFAULT 0, ind_32_persen REAL DEFAULT 0,
      ind_33a_jumlah INTEGER DEFAULT 0, ind_33b_jumlah INTEGER DEFAULT 0,
      ind_33c_jumlah INTEGER DEFAULT 0, ind_33d_jumlah INTEGER DEFAULT 0,
      ind_34_persen REAL DEFAULT 0, ind_35_persen REAL DEFAULT 0,
      ind_36_persen REAL DEFAULT 0, ind_37_persen REAL DEFAULT 0,
      ind_38a_jumlah INTEGER DEFAULT 0,
      ind_39_persen REAL DEFAULT 0, ind_40_persen REAL DEFAULT 0,
      ind_41_nilai TEXT DEFAULT 'D', ind_41_pilihan TEXT,
      ind_42_status TEXT DEFAULT 'tidak', ind_43_status TEXT DEFAULT 'tidak',
          ind_43a_jumlah INTEGER DEFAULT 0, ind_43b_jumlah INTEGER DEFAULT 0,
          ind_43c_komentar TEXT, ind_43d_jumlah INTEGER DEFAULT 0,
      upload_status TEXT DEFAULT 'Belum', total_score REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS aspect_c (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kecamatan_id INTEGER,
      ind_1a TEXT, ind_1b TEXT, ind_1c TEXT, ind_1d TEXT,
      ind_2a TEXT, ind_2b TEXT,
      ind_3a TEXT, ind_3b TEXT, ind_3c TEXT, ind_3d TEXT, ind_3e TEXT, ind_3f TEXT,
      ind_4 TEXT,
      ind_5a TEXT, ind_5b TEXT, ind_5c TEXT, ind_5d TEXT, ind_5e TEXT, ind_5f TEXT, ind_5g TEXT,
      ind_6a TEXT, ind_6b TEXT,
      upload_status TEXT DEFAULT 'Belum', total_score REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS aspect_d (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kecamatan_id INTEGER,
      ind_1a_nama TEXT, ind_1b_nama TEXT,
      ind_2a_jumlah INTEGER DEFAULT 0, ind_2b_jumlah INTEGER DEFAULT 0, ind_2_jumlah INTEGER DEFAULT 0,
      ind_3_jumlah INTEGER DEFAULT 0, ind_3_pilihan TEXT,
      ind_4a_nasional INTEGER DEFAULT 0, ind_4a_provinsi INTEGER DEFAULT 0, ind_4a_kabupaten INTEGER DEFAULT 0,
      ind_4b_nasional INTEGER DEFAULT 0, ind_4b_provinsi INTEGER DEFAULT 0, ind_4_detail TEXT,
      upload_status TEXT DEFAULT 'Belum', total_score REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS aspect_e (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kecamatan_id INTEGER,
      ind_1a_sd INTEGER DEFAULT 0, ind_1b_smp INTEGER DEFAULT 0, ind_1c_sma INTEGER DEFAULT 0,
      ind_1d_d3 INTEGER DEFAULT 0, ind_1e_s1 INTEGER DEFAULT 0, ind_1f_s2 INTEGER DEFAULT 0, ind_1g_s3 INTEGER DEFAULT 0,
      ind_1_persen_tertinggi TEXT DEFAULT 'c',
      ind_2_jumlah INTEGER DEFAULT 0, ind_3_jumlah INTEGER DEFAULT 0, ind_4_jumlah INTEGER DEFAULT 0,
      ind_5_status TEXT DEFAULT 'tidak',
      upload_status TEXT DEFAULT 'Belum', total_score REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS aspect_f (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kecamatan_id INTEGER,
      ind_1_status TEXT DEFAULT 'tidak', ind_2_status TEXT DEFAULT 'tidak',
      ind_3_status TEXT DEFAULT 'tidak', ind_4_status TEXT DEFAULT 'tidak',
      ind_5_status TEXT DEFAULT 'tidak', ind_6_status TEXT DEFAULT 'tidak',
      ind_7_status TEXT DEFAULT 'tidak', ind_8_status TEXT DEFAULT 'tidak',
      ind_9_status TEXT DEFAULT 'tidak', ind_10_status TEXT DEFAULT 'tidak',
      ind_11_status TEXT DEFAULT 'tidak', ind_12_status TEXT DEFAULT 'tidak',
      ind_13_status TEXT DEFAULT 'tidak', ind_14_status TEXT DEFAULT 'tidak',
      ind_15_status TEXT DEFAULT 'tidak', ind_16_status TEXT DEFAULT 'tidak',
      ind_17_status TEXT DEFAULT 'tidak', ind_18_status TEXT DEFAULT 'tidak',
      ind_19_status TEXT DEFAULT 'tidak', ind_20_status TEXT DEFAULT 'tidak',
      ind_21_status TEXT DEFAULT 'tidak', ind_22_status TEXT DEFAULT 'tidak',
      ind_23_status TEXT DEFAULT 'tidak', ind_24_status TEXT DEFAULT 'tidak',
      ind_25_status TEXT DEFAULT 'tidak', ind_26_status TEXT DEFAULT 'tidak',
      ind_27_status TEXT DEFAULT 'tidak', ind_28_status TEXT DEFAULT 'tidak',
      ind_29_status TEXT DEFAULT 'tidak', ind_30_status TEXT DEFAULT 'tidak',
      ind_31_status TEXT DEFAULT 'tidak', ind_32_status TEXT DEFAULT 'tidak',
      ind_33_status TEXT DEFAULT 'tidak', ind_34_status TEXT DEFAULT 'tidak',
      ind_35_status TEXT DEFAULT 'tidak', ind_36_status TEXT DEFAULT 'tidak',
      ind_37_status TEXT DEFAULT 'tidak', ind_38_status TEXT DEFAULT 'tidak',
      ind_39_status TEXT DEFAULT 'tidak', ind_40_status TEXT DEFAULT 'tidak',
      upload_status TEXT DEFAULT 'Belum', total_score REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
    )`);

    // Tabel config untuk menyimpan pengaturan aplikasi, termasuk deadline pengisian.
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Default deadline hanya dibuat jika belum ada agar perubahan admin tidak tertimpa.
    sqliteDb.run(
      `INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`,
      ['deadline', process.env.DEFAULT_DEADLINE || '2026-12-31']
    );

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS assessment_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kecamatan_id INTEGER NOT NULL,
      instrument TEXT NOT NULL,
      indicator_key TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      relative_path TEXT,
      mime_type TEXT,
      size_bytes INTEGER DEFAULT 0,
      uploaded_by INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES kecamatan(id)
    )`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_assessment_files_owner ON assessment_files(kecamatan_id, instrument, indicator_key)`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS assessment_progress (
      kecamatan_id INTEGER NOT NULL,
      instrument TEXT NOT NULL,
      filled_fields TEXT NOT NULL DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (kecamatan_id, instrument),
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS evaluation_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kecamatan_id INTEGER NOT NULL,
      instrument TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Belum Dinilai',
      notes TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (kecamatan_id, instrument),
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES kecamatan(id)
    )`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_evaluation_reviews_kecamatan ON evaluation_reviews(kecamatan_id, instrument)`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS evaluation_item_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kecamatan_id INTEGER NOT NULL,
      instrument TEXT NOT NULL,
      indicator_key TEXT NOT NULL,
      standard_score REAL NOT NULL DEFAULT 0,
      awarded_score REAL NOT NULL DEFAULT 0,
      notes TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (kecamatan_id, instrument, indicator_key),
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES kecamatan(id)
    )`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_evaluation_item_scores_owner ON evaluation_item_scores(kecamatan_id, instrument)`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS evaluation_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kecamatan_id INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'Belum Final',
      score_a REAL DEFAULT 0,
      score_b REAL DEFAULT 0,
      score_c REAL DEFAULT 0,
      score_d REAL DEFAULT 0,
      score_e REAL DEFAULT 0,
      score_f REAL DEFAULT 0,
      total_score REAL DEFAULT 0,
      max_score REAL DEFAULT 100,
      percentage REAL DEFAULT 0,
      category TEXT,
      score_snapshot TEXT,
      finalized_by INTEGER,
      finalized_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
      FOREIGN KEY (finalized_by) REFERENCES kecamatan(id)
    )`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_evaluation_results_status ON evaluation_results(status, total_score DESC)`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS workbook_baselines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kecamatan_id INTEGER NOT NULL UNIQUE,
      score_a REAL DEFAULT 0,
      score_b REAL DEFAULT 0,
      score_c REAL DEFAULT 0,
      score_d REAL DEFAULT 0,
      score_e REAL DEFAULT 0,
      score_f REAL DEFAULT 0,
      total_score REAL DEFAULT 0,
      source_file TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS evaluation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kecamatan_id INTEGER NOT NULL,
      instrument TEXT,
      action TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT,
      notes TEXT,
      actor_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES kecamatan(id)
    )`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_evaluation_history_kecamatan ON evaluation_history(kecamatan_id, created_at DESC)`);

    // SQLite tidak mendukung ADD COLUMN IF NOT EXISTS secara konsisten.
    // Duplicate-column error diabaikan agar migrasi aman dijalankan berulang kali.
    const sqliteColumnMigrations = [
      ["aspect_b", "ind_3_pilihan", "TEXT"], ["aspect_b", "ind_27_pilihan", "TEXT"], ["aspect_b", "ind_41_pilihan", "TEXT"], ["aspect_b", "ind_3_komentar", "TEXT"], ["aspect_b", "ind_5_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_43a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_43b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_43c_komentar", "TEXT"], ["aspect_b", "ind_43d_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_26a_status", "TEXT DEFAULT 'tidak'"],
      ["aspect_b", "ind_26c_status", "TEXT DEFAULT 'tidak'"], ["aspect_b", "ind_26c_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_26d_status", "TEXT DEFAULT 'tidak'"], ["aspect_b", "ind_26d_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_26e_status", "TEXT DEFAULT 'tidak'"], ["aspect_b", "ind_26e_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_26f_status", "TEXT DEFAULT 'tidak'"], ["aspect_b", "ind_26f_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_28a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_28b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_29a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_29b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_30a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_30b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_30_klasifikasi", "TEXT"],
      ["aspect_b", "ind_31a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_31b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_32a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_32b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_33e_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_33f_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_34a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_34b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_35a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_35b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_36a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_36b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_37a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_37b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_38_persen", "REAL DEFAULT 0"], ["aspect_b", "ind_38b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_39a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_39b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_40a_jumlah", "INTEGER DEFAULT 0"], ["aspect_b", "ind_40b_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_b", "ind_43a_status", "TEXT DEFAULT 'tidak'"], ["aspect_b", "ind_43b_status", "TEXT DEFAULT 'tidak'"],
      ["aspect_b", "ind_43c_status", "TEXT DEFAULT 'tidak'"], ["aspect_b", "ind_43d_status", "TEXT DEFAULT 'tidak'"],
      ["aspect_b", "ind_43e_status", "TEXT DEFAULT 'tidak'"],
      ["aspect_c", "ind_2a_program", "INTEGER DEFAULT 0"], ["aspect_c", "ind_2a_indikator", "INTEGER DEFAULT 0"],
      ["aspect_c", "ind_2b_program", "INTEGER DEFAULT 0"], ["aspect_c", "ind_2b_indikator", "INTEGER DEFAULT 0"],
      ["aspect_d", "ind_3_pilihan", "TEXT"], ["aspect_d", "ind_2_detail", "TEXT"], ["aspect_d", "ind_2_jumlah", "INTEGER DEFAULT 0"],
      ["aspect_d", "ind_4_detail", "TEXT"],
      ["assessment_files", "relative_path", "TEXT"]
      ,["kecamatan", "role", "TEXT NOT NULL DEFAULT 'kecamatan'"]
    ];

    sqliteColumnMigrations.forEach(([tableName, columnName, definition]) => {
      sqliteDb.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`, err => {
        if (err && !String(err.message).toLowerCase().includes('duplicate column name')) {
          console.error(`❌ SQLite migration error ${tableName}.${columnName}:`, err.message);
        }
      });
    });
    sqliteDb.run(`UPDATE kecamatan SET role = 'superadmin' WHERE username = 'admin'`);

    // Insert default data for SQLite. Penyelesaian db.ready dilakukan setelah
    // seluruh DDL, migrasi kolom, dan pemeriksaan tabel benar-benar selesai.
    sqliteDb.get('SELECT COUNT(*) as count FROM kecamatan', (err, row) => {
      if (err) return settleSqliteReady(err);
      if (row && row.count === 0) {
        const adminPassword = bcrypt.hashSync(process.env.INITIAL_ADMIN_PASSWORD || 'admin123', 10);
        const kecamatans = [
          'Wado','Jatinunggal','Darmaraja','Cibugel','Cisitu','Situraja',
          'Conggeang','Paseh','Surian','Buahdua','Tanjungsari','Sukasari',
          'Pamulihan','Cimanggung','Jatinangor','Rancakalong','Sumedang Selatan',
          'Sumedang Utara','Ganeas','Tanjungkerta','Tanjungmedar','Cimalaka',
          'Cisarua','Tomo','Ujung Jaya','Jatigede'
        ];

        sqliteDb.serialize(() => {
          sqliteDb.run(
            'INSERT INTO kecamatan (nama, username, password, nama_pengelola, email) VALUES (?, ?, ?, ?, ?)',
            ['Admin Pusat', 'admin', adminPassword, 'Administrator', 'admin@sumedangkab.go.id']
          );

          kecamatans.forEach(nama => {
            const username = nama.toLowerCase().replace(/\s+/g, '');
            const password = bcrypt.hashSync(username + (process.env.INITIAL_USER_PASSWORD_SUFFIX || '123'), 10);
            sqliteDb.run(
              'INSERT INTO kecamatan (nama, username, password) VALUES (?, ?, ?)',
              [nama, username, password]
            );
          });

          sqliteDb.get('SELECT COUNT(*) AS count FROM kecamatan', [], (insertError, countRow) => {
            if (insertError) return settleSqliteReady(insertError);
            console.log(`✅ SQLite default data available: ${Number(countRow && countRow.count || 0)} users`);
            verifyRequiredSqliteTables();
          });
        });
        return;
      }

      verifyRequiredSqliteTables();
    });
  });
}

module.exports = db;
