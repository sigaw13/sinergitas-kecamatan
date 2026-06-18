'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { ensureAuthenticated, isAdmin, getAuthorizedKecamatanIds } = require('../middleware/auth');
const { TOTAL_MAX_SCORE } = require('../utils/standards');

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(Array.isArray(rows) ? rows : [])));
  });
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('id-ID');
}

async function getOfficialRows() {
  return dbAll(
    `SELECT er.*, k.nama AS kecamatan, k.nama_pengelola, k.email
     FROM evaluation_results er
     JOIN kecamatan k ON k.id = er.kecamatan_id
     WHERE er.status = ?
     ORDER BY er.total_score DESC, er.finalized_at ASC, k.nama ASC`,
    ['Final']
  );
}

router.get('/official.csv', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const rows = await getOfficialRows();
    const authorizedIds = await getAuthorizedKecamatanIds(req);
    const allowed = Array.isArray(authorizedIds) ? new Set(authorizedIds.map(Number)) : null;
    const visibleRows = rows.filter(row => !allowed || allowed.has(Number(row.kecamatan_id)));
    const header = [
      'Peringkat','Kecamatan','Pengelola','Email','Instrumen A','Instrumen B','Instrumen C',
      'Instrumen D','Instrumen E','Instrumen F','Total Skor','Skor Maksimum','Persentase',
      'Kategori','Tanggal Finalisasi'
    ];
    const lines = [header.map(csvEscape).join(',')];
    visibleRows.forEach((row, index) => {
      lines.push([
        index + 1,
        row.kecamatan,
        row.nama_pengelola || '-',
        row.email || '-',
        Number(row.score_a || 0),
        Number(row.score_b || 0),
        Number(row.score_c || 0),
        Number(row.score_d || 0),
        Number(row.score_e || 0),
        Number(row.score_f || 0),
        Number(row.total_score || 0),
        Number(row.max_score || TOTAL_MAX_SCORE),
        `${Number(row.percentage || 0)}%`,
        row.category || '-',
        formatDate(row.finalized_at)
      ].map(csvEscape).join(','));
    });

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`Hasil-Resmi-Sinergitas-Kecamatan-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(`\uFEFF${lines.join('\n')}`);
  } catch (error) {
    console.error('Gagal mengekspor hasil resmi:', error);
    res.status(500).send('Gagal mengekspor hasil resmi penilaian sinergitas.');
  }
});

// Kompatibilitas tautan lama: ekspor utama sekarang hanya memakai hasil yang sudah final.
router.get('/csv', ensureAuthenticated, isAdmin, (req, res) => {
  res.redirect('/export/official.csv');
});

module.exports = router;
