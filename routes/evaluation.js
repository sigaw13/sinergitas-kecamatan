'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/database');
const {
  ensureAuthenticated,
  isAdmin,
  requireKecamatanAccess,
  getAuthorizedKecamatanIds
} = require('../middleware/auth');
const ScoringSystem = require('../utils/scoring');
const { expandEvidenceKeys } = require('../utils/standards');
const {
  getInstrumentCatalog,
  getInstrumentQuestions,
  buildInstrumentMatrix,
  buildReviewedAspect,
  validateAwardedScore,
  roundScore
} = require('../utils/evaluation-matrix');
const {
  INSTRUMENTS,
  parseFilledFields,
  inferMeaningfulLegacyFields,
  calculateInstrumentProgress,
  calculateOverallProgress
} = require('../utils/progress');

const CODES = ['a', 'b', 'c', 'd', 'e', 'f'];
const REVIEW_STATUSES = new Set(['Belum Dinilai', 'Perlu Perbaikan', 'Terverifikasi']);
const TABLES = Object.fromEntries(CODES.map(code => [code, `aspect_${code}`]));

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row || null)));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(Array.isArray(rows) ? rows : [])));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error, result) => (error ? reject(error) : resolve(result || {})));
  });
}

async function getKecamatan(id) {
  return dbGet(
    "SELECT id, nama, username, nama_pengelola, email, no_hp FROM kecamatan WHERE id = ? AND role = 'kecamatan'",
    [id]
  );
}

async function getRows(kecamatanId) {
  const results = await Promise.all(CODES.map(code => dbGet(
    `SELECT * FROM ${TABLES[code]} WHERE kecamatan_id = ?`,
    [kecamatanId]
  )));
  return Object.fromEntries(CODES.map((code, index) => [code, results[index] || {}]));
}

async function getProgress(kecamatanId, rows) {
  const [progressRows, fileRows] = await Promise.all([
    dbAll('SELECT instrument, filled_fields FROM assessment_progress WHERE kecamatan_id = ?', [kecamatanId]),
    dbAll('SELECT instrument, indicator_key FROM assessment_files WHERE kecamatan_id = ?', [kecamatanId])
  ]);

  const storedMap = new Map(progressRows.map(row => [String(row.instrument || '').toLowerCase(), row.filled_fields]));
  const evidenceMap = new Map(CODES.map(code => [code, new Set()]));
  for (const file of fileRows) {
    const code = String(file.instrument || '').toLowerCase();
    if (!evidenceMap.has(code)) evidenceMap.set(code, new Set());
    evidenceMap.get(code).add(String(file.indicator_key || ''));
  }
  for (const [field, value] of Object.entries(rows.a || {})) {
    if (field.endsWith('_file') && String(value || '').trim()) {
      evidenceMap.get('a').add(field.replace(/_file$/i, '').toLowerCase());
    }
  }
  for (const code of CODES) {
    evidenceMap.set(code, expandEvidenceKeys(code, evidenceMap.get(code) || new Set()));
  }

  const details = CODES.map(code => {
    const row = rows[code] || {};
    const stored = parseFilledFields(storedMap.get(code));
    const filledFields = stored || inferMeaningfulLegacyFields(row, INSTRUMENTS[code].fields);
    return calculateInstrumentProgress({
      instrument: code,
      row,
      filledFields,
      evidenceKeys: evidenceMap.get(code) || new Set()
    });
  });

  return { details, overall: calculateOverallProgress(details), evidenceMap };
}

function calculateScore(rows, evidenceMap = new Map()) {
  const a = ScoringSystem.calculateAspectA(rows.a || {}, evidenceMap.get('a') || new Set());
  const b = ScoringSystem.calculateAspectB(rows.b || {}, evidenceMap.get('b') || new Set());
  const c = ScoringSystem.calculateAspectC(rows.c || {}, evidenceMap.get('c') || new Set());
  const d = ScoringSystem.calculateAspectD(rows.d || {}, evidenceMap.get('d') || new Set());
  const e = ScoringSystem.calculateAspectE(rows.e || {}, evidenceMap.get('e') || new Set());
  const f = ScoringSystem.calculateAspectF(rows.f || {}, evidenceMap.get('f') || new Set());
  return ScoringSystem.calculateTotalScore(a, b, c, d, e, f);
}

