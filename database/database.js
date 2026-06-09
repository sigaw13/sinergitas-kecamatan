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
          nama_pengelola TEXT,
          email TEXT,
          no_hp TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

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
          ind_1_jumlah INTEGER DEFAULT 0, ind_2_jumlah INTEGER DEFAULT 0, ind_3_jumlah INTEGER DEFAULT 0,
          ind_4a_jumlah INTEGER DEFAULT 0, ind_4b_jumlah INTEGER DEFAULT 0,
          ind_5_persen REAL DEFAULT 0, ind_6_jumlah INTEGER DEFAULT 0,
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
          ind_27_jumlah INTEGER DEFAULT 0,
          ind_28_persen REAL DEFAULT 0, ind_29_persen REAL DEFAULT 0,
          ind_30_persen REAL DEFAULT 0, ind_31_persen REAL DEFAULT 0, ind_32_persen REAL DEFAULT 0,
          ind_33a_jumlah INTEGER DEFAULT 0, ind_33b_jumlah INTEGER DEFAULT 0,
          ind_33c_jumlah INTEGER DEFAULT 0, ind_33d_jumlah INTEGER DEFAULT 0,
          ind_34_persen REAL DEFAULT 0, ind_35_persen REAL DEFAULT 0,
          ind_36_persen REAL DEFAULT 0, ind_37_persen REAL DEFAULT 0,
          ind_38a_jumlah INTEGER DEFAULT 0,
          ind_39_persen REAL DEFAULT 0, ind_40_persen REAL DEFAULT 0,
          ind_41_nilai TEXT DEFAULT 'D',
          ind_42_status TEXT DEFAULT 'tidak', ind_43_status TEXT DEFAULT 'tidak',
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
          ind_2a_jumlah INTEGER DEFAULT 0, ind_2b_jumlah INTEGER DEFAULT 0,
          ind_3_jumlah INTEGER DEFAULT 0,
          ind_4a_nasional INTEGER DEFAULT 0, ind_4a_provinsi INTEGER DEFAULT 0, ind_4a_kabupaten INTEGER DEFAULT 0,
          ind_4b_nasional INTEGER DEFAULT 0, ind_4b_provinsi INTEGER DEFAULT 0,
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

      console.log('✅ PostgreSQL tables created successfully');

      // Insert default data
      const result = await client.query('SELECT COUNT(*) as count FROM kecamatan');
      if (parseInt(result.rows[0].count) === 0) {
        console.log('📝 Inserting default data...');
        
        const adminPassword = bcrypt.hashSync('admin123', 10);
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
          const password = bcrypt.hashSync(username + '123', 10);
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
    } finally {
      client.release();
    }
  }

  initializePostgres();

} else {
  // SQLite untuk Development (Lokal)
  console.log('⚠️  Using SQLite (DATABASE_URL not set or invalid)');
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'sinergitas.db');
  const sqliteDb = new sqlite3.Database(dbPath);

  db = {
    get: (sql, params, callback) => sqliteDb.get(sql, params || [], callback),
    all: (sql, params, callback) => sqliteDb.all(sql, params || [], callback),
    run: (sql, params, callback) => sqliteDb.run(sql, params || [], callback)
  };

  sqliteDb.serialize(() => {
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS kecamatan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT UNIQUE, username TEXT UNIQUE, password TEXT,
      nama_pengelola TEXT, email TEXT, no_hp TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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
      ind_1_jumlah INTEGER DEFAULT 0, ind_2_jumlah INTEGER DEFAULT 0, ind_3_jumlah INTEGER DEFAULT 0,
      ind_4a_jumlah INTEGER DEFAULT 0, ind_4b_jumlah INTEGER DEFAULT 0,
      ind_5_persen REAL DEFAULT 0, ind_6_jumlah INTEGER DEFAULT 0,
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
      ind_27_jumlah INTEGER DEFAULT 0,
      ind_28_persen REAL DEFAULT 0, ind_29_persen REAL DEFAULT 0,
      ind_30_persen REAL DEFAULT 0, ind_31_persen REAL DEFAULT 0, ind_32_persen REAL DEFAULT 0,
      ind_33a_jumlah INTEGER DEFAULT 0, ind_33b_jumlah INTEGER DEFAULT 0,
      ind_33c_jumlah INTEGER DEFAULT 0, ind_33d_jumlah INTEGER DEFAULT 0,
      ind_34_persen REAL DEFAULT 0, ind_35_persen REAL DEFAULT 0,
      ind_36_persen REAL DEFAULT 0, ind_37_persen REAL DEFAULT 0,
      ind_38a_jumlah INTEGER DEFAULT 0,
      ind_39_persen REAL DEFAULT 0, ind_40_persen REAL DEFAULT 0,
      ind_41_nilai TEXT DEFAULT 'D',
      ind_42_status TEXT DEFAULT 'tidak', ind_43_status TEXT DEFAULT 'tidak',
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
      ind_2a_jumlah INTEGER DEFAULT 0, ind_2b_jumlah INTEGER DEFAULT 0,
      ind_3_jumlah INTEGER DEFAULT 0,
      ind_4a_nasional INTEGER DEFAULT 0, ind_4a_provinsi INTEGER DEFAULT 0, ind_4a_kabupaten INTEGER DEFAULT 0,
      ind_4b_nasional INTEGER DEFAULT 0, ind_4b_provinsi INTEGER DEFAULT 0,
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

    // Insert default data for SQLite
    sqliteDb.get('SELECT COUNT(*) as count FROM kecamatan', (err, row) => {
      if (row.count === 0) {
        const adminPassword = bcrypt.hashSync('admin123', 10);
        sqliteDb.run(
          'INSERT INTO kecamatan (nama, username, password, nama_pengelola, email) VALUES (?, ?, ?, ?, ?)',
          ['Admin Pusat', 'admin', adminPassword, 'Administrator', 'admin@sumedangkab.go.id']
        );

        const kecamatans = [
          'Wado','Jatinunggal','Darmaraja','Cibugel','Cisitu','Situraja',
          'Conggeang','Paseh','Surian','Buahdua','Tanjungsari','Sukasari',
          'Pamulihan','Cimanggung','Jatinangor','Rancakalong','Sumedang Selatan',
          'Sumedang Utara','Ganeas','Tanjungkerta','Tanjungmedar','Cimalaka',
          'Cisarua','Tomo','Ujung Jaya','Jatigede'
        ];

        kecamatans.forEach(nama => {
          const username = nama.toLowerCase().replace(/\s+/g, '');
          const password = bcrypt.hashSync(username + '123', 10);
          sqliteDb.run(
            'INSERT INTO kecamatan (nama, username, password) VALUES (?, ?, ?)',
            [nama, username, password]
          );
        });

        console.log('✅ SQLite default data inserted');
      }
    });
  });
}

module.exports = db;
