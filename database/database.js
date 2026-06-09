const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'sinergitas.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Tabel Kecamatan
  db.run(`CREATE TABLE IF NOT EXISTS kecamatan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT UNIQUE,
    username TEXT UNIQUE,
    password TEXT,
    nama_pengelola TEXT,
    email TEXT,
    no_hp TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabel Aspect A - Pelayanan Publik (16 indikator)
  db.run(`CREATE TABLE IF NOT EXISTS aspect_a (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    ind_1_status TEXT DEFAULT 'tidak',
    ind_1_file TEXT,
    ind_2a_status TEXT DEFAULT 'tidak',
    ind_2b_status TEXT DEFAULT 'tidak',
    ind_2c_status TEXT DEFAULT 'tidak',
    ind_2a_file TEXT,
    ind_2b_file TEXT,
    ind_2c_file TEXT,
    ind_3_status TEXT DEFAULT 'tidak',
    ind_3_file TEXT,
    ind_4_jumlah INTEGER DEFAULT 0,
    ind_4_file TEXT,
    ind_5a_jumlah INTEGER DEFAULT 0,
    ind_5b_jumlah INTEGER DEFAULT 0,
    ind_5a_file TEXT,
    ind_5b_file TEXT,
    ind_6_status TEXT DEFAULT 'tidak',
    ind_6_file TEXT,
    ind_7_jumlah INTEGER DEFAULT 0,
    ind_7_file TEXT,
    ind_8_status TEXT DEFAULT 'tidak',
    ind_8_file TEXT,
    ind_9a_status TEXT DEFAULT 'tidak',
    ind_9b_status TEXT DEFAULT 'tidak',
    ind_9c_status TEXT DEFAULT 'tidak',
    ind_9d_status TEXT DEFAULT 'tidak',
    ind_9e_status TEXT DEFAULT 'tidak',
    ind_9_file TEXT,
    ind_10a_status TEXT DEFAULT 'tidak',
    ind_10b_status TEXT DEFAULT 'tidak',
    ind_10c_status TEXT DEFAULT 'tidak',
    ind_10d_status TEXT DEFAULT 'tidak',
    ind_10e_status TEXT DEFAULT 'tidak',
    ind_10f_status TEXT DEFAULT 'tidak',
    ind_10g_status TEXT DEFAULT 'tidak',
    ind_10_file TEXT,
    ind_11_status TEXT DEFAULT 'Tidak Ada Data',
    ind_11_file TEXT,
    ind_12a_jumlah INTEGER DEFAULT 0,
    ind_12b_jumlah INTEGER DEFAULT 0,
    ind_12_file TEXT,
    ind_13_status TEXT DEFAULT 'tidak',
    ind_13_file TEXT,
    ind_14a_status TEXT DEFAULT 'tidak',
    ind_14b_status TEXT DEFAULT 'tidak',
    ind_14c_status TEXT DEFAULT 'tidak',
    ind_14_file TEXT,
    ind_15_persen REAL DEFAULT 0,
    ind_15_file TEXT,
    ind_16_persen REAL DEFAULT 0,
    ind_16_file TEXT,
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Tabel Aspect B - Penyelenggaraan Pemerintahan (43 indikator)
  db.run(`CREATE TABLE IF NOT EXISTS aspect_b (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    ind_1_jumlah INTEGER DEFAULT 0,
    ind_2_jumlah INTEGER DEFAULT 0,
    ind_3_jumlah INTEGER DEFAULT 0,
    ind_4a_jumlah INTEGER DEFAULT 0,
    ind_4b_jumlah INTEGER DEFAULT 0,
    ind_5_persen REAL DEFAULT 0,
    ind_6_jumlah INTEGER DEFAULT 0,
    ind_7a_jumlah INTEGER DEFAULT 0,
    ind_7b_jumlah INTEGER DEFAULT 0,
    ind_8a_jumlah INTEGER DEFAULT 0,
    ind_8b_jumlah INTEGER DEFAULT 0,
    ind_9a_jumlah INTEGER DEFAULT 0,
    ind_9b_jumlah INTEGER DEFAULT 0,
    ind_10a_status TEXT DEFAULT 'belum',
    ind_10b_status TEXT DEFAULT 'tidak',
    ind_10c_status TEXT DEFAULT 'tidak',
    ind_11a_jumlah INTEGER DEFAULT 0,
    ind_11b_jumlah INTEGER DEFAULT 0,
    ind_12a_jumlah INTEGER DEFAULT 0,
    ind_12b_jumlah INTEGER DEFAULT 0,
    ind_13a_jumlah INTEGER DEFAULT 0,
    ind_13b_jumlah INTEGER DEFAULT 0,
    ind_14a_jumlah INTEGER DEFAULT 0,
    ind_14b_jumlah INTEGER DEFAULT 0,
    ind_14c_jumlah INTEGER DEFAULT 0,
    ind_15a_jumlah INTEGER DEFAULT 0,
    ind_15b_jumlah INTEGER DEFAULT 0,
    ind_15c_jumlah INTEGER DEFAULT 0,
    ind_15d_jumlah INTEGER DEFAULT 0,
    ind_16a1_jumlah INTEGER DEFAULT 0,
    ind_16a2_jumlah INTEGER DEFAULT 0,
    ind_16a3_jumlah INTEGER DEFAULT 0,
    ind_16b1_jumlah INTEGER DEFAULT 0,
    ind_16b2_jumlah INTEGER DEFAULT 0,
    ind_16b3_jumlah INTEGER DEFAULT 0,
    ind_17_jumlah INTEGER DEFAULT 0,
    ind_18a_jumlah INTEGER DEFAULT 0,
    ind_18b_jumlah INTEGER DEFAULT 0,
    ind_19a_jumlah INTEGER DEFAULT 0,
    ind_19b_jumlah INTEGER DEFAULT 0,
    ind_20a_jumlah INTEGER DEFAULT 0,
    ind_20b_jumlah INTEGER DEFAULT 0,
    ind_20c_jumlah INTEGER DEFAULT 0,
    ind_20d_jumlah INTEGER DEFAULT 0,
    ind_20e_jumlah INTEGER DEFAULT 0,
    ind_21_jumlah INTEGER DEFAULT 0,
    ind_22_jumlah INTEGER DEFAULT 0,
    ind_23a_jumlah INTEGER DEFAULT 0,
    ind_23b_jumlah INTEGER DEFAULT 0,
    ind_24a_jumlah INTEGER DEFAULT 0,
    ind_24b_jumlah INTEGER DEFAULT 0,
    ind_25a_jumlah INTEGER DEFAULT 0,
    ind_25b_jumlah INTEGER DEFAULT 0,
    ind_26a_jumlah INTEGER DEFAULT 0,
    ind_26b_jumlah INTEGER DEFAULT 0,
    ind_27_jumlah INTEGER DEFAULT 0,
    ind_28_persen REAL DEFAULT 0,
    ind_29_persen REAL DEFAULT 0,
    ind_30_persen REAL DEFAULT 0,
    ind_31_persen REAL DEFAULT 0,
    ind_32_persen REAL DEFAULT 0,
    ind_33a_jumlah INTEGER DEFAULT 0,
    ind_33b_jumlah INTEGER DEFAULT 0,
    ind_33c_jumlah INTEGER DEFAULT 0,
    ind_33d_jumlah INTEGER DEFAULT 0,
    ind_34_persen REAL DEFAULT 0,
    ind_35_persen REAL DEFAULT 0,
    ind_36_persen REAL DEFAULT 0,
    ind_37_persen REAL DEFAULT 0,
    ind_38a_jumlah INTEGER DEFAULT 0,
    ind_39_persen REAL DEFAULT 0,
    ind_40_persen REAL DEFAULT 0,
    ind_41_nilai TEXT DEFAULT 'D',
    ind_42_status TEXT DEFAULT 'tidak',
    ind_43_status TEXT DEFAULT 'tidak',
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Tabel Aspect C - Pengelolaan Anggaran
  db.run(`CREATE TABLE IF NOT EXISTS aspect_c (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    ind_1a TEXT,
    ind_1b TEXT,
    ind_1c TEXT,
    ind_1d TEXT,
    ind_2a TEXT,
    ind_2b TEXT,
    ind_3a TEXT,
    ind_3b TEXT,
    ind_3c TEXT,
    ind_3d TEXT,
    ind_3e TEXT,
    ind_3f TEXT,
    ind_4 TEXT,
    ind_5a TEXT,
    ind_5b TEXT,
    ind_5c TEXT,
    ind_5d TEXT,
    ind_5e TEXT,
    ind_5f TEXT,
    ind_5g TEXT,
    ind_6a TEXT,
    ind_6b TEXT,
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Tabel Aspect D - Inovasi
  db.run(`CREATE TABLE IF NOT EXISTS aspect_d (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    ind_1a_nama TEXT,
    ind_1b_nama TEXT,
    ind_2a_jumlah INTEGER DEFAULT 0,
    ind_2b_jumlah INTEGER DEFAULT 0,
    ind_3_jumlah INTEGER DEFAULT 0,
    ind_4a_nasional INTEGER DEFAULT 0,
    ind_4a_provinsi INTEGER DEFAULT 0,
    ind_4a_kabupaten INTEGER DEFAULT 0,
    ind_4b_nasional INTEGER DEFAULT 0,
    ind_4b_provinsi INTEGER DEFAULT 0,
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Tabel Aspect E - SDM
  db.run(`CREATE TABLE IF NOT EXISTS aspect_e (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    ind_1a_sd INTEGER DEFAULT 0,
    ind_1b_smp INTEGER DEFAULT 0,
    ind_1c_sma INTEGER DEFAULT 0,
    ind_1d_d3 INTEGER DEFAULT 0,
    ind_1e_s1 INTEGER DEFAULT 0,
    ind_1f_s2 INTEGER DEFAULT 0,
    ind_1g_s3 INTEGER DEFAULT 0,
    ind_1_persen_tertinggi TEXT DEFAULT 'c',
    ind_2_jumlah INTEGER DEFAULT 0,
    ind_3_jumlah INTEGER DEFAULT 0,
    ind_4_jumlah INTEGER DEFAULT 0,
    ind_5_status TEXT DEFAULT 'tidak',
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Tabel Aspect F - Data Dukung (40 indikator)
  db.run(`CREATE TABLE IF NOT EXISTS aspect_f (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    ind_1_status TEXT DEFAULT 'tidak',
    ind_2_status TEXT DEFAULT 'tidak',
    ind_3_status TEXT DEFAULT 'tidak',
    ind_4_status TEXT DEFAULT 'tidak',
    ind_5_status TEXT DEFAULT 'tidak',
    ind_6_status TEXT DEFAULT 'tidak',
    ind_7_status TEXT DEFAULT 'tidak',
    ind_8_status TEXT DEFAULT 'tidak',
    ind_9_status TEXT DEFAULT 'tidak',
    ind_10_status TEXT DEFAULT 'tidak',
    ind_11_status TEXT DEFAULT 'tidak',
    ind_12_status TEXT DEFAULT 'tidak',
    ind_13_status TEXT DEFAULT 'tidak',
    ind_14_status TEXT DEFAULT 'tidak',
    ind_15_status TEXT DEFAULT 'tidak',
    ind_16_status TEXT DEFAULT 'tidak',
    ind_17_status TEXT DEFAULT 'tidak',
    ind_18_status TEXT DEFAULT 'tidak',
    ind_19_status TEXT DEFAULT 'tidak',
    ind_20_status TEXT DEFAULT 'tidak',
    ind_21_status TEXT DEFAULT 'tidak',
    ind_22_status TEXT DEFAULT 'tidak',
    ind_23_status TEXT DEFAULT 'tidak',
    ind_24_status TEXT DEFAULT 'tidak',
    ind_25_status TEXT DEFAULT 'tidak',
    ind_26_status TEXT DEFAULT 'tidak',
    ind_27_status TEXT DEFAULT 'tidak',
    ind_28_status TEXT DEFAULT 'tidak',
    ind_29_status TEXT DEFAULT 'tidak',
    ind_30_status TEXT DEFAULT 'tidak',
    ind_31_status TEXT DEFAULT 'tidak',
    ind_32_status TEXT DEFAULT 'tidak',
    ind_33_status TEXT DEFAULT 'tidak',
    ind_34_status TEXT DEFAULT 'tidak',
    ind_35_status TEXT DEFAULT 'tidak',
    ind_36_status TEXT DEFAULT 'tidak',
    ind_37_status TEXT DEFAULT 'tidak',
    ind_38_status TEXT DEFAULT 'tidak',
    ind_39_status TEXT DEFAULT 'tidak',
    ind_40_status TEXT DEFAULT 'tidak',
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Insert data awal kecamatan jika belum ada
  db.get('SELECT COUNT(*) as count FROM kecamatan', (err, row) => {
    if (row.count === 0) {
      const kecamatans = [
        { nama: 'Wado', username: 'wado' },
        { nama: 'Jatinunggal', username: 'jatinunggal' },
        { nama: 'Darmaraja', username: 'darmaraja' },
        { nama: 'Cibugel', username: 'cibugel' },
        { nama: 'Cisitu', username: 'cisitu' },
        { nama: 'Situraja', username: 'situraja' },
        { nama: 'Conggeang', username: 'conggeang' },
        { nama: 'Paseh', username: 'paseh' },
        { nama: 'Surian', username: 'surian' },
        { nama: 'Buahdua', username: 'buahdua' },
        { nama: 'Tanjungsari', username: 'tanjungsari' },
        { nama: 'Sukasari', username: 'sukasari' },
        { nama: 'Pamulihan', username: 'pamulihan' },
        { nama: 'Cimanggung', username: 'cimanggung' },
        { nama: 'Jatinangor', username: 'jatinangor' },
        { nama: 'Rancakalong', username: 'rancakalong' },
        { nama: 'Sumedang Selatan', username: 'sumedangselatan' },
        { nama: 'Sumedang Utara', username: 'sumedangutara' },
        { nama: 'Ganeas', username: 'ganeas' },
        { nama: 'Tanjungkerta', username: 'tanjungkerta' },
        { nama: 'Tanjungmedar', username: 'tanjungmedar' },
        { nama: 'Cimalaka', username: 'cimalaka' },
        { nama: 'Cisarua', username: 'cisarua' },
        { nama: 'Tomo', username: 'tomo' },
        { nama: 'Ujung Jaya', username: 'ujungjaya' },
        { nama: 'Jatigede', username: 'jatigede' }
      ];

      const adminPassword = bcrypt.hashSync('admin123', 10);
      db.run(
        'INSERT INTO kecamatan (nama, username, password, nama_pengelola, email) VALUES (?, ?, ?, ?, ?)',
        ['Admin Pusat', 'admin', adminPassword, 'Administrator', 'admin@sumedangkab.go.id']
      );

      kecamatans.forEach(kc => {
        const password = bcrypt.hashSync(kc.username + '123', 10);
        db.run(
          'INSERT INTO kecamatan (nama, username, password) VALUES (?, ?, ?)',
          [kc.nama, kc.username, password]
        );
      });

      console.log('✅ Data awal kecamatan berhasil ditambahkan');
    }
  });
});

module.exports = db;