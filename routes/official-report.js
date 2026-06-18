'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/database');
const {
  ensureAuthenticated,
  isAdmin,
  canAccessKecamatan,
  getAuthorizedKecamatanIds
} = require('../middleware/auth');
const { INSTRUMENT_STANDARDS, TOTAL_MAX_SCORE } = require('../utils/standards');

const ASPECTS = Object.values(INSTRUMENT_STANDARDS).map(item => ({
  code: item.code,
  label: item.name,
  maxScore: item.maxScore
}));

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

function parseSnapshot(row) {
  try {
    return row && row.score_snapshot ? JSON.parse(row.score_snapshot) : null;
  } catch (error) {
    return null;
  }
}

function buildAspectRows(row) {
  const snapshot = parseSnapshot(row);
  return ASPECTS.map(item => {
    const fromSnapshot = snapshot && snapshot.aspects ? snapshot.aspects[item.code] : null;
    const score = fromSnapshot
      ? Number(fromSnapshot.totalScore || 0)
      : Number(row[`score_${item.code.toLowerCase()}`] || 0);
    const maxScore = fromSnapshot
      ? Number(fromSnapshot.maxScore || item.maxScore)
      : item.maxScore;
    return {
      ...item,
      score: Math.round(score * 100) / 100,
      maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0
    };
  });
}

function assignRanking(rows) {
  return rows.map((row, index) => ({ ...row, ranking: index + 1 }));
}

async function getOfficialRows(authorizedIds = null) {
  const rows = await dbAll(
    `SELECT er.*, k.nama AS kecamatan, k.username, k.nama_pengelola, k.email,
            evaluator.nama AS finalized_by_name
     FROM evaluation_results er
     JOIN kecamatan k ON k.id = er.kecamatan_id
     LEFT JOIN kecamatan evaluator ON evaluator.id = er.finalized_by
     WHERE er.status = ?
     ORDER BY er.total_score DESC, er.finalized_at ASC, k.nama ASC`,
    ['Final']
  );

  const allowed = Array.isArray(authorizedIds) ? new Set(authorizedIds.map(Number)) : null;
  return assignRanking(rows.filter(row => !allowed || allowed.has(Number(row.kecamatan_id))).map(row => ({
    ...row,
    total_score: Number(row.total_score || 0),
    max_score: Number(row.max_score || TOTAL_MAX_SCORE),
    percentage: Number(row.percentage || 0),
    aspects: buildAspectRows(row)
  })));
}

router.get('/', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const authorizedIds = await getAuthorizedKecamatanIds(req);
    const [officialRows, totalRow] = await Promise.all([
      getOfficialRows(authorizedIds),
      dbGet("SELECT COUNT(*) AS total FROM kecamatan WHERE role = 'kecamatan'")
    ]);
    const totalKecamatan = Array.isArray(authorizedIds)
      ? authorizedIds.length
      : Number(totalRow && totalRow.total ? totalRow.total : 0);
    const finalCount = officialRows.length;
    const averageScore = finalCount
      ? Math.round((officialRows.reduce((sum, item) => sum + item.total_score, 0) / finalCount) * 100) / 100
      : 0;
    const averagePercentage = finalCount
      ? Math.round((officialRows.reduce((sum, item) => sum + item.percentage, 0) / finalCount) * 100) / 100
      : 0;

    res.render('official-report/index', {
      rows: officialRows,
      totalKecamatan,
      finalCount,
      pendingCount: Math.max(totalKecamatan - finalCount, 0),
      averageScore,
      averagePercentage,
      username: req.session.username
    });
  } catch (error) {
    console.error('Gagal memuat laporan hasil resmi:', error);
    res.status(500).send('Gagal memuat laporan hasil resmi penilaian sinergitas.');
  }
});

router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const kecamatanId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(kecamatanId)) return res.status(400).send('Kecamatan tidak valid.');
    if (!(await canAccessKecamatan(req.session.userId, req.session.role, kecamatanId))) {
      return res.status(403).send('Anda tidak memiliki akses ke laporan kecamatan ini.');
    }

    const row = await dbGet(
      `SELECT er.*, k.nama AS kecamatan, k.username, k.nama_pengelola, k.email, k.no_hp,
              evaluator.nama AS finalized_by_name
       FROM evaluation_results er
       JOIN kecamatan k ON k.id = er.kecamatan_id
       LEFT JOIN kecamatan evaluator ON evaluator.id = er.finalized_by
       WHERE er.kecamatan_id = ? AND er.status = ?`,
      [kecamatanId, 'Final']
    );
    if (!row) return res.status(404).send('Hasil resmi kecamatan ini belum tersedia.');

    const officialRows = await getOfficialRows();
    const rankingRow = officialRows.find(item => Number(item.kecamatan_id) === kecamatanId);
    const reviews = await dbAll(
      `SELECT instrument, status, notes, reviewed_at
       FROM evaluation_reviews
       WHERE kecamatan_id = ?
       ORDER BY instrument`,
      [kecamatanId]
    );
    const evidenceCounts = await dbAll(
      `SELECT instrument, COUNT(*) AS total
       FROM assessment_files
       WHERE kecamatan_id = ?
       GROUP BY instrument`,
      [kecamatanId]
    );
    const evidenceMap = new Map(evidenceCounts.map(item => [String(item.instrument || '').toUpperCase(), Number(item.total || 0)]));
    const reviewMap = new Map(reviews.map(item => [String(item.instrument || '').toUpperCase(), item]));
    const aspects = buildAspectRows(row).map(item => ({
      ...item,
      evidenceCount: evidenceMap.get(item.code) || 0,
      reviewStatus: (reviewMap.get(item.code) || {}).status || 'Terverifikasi',
      reviewNotes: (reviewMap.get(item.code) || {}).notes || ''
    }));

    res.render('official-report/detail', {
      result: {
        ...row,
        total_score: Number(row.total_score || 0),
        max_score: Number(row.max_score || TOTAL_MAX_SCORE),
        percentage: Number(row.percentage || 0),
        ranking: rankingRow ? rankingRow.ranking : '-'
      },
      aspects,
      username: req.session.username,
      isAdmin: Boolean(req.session.isAdmin)
    });
  } catch (error) {
    console.error('Gagal memuat rincian hasil resmi:', error);
    res.status(500).send('Gagal memuat rincian hasil resmi kecamatan.');
  }
});

module.exports = router;
