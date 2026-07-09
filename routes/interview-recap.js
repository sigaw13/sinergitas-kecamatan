'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { ensureAuthenticated, isSuperAdmin } = require('../middleware/auth');

const EVALUATORS = [
  { key: 'bappeda', label: 'BAPPEDA' },
  { key: 'dpmd', label: 'DPMD' },
  { key: 'asisten1', label: 'ASISTEN I' },
  { key: 'asisten3', label: 'ASISTEN III' }
];

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(Array.isArray(rows) ? rows : [])));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value).replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, precision = 3) {
  const multiplier = 10 ** precision;
  return Math.round((Number(value) + Number.EPSILON) * multiplier) / multiplier;
}

function field(body, prefix, kecamatanId, evaluatorKey) {
  return body[`${prefix}_${kecamatanId}_${evaluatorKey}`];
}

async function ensureTables() {
  await dbRun(`CREATE TABLE IF NOT EXISTS interview_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER NOT NULL,
    evaluator_key TEXT NOT NULL,
    evaluator_name TEXT NOT NULL,
    presentation_score REAL DEFAULT 0,
    collaboration_score REAL DEFAULT 0,
    total_score REAL DEFAULT 0,
    rank INTEGER,
    updated_by INTEGER,
    source_file TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kecamatan_id, evaluator_key)
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS interview_final_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER NOT NULL UNIQUE,
    presentation_total REAL DEFAULT 0,
    collaboration_total REAL DEFAULT 0,
    interview_total REAL DEFAULT 0,
    interview_percentage REAL DEFAULT 0,
    interview_weighted_score REAL DEFAULT 0,
    input_data_score REAL DEFAULT 0,
    final_score REAL DEFAULT 0,
    final_rank INTEGER,
    source_file TEXT,
    updated_by INTEGER,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
}

async function loadRows() {
  await ensureTables();

  const [kecamatans, scoreRows, finalRows, baselineRows] = await Promise.all([
    dbAll("SELECT id, nama, username FROM kecamatan WHERE role = 'kecamatan' ORDER BY nama"),
    dbAll('SELECT * FROM interview_scores'),
    dbAll('SELECT * FROM interview_final_scores'),
    dbAll('SELECT kecamatan_id, total_score, ranking, source_file FROM workbook_baselines')
  ]);

  const scoreMap = new Map();
  for (const row of scoreRows) {
    const key = `${Number(row.kecamatan_id)}:${row.evaluator_key}`;
    scoreMap.set(key, row);
  }
  const finalMap = new Map(finalRows.map(row => [Number(row.kecamatan_id), row]));
  const baselineMap = new Map(baselineRows.map(row => [Number(row.kecamatan_id), row]));

  return kecamatans.map(kecamatan => {
    const scores = {};
    for (const evaluator of EVALUATORS) {
      const row = scoreMap.get(`${Number(kecamatan.id)}:${evaluator.key}`) || {};
      scores[evaluator.key] = {
        presentationScore: Number(row.presentation_score || 0),
        collaborationScore: Number(row.collaboration_score || 0),
        totalScore: Number(row.total_score || 0),
        rank: row.rank !== null && row.rank !== undefined ? Number(row.rank) : null
      };
    }

    const finalRow = finalMap.get(Number(kecamatan.id)) || null;
    const baseline = baselineMap.get(Number(kecamatan.id)) || null;
    return {
      ...kecamatan,
      scores,
      final: finalRow ? {
        presentationTotal: Number(finalRow.presentation_total || 0),
        collaborationTotal: Number(finalRow.collaboration_total || 0),
        interviewTotal: Number(finalRow.interview_total || 0),
        interviewPercentage: Number(finalRow.interview_percentage || 0),
        interviewWeightedScore: Number(finalRow.interview_weighted_score || 0),
        inputDataScore: Number(finalRow.input_data_score || 0),
        finalScore: Number(finalRow.final_score || 0),
        finalRank: finalRow.final_rank !== null && finalRow.final_rank !== undefined ? Number(finalRow.final_rank) : null,
        sourceFile: finalRow.source_file || null
      } : null,
      baseline: baseline ? {
        totalScore: Number(baseline.total_score || 0),
        ranking: baseline.ranking !== null && baseline.ranking !== undefined ? Number(baseline.ranking) : null,
        sourceFile: baseline.source_file || null
      } : null
    };
  });
}

function getRankedInterviewRows(rows) {
  return [...rows].sort((a, b) => {
    const rankA = a.final && a.final.finalRank ? Number(a.final.finalRank) : Number.MAX_SAFE_INTEGER;
    const rankB = b.final && b.final.finalRank ? Number(b.final.finalRank) : Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;

    const scoreA = a.final ? Number(a.final.finalScore || 0) : 0;
    const scoreB = b.final ? Number(b.final.finalScore || 0) : 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    return String(a.nama || '').localeCompare(String(b.nama || ''), 'id');
  });
}

async function upsertScore(kecamatanId, evaluator, presentationScore, collaborationScore, actorId) {
  const totalScore = round(presentationScore + collaborationScore, 3);
  await dbRun(
    `INSERT INTO interview_scores
      (kecamatan_id, evaluator_key, evaluator_name, presentation_score, collaboration_score, total_score, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(kecamatan_id, evaluator_key) DO UPDATE SET
      evaluator_name=excluded.evaluator_name,
      presentation_score=excluded.presentation_score,
      collaboration_score=excluded.collaboration_score,
      total_score=excluded.total_score,
      updated_by=excluded.updated_by,
      updated_at=CURRENT_TIMESTAMP`,
    [kecamatanId, evaluator.key, evaluator.label, presentationScore, collaborationScore, totalScore, actorId]
  );
  return totalScore;
}

async function upsertFinal(kecamatanId, values, actorId) {
  await dbRun(
    `INSERT INTO interview_final_scores
      (kecamatan_id, presentation_total, collaboration_total, interview_total,
       interview_percentage, interview_weighted_score, input_data_score, final_score,
       final_rank, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(kecamatan_id) DO UPDATE SET
       presentation_total=excluded.presentation_total,
       collaboration_total=excluded.collaboration_total,
       interview_total=excluded.interview_total,
       interview_percentage=excluded.interview_percentage,
       interview_weighted_score=excluded.interview_weighted_score,
       input_data_score=excluded.input_data_score,
       final_score=excluded.final_score,
       final_rank=excluded.final_rank,
       updated_by=excluded.updated_by,
       updated_at=CURRENT_TIMESTAMP`,
    [
      kecamatanId,
      values.presentationTotal,
      values.collaborationTotal,
      values.interviewTotal,
      values.interviewPercentage,
      values.interviewWeightedScore,
      values.inputDataScore,
      values.finalScore,
      values.finalRank || null,
      actorId
    ]
  );
}

async function recalculateRanks() {
  const finalRows = await dbAll(
    `SELECT kecamatan_id, final_score
     FROM interview_final_scores
     ORDER BY final_score DESC, kecamatan_id ASC`
  );

  let previousScore = null;
  let previousRank = 0;
  for (let index = 0; index < finalRows.length; index += 1) {
    const row = finalRows[index];
    const score = Number(row.final_score || 0);
    const rank = previousScore !== null && score === previousScore ? previousRank : index + 1;
    await dbRun('UPDATE interview_final_scores SET final_rank = ? WHERE kecamatan_id = ?', [rank, row.kecamatan_id]);
    previousScore = score;
    previousRank = rank;
  }
}

router.get('/interview-recap', ensureAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    await recalculateRanks();
    const rows = getRankedInterviewRows(await loadRows());
    const evaluatedRows = rows.filter(row => row.final && Number(row.final.finalScore || 0) > 0);
    res.render('interview-recap', {
      rows,
      evaluatedRows,
      evaluators: EVALUATORS,
      username: req.session.username,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Gagal memuat rekap wawancara:', error);
    res.status(500).send('Gagal memuat rekap nilai wawancara.');
  }
});

router.post('/interview-recap/save', ensureAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const rows = await loadRows();
    for (const row of rows) {
      const kecamatanId = Number(row.id);
      let presentationTotal = 0;
      let collaborationTotal = 0;

      for (const evaluator of EVALUATORS) {
        const presentationScore = toNumber(field(req.body, 'presentation', kecamatanId, evaluator.key));
        const collaborationScore = toNumber(field(req.body, 'collaboration', kecamatanId, evaluator.key));
        presentationTotal += presentationScore;
        collaborationTotal += collaborationScore;
        await upsertScore(kecamatanId, evaluator, presentationScore, collaborationScore, req.session.userId);
      }

      const interviewTotal = round(presentationTotal + collaborationTotal, 3);
      const interviewPercentage = round((interviewTotal / 400) * 100, 3);
      const interviewWeightedScore = round(interviewPercentage * 0.5, 3);
      const inputDataRawScore = req.body[`input_data_${kecamatanId}`] === undefined || String(req.body[`input_data_${kecamatanId}`]).trim() === ''
        ? Number(row.baseline ? row.baseline.totalScore : 0)
        : toNumber(req.body[`input_data_${kecamatanId}`]);
      const inputDataScore = round(inputDataRawScore * 0.5, 3);
      const finalScore = round(interviewWeightedScore + inputDataScore, 3);

      await upsertFinal(kecamatanId, {
        presentationTotal: round(presentationTotal, 3),
        collaborationTotal: round(collaborationTotal, 3),
        interviewTotal,
        interviewPercentage,
        interviewWeightedScore,
        inputDataScore: round(inputDataScore, 3),
        finalScore,
        finalRank: null
      }, req.session.userId);
    }

    await recalculateRanks();
    res.redirect('/interview-recap?success=1');
  } catch (error) {
    console.error('Gagal menyimpan rekap wawancara:', error);
    res.redirect('/interview-recap?error=' + encodeURIComponent('Gagal menyimpan rekap nilai wawancara.'));
  }
});

router.get('/interview-recap/export.csv', ensureAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    await recalculateRanks();
    const rows = getRankedInterviewRows(await loadRows());
    const headers = [
      'No', 'Kecamatan',
      ...EVALUATORS.flatMap(evaluator => [
        `${evaluator.label} Penampilan`,
        `${evaluator.label} Pengayaan`,
        `${evaluator.label} Total`
      ]),
      'Total Penampilan', 'Total Pengayaan', 'Total Wawancara',
      'Capaian Wawancara (%)', 'Capaian Wawancara Bobot 50%', 'Capaian Input Data Bobot 50%', 'Nilai Akhir', 'Peringkat'
    ];
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csvRows = [headers.map(escape).join(',')];

    rows.forEach((row, index) => {
      const final = row.final || {};
      csvRows.push([
        final.finalRank || index + 1,
        row.nama,
        ...EVALUATORS.flatMap(evaluator => [
          row.scores[evaluator.key].presentationScore,
          row.scores[evaluator.key].collaborationScore,
          row.scores[evaluator.key].totalScore
        ]),
        final.presentationTotal || 0,
        final.collaborationTotal || 0,
        final.interviewTotal || 0,
        final.interviewPercentage || 0,
        final.interviewWeightedScore || round((final.interviewPercentage || 0) * 0.5, 3),
        final.inputDataScore || (row.baseline ? round(row.baseline.totalScore * 0.5, 3) : 0),
        final.finalScore || 0,
        final.finalRank || ''
      ].map(escape).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rekap-nilai-wawancara-semua-kecamatan.csv"');
    res.send('\ufeff' + csvRows.join('\n'));
  } catch (error) {
    console.error('Gagal ekspor rekap wawancara:', error);
    res.status(500).send('Gagal ekspor rekap nilai wawancara.');
  }
});

module.exports = router;
