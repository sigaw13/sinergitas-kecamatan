'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/database');
const ScoringSystem = require('../utils/scoring');
const { INSTRUMENT_STANDARDS, TOTAL_MAX_SCORE, expandEvidenceKeys } = require('../utils/standards');
const {
  INSTRUMENTS,
  parseFilledFields,
  inferMeaningfulLegacyFields,
  calculateInstrumentProgress,
  calculateOverallProgress
} = require('../utils/progress');
const { getAuthorizedKecamatanIds } = require('../middleware/auth');

const DEFAULT_DEADLINE = '2026-12-31';
const CODES = ['a', 'b', 'c', 'd', 'e', 'f'];

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.redirect('/login');
}

function ensureAdmin(req, res, next) {
  if (req.session && ['superadmin', 'evaluator'].includes(req.session.role)) return next();
  res.redirect('/dashboard');
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(Array.isArray(rows) ? rows : [])));
  });
}

async function getDeadline() {
  try {
    const row = await dbGet('SELECT value FROM config WHERE key = ?', ['deadline']);
    return row && row.value ? row.value : DEFAULT_DEADLINE;
  } catch (error) {
    console.warn('Deadline tidak dapat dibaca, menggunakan nilai bawaan:', error.message);
    return DEFAULT_DEADLINE;
  }
}


async function getEvaluationForKecamatan(kecamatanId) {
  const [reviewRows, finalResult] = await Promise.all([
    dbAll(
      `SELECT instrument, status, notes, reviewed_at
       FROM evaluation_reviews WHERE kecamatan_id = ?`,
      [kecamatanId]
    ),
    dbGet(
      `SELECT status, total_score, max_score, percentage, category, finalized_at
       FROM evaluation_results WHERE kecamatan_id = ?`,
      [kecamatanId]
    )
  ]);

  const reviewMap = new Map(reviewRows.map(row => [String(row.instrument || '').toUpperCase(), row]));
  const reviews = CODES.map(code => {
    const instrument = code.toUpperCase();
    const row = reviewMap.get(instrument) || {};
    return {
      instrument,
      status: row.status || 'Belum Dinilai',
      notes: row.notes || '',
      reviewedAt: row.reviewed_at || null
    };
  });

  return {
    reviews,
    reviewMap: new Map(reviews.map(item => [item.instrument, item])),
    verifiedCount: reviews.filter(item => item.status === 'Terverifikasi').length,
    revisionCount: reviews.filter(item => item.status === 'Perlu Perbaikan').length,
    finalResult: finalResult || null,
    finalStatus: finalResult && finalResult.status === 'Final' ? 'Final' : 'Belum Final'
  };
}

async function getInstrumentRowsForKecamatan(kecamatanId) {
  const [a, b, c, d, e, f] = await Promise.all([
    dbGet('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_b WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_c WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_d WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_e WHERE kecamatan_id = ?', [kecamatanId]),
    dbGet('SELECT * FROM aspect_f WHERE kecamatan_id = ?', [kecamatanId])
  ]);
  return { a, b, c, d, e, f };
}

async function getProgressForKecamatan(kecamatanId, rows = null) {
  const instrumentRows = rows || await getInstrumentRowsForKecamatan(kecamatanId);
  const [progressRows, fileRows] = await Promise.all([
    dbAll('SELECT instrument, filled_fields FROM assessment_progress WHERE kecamatan_id = ?', [kecamatanId]),
    dbAll('SELECT instrument, indicator_key FROM assessment_files WHERE kecamatan_id = ?', [kecamatanId])
  ]);

  const progressByCode = new Map(progressRows.map(row => [String(row.instrument).toLowerCase(), row.filled_fields]));
  const evidenceByCode = new Map(CODES.map(code => [code, new Set()]));
  for (const file of fileRows) {
    const code = String(file.instrument || '').toLowerCase();
    if (!evidenceByCode.has(code)) evidenceByCode.set(code, new Set());
    evidenceByCode.get(code).add(String(file.indicator_key || ''));
  }
  for (const [field, value] of Object.entries(instrumentRows.a || {})) {
    if (field.endsWith('_file') && String(value || '').trim()) {
      evidenceByCode.get('a').add(field.replace(/_file$/i, '').toLowerCase());
    }
  }
  for (const code of CODES) {
    evidenceByCode.set(code, expandEvidenceKeys(code, evidenceByCode.get(code) || new Set()));
  }

  const details = CODES.map(code => {
    const row = instrumentRows[code] || {};
    const stored = parseFilledFields(progressByCode.get(code));
    const filledFields = stored || inferMeaningfulLegacyFields(row, INSTRUMENTS[code].fields);
    return calculateInstrumentProgress({
      instrument: code,
      row,
      filledFields,
      evidenceKeys: evidenceByCode.get(code) || new Set()
    });
  });

  return { details, overall: calculateOverallProgress(details), evidenceMap: evidenceByCode };
}

