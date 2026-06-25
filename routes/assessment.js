const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { ensureAuthenticated, canAccessKecamatan } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ScoringSystem = require('../utils/scoring');
const EVALUATION_QUESTIONS = require('../data/evaluation-questions.json');
const { getInstrumentStandard, expandEvidenceKeys } = require('../utils/standards');
const { getDeadline, isDeadlineExpired } = require('../utils/deadline');
const {
  INSTRUMENTS, hasValue, parseFilledFields, inferMeaningfulLegacyFields,
  sanitizeLegacyRow, calculateInstrumentProgress
} = require('../utils/progress');

const {
  ensureEvidenceDirectory,
  buildStoredFilename,
  toPosixRelative,
  resolveAssessmentFilePath,
  resolveLegacyRootFile
} = require('../utils/storage');

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'
]);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'application/octet-stream'
]);
const MAX_FILE_MB = Math.max(1, Number(process.env.MAX_FILE_MB || 30));
const MAX_UPLOAD_REQUEST_MB = Math.max(1, Number(process.env.MAX_UPLOAD_REQUEST_MB || 100));
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MAX_UPLOAD_REQUEST_BYTES = MAX_UPLOAD_REQUEST_MB * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const instrument = req.currentInstrument;
      const indicatorKey = toMainIndicatorKey(file.fieldname);
      const directory = ensureEvidenceDirectory({
        kecamatanId: req.kecamatan_id,
        kecamatanName: req.targetKecamatan && req.targetKecamatan.nama,
        instrument,
        indicatorKey
      });
      file.sieselonIndicatorKey = indicatorKey;
      file.sieselonRelativeDir = directory.relativeDir;
      cb(null, directory.absoluteDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      cb(null, buildStoredFilename(file.originalname));
    } catch (error) {
      cb(error);
    }
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 120
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return cb(new Error(`Jenis file ${extension || '(tanpa ekstensi)'} tidak diizinkan.`));
    }
    if (file.mimetype && !ALLOWED_MIME_TYPES.has(String(file.mimetype).toLowerCase())) {
      return cb(new Error(`Tipe isi file ${file.mimetype} tidak diizinkan.`));
    }
    cb(null, true);
  }
});

const INSTRUMENT_TABLES = {
  a: 'aspect_a',
  b: 'aspect_b',
  c: 'aspect_c',
  d: 'aspect_d',
  e: 'aspect_e',
  f: 'aspect_f'
};

const REQUIRED_EVIDENCE = {
  a: [
    'ind_1',
    'ind_2a', 'ind_2b', 'ind_2c',
    'ind_3', 'ind_4',
    'ind_5a', 'ind_5b',
    'ind_6', 'ind_7', 'ind_8',
    'ind_9a', 'ind_9b', 'ind_9c', 'ind_9d', 'ind_9e',
    'ind_10a', 'ind_10b', 'ind_10c', 'ind_10d', 'ind_10e', 'ind_10f', 'ind_10g',
    'ind_11',
    'ind_12a', 'ind_12b',
    'ind_13',
    'ind_14a', 'ind_14b', 'ind_14c',
    'ind_15', 'ind_16'
  ],
  b: EVALUATION_QUESTIONS.B.questions.flatMap(question => question.evidence.map(item => item.key)),
  c: Array.from({ length: 6 }, (_, index) => `ind_${index + 1}`),
  d: EVALUATION_QUESTIONS.D.questions.flatMap(question => question.evidence.map(item => item.key)),
  e: Array.from({ length: 5 }, (_, index) => `ind_${index + 1}`),
  f: Array.from({ length: 40 }, (_, index) => `ind_${index + 1}`)
};

// Seluruh instrumen hanya memperbolehkan satu berkas aktif untuk setiap indikator utama.
// Pengguna harus menghapus berkas lama terlebih dahulu sebelum mengunggah pengganti.
const SINGLE_EVIDENCE_PER_INDICATOR = new Set(['a', 'b', 'c', 'd', 'e', 'f']);

const B_PARENT_KEYS_WITH_SUBEVIDENCE = new Set(
  EVALUATION_QUESTIONS.B.questions
    .filter(question => question.evidence.length > 1)
    .map(question => question.key)
);

const CHOICE_QUESTIONS = Object.freeze(
  Object.fromEntries(
    Object.entries(EVALUATION_QUESTIONS).map(([code, instrument]) => [
      code.toLowerCase(),
      Object.freeze(Object.fromEntries(
        instrument.questions
          .filter(question => question.answerType === 'single_choice_with_evidence')
          .map(question => [Number(question.number), Object.freeze({
            number: Number(question.number),
            field: String(question.field),
            parentKey: String(question.key),
            options: Object.freeze(Object.fromEntries((question.options || []).map(option => [
              String(option.key),
              Object.freeze({ evidenceKey: String(option.evidenceKey), score: Number(option.score) })
            ])))
          })])
      ))
    ])
  )
);

const B_CHOICE_QUESTIONS = CHOICE_QUESTIONS.b || Object.freeze({});

function normalizeChoice(value, allowed) {
  const normalized = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(allowed, normalized) ? normalized : null;
}

function inferChoice(instrument, questionNumber, row = {}) {
  const config = (CHOICE_QUESTIONS[instrument] || {})[Number(questionNumber)];
  if (!config) return null;
  const explicit = normalizeChoice(row[config.field], config.options);
  if (explicit) return explicit;

  if (instrument === 'b' && Number(questionNumber) === 3) {
    const legacy = Number(row.ind_3_jumlah);
    if (legacy >= 1 && legacy < 5) return 'a';
    if (legacy >= 6 && legacy <= 11) return 'b';
    if (legacy >= 12 && legacy <= 35) return 'c';
    if (legacy >= 36 && legacy <= 48) return 'd';
  }
  if (instrument === 'b' && Number(questionNumber) === 27) {
    const legacy = Number(row.ind_27_jumlah);
    if (legacy >= 1 && legacy <= 4) return 'b';
    if (legacy >= 5 && legacy <= 8) return 'c';
    if (legacy >= 9) return 'd';
  }
  if (instrument === 'b' && Number(questionNumber) === 41) {
    const legacy = String(row.ind_41_nilai || '').trim().toUpperCase();
    if (['A', 'AA', 'A-AA'].includes(legacy)) return 'a';
    if (['B', 'BB', 'B-BB'].includes(legacy)) return 'b';
    if (['C', 'CC', 'C-CC'].includes(legacy)) return 'c';
    if (['D', 'DD', 'D-DD'].includes(legacy)) return 'd';
  }
  if (instrument === 'd' && Number(questionNumber) === 3) {
    const legacy = Number(row.ind_3_jumlah);
    if (legacy >= 1 && legacy <= 5) return 'a';
    if (legacy >= 6 && legacy <= 10) return 'b';
    if (legacy >= 11 && legacy <= 15) return 'c';
    if (legacy > 15) return 'd';
  }
  return null;
}