async function getReviews(kecamatanId) {
  const rows = await dbAll(
    `SELECT instrument, status, notes, reviewed_by, reviewed_at, updated_at
     FROM evaluation_reviews WHERE kecamatan_id = ?`,
    [kecamatanId]
  );
  const map = new Map(rows.map(row => [String(row.instrument || '').toUpperCase(), row]));
  return CODES.map(code => {
    const instrument = code.toUpperCase();
    const row = map.get(instrument) || {};
    return {
      instrument,
      status: row.status || 'Belum Dinilai',
      notes: row.notes || '',
      reviewedBy: row.reviewed_by || null,
      reviewedAt: row.reviewed_at || null,
      updatedAt: row.updated_at || null
    };
  });
}

async function getFinalResult(kecamatanId) {
  return dbGet('SELECT * FROM evaluation_results WHERE kecamatan_id = ?', [kecamatanId]);
}

function isMissingItemScoreTableError(error) {
  const message = String(error && error.message || '').toLowerCase();
  return message.includes('no such table: evaluation_item_scores')
    || message.includes('relation \"evaluation_item_scores\" does not exist');
}

async function ensureItemScoreTable() {
  const idDefinition = db.dialect === 'postgres'
    ? 'SERIAL PRIMARY KEY'
    : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  await dbRun(`CREATE TABLE IF NOT EXISTS evaluation_item_scores (
    id ${idDefinition},
    kecamatan_id INTEGER NOT NULL,
    instrument TEXT NOT NULL,
    indicator_key TEXT NOT NULL,
    standard_score REAL NOT NULL DEFAULT 0,
    awarded_score REAL NOT NULL DEFAULT 0,
    notes TEXT,
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (kecamatan_id, instrument, indicator_key),
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES kecamatan(id)
  )`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_evaluation_item_scores_owner
    ON evaluation_item_scores(kecamatan_id, instrument)`);
}

async function queryItemScores(kecamatanId, instrument = null) {
  if (instrument) {
    return dbAll(
      `SELECT instrument, indicator_key, standard_score, awarded_score, notes, reviewed_by, reviewed_at, updated_at
       FROM evaluation_item_scores WHERE kecamatan_id = ? AND instrument = ?
       ORDER BY indicator_key`,
      [kecamatanId, String(instrument).toUpperCase()]
    );
  }
  return dbAll(
    `SELECT instrument, indicator_key, standard_score, awarded_score, notes, reviewed_by, reviewed_at, updated_at
     FROM evaluation_item_scores WHERE kecamatan_id = ?
     ORDER BY instrument, indicator_key`,
    [kecamatanId]
  );
}

async function getItemScores(kecamatanId, instrument = null) {
  try {
    return await queryItemScores(kecamatanId, instrument);
  } catch (error) {
    if (!isMissingItemScoreTableError(error)) throw error;
    console.warn('⚠️ Tabel evaluation_item_scores belum tersedia. Sistem menjalankan perbaikan otomatis.');
    await ensureItemScoreTable();
    return queryItemScores(kecamatanId, instrument);
  }
}

function calculateReviewedScoring(automaticScoring, itemScores = []) {
  const byInstrument = new Map(CODES.map(code => [code.toUpperCase(), []]));
  for (const item of itemScores || []) {
    const code = String(item.instrument || '').toUpperCase();
    if (!byInstrument.has(code)) byInstrument.set(code, []);
    byInstrument.get(code).push(item);
  }

  const reviewedAspects = CODES.map(code => {
    const instrument = code.toUpperCase();
    const rows = byInstrument.get(instrument) || [];
    const matrix = {
      savedCount: rows.length,
      awardedTotal: roundScore(rows.reduce((sum, row) => sum + Number(row.awarded_score || 0), 0))
    };
    return buildReviewedAspect(instrument, matrix, automaticScoring.aspects[instrument]);
  });

  return ScoringSystem.calculateTotalScore(...reviewedAspects);
}

async function addHistory({ kecamatanId, instrument = null, action, previousStatus = null, newStatus = null, notes = null, actorId }) {
  await dbRun(
    `INSERT INTO evaluation_history
      (kecamatan_id, instrument, action, previous_status, new_status, notes, actor_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [kecamatanId, instrument, action, previousStatus, newStatus, notes, actorId]
  );
}

async function buildEvaluationRow(kecamatan) {
  const rows = await getRows(kecamatan.id);
  const [progress, reviews, finalResult, itemScores] = await Promise.all([
    getProgress(kecamatan.id, rows),
    getReviews(kecamatan.id),
    getFinalResult(kecamatan.id),
    getItemScores(kecamatan.id)
  ]);
  const scoring = calculateScore(rows, progress.evidenceMap);
  const reviewedScoring = calculateReviewedScoring(scoring, itemScores);
  const reviewMap = new Map(reviews.map(review => [review.instrument, review]));
  const verifiedCount = reviews.filter(review => review.status === 'Terverifikasi').length;
  const revisionCount = reviews.filter(review => review.status === 'Perlu Perbaikan').length;

  return {
    ...kecamatan,
    rows,
    progress,
    reviews,
    reviewMap,
    verifiedCount,
    revisionCount,
    scoring,
    reviewedScoring,
    itemScores,
    finalResult,
    finalStatus: finalResult && finalResult.status === 'Final' ? 'Final' : 'Belum Final'
  };
}

router.get('/', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const kecamatans = await dbAll(
      `SELECT id, nama, username, nama_pengelola, email
       FROM kecamatan WHERE role = ? ORDER BY nama`,
      ['kecamatan']
    );
    const authorizedIds = await getAuthorizedKecamatanIds(req);
    const allowed = Array.isArray(authorizedIds) ? new Set(authorizedIds.map(Number)) : null;
    const visibleKecamatans = kecamatans.filter(item => !allowed || allowed.has(Number(item.id)));
    const evaluations = await Promise.all(visibleKecamatans.map(buildEvaluationRow));
    res.render('evaluation/index', {
      evaluations,
      username: req.session.username,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Gagal memuat daftar evaluasi:', error);
    res.status(500).send('Gagal memuat daftar evaluasi kinerja.');
  }
});

router.get('/:id', ensureAuthenticated, isAdmin, requireKecamatanAccess('id'), async (req, res) => {
  try {
    const kecamatanId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(kecamatanId)) return res.status(400).send('Kecamatan tidak valid.');
    const kecamatan = await getKecamatan(kecamatanId);
    if (!kecamatan) return res.status(404).send('Kecamatan tidak ditemukan.');

    const evaluation = await buildEvaluationRow(kecamatan);
    const files = await dbAll(
      `SELECT id, instrument, indicator_key, original_name, mime_type, size_bytes, uploaded_at
       FROM assessment_files WHERE kecamatan_id = ?
       ORDER BY instrument, indicator_key, uploaded_at DESC`,
      [kecamatanId]
    );
    const history = await dbAll(
      `SELECT h.*, k.nama AS actor_name
       FROM evaluation_history h
       LEFT JOIN kecamatan k ON k.id = h.actor_id
       WHERE h.kecamatan_id = ?
       ORDER BY h.created_at DESC, h.id DESC
       LIMIT 100`,
      [kecamatanId]
    );

    const filesByInstrument = new Map(CODES.map(code => [code.toUpperCase(), []]));
    for (const file of files) {
      const instrument = String(file.instrument || '').toUpperCase();
      if (!filesByInstrument.has(instrument)) filesByInstrument.set(instrument, []);
      filesByInstrument.get(instrument).push({ ...file, url: `/assessment/download/${file.id}` });
    }

    const questionMatrices = Object.fromEntries(CODES.map(code => {
      const instrument = code.toUpperCase();
      return [instrument, buildInstrumentMatrix({
        code: instrument,
        row: evaluation.rows[code] || {},
        files: filesByInstrument.get(instrument) || [],
        itemScores: evaluation.itemScores.filter(item => String(item.instrument || '').toUpperCase() === instrument),
        aspectScore: evaluation.scoring.aspects[instrument]
      })];
    }));

    res.render('evaluation/detail', {
      evaluation,
      filesByInstrument,
      questionMatrices,
      history,
      username: req.session.username,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Gagal memuat detail evaluasi:', error);
    res.status(500).send('Gagal memuat detail evaluasi kinerja.');
  }
});

router.post('/:id/instrument/:code', ensureAuthenticated, isAdmin, requireKecamatanAccess('id'), async (req, res) => {
  try {
    const kecamatanId = Number.parseInt(req.params.id, 10);
    const code = String(req.params.code || '').toLowerCase();
    const status = String(req.body.status || '').trim();
    const notes = String(req.body.notes || '').trim();

    if (!Number.isInteger(kecamatanId) || !CODES.includes(code)) {
      return res.status(400).send('Permintaan evaluasi tidak valid.');
    }
    if (!REVIEW_STATUSES.has(status)) {
      return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent('Status evaluasi tidak valid.')}`);
    }
    if (status === 'Perlu Perbaikan' && !notes) {
      return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent('Catatan perbaikan wajib diisi.')}`);
    }

    const kecamatan = await getKecamatan(kecamatanId);
    if (!kecamatan) return res.status(404).send('Kecamatan tidak ditemukan.');

    const rows = await getRows(kecamatanId);
    const progress = await getProgress(kecamatanId, rows);
    const detail = progress.details.find(item => item.instrument === code.toUpperCase());
    const instrumentRow = rows[code] || {};
    const questions = getInstrumentQuestions(code);
    const hasScorePayload = questions.some(question => Object.prototype.hasOwnProperty.call(req.body, `score_${question.key}`));
    const scoredItems = [];

    if (hasScorePayload) {
      for (const question of questions) {
        const awardedScore = validateAwardedScore(question, req.body[`score_${question.key}`]);
        const itemNotes = String(req.body[`item_note_${question.key}`] || '').trim();
        scoredItems.push({ question, awardedScore, notes: itemNotes || null });
      }

      const instrumentDefinition = getInstrumentCatalog(code);
      const submittedTotal = roundScore(scoredItems.reduce((sum, item) => sum + item.awardedScore, 0));
      if (submittedTotal > Number(instrumentDefinition.maxScore) + 0.000001) {
        return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent(`Jumlah nilai Instrumen ${code.toUpperCase()} sebesar ${submittedTotal} melebihi standar maksimum ${instrumentDefinition.maxScore}.`)}`);
      }
    }

    if (status === 'Terverifikasi' && !hasScorePayload) {
      return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent(`Hasil penilaian per pertanyaan Instrumen ${code.toUpperCase()} wajib disimpan.`)}`);
    }

    if (status === 'Terverifikasi') {
      if (instrumentRow.upload_status !== 'Sudah') {
        return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent(`Instrumen ${code.toUpperCase()} belum dikirim final.`)}`);
      }
      if (!detail || detail.percent < 100) {
        return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent(`Progres Instrumen ${code.toUpperCase()} belum 100%.`)}`);
      }
    }

    if (scoredItems.length) {
      for (const item of scoredItems) {
        await dbRun(
          `INSERT INTO evaluation_item_scores
            (kecamatan_id, instrument, indicator_key, standard_score, awarded_score, notes,
             reviewed_by, reviewed_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT(kecamatan_id, instrument, indicator_key)
           DO UPDATE SET standard_score = excluded.standard_score,
             awarded_score = excluded.awarded_score, notes = excluded.notes,
             reviewed_by = excluded.reviewed_by, reviewed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP`,
          [
            kecamatanId,
            code.toUpperCase(),
            item.question.key,
            item.question.maxScore,
            item.awardedScore,
            item.notes,
            req.session.userId
          ]
        );
      }
    }

    const previous = await dbGet(
      'SELECT status FROM evaluation_reviews WHERE kecamatan_id = ? AND instrument = ?',
      [kecamatanId, code.toUpperCase()]
    );

    await dbRun(
      `INSERT INTO evaluation_reviews
        (kecamatan_id, instrument, status, notes, reviewed_by, reviewed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(kecamatan_id, instrument)
       DO UPDATE SET status = excluded.status, notes = excluded.notes,
         reviewed_by = excluded.reviewed_by, reviewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [kecamatanId, code.toUpperCase(), status, notes || null, req.session.userId]
    );

    if (status === 'Perlu Perbaikan') {
      await dbRun(
        `UPDATE ${TABLES[code]} SET upload_status = ?, updated_at = CURRENT_TIMESTAMP WHERE kecamatan_id = ?`,
        ['Perlu Perbaikan', kecamatanId]
      );
    }

    await dbRun(
      `UPDATE evaluation_results SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE kecamatan_id = ? AND status = ?`,
      ['Belum Final', kecamatanId, 'Final']
    );

    await addHistory({
      kecamatanId,
      instrument: code.toUpperCase(),
      action: 'Evaluasi instrumen',
      previousStatus: previous ? previous.status : 'Belum Dinilai',
      newStatus: status,
      notes: scoredItems.length
        ? `${notes || 'Penilaian disimpan.'} Jumlah nilai ${roundScore(scoredItems.reduce((sum, item) => sum + item.awardedScore, 0))}.`
        : (notes || null),
      actorId: req.session.userId
    });

    const savedTotal = scoredItems.length
      ? roundScore(scoredItems.reduce((sum, item) => sum + item.awardedScore, 0))
      : null;
    const successMessage = savedTotal === null
      ? `Evaluasi Instrumen ${code.toUpperCase()} berhasil disimpan.`
      : `Evaluasi Instrumen ${code.toUpperCase()} berhasil disimpan. Jumlah nilai ${savedTotal}.`;
    res.redirect(`/evaluation/${kecamatanId}?success=${encodeURIComponent(successMessage)}`);
  } catch (error) {
    console.error('Gagal menyimpan evaluasi instrumen:', error);
    const kecamatanId = Number.parseInt(req.params.id, 10);
    if (Number.isInteger(kecamatanId) && error && error.message) {
      return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent(error.message)}`);
    }
    res.status(500).send('Gagal menyimpan evaluasi instrumen.');
  }
});