function instrumentCardDefinitions() {
  return [
    {
      key: 'A', code: 'a', title: 'Pelayanan Publik',
      description: 'Data monografi, struktur organisasi, pelayanan publik, pengaduan masyarakat, Sistem Pemerintahan Berbasis Elektronik (SPBE), Nomor Induk Berusaha (NIB), dan Pajak Bumi dan Bangunan (PBB).',
      url: '/assessment/instrument-a'
    },
    {
      key: 'B', code: 'b', title: 'Penyelenggaraan Urusan Pemerintahan Umum',
      description: 'Koordinasi pemerintahan umum, ketenteraman dan ketertiban, fasilitasi pemerintahan desa, serta Sistem Akuntabilitas Kinerja Instansi Pemerintah (SAKIP).',
      url: '/assessment/instrument-b'
    },
    {
      key: 'C', code: 'c', title: 'Pengelolaan Anggaran Kecamatan',
      description: 'Dokumen perencanaan, Dokumen Pelaksanaan Anggaran (DPA), kegiatan prioritas, bobot pelaksanaan kegiatan, dan realisasi anggaran.',
      url: '/assessment/instrument-c'
    },
    {
      key: 'D', code: 'd', title: 'Inovasi Kecamatan',
      description: 'Sistem Informasi (SI), inovasi kecamatan, Surat Keputusan (SK) Camat, dan prestasi kecamatan serta desa atau kelurahan.',
      url: '/assessment/instrument-d'
    },
    {
      key: 'E', code: 'e', title: 'Kompetensi Sumber Daya Manusia (SDM)',
      description: 'Kualifikasi pendidikan, pejabat kecamatan, Pendidikan dan Pelatihan Kepemimpinan (Diklat PIM), pendidikan dan pelatihan teknis, serta nilai dasar Aparatur Sipil Negara (ASN) BerAKHLAK.',
      url: '/assessment/instrument-e'
    },
    {
      key: 'F', code: 'f', title: 'Keberadaan Data Dukung Lainnya',
      description: 'Data pendidikan, budaya, kesehatan, ekonomi, sosial, hukum, pemerintahan, dan Pemberdayaan dan Kesejahteraan Keluarga (PKK).',
      url: '/assessment/instrument-f'
    }
  ];
}

function buildInstrumentCards(rows, progressDetails) {
  const progressMap = new Map(progressDetails.map(item => [item.instrument, item]));
  return instrumentCardDefinitions().map(item => {
    const row = rows[item.code] || {};
    const progress = progressMap.get(item.key) || calculateInstrumentProgress({ instrument: item.code, row });
    return {
      ...item,
      status: row.upload_status || 'Belum',
      totalScore: Number(row.total_score || 0),
      maxScore: INSTRUMENT_STANDARDS[item.key].maxScore,
      progress
    };
  });
}