function inferBChoice(questionNumber, row = {}) {
  return inferChoice('b', questionNumber, row);
}

function requiredEvidenceFor(instrument, row = {}) {
  let required = [...(REQUIRED_EVIDENCE[instrument] || [])];
  for (const config of Object.values(CHOICE_QUESTIONS[instrument] || {})) {
    const optionKeys = new Set(Object.values(config.options).map(item => item.evidenceKey));
    required = required.filter(key => !optionKeys.has(key));
    const selected = inferChoice(instrument, config.number, row);
    required.push(selected ? config.options[selected].evidenceKey : config.parentKey);
  }
  return required;
}

async function validateChoiceUploads({ instrument, body, files }) {
  const normalizedFiles = normalizeFiles(files);
  for (const config of Object.values(CHOICE_QUESTIONS[instrument] || {})) {
    const optionKeys = new Set(Object.values(config.options).map(item => item.evidenceKey));
    const choiceFiles = normalizedFiles.filter(file => optionKeys.has(toMainIndicatorKey(file.fieldname)));
    if (choiceFiles.length === 0) continue;
    const selected = normalizeChoice(body && body[config.field], config.options);
    const expectedKey = selected ? config.options[selected].evidenceKey : null;
    const invalid = choiceFiles.some(file => toMainIndicatorKey(file.fieldname) !== expectedKey);
    if (!expectedKey || invalid) {
      await removeNewlyUploadedFiles(normalizedFiles);
      const error = new Error(`Pilih satu jawaban pada Pertanyaan ${config.number} dan unggah data hanya pada pilihan yang aktif.`);
      error.code = 'INVALID_CHOICE_EVIDENCE';
      throw error;
    }
  }
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err, result) => (err ? reject(err) : resolve(result || {})));
  });
}


async function getFinalEvaluation(kecamatanId) {
  return dbGet(
    `SELECT status, total_score, max_score, percentage, category, finalized_at
     FROM evaluation_results WHERE kecamatan_id = ?`,
    [kecamatanId]
  );
}

async function ensureAssessmentEditable(req, res, next) {
  try {
    const result = await getFinalEvaluation(req.kecamatan_id);
    if (result && result.status === 'Final') {
      return res.status(423).send('Instrumen dikunci karena hasil evaluasi telah difinalkan. Administrator harus membuka kembali hasil evaluasi sebelum data dapat diubah.');
    }
    next();
  } catch (error) {
    console.error('Gagal memeriksa kunci evaluasi:', error);
    res.status(500).send('Gagal memeriksa status evaluasi.');
  }
}

function ensureCanEditInstrument(req, res, next) {
  if (req.session.role === 'evaluator') {
    return res.status(403).send('Evaluator hanya dapat memeriksa dan menilai, bukan mengubah isian kecamatan.');
  }
  next();
}

async function ensureBeforeDeadline(req, res, next) {
  try {
    if (req.session.role !== 'kecamatan') return next();
    const deadline = await getDeadline(db);
    if (isDeadlineExpired(deadline)) {
      return res.status(423).send(
        `Batas waktu pengisian telah berakhir pada ${deadline}. ` +
        'Akun kecamatan tidak dapat menyimpan isian atau mengunggah bukti lagi.'
      );
    }
    next();
  } catch (error) {
    console.error('Gagal memeriksa batas waktu:', error);
    res.status(500).send('Gagal memeriksa batas waktu pengisian.');
  }
}

async function resetEvaluationReview(kecamatanId, instrumentKey, actorId, reason) {
  const instrument = String(instrumentKey || '').toUpperCase();
  const previous = await dbGet(
    'SELECT status, notes FROM evaluation_reviews WHERE kecamatan_id = ? AND instrument = ?',
    [kecamatanId, instrument]
  );

  await dbRun(
    `INSERT INTO evaluation_reviews
      (kecamatan_id, instrument, status, notes, reviewed_by, reviewed_at, updated_at)
     VALUES (?, ?, 'Belum Dinilai', NULL, NULL, NULL, CURRENT_TIMESTAMP)
     ON CONFLICT(kecamatan_id, instrument)
     DO UPDATE SET status = 'Belum Dinilai', notes = NULL, reviewed_by = NULL,
       reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP`,
    [kecamatanId, instrument]
  );

  if (previous && previous.status !== 'Belum Dinilai') {
    await dbRun(
      `INSERT INTO evaluation_history
        (kecamatan_id, instrument, action, previous_status, new_status, notes, actor_id, created_at)
       VALUES (?, ?, ?, ?, 'Belum Dinilai', ?, ?, CURRENT_TIMESTAMP)`,
      [kecamatanId, instrument, 'Data instrumen diperbarui', previous.status, reason || null, actorId]
    );
  }
}

async function getKecamatanId(req, res, next) {
  try {
    let targetId = req.session.userId;
    if (req.session.isAdmin && req.query.kecamatan_id) {
      targetId = Number.parseInt(req.query.kecamatan_id, 10);
    }

    if (!Number.isInteger(Number(targetId)) || Number(targetId) <= 0) {
      return res.status(400).send('Kecamatan tidak valid.');
    }

    const target = await dbGet(
      `SELECT id, nama, username, role FROM kecamatan WHERE id = ?`,
      [targetId]
    );

    if (!target || target.role !== 'kecamatan') {
      return res.status(404).send('Kecamatan tidak ditemukan.');
    }

    if (!(await canAccessKecamatan(req.session.userId, req.session.role, target.id))) {
      return res.status(403).send('Kecamatan ini bukan wilayah kerja akun Anda.');
    }

    req.kecamatan_id = Number(target.id);
    req.targetKecamatan = target;
    next();
  } catch (error) {
    console.error('Error validating kecamatan:', error);
    res.status(500).send('Gagal memvalidasi kecamatan.');
  }
}

function setInstrumentContext(instrument) {
  return (req, res, next) => {
    req.currentInstrument = String(instrument || '').toLowerCase();
    next();
  };
}

