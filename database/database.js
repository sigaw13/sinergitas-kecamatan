const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'sinergitas.db');
const db = new sqlite3.Database(dbPath);

// Inisialisasi database
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

  // Tabel History Upload
  db.run(`CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    aspect TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_count INTEGER DEFAULT 0,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Tabel Aspect A - Pelayanan Publik (16 indikator)
  db.run(`CREATE TABLE IF NOT EXISTS aspect_a (
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    
    -- Indikator 1
    ind_1_status TEXT DEFAULT 'tidak',
    ind_1_file TEXT,
    
    -- Indikator 2
    ind_2a_status TEXT DEFAULT 'tidak',
    ind_2b_status TEXT DEFAULT 'tidak',
    ind_2c_status TEXT DEFAULT 'tidak',
    ind_2a_file TEXT,
    ind_2b_file TEXT,
    ind_2c_file TEXT,
    
    -- Indikator 3
    ind_3_status TEXT DEFAULT 'tidak',
    ind_3_file TEXT,
    
    -- Indikator 4
    ind_4_jumlah INTEGER DEFAULT 0,
    ind_4_file TEXT,
    
    -- Indikator 5
    ind_5a_jumlah INTEGER DEFAULT 0,
    ind_5b_jumlah INTEGER DEFAULT 0,
    ind_5a_file TEXT,
    ind_5b_file TEXT,
    
    -- Indikator 6
    ind_6_status TEXT DEFAULT 'tidak',
    ind_6_file TEXT,
    
    -- Indikator 7
    ind_7_jumlah INTEGER DEFAULT 0,
    ind_7_file TEXT,
    
    -- Indikator 8
    ind_8_status TEXT DEFAULT 'tidak',
    ind_8_file TEXT,
    
    -- Indikator 9
    ind_9a_status TEXT DEFAULT 'tidak',
    ind_9b_status TEXT DEFAULT 'tidak',
    ind_9c_status TEXT DEFAULT 'tidak',
    ind_9d_status TEXT DEFAULT 'tidak',
    ind_9e_status TEXT DEFAULT 'tidak',
    ind_9a_file TEXT,
    ind_9b_file TEXT,
    ind_9c_file TEXT,
    ind_9d_file TEXT,
    ind_9e_file TEXT,
    
    -- Indikator 10
    ind_10a_status TEXT DEFAULT 'tidak',
    ind_10b_status TEXT DEFAULT 'tidak',
    ind_10c_status TEXT DEFAULT 'tidak',
    ind_10d_status TEXT DEFAULT 'tidak',
    ind_10e_status TEXT DEFAULT 'tidak',
    ind_10f_status TEXT DEFAULT 'tidak',
    ind_10g_status TEXT DEFAULT 'tidak',
    ind_10a_file TEXT,
    ind_10b_file TEXT,
    ind_10c_file TEXT,
    ind_10d_file TEXT,
    ind_10e_file TEXT,
    ind_10f_file TEXT,
    ind_10g_file TEXT,
    
    -- Indikator 11
    ind_11_status TEXT DEFAULT 'Tidak Ada Data',
    ind_11_file TEXT,
    
    -- Indikator 12
    ind_12a_jumlah INTEGER DEFAULT 0,
    ind_12b_jumlah INTEGER DEFAULT 0,
    ind_12_file TEXT,
    
    -- Indikator 13
    ind_13_status TEXT DEFAULT 'tidak',
    ind_13_file TEXT,
    
    -- Indikator 14
    ind_14a_status TEXT DEFAULT 'tidak',
    ind_14b_status TEXT DEFAULT 'tidak',
    ind_14c_status TEXT DEFAULT 'tidak',
    ind_14a_file TEXT,
    ind_14b_file TEXT,
    ind_14c_file TEXT,
    
    -- Indikator 15
    ind_15_persen REAL DEFAULT 0,
    ind_15_file TEXT,
    
    -- Indikator 16
    ind_16_persen REAL DEFAULT 0,
    ind_16_file TEXT,
    
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);
  
  // Tabel Aspect B - Penyelenggaraan Pemerintahan (43 indikator)
  db.run(`CREATE TABLE IF NOT EXISTS aspect_b (
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    
    -- Indikator 1-43 (struktur lengkap)
    ind_1_jumlah INTEGER DEFAULT 0,
    ind_1_file TEXT,
    
    ind_2_jumlah INTEGER DEFAULT 0,
    ind_2_file TEXT,
    
    ind_3_jumlah INTEGER DEFAULT 0,
    ind_3_kategori TEXT DEFAULT 'a',
    ind_3_file TEXT,
    
    ind_4a_jumlah INTEGER DEFAULT 0,
    ind_4b_jumlah INTEGER DEFAULT 0,
    ind_4_file TEXT,
    
    ind_5_jumlah INTEGER DEFAULT 0,
    ind_5_persen REAL DEFAULT 0,
    ind_5_file TEXT,
    
    ind_6_jumlah INTEGER DEFAULT 0,
    ind_6_file TEXT,
    
    ind_7a_jumlah INTEGER DEFAULT 0,
    ind_7b_jumlah INTEGER DEFAULT 0,
    ind_7_file TEXT,
    
    ind_8a_jumlah INTEGER DEFAULT 0,
    ind_8b_jumlah INTEGER DEFAULT 0,
    ind_8_file TEXT,
    
    ind_9a_jumlah INTEGER DEFAULT 0,
    ind_9b_jumlah INTEGER DEFAULT 0,
    ind_9_file TEXT,
    
    ind_10a_status TEXT DEFAULT 'belum',
    ind_10b_status TEXT DEFAULT 'tidak',
    ind_10c_status TEXT DEFAULT 'tidak',
    ind_10_file TEXT,
    
    ind_11a_jumlah INTEGER DEFAULT 0,
    ind_11b_jumlah INTEGER DEFAULT 0,
    ind_11_file TEXT,
    
    ind_12a_jumlah INTEGER DEFAULT 0,
    ind_12b_jumlah INTEGER DEFAULT 0,
    ind_12_file TEXT,
    
    ind_13a_jumlah INTEGER DEFAULT 0,
    ind_13b_jumlah INTEGER DEFAULT 0,
    ind_13_file TEXT,
    
    ind_14a_jumlah INTEGER DEFAULT 0,
    ind_14b_jumlah INTEGER DEFAULT 0,
    ind_14c_jumlah INTEGER DEFAULT 0,
    ind_14_file TEXT,
    
    ind_15a_jumlah INTEGER DEFAULT 0,
    ind_15b_jumlah INTEGER DEFAULT 0,
    ind_15c_jumlah INTEGER DEFAULT 0,
    ind_15d_jumlah INTEGER DEFAULT 0,
    ind_15_file TEXT,
    
    ind_16a1_jumlah INTEGER DEFAULT 0,
    ind_16a2_jumlah INTEGER DEFAULT 0,
    ind_16a3_jumlah INTEGER DEFAULT 0,
    ind_16b1_jumlah INTEGER DEFAULT 0,
    ind_16b2_jumlah INTEGER DEFAULT 0,
    ind_16b3_jumlah INTEGER DEFAULT 0,
    ind_16_file TEXT,
    
    ind_17_jumlah INTEGER DEFAULT 0,
    ind_17_file TEXT,
    
    ind_18a_jumlah INTEGER DEFAULT 0,
    ind_18b_jumlah INTEGER DEFAULT 0,
    ind_18_file TEXT,
    
    ind_19a_jumlah INTEGER DEFAULT 0,
    ind_19b_jumlah INTEGER DEFAULT 0,
    ind_19_file TEXT,
    
    ind_20a_jumlah INTEGER DEFAULT 0,
    ind_20b_jumlah INTEGER DEFAULT 0,
    ind_20c_jumlah INTEGER DEFAULT 0,
    ind_20d_jumlah INTEGER DEFAULT 0,
    ind_20e_jumlah INTEGER DEFAULT 0,
    ind_20_file TEXT,
    
    ind_21_jumlah INTEGER DEFAULT 0,
    ind_21_file TEXT,
    
    ind_22_jumlah INTEGER DEFAULT 0,
    ind_22_file TEXT,
    
    ind_23a_jumlah INTEGER DEFAULT 0,
    ind_23b_jumlah INTEGER DEFAULT 0,
    ind_23_file TEXT,
    
    ind_24a_jumlah INTEGER DEFAULT 0,
    ind_24b_jumlah INTEGER DEFAULT 0,
    ind_24_file TEXT,
    
    ind_25a_jumlah INTEGER DEFAULT 0,
    ind_25b_jumlah INTEGER DEFAULT 0,
    ind_25_file TEXT,
    
    ind_26a_status TEXT DEFAULT 'tidak',
    ind_26b_jumlah INTEGER DEFAULT 0,
    ind_26c_status TEXT DEFAULT 'tidak',
    ind_26d_status TEXT DEFAULT 'tidak',
    ind_26e_status TEXT DEFAULT 'tidak',
    ind_26f_status TEXT DEFAULT 'tidak',
    ind_26_file TEXT,
    
    ind_27_jumlah INTEGER DEFAULT 0,
    ind_27_kategori TEXT DEFAULT 'a',
    ind_27_file TEXT,
    
    ind_28a_jumlah INTEGER DEFAULT 0,
    ind_28b_jumlah INTEGER DEFAULT 0,
    ind_28_persen REAL DEFAULT 0,
    ind_28_file TEXT,
    
    ind_29a_jumlah INTEGER DEFAULT 0,
    ind_29b_jumlah INTEGER DEFAULT 0,
    ind_29_persen REAL DEFAULT 0,
    ind_29_file TEXT,
    
    ind_30_persen REAL DEFAULT 0,
    ind_30_file TEXT,
    
    ind_31a_jumlah INTEGER DEFAULT 0,
    ind_31b_jumlah INTEGER DEFAULT 0,
    ind_31_persen REAL DEFAULT 0,
    ind_31_file TEXT,
    
    ind_32a_jumlah INTEGER DEFAULT 0,
    ind_32b_jumlah INTEGER DEFAULT 0,
    ind_32_persen REAL DEFAULT 0,
    ind_32_file TEXT,
    
    ind_33a_jumlah INTEGER DEFAULT 0,
    ind_33b_jumlah INTEGER DEFAULT 0,
    ind_33c_jumlah INTEGER DEFAULT 0,
    ind_33d_jumlah INTEGER DEFAULT 0,
    ind_33e_jumlah INTEGER DEFAULT 0,
    ind_33f_jumlah INTEGER DEFAULT 0,
    ind_33_file TEXT,
    
    ind_34a_jumlah INTEGER DEFAULT 0,
    ind_34_persen REAL DEFAULT 0,
    ind_34_file TEXT,
    
    ind_35a_jumlah INTEGER DEFAULT 0,
    ind_35_persen REAL DEFAULT 0,
    ind_35_file TEXT,
    
    ind_36a_jumlah INTEGER DEFAULT 0,
    ind_36_persen REAL DEFAULT 0,
    ind_36_file TEXT,
    
    ind_37a_jumlah INTEGER DEFAULT 0,
    ind_37_persen REAL DEFAULT 0,
    ind_37_file TEXT,
    
    ind_38a_jumlah INTEGER DEFAULT 0,
    ind_38b_jumlah INTEGER DEFAULT 0,
    ind_38_file TEXT,
    
    ind_39a_jumlah INTEGER DEFAULT 0,
    ind_39_persen REAL DEFAULT 0,
    ind_39_file TEXT,
    
    ind_40a_jumlah INTEGER DEFAULT 0,
    ind_40_persen REAL DEFAULT 0,
    ind_40_file TEXT,
    
    ind_41_nilai TEXT DEFAULT 'D',
    ind_41_file TEXT,
    
    ind_42_status TEXT DEFAULT 'tidak',
    ind_42_file TEXT,
    
    ind_43a_status TEXT DEFAULT 'tidak',
    ind_43b_status TEXT DEFAULT 'tidak',
    ind_43c_status TEXT DEFAULT 'tidak',
    ind_43d_status TEXT DEFAULT 'tidak',
    ind_43e_status TEXT DEFAULT 'tidak',
    ind_43_file TEXT,
    
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Tabel Aspect C - Pengelolaan Anggaran (6 indikator)
  db.run(`CREATE TABLE IF NOT EXISTS aspect_c (
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    
    ind_1a_status TEXT DEFAULT 'tidak',
    ind_1b_status TEXT DEFAULT 'tidak',
    ind_1c_status TEXT DEFAULT 'tidak',
    ind_1d_status TEXT DEFAULT 'tidak',
    ind_1_file TEXT,
    
    ind_2a_program INTEGER DEFAULT 0,
    ind_2a_indikator INTEGER DEFAULT 0,
    ind_2b_program INTEGER DEFAULT 0,
    ind_2b_indikator INTEGER DEFAULT 0,
    ind_2_persen REAL DEFAULT 0,
    ind_2_file TEXT,
    
    ind_3a_persen REAL DEFAULT 0,
    ind_3b_persen REAL DEFAULT 0,
    ind_3c_persen REAL DEFAULT 0,
    ind_3d_persen REAL DEFAULT 0,
    ind_3e_persen REAL DEFAULT 0,
    ind_3f_persen REAL DEFAULT 0,
    ind_3_prioritas TEXT,
    ind_3_file TEXT,
    
    ind_5a_persen REAL DEFAULT 0,
    ind_5b_persen REAL DEFAULT 0,
    ind_5c_persen REAL DEFAULT 0,
    ind_5d_persen REAL DEFAULT 0,
    ind_5e_persen REAL DEFAULT 0,
    ind_5f_persen REAL DEFAULT 0,
    ind_5g_persen REAL DEFAULT 0,
    ind_5_file TEXT,
    
    ind_6a_realisasi REAL DEFAULT 0,
    ind_6b_anggaran REAL DEFAULT 0,
    ind_6_persen REAL DEFAULT 0,
    ind_6_file TEXT,
    
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Tabel Aspect D - Inovasi (4 indikator)
  db.run(`CREATE TABLE IF NOT EXISTS aspect_d (
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    
    ind_1a_nama TEXT,
    ind_1b_nama TEXT,
    ind_1_file TEXT,
    
    ind_2a_jumlah INTEGER DEFAULT 0,
    ind_2b_jumlah INTEGER DEFAULT 0,
    ind_2_file TEXT,
    
    ind_3_jumlah INTEGER DEFAULT 0,
    ind_3_kategori TEXT DEFAULT 'a',
    ind_3_file TEXT,
    
    ind_4a_nasional INTEGER DEFAULT 0,
    ind_4a_provinsi INTEGER DEFAULT 0,
    ind_4a_kabupaten INTEGER DEFAULT 0,
    ind_4b_nasional INTEGER DEFAULT 0,
    ind_4b_provinsi INTEGER DEFAULT 0,
    ind_4_file TEXT,
    
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Tabel Aspect E - SDM (5 indikator)
  db.run(`CREATE TABLE IF NOT EXISTS aspect_e (
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    ind_1_file TEXT,
    
    ind_2_jumlah INTEGER DEFAULT 0,
    ind_2_file TEXT,
    
    ind_3_jumlah INTEGER DEFAULT 0,
    ind_3_file TEXT,
    
    ind_4_jumlah INTEGER DEFAULT 0,
    ind_4_file TEXT,
    
    ind_5_status TEXT DEFAULT 'tidak',
    ind_5_file TEXT,
    
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Tabel Aspect F - Data Dukung (40 indikator)
  db.run(`CREATE TABLE IF NOT EXISTS aspect_f (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER,
    
    -- Indikator 1-40 dengan struktur lengkap
    ind_1_status TEXT DEFAULT 'tidak',
    ind_1_file TEXT,
    
    ind_2_status TEXT DEFAULT 'tidak',
    ind_2_file TEXT,
    
    ind_3_status TEXT DEFAULT 'tidak',
    ind_3_file TEXT,
    
    ind_4_status TEXT DEFAULT 'tidak',
    ind_4_file TEXT,
    
    ind_5_status TEXT DEFAULT 'tidak',
    ind_5_file TEXT,
    
    ind_6_status TEXT DEFAULT 'tidak',
    ind_6_file TEXT,
    
    ind_7_status TEXT DEFAULT 'tidak',
    ind_7_file TEXT,
    
    ind_8_status TEXT DEFAULT 'tidak',
    ind_8_file TEXT,
    
    ind_9_status TEXT DEFAULT 'tidak',
    ind_9_file TEXT,
    
    ind_10_status TEXT DEFAULT 'tidak',
    ind_10_file TEXT,
    
    ind_11_status TEXT DEFAULT 'tidak',
    ind_11_file TEXT,
    
    ind_12_status TEXT DEFAULT 'tidak',
    ind_12_file TEXT,
    
    ind_13_status TEXT DEFAULT 'tidak',
    ind_13_file TEXT,
    
    ind_14_status TEXT DEFAULT 'tidak',
    ind_14_file TEXT,
    
    ind_15_status TEXT DEFAULT 'tidak',
    ind_15_file TEXT,
    
    ind_16_status TEXT DEFAULT 'tidak',
    ind_16_file TEXT,
    
    ind_17_status TEXT DEFAULT 'tidak',
    ind_17_file TEXT,
    
    ind_18_status TEXT DEFAULT 'tidak',
    ind_18_file TEXT,
    
    ind_19_status TEXT DEFAULT 'tidak',
    ind_19_file TEXT,
    
    ind_20_status TEXT DEFAULT 'tidak',
    ind_20_file TEXT,
    
    ind_21_status TEXT DEFAULT 'tidak',
    ind_21_file TEXT,
    
    ind_22_status TEXT DEFAULT 'tidak',
    ind_22_file TEXT,
    
    ind_23_status TEXT DEFAULT 'tidak',
    ind_23_file TEXT,
    
    ind_24_status TEXT DEFAULT 'tidak',
    ind_24_file TEXT,
    
    ind_25_status TEXT DEFAULT 'tidak',
    ind_25_file TEXT,
    
    ind_26_status TEXT DEFAULT 'tidak',
    ind_26_file TEXT,
    
    ind_27_status TEXT DEFAULT 'tidak',
    ind_27_file TEXT,
    
    ind_28_status TEXT DEFAULT 'tidak',
    ind_28_file TEXT,
    
    ind_29_status TEXT DEFAULT 'tidak',
    ind_29_file TEXT,
    
    ind_30_status TEXT DEFAULT 'tidak',
    ind_30_file TEXT,
    
    ind_31_status TEXT DEFAULT 'tidak',
    ind_31_file TEXT,
    
    ind_32_status TEXT DEFAULT 'tidak',
    ind_32_file TEXT,
    
    ind_33_status TEXT DEFAULT 'tidak',
    ind_33_file TEXT,
    
    ind_34_status TEXT DEFAULT 'tidak',
    ind_34_file TEXT,
    
    ind_35_status TEXT DEFAULT 'tidak',
    ind_35_file TEXT,
    
    ind_36_status TEXT DEFAULT 'tidak',
    ind_36_file TEXT,
    
    ind_37_status TEXT DEFAULT 'tidak',
    ind_37_file TEXT,
    
    ind_38_status TEXT DEFAULT 'tidak',
    ind_38_file TEXT,
    
    ind_39_status TEXT DEFAULT 'tidak',
    ind_39_file TEXT,
    
    ind_40_status TEXT DEFAULT 'tidak',
    ind_40_file TEXT,
    
    upload_status TEXT DEFAULT 'Belum',
    total_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
  )`);

  // Insert data kecamatan (sama seperti sebelumnya)
  const kecamatanData = [
    { nama: 'WADO', username: 'wado', pengelola: 'SAGERI SYAHID', email: 'keuanganwado@gmail.com' },
    { nama: 'JATINUNGGAL', username: 'jatinunggal', pengelola: 'TEDDY', email: 'hermawanteddy20@gmail.com' },
    { nama: 'DARMARAJA', username: 'darmaraja', pengelola: 'ENYANG', email: 'subagprogkeudarmaraja@gmail.com' },
    { nama: 'CIBUGEL', username: 'cibugel', pengelola: 'ANDIYANA', email: 'andiyana.wdm@gmail.com' },
    { nama: 'CISITU', username: 'cisitu', pengelola: 'TAUFIQ FALAH', email: 'vicktanoshie4@gmail.com' },
    { nama: 'SITURAJA', username: 'situraja', pengelola: 'YADI SURYADI', email: 'syadi1931@gmail.com' },
    { nama: 'CONGGEANG', username: 'conggeang', pengelola: 'SRI', email: 'kharismawati546@gmail.com' },
    { nama: 'PASEH', username: 'paseh', pengelola: 'ARIS', email: 'adearies369@gmail.com' },
    { nama: 'SURIAN', username: 'surian', pengelola: 'EDI SUPRIADI, SE', email: 'progkeu.kecamatansurian@gmail.com' },
    { nama: 'BUAHDUA', username: 'buahdua', pengelola: 'NENG YULI', email: 'kecbuahdua@gmail.com' },
    { nama: 'TANJUNGSARI', username: 'tanjungsari', pengelola: 'TARI', email: 'subagprogkeutanjungsari@gmail.com' },
    { nama: 'SUKASARI', username: 'sukasari', pengelola: 'SITI FATIMAH', email: 'kecsukasari@yahoo.com' },
    { nama: 'PAMULIHAN', username: 'pamulihan', pengelola: 'RIJAL', email: 'rijal.miftahul.anwar@gmail.com' },
    { nama: 'CIMANGGUNG', username: 'cimanggung', pengelola: 'DIROHMAT', email: 'atedirohmat@gmail.com' },
    { nama: 'JATINANGOR', username: 'jatinangor', pengelola: 'ABIASA', email: 'kecjtr2@gmail.com' },
    { nama: 'RANCAKALONG', username: 'rancakalong', pengelola: 'YUYU WIHARMAN', email: 'lobaduitwillytea@gmail.com' },
    { nama: 'SUMEDANG SELATAN', username: 'sumedangselatan', pengelola: 'HARI', email: 'kec.sumedangselatana@gmail.com' },
    { nama: 'SUMEDANG UTARA', username: 'sumedangutara', pengelola: 'GERI AGUSTIANA', email: 'geriagustiana56@gmail.com' },
    { nama: 'GANEAS', username: 'ganeas', pengelola: 'HENDI', email: 'programkeuanganganeas@gmail.com' },
    { nama: 'TANJUNGKERTA', username: 'tanjungkerta', pengelola: 'RADIK', email: 'muhamadradik5044@gmail.com' },
    { nama: 'TANJUNGMEDAR', username: 'tanjungmedar', pengelola: 'RONI', email: 'kectanjungmedar2@gmail.com' },
    { nama: 'CIMALAKA', username: 'cimalaka', pengelola: 'SITI', email: 'ssulastri769@gmail.com' },
    { nama: 'CISARUA', username: 'cisarua', pengelola: 'KARMAT', email: 'karmat201970@gmail.com' },
    { nama: 'TOMO', username: 'tomo', pengelola: 'ATI NURHAYATI', email: 'kecamatantomo544@gmail.com' },
    { nama: 'UJUNG JAYA', username: 'ujungjaya', pengelola: 'IIS NIRMALA DEWI', email: 'nengjojotek@gmail.com' },
    { nama: 'JATIGEDE', username: 'jatigede', pengelola: 'GUNAWAN', email: 'program.jatigedeket@gmail.com' }
  ];

  // Hash password dan insert kecamatan
  kecamatanData.forEach(async (kc) => {
    const hashedPassword = await bcrypt.hash(kc.username + '123', 10);
    db.run(
      `INSERT OR IGNORE INTO kecamatan (nama, username, password, nama_pengelola, email) 
       VALUES (?, ?, ?, ?, ?)`,
      [kc.nama, kc.username, hashedPassword, kc.pengelola, kc.email]
    );
  });

  // Insert admin
  bcrypt.hash('admin123', 10, (err, hash) => {
    db.run(
      `INSERT OR IGNORE INTO kecamatan (nama, username, password) VALUES (?, ?, ?)`,
      ['ADMIN', 'admin', hash]
    );
  });
});

module.exports = db;