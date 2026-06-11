const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { ensureAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const ScoringSystem = require('../utils/scoring');

// Konfigurasi upload file bukti dukung.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Daftar tabel instrumen yang valid. Nama tabel tetap memakai aspect_* agar kompatibel
// dengan skema database dan view form yang sudah ada.
const INSTRUMENT_TABLES = {
  a: 'aspect_a',
  b: 'aspect_b',
  c: 'aspect_c',
  d: 'aspect_d',
  e: 'aspect_e',
  f: 'aspect_f'
};

// Middleware untuk menentukan kecamatan yang sedang diisi.
// Admin boleh memilih kecamatan lewat query string, kecamatan biasa hanya boleh memakai userId sendiri.
function getKecamatanId(req, res, next) {
  if (req.session.isAdmin && req.query.kecamatan_id) {
    req.kecamatan_id = req.query.kecamatan_id;
  } else {
    req.kecamatan_id = req.session.userId;
  }
  next();
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

// Redirect setelah simpan. Query kecamatan_id tetap dibawa agar admin kembali ke data kecamatan yang sama.
function redirectSaved(req, res, instrument) {
  const params = new URLSearchParams({ saved: '1' });
  if (req.session.isAdmin && req.kecamatan_id) params.set('kecamatan_id', req.kecamatan_id);
  res.redirect(`/assessment/aspect-${instrument}?${params.toString()}`);
}

// Fungsi untuk menghitung dan menyimpan skor semua instrumen A-F setelah salah satu form disimpan.
async function calculateAndSaveScore(kecamatanId) {
  const [aspectAData, aspectBData, aspectCData, aspectDData, aspectEData, aspectFData] = await Promise.all([
    dbGet('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_b WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_c WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_d WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_e WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_f WHERE kecamatan_id = ?', [kecamatanId])
  ]);

  const aspectA = ScoringSystem.calculateAspectA(aspectAData || {});
  const aspectB = ScoringSystem.calculateAspectB(aspectBData || {});
  const aspectC = ScoringSystem.calculateAspectC(aspectCData || {});
  const aspectD = ScoringSystem.calculateAspectD(aspectDData || {});
  const aspectE = ScoringSystem.calculateAspectE(aspectEData || {});
  const aspectF = ScoringSystem.calculateAspectF(aspectFData || {});

  const totalScore = ScoringSystem.calculateTotalScore(aspectA, aspectB, aspectC, aspectD, aspectE, aspectF);

  await Promise.all([
    dbRun('UPDATE aspect_a SET total_score = ? WHERE kecamatan_id = ?', [aspectA.totalScore || 0, kecamatanId]),
    dbRun('UPDATE aspect_b SET total_score = ? WHERE kecamatan_id = ?', [aspectB.totalScore || 0, kecamatanId]),
    dbRun('UPDATE aspect_c SET total_score = ? WHERE kecamatan_id = ?', [aspectC.totalScore || 0, kecamatanId]),
    dbRun('UPDATE aspect_d SET total_score = ? WHERE kecamatan_id = ?', [aspectD.totalScore || 0, kecamatanId]),
    dbRun('UPDATE aspect_e SET total_score = ? WHERE kecamatan_id = ?', [aspectE.totalScore || 0, kecamatanId]),
    dbRun('UPDATE aspect_f SET total_score = ? WHERE kecamatan_id = ?', [aspectF.totalScore || 0, kecamatanId])
  ]);

  return { aspectA, aspectB, aspectC, aspectD, aspectE, aspectF, totalScore };
}

// Builder data yang akan disimpan. Field yang tidak ada di body tidak ditulis,
// sehingga nilai default database tetap aman.
function buildSavePayload(body, fieldMapping, files = {}) {
  const payload = {};

  Object.entries(fieldMapping).forEach(([formField, dbField]) => {
    if (body[formField] !== undefined) payload[dbField] = body[formField];
  });

  Object.entries(files || {}).forEach(([fieldName, uploadedFiles]) => {
    if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      payload[fieldName] = uploadedFiles.map(file => file.filename).join(',');
    }
  });

  return payload;
}

// Upsert generik agar kode POST tiap instrumen ringkas dan bebas typo SQL.
async function saveInstrumentData(tableName, kecamatanId, payload) {
  const existing = await dbGet(`SELECT id FROM ${tableName} WHERE kecamatan_id = ?`, [kecamatanId]);

  if (existing) {
    const setClauses = [];
    const values = [];

    Object.entries(payload).forEach(([field, value]) => {
      setClauses.push(`${field} = ?`);
      values.push(value);
    });

    // Status dan timestamp selalu diperbarui walaupun payload kosong.
    setClauses.push("upload_status = 'Sudah'");
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(kecamatanId);

    await dbRun(`UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE kecamatan_id = ?`, values);
    return;
  }

  const fields = ['kecamatan_id', 'upload_status', ...Object.keys(payload)];
  const values = [kecamatanId, 'Sudah', ...Object.values(payload)];
  const placeholders = fields.map(() => '?').join(', ');

  await dbRun(`INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`, values);
}

// Handler GET generik untuk membuka form instrumen.
function renderInstrument(instrumentKey, viewName) {
  const tableName = INSTRUMENT_TABLES[instrumentKey];

  return async (req, res) => {
    try {
      const row = await dbGet(`SELECT * FROM ${tableName} WHERE kecamatan_id = ?`, [req.kecamatan_id]);
      res.render(viewName, {
        saved: req.query.saved === '1',
        data: row || {},
        kecamatan: req.session.kecamatan,
        isAdmin: req.session.isAdmin,
        kecamatan_id: req.kecamatan_id,
        username: req.session.username
      });
    } catch (err) {
      console.error(`Error fetching instrument ${instrumentKey.toUpperCase()}:`, err);
      res.status(500).send('Error loading data');
    }
  };
}

// Handler POST generik untuk menyimpan form instrumen.
function saveInstrument(instrumentKey, fieldMapping) {
  const tableName = INSTRUMENT_TABLES[instrumentKey];

  return async (req, res) => {
    try {
      const payload = buildSavePayload(req.body || {}, fieldMapping, req.files || {});
      await saveInstrumentData(tableName, req.kecamatan_id, payload);
      await calculateAndSaveScore(req.kecamatan_id);
      redirectSaved(req, res, instrumentKey);
    } catch (err) {
      console.error(`Error saving instrument ${instrumentKey.toUpperCase()}:`, err);
      res.status(500).send('Error saving data');
    }
  };
}

// ==================== INSTRUMEN A ====================
const instrumentAFields = {
  ind_1_status: 'ind_1_status',
  ind_2a_status: 'ind_2a_status',
  ind_2b_status: 'ind_2b_status',
  ind_2c_status: 'ind_2c_status',
  ind_3_status: 'ind_3_status',
  ind_4_jumlah: 'ind_4_jumlah',
  ind_5a_jumlah: 'ind_5a_jumlah',
  ind_5b_jumlah: 'ind_5b_jumlah',
  ind_6_status: 'ind_6_status',
  ind_7_jumlah: 'ind_7_jumlah',
  ind_8_status: 'ind_8_status',
  ind_9a_status: 'ind_9a_status',
  ind_9b_status: 'ind_9b_status',
  ind_9c_status: 'ind_9c_status',
  ind_9d_status: 'ind_9d_status',
  ind_9e_status: 'ind_9e_status',
  ind_10a_status: 'ind_10a_status',
  ind_10b_status: 'ind_10b_status',
  ind_10c_status: 'ind_10c_status',
  ind_10d_status: 'ind_10d_status',
  ind_10e_status: 'ind_10e_status',
  ind_10f_status: 'ind_10f_status',
  ind_10g_status: 'ind_10g_status',
  ind_11_status: 'ind_11_status',
  ind_12a_jumlah: 'ind_12a_jumlah',
  ind_12b_jumlah: 'ind_12b_jumlah',
  ind_13_status: 'ind_13_status',
  ind_14a_status: 'ind_14a_status',
  ind_14b_status: 'ind_14b_status',
  ind_14c_status: 'ind_14c_status',
  ind_15_persen: 'ind_15_persen',
  ind_16_persen: 'ind_16_persen'
};

const uploadInstrumentA = upload.fields([
  { name: 'ind_1_file', maxCount: 1 },
  { name: 'ind_2a_file', maxCount: 1 },
  { name: 'ind_2b_file', maxCount: 1 },
  { name: 'ind_2c_file', maxCount: 1 },
  { name: 'ind_3_file', maxCount: 1 },
  { name: 'ind_4_file', maxCount: 1 },
  { name: 'ind_5a_file', maxCount: 1 },
  { name: 'ind_5b_file', maxCount: 1 },
  { name: 'ind_6_file', maxCount: 1 },
  { name: 'ind_7_file', maxCount: 1 },
  { name: 'ind_8_file', maxCount: 1 },
  { name: 'ind_9_file', maxCount: 1 },
  { name: 'ind_10_file', maxCount: 5 },
  { name: 'ind_11_file', maxCount: 1 },
  { name: 'ind_12_file', maxCount: 1 },
  { name: 'ind_13_file', maxCount: 1 },
  { name: 'ind_14_file', maxCount: 5 },
  { name: 'ind_15_file', maxCount: 1 },
  { name: 'ind_16_file', maxCount: 1 }
]);

router.get('/aspect-a', ensureAuthenticated, getKecamatanId, renderInstrument('a', 'assessment/aspect-a'));
router.post('/aspect-a', ensureAuthenticated, getKecamatanId, uploadInstrumentA, saveInstrument('a', instrumentAFields));

// ==================== INSTRUMEN B ====================
const instrumentBFields = {
  ind_1_jumlah: 'ind_1_jumlah',
  ind_2_jumlah: 'ind_2_jumlah',
  ind_3_jumlah: 'ind_3_jumlah',
  ind_4a_jumlah: 'ind_4a_jumlah',
  ind_4b_jumlah: 'ind_4b_jumlah',
  ind_5_persen: 'ind_5_persen',
  ind_6_jumlah: 'ind_6_jumlah',
  ind_7a_jumlah: 'ind_7a_jumlah',
  ind_7b_jumlah: 'ind_7b_jumlah',
  ind_8a_jumlah: 'ind_8a_jumlah',
  ind_8b_jumlah: 'ind_8b_jumlah',
  ind_9a_jumlah: 'ind_9a_jumlah',
  ind_9b_jumlah: 'ind_9b_jumlah',
  ind_10a_status: 'ind_10a_status',
  ind_10b_status: 'ind_10b_status',
  ind_10c_status: 'ind_10c_status',
  ind_11a_jumlah: 'ind_11a_jumlah',
  ind_11b_jumlah: 'ind_11b_jumlah',
  ind_12a_jumlah: 'ind_12a_jumlah',
  ind_12b_jumlah: 'ind_12b_jumlah',
  ind_13a_jumlah: 'ind_13a_jumlah',
  ind_13b_jumlah: 'ind_13b_jumlah',
  ind_14a_jumlah: 'ind_14a_jumlah',
  ind_14b_jumlah: 'ind_14b_jumlah',
  ind_14c_jumlah: 'ind_14c_jumlah',
  ind_15a_jumlah: 'ind_15a_jumlah',
  ind_15b_jumlah: 'ind_15b_jumlah',
  ind_15c_jumlah: 'ind_15c_jumlah',
  ind_15d_jumlah: 'ind_15d_jumlah',
  ind_16a1_jumlah: 'ind_16a1_jumlah',
  ind_16a2_jumlah: 'ind_16a2_jumlah',
  ind_16a3_jumlah: 'ind_16a3_jumlah',
  ind_16b1_jumlah: 'ind_16b1_jumlah',
  ind_16b2_jumlah: 'ind_16b2_jumlah',
  ind_16b3_jumlah: 'ind_16b3_jumlah',
  ind_17_jumlah: 'ind_17_jumlah',
  ind_18a_jumlah: 'ind_18a_jumlah',
  ind_18b_jumlah: 'ind_18b_jumlah',
  ind_19a_jumlah: 'ind_19a_jumlah',
  ind_19b_jumlah: 'ind_19b_jumlah',
  ind_20a_jumlah: 'ind_20a_jumlah',
  ind_20b_jumlah: 'ind_20b_jumlah',
  ind_20c_jumlah: 'ind_20c_jumlah',
  ind_20d_jumlah: 'ind_20d_jumlah',
  ind_20e_jumlah: 'ind_20e_jumlah',
  ind_21_jumlah: 'ind_21_jumlah',
  ind_22_jumlah: 'ind_22_jumlah',
  ind_23a_jumlah: 'ind_23a_jumlah',
  ind_23b_jumlah: 'ind_23b_jumlah',
  ind_24a_jumlah: 'ind_24a_jumlah',
  ind_24b_jumlah: 'ind_24b_jumlah',
  ind_25a_jumlah: 'ind_25a_jumlah',
  ind_25b_jumlah: 'ind_25b_jumlah',
  ind_26a_jumlah: 'ind_26a_jumlah',
  ind_26b_jumlah: 'ind_26b_jumlah',
  ind_27_jumlah: 'ind_27_jumlah',
  ind_28_persen: 'ind_28_persen',
  ind_29_persen: 'ind_29_persen',
  ind_30_persen: 'ind_30_persen',
  ind_31_persen: 'ind_31_persen',
  ind_32_persen: 'ind_32_persen',
  ind_33a_jumlah: 'ind_33a_jumlah',
  ind_33b_jumlah: 'ind_33b_jumlah',
  ind_33c_jumlah: 'ind_33c_jumlah',
  ind_33d_jumlah: 'ind_33d_jumlah',
  ind_34_persen: 'ind_34_persen',
  ind_35_persen: 'ind_35_persen',
  ind_36_persen: 'ind_36_persen',
  ind_37_persen: 'ind_37_persen',
  ind_38a_jumlah: 'ind_38a_jumlah',
  ind_39_persen: 'ind_39_persen',
  ind_40_persen: 'ind_40_persen',
  ind_41_nilai: 'ind_41_nilai',
  ind_42_status: 'ind_42_status',
  ind_43_status: 'ind_43_status'
};

router.get('/aspect-b', ensureAuthenticated, getKecamatanId, renderInstrument('b', 'assessment/aspect-b'));
router.post('/aspect-b', ensureAuthenticated, getKecamatanId, upload.any(), saveInstrument('b', instrumentBFields));

// ==================== INSTRUMEN C ====================
const instrumentCFields = [
  'ind_1a', 'ind_1b', 'ind_1c', 'ind_1d',
  'ind_2a', 'ind_2b',
  'ind_3a', 'ind_3b', 'ind_3c', 'ind_3d', 'ind_3e', 'ind_3f',
  'ind_4',
  'ind_5a', 'ind_5b', 'ind_5c', 'ind_5d', 'ind_5e', 'ind_5f', 'ind_5g',
  'ind_6a', 'ind_6b'
].reduce((mapping, field) => ({ ...mapping, [field]: field }), {});

router.get('/aspect-c', ensureAuthenticated, getKecamatanId, renderInstrument('c', 'assessment/aspect-c'));
router.post('/aspect-c', ensureAuthenticated, getKecamatanId, upload.any(), saveInstrument('c', instrumentCFields));

// ==================== INSTRUMEN D ====================
const instrumentDFields = [
  'ind_1a_nama', 'ind_1b_nama',
  'ind_2a_jumlah', 'ind_2b_jumlah',
  'ind_3_jumlah',
  'ind_4a_nasional', 'ind_4a_provinsi', 'ind_4a_kabupaten',
  'ind_4b_nasional', 'ind_4b_provinsi'
].reduce((mapping, field) => ({ ...mapping, [field]: field }), {});

router.get('/aspect-d', ensureAuthenticated, getKecamatanId, renderInstrument('d', 'assessment/aspect-d'));
router.post('/aspect-d', ensureAuthenticated, getKecamatanId, upload.any(), saveInstrument('d', instrumentDFields));

// ==================== INSTRUMEN E ====================
const instrumentEFields = [
  'ind_1a_sd', 'ind_1b_smp', 'ind_1c_sma', 'ind_1d_d3', 'ind_1e_s1', 'ind_1f_s2', 'ind_1g_s3',
  'ind_1_persen_tertinggi',
  'ind_2_jumlah',
  'ind_3_jumlah',
  'ind_4_jumlah',
  'ind_5_status'
].reduce((mapping, field) => ({ ...mapping, [field]: field }), {});

router.get('/aspect-e', ensureAuthenticated, getKecamatanId, renderInstrument('e', 'assessment/aspect-e'));
router.post('/aspect-e', ensureAuthenticated, getKecamatanId, upload.any(), saveInstrument('e', instrumentEFields));

// ==================== INSTRUMEN F ====================
const instrumentFFields = Array.from({ length: 40 }, (_, index) => `ind_${index + 1}_status`)
  .reduce((mapping, field) => ({ ...mapping, [field]: field }), {});

router.get('/aspect-f', ensureAuthenticated, getKecamatanId, renderInstrument('f', 'assessment/aspect-f'));
router.post('/aspect-f', ensureAuthenticated, getKecamatanId, upload.any(), saveInstrument('f', instrumentFFields));

// ==================== SKORING ====================
router.get('/scoring', ensureAuthenticated, getKecamatanId, async (req, res) => {
  try {
    const scoringResult = await calculateAndSaveScore(req.kecamatan_id);
    res.render('assessment/scoring-result', {
      scoring: scoringResult.totalScore,
      kecamatan: req.session.kecamatan,
      isAdmin: req.session.isAdmin,
      kecamatan_id: req.kecamatan_id,
      username: req.session.username
    });
  } catch (err) {
    console.error('Error calculating score:', err);
    res.status(500).send('Error calculating score');
  }
});

// ==================== FILE BUKTI DUKUNG ====================
router.get('/files/:instrument', ensureAuthenticated, getKecamatanId, async (req, res) => {
  try {
    const instrumentKey = String(req.params.instrument || '').toLowerCase();
    const tableName = INSTRUMENT_TABLES[instrumentKey];

    if (!tableName) return res.status(400).json({ files: [] });

    const row = await dbGet(`SELECT * FROM ${tableName} WHERE kecamatan_id = ?`, [req.kecamatan_id]);
    if (!row) return res.json({ files: [] });

    const files = Object.keys(row)
      .filter(key => key.includes('_file') && row[key])
      .flatMap(fieldName => String(row[fieldName]).split(',')
        .map(fileName => fileName.trim())
        .filter(Boolean)
        .map(fileName => ({
          fieldName,
          fileName,
          url: `/uploads/${fileName}`
        })));

    res.json({ files });
  } catch (err) {
    console.error('Error fetching uploaded files:', err);
    res.status(500).json({ files: [] });
  }
});

router.get('/download/:filename', ensureAuthenticated, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, '..', 'uploads', filename);

  res.download(filePath, filename, (err) => {
    if (err) res.status(404).send('File tidak ditemukan');
  });
});

module.exports = router;