async function getKecamatanProgressRows(authorizedIds = null) {
  const [kecamatans, aRows, bRows, cRows, dRows, eRows, fRows, progressRows, fileRows, reviewRows, finalRows, baselineRows] = await Promise.all([
    dbAll(`SELECT id, nama, username, nama_pengelola, email FROM kecamatan WHERE role = ? ORDER BY id`, ['kecamatan']),
    dbAll('SELECT * FROM aspect_a'),
    dbAll('SELECT * FROM aspect_b'),
    dbAll('SELECT * FROM aspect_c'),
    dbAll('SELECT * FROM aspect_d'),
    dbAll('SELECT * FROM aspect_e'),
    dbAll('SELECT * FROM aspect_f'),
    dbAll('SELECT kecamatan_id, instrument, filled_fields FROM assessment_progress'),
    dbAll('SELECT kecamatan_id, instrument, indicator_key FROM assessment_files'),
    dbAll('SELECT kecamatan_id, instrument, status, notes FROM evaluation_reviews'),
    dbAll('SELECT kecamatan_id, status, total_score, max_score, percentage, category, finalized_at FROM evaluation_results'),
    dbAll('SELECT kecamatan_id, total_score, ranking, source_file, imported_at FROM workbook_baselines')
  ]);

  const tableMaps = {};
  for (const [code, rows] of Object.entries({ a: aRows, b: bRows, c: cRows, d: dRows, e: eRows, f: fRows })) {
    tableMaps[code] = new Map(rows.map(row => [Number(row.kecamatan_id), row]));
  }

  const filledMap = new Map();
  for (const row of progressRows) {
    filledMap.set(`${Number(row.kecamatan_id)}:${String(row.instrument).toLowerCase()}`, row.filled_fields);
  }

  const evidenceMap = new Map();
  for (const row of fileRows) {
    const key = `${Number(row.kecamatan_id)}:${String(row.instrument).toLowerCase()}`;
    if (!evidenceMap.has(key)) evidenceMap.set(key, new Set());
    evidenceMap.get(key).add(String(row.indicator_key || ''));
  }

  const reviewMap = new Map();
  for (const row of reviewRows) {
    reviewMap.set(
      `${Number(row.kecamatan_id)}:${String(row.instrument || '').toLowerCase()}`,
      { status: row.status || 'Belum Dinilai', notes: row.notes || '' }
    );
  }
  const finalMap = new Map(finalRows.map(row => [Number(row.kecamatan_id), row]));
  const baselineMap = new Map(baselineRows.map(row => [Number(row.kecamatan_id), row]));

  for (const row of aRows) {
    const mapKey = `${Number(row.kecamatan_id)}:a`;
    if (!evidenceMap.has(mapKey)) evidenceMap.set(mapKey, new Set());
    for (const [field, value] of Object.entries(row || {})) {
      if (field.endsWith('_file') && String(value || '').trim()) {
        evidenceMap.get(mapKey).add(field.replace(/_file$/i, '').toLowerCase());
      }
    }
  }

  const allowed = Array.isArray(authorizedIds) ? new Set(authorizedIds.map(Number)) : null;
  return kecamatans.filter(kecamatan => !allowed || allowed.has(Number(kecamatan.id))).map(kecamatan => {
    const progressDetails = CODES.map(code => {
      const row = tableMaps[code].get(Number(kecamatan.id)) || {};
      const stored = parseFilledFields(filledMap.get(`${Number(kecamatan.id)}:${code}`));
      const filledFields = stored || inferMeaningfulLegacyFields(row, INSTRUMENTS[code].fields);
      return calculateInstrumentProgress({
        instrument: code,
        row,
        filledFields,
        evidenceKeys: expandEvidenceKeys(code, evidenceMap.get(`${Number(kecamatan.id)}:${code}`) || new Set())
      });
    });
    const overall = calculateOverallProgress(progressDetails);
    const result = { ...kecamatan, progress_percent: overall.percent, overall_progress: overall };

    progressDetails.forEach(detail => {
      const code = detail.instrument.toLowerCase();
      const row = tableMaps[code].get(Number(kecamatan.id)) || {};
      const review = reviewMap.get(`${Number(kecamatan.id)}:${code}`) || { status: 'Belum Dinilai', notes: '' };
      result[`status_${code}`] = row.upload_status || 'Belum';
      result[`progress_${code}`] = detail.percent;
      result[`data_progress_${code}`] = detail.dataPercent;
      result[`evidence_progress_${code}`] = detail.evidencePercent;
      result[`progress_detail_${code}`] = detail;
      result[`review_${code}`] = review.status;
      result[`review_notes_${code}`] = review.notes;
    });

    const finalResult = finalMap.get(Number(kecamatan.id)) || null;
    result.completed_instruments = CODES.filter(code => result[`status_${code}`] === 'Sudah').length;
    result.verified_instruments = CODES.filter(code => result[`review_${code}`] === 'Terverifikasi').length;
    result.uploaded_verified_instruments = CODES.filter(code => result[`status_${code}`] === 'Sudah' && result[`review_${code}`] === 'Terverifikasi').length;
    result.uploaded_unverified_instruments = CODES.filter(code => result[`status_${code}`] === 'Sudah' && result[`review_${code}`] !== 'Terverifikasi').length;
    result.revision_instruments = CODES.filter(code => result[`review_${code}`] === 'Perlu Perbaikan').length;
    result.evaluation_status = finalResult && finalResult.status === 'Final' ? 'Final' : 'Belum Final';
    result.final_score = finalResult && finalResult.status === 'Final' ? Number(finalResult.total_score || 0) : null;
    result.final_percentage = finalResult && finalResult.status === 'Final' ? Number(finalResult.percentage || 0) : null;
    result.final_category = finalResult && finalResult.status === 'Final' ? finalResult.category : null;
    const baseline = baselineMap.get(Number(kecamatan.id)) || null;
    result.workbook_score = baseline ? Number(baseline.total_score || 0) : null;
    result.workbook_ranking = baseline && baseline.ranking !== null && baseline.ranking !== undefined ? Number(baseline.ranking) : null;
    result.workbook_source = baseline ? baseline.source_file : null;
    return result;
  });
}

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const deadline = await getDeadline();

    if (req.session.isAdmin) {
      const authorizedIds = await getAuthorizedKecamatanIds(req);
      const kecamatans = await getKecamatanProgressRows(authorizedIds);
      return res.render('dashboard', {
        kecamatans,
        deadline,
        isAdmin: true,
        isSuperAdmin: req.session.role === 'superadmin',
        username: req.session.username,
        success: req.query.success || null,
        error: req.query.error || null
      });
    }

    const rows = await getInstrumentRowsForKecamatan(req.session.userId);
    const [progressSummary, evaluationSummary] = await Promise.all([
      getProgressForKecamatan(req.session.userId, rows),
      getEvaluationForKecamatan(req.session.userId)
    ]);
    const instruments = buildInstrumentCards(rows, progressSummary.details).map(item => {
      const review = evaluationSummary.reviewMap.get(item.key) || { status: 'Belum Dinilai', notes: '' };
      return { ...item, reviewStatus: review.status, reviewNotes: review.notes };
    });
    const completedCount = instruments.filter(item => item.status === 'Sudah').length;

    res.render('dashboard', {
      kecamatan: req.session.kecamatan,
      instruments,
      completedCount,
      overallProgress: progressSummary.overall.percent,
      overallProgressDetail: progressSummary.overall,
      evaluationSummary,
      deadline,
      isAdmin: false,
      username: req.session.username,
      success: req.query.success || null,
      error: req.query.error || null,
      kecamatans: []
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Gagal memuat dashboard: ' + error.message);
  }
});

