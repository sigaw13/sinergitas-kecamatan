const express = require('express');
const router = express.Router();
const db = require('../database/database');
const ScoringSystem = require('../utils/scoring');

const DEFAULT_DEADLINE = '2025-12-31';

// Middleware untuk cek login.
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.redirect('/login');
}

// Middleware khusus admin.
function ensureAdmin(req, res, next) {
  if (req.session && (req.session.isAdmin || req.session.username === 'admin')) return next();
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

// Ambil deadline dari tabel config. Jika tabel belum tersedia, gunakan default agar dashboard tetap jalan.
async function getDeadline() {
  try {
    const row = await dbGet('SELECT value FROM config WHERE key = ?', ['deadline']);
    return row && row.value ? row.value : DEFAULT_DEADLINE;
  } catch (err) {
    console.warn('⚠️ Deadline config belum bisa dibaca, memakai default:', err.message);
    return DEFAULT_DEADLINE;
  }
}

function countCompleted(row) {
  return ['status_a', 'status_b', 'status_c', 'status_d', 'status_e', 'status_f']
    .reduce((total, key) => total + (row[key] === 'Sudah' ? 1 : 0), 0);
}

function withProgress(row) {
  const completed = countCompleted(row);
  return {
    ...row,
    completed_instruments: completed,
    progress_percent: Math.round((completed / 6) * 100)
  };
}

// Query utama progress pengisian semua kecamatan per instrumen A-F.
async function getKecamatanProgressRows() {
  const query = `
    SELECT
      k.id, k.nama, k.username, k.nama_pengelola, k.email,
      COALESCE(a.upload_status, 'Belum') AS status_a,
      COALESCE(b.upload_status, 'Belum') AS status_b,
      COALESCE(c.upload_status, 'Belum') AS status_c,
      COALESCE(d.upload_status, 'Belum') AS status_d,
      COALESCE(e.upload_status, 'Belum') AS status_e,
      COALESCE(f.upload_status, 'Belum') AS status_f
    FROM kecamatan k
    LEFT JOIN aspect_a a ON k.id = a.kecamatan_id
    LEFT JOIN aspect_b b ON k.id = b.kecamatan_id
    LEFT JOIN aspect_c c ON k.id = c.kecamatan_id
    LEFT JOIN aspect_d d ON k.id = d.kecamatan_id
    LEFT JOIN aspect_e e ON k.id = e.kecamatan_id
    LEFT JOIN aspect_f f ON k.id = f.kecamatan_id
    WHERE k.username != ?
    ORDER BY k.id
  `;

  const rows = await dbAll(query, ['admin']);
  return rows.map(withProgress);
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

function buildInstrumentCards(rows) {
  const definitions = [
    { key: 'A', code: 'a', title: 'Pelayanan Publik', description: 'Standar pelayanan, survei kepuasan, inovasi pelayanan, pengaduan masyarakat, dan transparansi informasi publik.', url: '/assessment/aspect-a' },
    { key: 'B', code: 'b', title: 'Penyelenggaraan Pemerintahan', description: 'Pembinaan persatuan, kerukunan, koordinasi Forkopimcam, serta fasilitasi desa/kelurahan.', url: '/assessment/aspect-b' },
    { key: 'C', code: 'c', title: 'Pengelolaan Anggaran', description: 'Dokumen perencanaan, anggaran, kesesuaian program, dan realisasi anggaran.', url: '/assessment/aspect-c' },
    { key: 'D', code: 'd', title: 'Inovasi Kecamatan', description: 'Sistem informasi, inovasi camat, keputusan camat, dan prestasi kecamatan.', url: '/assessment/aspect-d' },
    { key: 'E', code: 'e', title: 'Kompetensi SDM', description: 'Kualifikasi pendidikan, jumlah pejabat, diklat PIM, diklat teknis, dan nilai BerAKHLAK.', url: '/assessment/aspect-e' },
    { key: 'F', code: 'f', title: 'Data Dukung Lainnya', description: 'Data PAUD, TK, SD, SMP, SMA, kesehatan, UMKM, pasar, koperasi, stunting, dan data lain.', url: '/assessment/aspect-f' }
  ];

  return definitions.map(item => {
    const row = rows[item.code] || {};
    return {
      ...item,
      status: row.upload_status === 'Sudah' ? 'Sudah' : 'Belum',
      totalScore: Number(row.total_score || 0)
    };
  });
}

// GET Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const deadline = await getDeadline();

    if (req.session.isAdmin) {
      const kecamatans = await getKecamatanProgressRows();
      return res.render('dashboard', {
        kecamatans,
        deadline,
        isAdmin: true,
        username: req.session.username,
        success: req.query.success || null,
        error: req.query.error || null
      });
    }

    const rows = await getInstrumentRowsForKecamatan(req.session.userId);
    const instruments = buildInstrumentCards(rows);
    const completedCount = instruments.filter(item => item.status === 'Sudah').length;

    res.render('dashboard', {
      kecamatan: req.session.kecamatan,
      instruments,
      completedCount,
      overallProgress: Math.round((completedCount / 6) * 100),
      deadline,
      isAdmin: false,
      username: req.session.username,
      success: req.query.success || null,
      error: req.query.error || null,
      kecamatans: []
    });
  } catch (err) {
    console.error('❌ Error loading dashboard:', err);
    res.status(500).send('Error loading dashboard: ' + err.message);
  }
});

// GET Report
router.get('/report', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const kecamatans = await getKecamatanProgressRows();
    res.render('report', {
      kecamatans,
      username: req.session.username
    });
  } catch (err) {
    console.error('❌ Error fetching report data:', err);
    res.status(500).send('Error loading report');
  }
});

async function buildScoreForKecamatan(kecamatan) {
  const rows = await getInstrumentRowsForKecamatan(kecamatan.id);

  const aspectA = ScoringSystem.calculateAspectA(rows.a || {});
  const aspectB = ScoringSystem.calculateAspectB(rows.b || {});
  const aspectC = ScoringSystem.calculateAspectC(rows.c || {});
  const aspectD = ScoringSystem.calculateAspectD(rows.d || {});
  const aspectE = ScoringSystem.calculateAspectE(rows.e || {});
  const aspectF = ScoringSystem.calculateAspectF(rows.f || {});

  const totalScore = ScoringSystem.calculateTotalScore(aspectA, aspectB, aspectC, aspectD, aspectE, aspectF);

  return {
    kecamatan: kecamatan.nama,
    username: kecamatan.username,
    ...totalScore
  };
}

// GET Ranking
router.get('/ranking', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const kecamatans = await dbAll('SELECT * FROM kecamatan WHERE username != ? ORDER BY nama', ['admin']);
    const allScores = await Promise.all(kecamatans.map(buildScoreForKecamatan));
    const ranked = ScoringSystem.calculateRanking(allScores);

    res.render('ranking', {
      rankings: ranked,
      username: req.session.username
    });
  } catch (err) {
    console.error('❌ Error loading ranking:', err);
    res.status(500).send('Error loading ranking');
  }
});

module.exports = router;