router.post('/:id/finalize', ensureAuthenticated, isAdmin, requireKecamatanAccess('id'), async (req, res) => {
  try {
    const kecamatanId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(kecamatanId)) return res.status(400).send('Kecamatan tidak valid.');
    const kecamatan = await getKecamatan(kecamatanId);
    if (!kecamatan) return res.status(404).send('Kecamatan tidak ditemukan.');

    const rows = await getRows(kecamatanId);
    const [reviews, progress] = await Promise.all([
      getReviews(kecamatanId),
      getProgress(kecamatanId, rows)
    ]);

    if (reviews.some(review => review.status !== 'Terverifikasi')) {
      return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent('Semua Instrumen A–F harus berstatus Terverifikasi sebelum hasil difinalkan.')}`);
    }
    if (progress.overall.percent < 100) {
      return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent('Progres pengisian keseluruhan belum 100%.')}`);
    }

    const itemScores = await getItemScores(kecamatanId);
    for (const code of CODES) {
      const expected = getInstrumentQuestions(code).length;
      const saved = itemScores.filter(item => String(item.instrument || '').toLowerCase() === code).length;
      if (saved < expected) {
        return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent(`Nilai per pertanyaan Instrumen ${code.toUpperCase()} belum lengkap ${saved}/${expected}.`)}`);
      }
    }

    const automaticScoring = calculateScore(rows, progress.evidenceMap);
    const scoring = calculateReviewedScoring(automaticScoring, itemScores);
    const snapshot = JSON.stringify({ ...scoring, automaticScoring });
    const previous = await getFinalResult(kecamatanId);

    await dbRun(
      `INSERT INTO evaluation_results
        (kecamatan_id, status, score_a, score_b, score_c, score_d, score_e, score_f,
         total_score, max_score, percentage, category, score_snapshot,
         finalized_by, finalized_at, updated_at)
       VALUES (?, 'Final', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(kecamatan_id)
       DO UPDATE SET status = 'Final', score_a = excluded.score_a, score_b = excluded.score_b,
         score_c = excluded.score_c, score_d = excluded.score_d, score_e = excluded.score_e,
         score_f = excluded.score_f, total_score = excluded.total_score,
         max_score = excluded.max_score, percentage = excluded.percentage,
         category = excluded.category, score_snapshot = excluded.score_snapshot,
         finalized_by = excluded.finalized_by, finalized_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [
        kecamatanId,
        scoring.aspects.A.totalScore,
        scoring.aspects.B.totalScore,
        scoring.aspects.C.totalScore,
        scoring.aspects.D.totalScore,
        scoring.aspects.E.totalScore,
        scoring.aspects.F.totalScore,
        scoring.totalScore,
        scoring.maxScore,
        scoring.percentage,
        scoring.category,
        snapshot,
        req.session.userId
      ]
    );

    await addHistory({
      kecamatanId,
      action: 'Finalisasi hasil evaluasi',
      previousStatus: previous ? previous.status : 'Belum Final',
      newStatus: 'Final',
      notes: String(req.body.notes || '').trim() || null,
      actorId: req.session.userId
    });

    res.redirect(`/evaluation/${kecamatanId}?success=${encodeURIComponent('Hasil evaluasi berhasil difinalkan dan masuk peringkat resmi.')}`);
  } catch (error) {
    console.error('Gagal memfinalkan evaluasi:', error);
    res.status(500).send('Gagal memfinalkan hasil evaluasi.');
  }
});