router.get('/report', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const authorizedIds = await getAuthorizedKecamatanIds(req);
    const kecamatans = await getKecamatanProgressRows(authorizedIds);
    res.render('report', { kecamatans, username: req.session.username });
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).send('Gagal memuat laporan.');
  }
});

async function buildScoreForKecamatan(kecamatan) {
  const rows = await getInstrumentRowsForKecamatan(kecamatan.id);
  const progress = await getProgressForKecamatan(kecamatan.id, rows);
  const evidence = progress.evidenceMap;
  const aspectA = ScoringSystem.calculateAspectA(rows.a || {}, evidence.get('a') || new Set());
  const aspectB = ScoringSystem.calculateAspectB(rows.b || {}, evidence.get('b') || new Set());
  const aspectC = ScoringSystem.calculateAspectC(rows.c || {}, evidence.get('c') || new Set());
  const aspectD = ScoringSystem.calculateAspectD(rows.d || {}, evidence.get('d') || new Set());
  const aspectE = ScoringSystem.calculateAspectE(rows.e || {}, evidence.get('e') || new Set());
  const aspectF = ScoringSystem.calculateAspectF(rows.f || {}, evidence.get('f') || new Set());
  const totalScore = ScoringSystem.calculateTotalScore(aspectA, aspectB, aspectC, aspectD, aspectE, aspectF);
  return { kecamatan: kecamatan.nama, username: kecamatan.username, ...totalScore };
}

router.get('/ranking', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const authorizedIds = await getAuthorizedKecamatanIds(req);
    const rows = await dbAll(
      `SELECT er.*, k.nama AS kecamatan, k.username
       FROM evaluation_results er
       JOIN kecamatan k ON k.id = er.kecamatan_id
       WHERE er.status = ?
       ORDER BY er.total_score DESC, er.finalized_at ASC, k.nama ASC`,
      ['Final']
    );

    const allowed = Array.isArray(authorizedIds) ? new Set(authorizedIds.map(Number)) : null;
    const officialScores = rows.filter(row => !allowed || allowed.has(Number(row.kecamatan_id))).map(row => {
      let snapshot = null;
      try { snapshot = row.score_snapshot ? JSON.parse(row.score_snapshot) : null; } catch (error) { snapshot = null; }
      const aspects = snapshot && snapshot.aspects ? snapshot.aspects : Object.fromEntries(
        CODES.map(code => {
          const upper = code.toUpperCase();
          return [upper, {
            totalScore: Number(row[`score_${code}`] || 0),
            maxScore: INSTRUMENT_STANDARDS[upper].maxScore
          }];
        })
      );
      return {
        kecamatan: row.kecamatan,
        username: row.username,
        totalScore: Number(row.total_score || 0),
        maxScore: Number(row.max_score || TOTAL_MAX_SCORE),
        percentage: Number(row.percentage || 0),
        category: row.category || 'Belum Dikategorikan',
        categoryColor: snapshot ? snapshot.categoryColor : '#6c757d',
        aspects,
        finalizedAt: row.finalized_at
      };
    });

    const ranked = ScoringSystem.calculateRanking(officialScores);
    res.render('ranking', { rankings: ranked, username: req.session.username });
  } catch (error) {
    console.error('Error loading ranking:', error);
    res.status(500).send('Gagal memuat peringkat resmi.');
  }
});

module.exports = router;