function redirectSaved(req, res, instrument, result = {}) {
  const params = new URLSearchParams({
    saved: '1',
    status: result.status || 'Draft',
    missing_data: String(result.missingData || 0),
    missing_files: String(result.missingFiles || 0)
  });
  if (req.session.isAdmin && req.kecamatan_id) {
    params.set('kecamatan_id', String(req.kecamatan_id));
  }
  res.redirect(`/assessment/instrument-${instrument}?${params.toString()}`);
}

function normalizeFiles(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return Object.values(files).flatMap(value => (Array.isArray(value) ? value : []));
}

function parseLegacyFileNames(value) {
  return String(value || '')
    .split(/,\s*(?=\d{10,}[-_])/)
    .map(fileName => fileName.trim())
    .filter(Boolean);
}

function toMainIndicatorKey(fieldName) {
  let normalized = String(fieldName || '').trim()
    .replace(/^file_(\d+[a-z]?\d*)$/i, 'ind_$1_file')
    .replace(/_file$/i, '')
    .toLowerCase();

  const match = normalized.match(/^ind_(\d+)([a-z]?)(\d*)$/i);
  if (!match) return normalized;

  const number = Number.parseInt(match[1], 10);
  const letter = match[2] || '';
  const subNumber = match[3] || '';
  return `ind_${number}${letter}${subNumber}`;
}

function indicatorSortParts(indicatorKey) {
  const match = String(indicatorKey || '').toLowerCase().match(/^ind_(\d+)([a-z]?)(\d*)$/);
  if (!match) return [Number.MAX_SAFE_INTEGER, 99, Number.MAX_SAFE_INTEGER];
  return [
    Number.parseInt(match[1], 10),
    match[2] ? match[2].charCodeAt(0) - 96 : 0,
    match[3] ? Number.parseInt(match[3], 10) : 0
  ];
}

function compareIndicatorKeys(firstKey, secondKey) {
  const first = indicatorSortParts(firstKey);
  const second = indicatorSortParts(secondKey);
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) return first[index] - second[index];
  }
  return 0;
}

function formatIndicatorLabel(indicatorKey) {
  const match = String(indicatorKey || '').toLowerCase().match(/^ind_(\d+)([a-z]?)(\d*)$/);
  if (!match) return String(indicatorKey || 'Bukti');
  const suffix = match[2] ? `.${match[2]}${match[3] || ''}` : '';
  return `Indikator ${Number.parseInt(match[1], 10)}${suffix}`;
}

function sortEvidenceFiles(files) {
  return [...(files || [])].sort((first, second) => {
    const keyDifference = compareIndicatorKeys(first.indicatorKey, second.indicatorKey);
    if (keyDifference !== 0) return keyDifference;

    const firstTime = first.uploadedAt ? new Date(first.uploadedAt).getTime() : 0;
    const secondTime = second.uploadedAt ? new Date(second.uploadedAt).getTime() : 0;
    if (firstTime !== secondTime) return secondTime - firstTime;

    return String(first.fileName || '').localeCompare(String(second.fileName || ''), 'id');
  });
}

async function removeNewlyUploadedFiles(files) {
  await Promise.all((files || []).map(file =>
    fs.promises.unlink(file.path).catch(error => {
      if (error.code !== 'ENOENT') console.error('Gagal membersihkan file upload:', error);
    })
  ));
}

async function enforceTotalUploadLimit(req, res, next) {
  const files = normalizeFiles(req.files);
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  if (totalBytes <= MAX_UPLOAD_REQUEST_BYTES) return next();

  await removeNewlyUploadedFiles(files);
  return res.status(413).send(
    `Total ukuran file dalam satu pengiriman melebihi ${MAX_UPLOAD_REQUEST_MB} MB. Silakan kompres PDF atau upload bukti secara bertahap.`
  );
}

function normalizeValue(fieldName, value) {
  if (value === undefined) return undefined;
  if (typeof value === 'string') value = value.trim();
  if (value === '') return null;

  const numericField = /(_jumlah|_persen|_sd|_smp|_sma|_d3|_s1|_s2|_s3|_nasional|_provinsi|_kabupaten|_program|_indikator)$/.test(fieldName)
    || /^ind_(3[a-f]|5[a-g]|6[ab])$/.test(fieldName);

  if (numericField) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return value;
}

function buildSavePayload(body, fieldMapping) {
  const payload = {};
  Object.entries(fieldMapping).forEach(([formField, dbField]) => {
    if (body[formField] !== undefined) {
      payload[dbField] = normalizeValue(dbField, body[formField]);
    }
  });
  return payload;
}

function getFilledFields(body, instrumentKey) {
  const definition = INSTRUMENTS[instrumentKey];
  if (!definition) return [];
  return definition.fields.filter(field => hasValue(body[field]));
}

function countMissingData(body, instrumentKey) {
  const definition = INSTRUMENTS[instrumentKey];
  if (!definition) return 0;
  return definition.fields.length - getFilledFields(body, instrumentKey).length;
}

async function saveProgressState(kecamatanId, instrumentKey, filledFields) {
  await dbRun(
    `INSERT INTO assessment_progress (kecamatan_id, instrument, filled_fields, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(kecamatan_id, instrument)
     DO UPDATE SET filled_fields = excluded.filled_fields, updated_at = CURRENT_TIMESTAMP`,
    [kecamatanId, instrumentKey.toUpperCase(), JSON.stringify(filledFields)]
  );
}

function safePercentage(numerator, denominator) {
  const top = Number(numerator);
  const bottom = Number(denominator);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= 0) return null;
  return Math.max(0, Math.min(100, (top / bottom) * 100));
}

function enrichDerivedPayload(instrumentKey, payload) {
  if (instrumentKey !== 'b') return payload;
  const pairs = [28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 39, 40];
  for (const number of pairs) {
    payload[`ind_${number}_persen`] = safePercentage(
      payload[`ind_${number}a_jumlah`],
      payload[`ind_${number}b_jumlah`]
    );
  }
  return payload;
}