router.post('/:id/reopen', ensureAuthenticated, isAdmin, requireKecamatanAccess('id'), async (req, res) => {
  try {
    const kecamatanId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(kecamatanId)) return res.status(400).send('Kecamatan tidak valid.');
    const previous = await getFinalResult(kecamatanId);
    if (!previous || previous.status !== 'Final') {
      return res.redirect(`/evaluation/${kecamatanId}?error=${encodeURIComponent('Hasil evaluasi belum berstatus Final.')}`);
    }

    await dbRun(
      `UPDATE evaluation_results SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE kecamatan_id = ?`,
      ['Belum Final', kecamatanId]
    );
    await addHistory({
      kecamatanId,
      action: 'Membuka kembali hasil evaluasi',
      previousStatus: 'Final',
      newStatus: 'Belum Final',
      notes: String(req.body.notes || '').trim() || 'Hasil dibuka kembali oleh administrator.',
      actorId: req.session.userId
    });

    res.redirect(`/evaluation/${kecamatanId}?success=${encodeURIComponent('Hasil evaluasi dibuka kembali. Kecamatan dapat memperbarui data setelah catatan diberikan.')}`);
  } catch (error) {
    console.error('Gagal membuka kembali evaluasi:', error);
    res.status(500).send('Gagal membuka kembali hasil evaluasi.');
  }
});

module.exports = router;