async function saveInstrumentData(tableName, kecamatanId, payload, status) {
  const existing = await dbGet(`SELECT id FROM ${tableName} WHERE kecamatan_id = ?`, [kecamatanId]);

  if (existing) {
    const setClauses = [];
    const values = [];

    Object.entries(payload).forEach(([field, value]) => {
      setClauses.push(`${field} = ?`);
      values.push(value);
    });

    setClauses.push('upload_status = ?');
    values.push(status);
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(kecamatanId);

    await dbRun(`UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE kecamatan_id = ?`, values);
    return;
  }

  const fields = ['kecamatan_id', 'upload_status', ...Object.keys(payload)];
  const values = [kecamatanId, status, ...Object.values(payload)];
  const placeholders = fields.map(() => '?').join(', ');
  await dbRun(`INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`, values);
}

async function saveUploadedFiles({ kecamatanId, instrument, files, uploadedBy }) {
  const normalizedFiles = normalizeFiles(files);
  if (normalizedFiles.length === 0) return [];

  if (SINGLE_EVIDENCE_PER_INDICATOR.has(instrument)) {
    const existingEvidence = await evidenceStatus(kecamatanId, instrument);
    const existingKeys = new Set([...existingEvidence.keys].map(toMainIndicatorKey));
    const requestKeys = new Set();
    const duplicateKeys = new Set();

    normalizedFiles.forEach(file => {
      const indicatorKey = toMainIndicatorKey(file.fieldname);
      if (existingKeys.has(indicatorKey) || requestKeys.has(indicatorKey)) {
        duplicateKeys.add(indicatorKey);
      }
      requestKeys.add(indicatorKey);
    });

    if (duplicateKeys.size > 0) {
      await removeNewlyUploadedFiles(normalizedFiles);
      const indicatorLabels = [...duplicateKeys]
        .sort(compareIndicatorKeys)
        .map(formatIndicatorLabel)
        .join(', ');
      const error = new Error(
        `Bukti ${indicatorLabels} sudah tersimpan. Hapus bukti lama terlebih dahulu sebelum mengunggah pengganti.`
      );
      error.code = 'DUPLICATE_EVIDENCE';
      throw error;
    }
  }

  const saved = [];

  for (const file of normalizedFiles) {
    const indicatorKey = toMainIndicatorKey(file.fieldname);
    try {
      await dbRun(
        `INSERT INTO assessment_files
          (kecamatan_id, instrument, indicator_key, original_name, stored_name, relative_path, mime_type, size_bytes, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          kecamatanId,
          instrument.toUpperCase(),
          indicatorKey,
          file.originalname,
          file.filename,
          toPosixRelative(file.path),
          file.mimetype || null,
          file.size || 0,
          uploadedBy || null
        ]
      );
      saved.push({ indicatorKey, file });
    } catch (error) {
      fs.unlink(file.path, () => {});
      throw error;
    }
  }

  return saved;
}

async function listUploadedFiles(kecamatanId, instrument) {
  const rows = await dbAll(
    `SELECT id, indicator_key, original_name, stored_name, relative_path, mime_type, size_bytes, uploaded_at
     FROM assessment_files
     WHERE kecamatan_id = ? AND instrument = ?
     ORDER BY indicator_key, uploaded_at DESC`,
    [kecamatanId, instrument.toUpperCase()]
  );

  return sortEvidenceFiles(rows.map(row => ({
    id: row.id,
    indicatorKey: row.indicator_key,
    fieldName: `${row.indicator_key}_file`,
    fileName: row.original_name,
    storedName: row.stored_name,
    relativePath: row.relative_path || null,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0),
    uploadedAt: row.uploaded_at,
    url: `/assessment/download/${row.id}`,
    legacy: false,
    unmappedSubindicator: (
      instrument === 'a' && ['ind_2', 'ind_5', 'ind_9', 'ind_10', 'ind_12', 'ind_14'].includes(toMainIndicatorKey(row.indicator_key))
    ) || (instrument === 'b' && B_PARENT_KEYS_WITH_SUBEVIDENCE.has(toMainIndicatorKey(row.indicator_key)))
  })));
}

async function listLegacyFiles(kecamatanId, instrument) {
  if (instrument !== 'a') return [];
  const row = await dbGet('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [kecamatanId]);
  if (!row) return [];

  return Object.keys(row)
    .filter(key => key.endsWith('_file') && row[key])
    .flatMap(fieldName =>
      parseLegacyFileNames(row[fieldName])
        .map(fileName => ({ fieldName, fileName }))
    )
    .filter(item => item.fileName)
    .map(({ fieldName, fileName }) => ({
      id: null,
      indicatorKey: toMainIndicatorKey(fieldName),
      fieldName,
      fileName,
      storedName: fileName,
      sizeBytes: 0,
      uploadedAt: null,
      url: `/assessment/download-legacy/a/${encodeURIComponent(fileName)}?kecamatan_id=${kecamatanId}`,
      legacy: true,
      unmappedSubindicator: ['ind_2', 'ind_5', 'ind_9', 'ind_10', 'ind_12', 'ind_14'].includes(toMainIndicatorKey(fieldName))
    }));
}

async function evidenceStatus(kecamatanId, instrument, answerRow = null) {
  const modern = await listUploadedFiles(kecamatanId, instrument);
  const legacy = await listLegacyFiles(kecamatanId, instrument);
  const keys = expandEvidenceKeys(instrument, new Set([...modern, ...legacy].map(file => toMainIndicatorKey(file.indicatorKey))));
  let row = answerRow;
  if (!row && Object.keys(CHOICE_QUESTIONS[instrument] || {}).length > 0) {
    row = await dbGet(`SELECT * FROM ${INSTRUMENT_TABLES[instrument]} WHERE kecamatan_id = ?`, [kecamatanId]);
  }
  const requiredKeys = requiredEvidenceFor(instrument, row || {});
  const missingKeys = requiredKeys.filter(key => !keys.has(key));
  return { files: sortEvidenceFiles([...modern, ...legacy]), keys, requiredKeys, missingKeys };
}

async function calculateAndSaveScore(kecamatanId) {
  const [
    aspectAData, aspectBData, aspectCData, aspectDData, aspectEData, aspectFData,
    evidenceA, evidenceB, evidenceC, evidenceD, evidenceE, evidenceF
  ] = await Promise.all([
    dbGet('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_b WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_c WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_d WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_e WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_f WHERE kecamatan_id = ?', [kecamatanId]),
    evidenceStatus(kecamatanId, 'a'),
    evidenceStatus(kecamatanId, 'b'),
    evidenceStatus(kecamatanId, 'c'),
    evidenceStatus(kecamatanId, 'd'),
    evidenceStatus(kecamatanId, 'e'),
    evidenceStatus(kecamatanId, 'f')
  ]);

  const aspectA = ScoringSystem.calculateAspectA(aspectAData || {}, evidenceA.keys);
  const aspectB = ScoringSystem.calculateAspectB(aspectBData || {}, evidenceB.keys);
  const aspectC = ScoringSystem.calculateAspectC(aspectCData || {}, evidenceC.keys);
  const aspectD = ScoringSystem.calculateAspectD(aspectDData || {}, evidenceD.keys);
  const aspectE = ScoringSystem.calculateAspectE(aspectEData || {}, evidenceE.keys);
  const aspectF = ScoringSystem.calculateAspectF(aspectFData || {}, evidenceF.keys);
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

function renderInstrument(instrumentKey, viewName) {
  const tableName = INSTRUMENT_TABLES[instrumentKey];

  return async (req, res) => {
    try {
      const row = await dbGet(`SELECT * FROM ${tableName} WHERE kecamatan_id = ?`, [req.kecamatan_id]);
      const [evidence, progressRow, finalEvaluation, evaluationReview, deadline] = await Promise.all([
        evidenceStatus(req.kecamatan_id, instrumentKey, row || {}),
        dbGet(
          `SELECT filled_fields FROM assessment_progress WHERE kecamatan_id = ? AND instrument = ?`,
          [req.kecamatan_id, instrumentKey.toUpperCase()]
        ),
        getFinalEvaluation(req.kecamatan_id),
        dbGet(
          `SELECT status, notes, reviewed_at FROM evaluation_reviews
           WHERE kecamatan_id = ? AND instrument = ?`,
          [req.kecamatan_id, instrumentKey.toUpperCase()]
        ),
        getDeadline(db)
      ]);
      const deadlineLocked = req.session.role === 'kecamatan' && isDeadlineExpired(deadline);
      const storedFilledFields = progressRow ? parseFilledFields(progressRow.filled_fields) : null;
      const effectiveFilledFields = storedFilledFields || inferMeaningfulLegacyFields(
        row || {},
        INSTRUMENTS[instrumentKey].fields
      );
      const displayRow = storedFilledFields
        ? (row || {})
        : sanitizeLegacyRow(row || {}, INSTRUMENTS[instrumentKey].fields, effectiveFilledFields);
      const progress = calculateInstrumentProgress({
        instrument: instrumentKey,
        row: displayRow,
        filledFields: effectiveFilledFields,
        evidenceKeys: evidence.keys,
        requiredEvidenceKeys: evidence.requiredKeys
      });

      res.render(viewName, {
        saved: req.query.saved === '1',
        saveResult: {
          status: req.query.status || null,
          missingData: Number(req.query.missing_data || 0),
          missingFiles: Number(req.query.missing_files || 0)
        },
        data: displayRow,
        uploadedFiles: evidence.files,
        missingEvidenceKeys: evidence.missingKeys,
        progress,
        standard: req.session.role === 'superadmin' ? getInstrumentStandard(instrumentKey) : null,
        activeStandard: req.session.role === 'superadmin' ? getInstrumentStandard(instrumentKey) : null,
        questionDefinitions: (EVALUATION_QUESTIONS[instrumentKey.toUpperCase()] || {}).questions || [],
        evaluationLocked: Boolean(finalEvaluation && finalEvaluation.status === 'Final') || deadlineLocked,
        deadlineLocked,
        deadline,
        lockReason: deadlineLocked
          ? `Batas waktu pengisian berakhir pada ${deadline}. Isian dan upload bukti telah dikunci.`
          : null,
        finalEvaluation: finalEvaluation || null,
        evaluationReview: evaluationReview || { status: 'Belum Dinilai', notes: '' },
        kecamatan: req.targetKecamatan.nama,
        isAdmin: req.session.isAdmin,
        kecamatan_id: req.kecamatan_id,
        username: req.session.username,
        userRole: req.session.role || 'guest'
      });
    } catch (error) {
      console.error(`Error fetching instrument ${instrumentKey.toUpperCase()}:`, error);
      res.status(500).send('Error loading data');
    }
  };
}

function saveInstrument(instrumentKey, fieldMapping) {
  const tableName = INSTRUMENT_TABLES[instrumentKey];

  return async (req, res) => {
    const uploadedFiles = normalizeFiles(req.files);
    try {
      const payload = enrichDerivedPayload(instrumentKey, buildSavePayload(req.body || {}, fieldMapping));
      await validateChoiceUploads({ instrument: instrumentKey, body: req.body || {}, files: uploadedFiles });
      await saveUploadedFiles({
        kecamatanId: req.kecamatan_id,
        instrument: instrumentKey,
        files: uploadedFiles,
        uploadedBy: req.session.userId
      });

      const filledFields = getFilledFields(req.body || {}, instrumentKey);
      const missingData = countMissingData(req.body || {}, instrumentKey);
      const evidence = await evidenceStatus(req.kecamatan_id, instrumentKey, payload);
      const missingFiles = evidence.missingKeys.length;
      const action = req.body.save_action === 'draft' ? 'draft' : 'final';
      const status = action === 'draft'
        ? 'Draft'
        : (missingData === 0 && missingFiles === 0 ? 'Sudah' : 'Belum Lengkap');

      await saveInstrumentData(tableName, req.kecamatan_id, payload, status);
      await saveProgressState(req.kecamatan_id, instrumentKey, filledFields);
      await calculateAndSaveScore(req.kecamatan_id);
      await resetEvaluationReview(
        req.kecamatan_id,
        instrumentKey,
        req.session.userId,
        status === 'Sudah' ? 'Instrumen dikirim ulang untuk diverifikasi.' : 'Data instrumen disimpan kembali.'
      );
      redirectSaved(req, res, instrumentKey, { status, missingData, missingFiles });
    } catch (error) {
      console.error(`Error saving instrument ${instrumentKey.toUpperCase()}:`, error);
      const message = error && error.message ? error.message : 'Error saving data';
      const statusCode = error && ['DUPLICATE_EVIDENCE', 'INVALID_CHOICE_EVIDENCE'].includes(error.code) ? 400 : 500;
      res.status(statusCode).send(`Gagal menyimpan data: ${message}`);
    }
  };
}

const instrumentAFields = {
  ind_1_status: 'ind_1_status',
  ind_2a_status: 'ind_2a_status', ind_2b_status: 'ind_2b_status', ind_2c_status: 'ind_2c_status',
  ind_3_status: 'ind_3_status', ind_4_jumlah: 'ind_4_jumlah',
  ind_5a_jumlah: 'ind_5a_jumlah', ind_5b_jumlah: 'ind_5b_jumlah',
  ind_6_status: 'ind_6_status', ind_7_jumlah: 'ind_7_jumlah', ind_8_status: 'ind_8_status',
  ind_9a_status: 'ind_9a_status', ind_9b_status: 'ind_9b_status', ind_9c_status: 'ind_9c_status',
  ind_9d_status: 'ind_9d_status', ind_9e_status: 'ind_9e_status',
  ind_10a_status: 'ind_10a_status', ind_10b_status: 'ind_10b_status', ind_10c_status: 'ind_10c_status',
  ind_10d_status: 'ind_10d_status', ind_10e_status: 'ind_10e_status', ind_10f_status: 'ind_10f_status',
  ind_10g_status: 'ind_10g_status', ind_11_status: 'ind_11_status',
  ind_12a_jumlah: 'ind_12a_jumlah', ind_12b_jumlah: 'ind_12b_jumlah',
  ind_13_status: 'ind_13_status', ind_14a_status: 'ind_14a_status',
  ind_14b_status: 'ind_14b_status', ind_14c_status: 'ind_14c_status',
  ind_15_persen: 'ind_15_persen', ind_16_persen: 'ind_16_persen'
};

const instrumentBFields = {
  ind_1_jumlah: 'ind_1_jumlah', ind_2_jumlah: 'ind_2_jumlah', ind_3_pilihan: 'ind_3_pilihan',
  ind_4a_jumlah: 'ind_4a_jumlah', ind_4b_jumlah: 'ind_4b_jumlah', ind_5_jumlah: 'ind_5_jumlah',
  ind_6_jumlah: 'ind_6_jumlah', ind_7a_jumlah: 'ind_7a_jumlah', ind_7b_jumlah: 'ind_7b_jumlah',
  ind_8a_jumlah: 'ind_8a_jumlah', ind_8b_jumlah: 'ind_8b_jumlah', ind_9a_jumlah: 'ind_9a_jumlah',
  ind_9b_jumlah: 'ind_9b_jumlah', ind_10a_status: 'ind_10a_status', ind_10b_status: 'ind_10b_status',
  ind_10c_status: 'ind_10c_status', ind_11a_jumlah: 'ind_11a_jumlah', ind_11b_jumlah: 'ind_11b_jumlah',
  ind_12a_jumlah: 'ind_12a_jumlah', ind_12b_jumlah: 'ind_12b_jumlah',
  ind_13a_jumlah: 'ind_13a_jumlah', ind_13b_jumlah: 'ind_13b_jumlah',
  ind_14a_jumlah: 'ind_14a_jumlah', ind_14b_jumlah: 'ind_14b_jumlah', ind_14c_jumlah: 'ind_14c_jumlah',
  ind_15a_jumlah: 'ind_15a_jumlah', ind_15b_jumlah: 'ind_15b_jumlah',
  ind_15c_jumlah: 'ind_15c_jumlah', ind_15d_jumlah: 'ind_15d_jumlah',
  ind_16a1_jumlah: 'ind_16a1_jumlah', ind_16a2_jumlah: 'ind_16a2_jumlah', ind_16a3_jumlah: 'ind_16a3_jumlah',
  ind_16b1_jumlah: 'ind_16b1_jumlah', ind_16b2_jumlah: 'ind_16b2_jumlah', ind_16b3_jumlah: 'ind_16b3_jumlah',
  ind_17_jumlah: 'ind_17_jumlah', ind_18a_jumlah: 'ind_18a_jumlah', ind_18b_jumlah: 'ind_18b_jumlah',
  ind_19a_jumlah: 'ind_19a_jumlah', ind_19b_jumlah: 'ind_19b_jumlah',
  ind_20a_jumlah: 'ind_20a_jumlah', ind_20b_jumlah: 'ind_20b_jumlah',
  ind_20c_jumlah: 'ind_20c_jumlah', ind_20d_jumlah: 'ind_20d_jumlah', ind_20e_jumlah: 'ind_20e_jumlah',
  ind_21_jumlah: 'ind_21_jumlah', ind_22_jumlah: 'ind_22_jumlah',
  ind_23a_jumlah: 'ind_23a_jumlah', ind_23b_jumlah: 'ind_23b_jumlah',
  ind_24a_jumlah: 'ind_24a_jumlah', ind_24b_jumlah: 'ind_24b_jumlah',
  ind_25a_jumlah: 'ind_25a_jumlah', ind_25b_jumlah: 'ind_25b_jumlah',
  ind_26a_status: 'ind_26a_status', ind_26a_jumlah: 'ind_26a_jumlah', ind_26b_jumlah: 'ind_26b_jumlah',
  ind_26c_status: 'ind_26c_status', ind_26c_jumlah: 'ind_26c_jumlah',
  ind_26d_status: 'ind_26d_status', ind_26d_jumlah: 'ind_26d_jumlah',
  ind_26e_status: 'ind_26e_status', ind_26e_jumlah: 'ind_26e_jumlah',
  ind_26f_status: 'ind_26f_status', ind_26f_jumlah: 'ind_26f_jumlah',
  ind_27_pilihan: 'ind_27_pilihan',
  ind_28a_jumlah: 'ind_28a_jumlah', ind_28b_jumlah: 'ind_28b_jumlah',
  ind_29a_jumlah: 'ind_29a_jumlah', ind_29b_jumlah: 'ind_29b_jumlah',
  ind_30a_jumlah: 'ind_30a_jumlah', ind_30b_jumlah: 'ind_30b_jumlah', ind_30_klasifikasi: 'ind_30_klasifikasi',
  ind_31a_jumlah: 'ind_31a_jumlah', ind_31b_jumlah: 'ind_31b_jumlah',
  ind_32a_jumlah: 'ind_32a_jumlah', ind_32b_jumlah: 'ind_32b_jumlah',
  ind_33a_jumlah: 'ind_33a_jumlah', ind_33b_jumlah: 'ind_33b_jumlah',
  ind_33c_jumlah: 'ind_33c_jumlah', ind_33d_jumlah: 'ind_33d_jumlah',
  ind_33e_jumlah: 'ind_33e_jumlah', ind_33f_jumlah: 'ind_33f_jumlah',
  ind_34a_jumlah: 'ind_34a_jumlah', ind_34b_jumlah: 'ind_34b_jumlah',
  ind_35a_jumlah: 'ind_35a_jumlah', ind_35b_jumlah: 'ind_35b_jumlah',
  ind_36a_jumlah: 'ind_36a_jumlah', ind_36b_jumlah: 'ind_36b_jumlah',
  ind_37a_jumlah: 'ind_37a_jumlah', ind_37b_jumlah: 'ind_37b_jumlah',
  ind_38a_jumlah: 'ind_38a_jumlah', ind_38b_jumlah: 'ind_38b_jumlah',
  ind_39a_jumlah: 'ind_39a_jumlah', ind_39b_jumlah: 'ind_39b_jumlah',
  ind_40a_jumlah: 'ind_40a_jumlah', ind_40b_jumlah: 'ind_40b_jumlah',
  ind_41_pilihan: 'ind_41_pilihan', ind_42_status: 'ind_42_status',
  ind_43a_status: 'ind_43a_status', ind_43a_jumlah: 'ind_43a_jumlah',
  ind_43b_status: 'ind_43b_status', ind_43b_jumlah: 'ind_43b_jumlah',
  ind_43c_komentar: 'ind_43c_komentar',
  ind_43d_status: 'ind_43d_status', ind_43d_jumlah: 'ind_43d_jumlah', ind_43e_status: 'ind_43e_status'
};

const instrumentCFields = [
  'ind_1a', 'ind_1b', 'ind_1c', 'ind_1d',
  'ind_2a_program', 'ind_2a_indikator', 'ind_2b_program', 'ind_2b_indikator',
  'ind_3a', 'ind_3b', 'ind_3c', 'ind_3d', 'ind_3e', 'ind_3f',
  'ind_4',
  'ind_5a', 'ind_5b', 'ind_5c', 'ind_5d', 'ind_5e', 'ind_5f', 'ind_5g',
  'ind_6a', 'ind_6b'
].reduce((mapping, field) => ({ ...mapping, [field]: field }), {});

const instrumentDFields = [
  'ind_1a_nama', 'ind_1b_nama', 'ind_2_jumlah', 'ind_2_detail', 'ind_3_pilihan',
  'ind_4a_nasional', 'ind_4a_provinsi', 'ind_4a_kabupaten', 'ind_4b_nasional', 'ind_4b_provinsi', 'ind_4_detail'
].reduce((mapping, field) => ({ ...mapping, [field]: field }), {});

const instrumentEFields = [
  'ind_1a_sd', 'ind_1b_smp', 'ind_1c_sma', 'ind_1d_d3', 'ind_1e_s1', 'ind_1f_s2', 'ind_1g_s3',
  'ind_1_persen_tertinggi', 'ind_2_jumlah', 'ind_3_jumlah', 'ind_4_jumlah', 'ind_5_status'
].reduce((mapping, field) => ({ ...mapping, [field]: field }), {});

const instrumentFFields = Array.from({ length: 40 }, (_, index) => `ind_${index + 1}_status`)
  .reduce((mapping, field) => ({ ...mapping, [field]: field }), {});

router.get(['/instrument-a', '/aspect-a'], ensureAuthenticated, getKecamatanId, renderInstrument('a', 'assessment/aspect-a'));
router.post(['/instrument-a', '/aspect-a'], ensureAuthenticated, getKecamatanId, ensureCanEditInstrument, ensureBeforeDeadline, ensureAssessmentEditable, setInstrumentContext('a'), upload.any(), enforceTotalUploadLimit, saveInstrument('a', instrumentAFields));
router.get(['/instrument-b', '/aspect-b'], ensureAuthenticated, getKecamatanId, renderInstrument('b', 'assessment/aspect-b'));
router.post(['/instrument-b', '/aspect-b'], ensureAuthenticated, getKecamatanId, ensureCanEditInstrument, ensureBeforeDeadline, ensureAssessmentEditable, setInstrumentContext('b'), upload.any(), enforceTotalUploadLimit, saveInstrument('b', instrumentBFields));
router.get(['/instrument-c', '/aspect-c'], ensureAuthenticated, getKecamatanId, renderInstrument('c', 'assessment/aspect-c'));
router.post(['/instrument-c', '/aspect-c'], ensureAuthenticated, getKecamatanId, ensureCanEditInstrument, ensureBeforeDeadline, ensureAssessmentEditable, setInstrumentContext('c'), upload.any(), enforceTotalUploadLimit, saveInstrument('c', instrumentCFields));
router.get(['/instrument-d', '/aspect-d'], ensureAuthenticated, getKecamatanId, renderInstrument('d', 'assessment/aspect-d'));
router.post(['/instrument-d', '/aspect-d'], ensureAuthenticated, getKecamatanId, ensureCanEditInstrument, ensureBeforeDeadline, ensureAssessmentEditable, setInstrumentContext('d'), upload.any(), enforceTotalUploadLimit, saveInstrument('d', instrumentDFields));
router.get(['/instrument-e', '/aspect-e'], ensureAuthenticated, getKecamatanId, renderInstrument('e', 'assessment/aspect-e'));
router.post(['/instrument-e', '/aspect-e'], ensureAuthenticated, getKecamatanId, ensureCanEditInstrument, ensureBeforeDeadline, ensureAssessmentEditable, setInstrumentContext('e'), upload.any(), enforceTotalUploadLimit, saveInstrument('e', instrumentEFields));
router.get(['/instrument-f', '/aspect-f'], ensureAuthenticated, getKecamatanId, renderInstrument('f', 'assessment/aspect-f'));
router.post(['/instrument-f', '/aspect-f'], ensureAuthenticated, getKecamatanId, ensureCanEditInstrument, ensureBeforeDeadline, ensureAssessmentEditable, setInstrumentContext('f'), upload.any(), enforceTotalUploadLimit, saveInstrument('f', instrumentFFields));

router.get('/scoring', ensureAuthenticated, getKecamatanId, async (req, res) => {
  try {
    const scoringResult = await calculateAndSaveScore(req.kecamatan_id);
    const finalEvaluation = await getFinalEvaluation(req.kecamatan_id);
    res.render('assessment/scoring-result', {
      scoring: scoringResult.totalScore,
      finalEvaluation: finalEvaluation || null,
      kecamatan: req.targetKecamatan.nama,
      isAdmin: req.session.isAdmin,
      kecamatan_id: req.kecamatan_id,
      username: req.session.username
    });
  } catch (error) {
    console.error('Error calculating score:', error);
    res.status(500).send('Error calculating score');
  }
});

router.get('/preview/:id', ensureAuthenticated, async (req, res) => {
  try {
    const fileId = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(fileId)) {
      return res.status(400).send('File tidak valid.')
    }

    const file = await dbGet(
      'SELECT * FROM assessment_files WHERE id = ?',
      [fileId]
    )

    if (!file) {
      return res.status(404).send('File tidak ditemukan.')
    }

    if (!(await canAccessKecamatan(req.session.userId, req.session.role, file.kecamatan_id))) {
      return res.status(403).send('Akses file ditolak.')
    }

    const filePath = resolveAssessmentFilePath(file)

    console.log('[PREVIEW DEBUG] file.id:', file.id)
    console.log('[PREVIEW DEBUG] file:', file)
    console.log('[PREVIEW DEBUG] resolved filePath:', filePath)
    console.log('[PREVIEW DEBUG] exists:', fs.existsSync(filePath))

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File fisik tidak ditemukan.')
    }

    // Audit log opsional. Kalau tabel log belum ada, preview tetap jalan.
    dbRun(
      `INSERT INTO assessment_file_access_logs 
       (user_id, file_id, action, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        req.session.userId || null,
        file.id,
        'PREVIEW',
        req.ip || null,
        req.headers['user-agent'] || null
      ]
    ).catch(() => {})

    const mimeType = file.mime_type || 'application/pdf'
    const safeName = String(file.original_name || 'bukti.pdf').replace(/[\r\n"]/g, '')

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`)
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')

    return res.sendFile(filePath)
  } catch (error) {
    console.error('Error previewing file:', error)
    return res.status(500).send('Gagal membuka preview file.')
  }
})

router.get('/files/:instrument', ensureAuthenticated, getKecamatanId, async (req, res) => {
  try {
    const instrument = String(req.params.instrument || '').toLowerCase();
    if (!INSTRUMENT_TABLES[instrument]) return res.status(400).json({ files: [] });
    const evidence = await evidenceStatus(req.kecamatan_id, instrument);
    res.json({ files: evidence.files, missingEvidenceKeys: evidence.missingKeys });
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    res.status(500).json({ files: [] });
  }
});

router.get('/download/:id', ensureAuthenticated, async (req, res) => {
  try {
    const fileId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(fileId)) return res.status(400).send('File tidak valid.');

    const file = await dbGet('SELECT * FROM assessment_files WHERE id = ?', [fileId]);
    if (!file) return res.status(404).send('File tidak ditemukan.');
    if (!(await canAccessKecamatan(req.session.userId, req.session.role, file.kecamatan_id))) {
      return res.status(403).send('Akses file ditolak.');
    }

    const filePath = resolveAssessmentFilePath(file);
    res.download(filePath, file.original_name, error => {
      if (error && !res.headersSent) res.status(404).send('File fisik tidak ditemukan.');
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).send('Gagal mengunduh file.');
  }
});

router.get('/download-legacy/:instrument/:filename', ensureAuthenticated, getKecamatanId, async (req, res) => {
  try {
    const instrument = String(req.params.instrument || '').toLowerCase();
    if (instrument !== 'a') return res.status(404).send('File tidak ditemukan.');
    const filename = path.basename(req.params.filename);
    const row = await dbGet('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [req.kecamatan_id]);
    const permitted = row && Object.keys(row)
      .filter(key => key.endsWith('_file') && row[key])
      .some(key => parseLegacyFileNames(row[key]).includes(filename));

    if (!permitted) return res.status(403).send('Akses file ditolak.');
    res.download(resolveLegacyRootFile(filename), filename);
  } catch (error) {
    console.error('Error downloading legacy file:', error);
    res.status(500).send('Gagal mengunduh file.');
  }
});

router.post('/files/:id/delete', ensureAuthenticated, async (req, res) => {
  try {
    const fileId = Number.parseInt(req.params.id, 10);
    const file = await dbGet('SELECT * FROM assessment_files WHERE id = ?', [fileId]);
    if (!file) return res.status(404).send('File tidak ditemukan.');
    const canDelete = req.session.role === 'superadmin'
      || (req.session.role === 'kecamatan' && Number(file.kecamatan_id) === Number(req.session.userId));
    if (!canDelete) {
      return res.status(403).send('Akses file ditolak.');
    }
    if (req.session.role === 'kecamatan') {
      const deadline = await getDeadline(db);
      if (isDeadlineExpired(deadline)) {
        return res.status(423).send(`Batas waktu pengisian telah berakhir pada ${deadline}. Bukti tidak dapat diubah.`);
      }
    }
    const finalEvaluation = await getFinalEvaluation(file.kecamatan_id);
    if (finalEvaluation && finalEvaluation.status === 'Final') {
      return res.status(423).send('Bukti tidak dapat dihapus karena hasil evaluasi telah difinalkan.');
    }

    await dbRun('DELETE FROM assessment_files WHERE id = ?', [fileId]);
    await fs.promises.unlink(resolveAssessmentFilePath(file)).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });

    const instrument = String(file.instrument || '').toLowerCase();
    const table = INSTRUMENT_TABLES[instrument];
    if (table) {
      await dbRun(
        `UPDATE ${table} SET upload_status = ?, updated_at = CURRENT_TIMESTAMP WHERE kecamatan_id = ?`,
        ['Belum Lengkap', file.kecamatan_id]
      );
      await resetEvaluationReview(
        file.kecamatan_id,
        instrument,
        req.session.userId,
        'Bukti dukung dihapus sehingga instrumen harus diverifikasi ulang.'
      );
      await calculateAndSaveScore(file.kecamatan_id);
    }
    const params = new URLSearchParams({ deleted: '1' });
    if (req.session.isAdmin) params.set('kecamatan_id', String(file.kecamatan_id));
    res.redirect(`/assessment/instrument-${instrument}?${params.toString()}`);
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).send('Gagal menghapus file.');
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).send(
        `Ukuran file melebihi batas ${MAX_FILE_MB} MB per file. Silakan kompres PDF atau unggah file yang lebih kecil.`
      );
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).send(
        'Jumlah file dalam satu pengiriman terlalu banyak. Silakan upload bukti secara bertahap.'
      );
    }

    return res.status(400).send(`Upload gagal: ${error.message}`);
  }

  if (error && error.message && error.message.includes('tidak diizinkan')) {
    return res.status(400).send(`Upload gagal: ${error.message}`);
  }

  next(error);
});

module.exports = router;
