const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const db = require('../database/database');
const { getBackupOverview } = require('../utils/backup');
const { UPLOADS_DIR } = require('../utils/storage');
const { isSuperAdmin } = require('../middleware/auth');

const DEFAULT_DEADLINE = '2026-12-31';


// =========================
// 🔐 MIDDLEWARE ADMIN
// =========================
function ensureAdmin(req, res, next) {
  return isSuperAdmin(req, res, next);
}


// =========================
// 🧩 DATABASE HELPER
// =========================
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}


// =========================
// ⏳ DEADLINE CONFIG
// =========================
async function getDeadline() {
  const row = await dbGet(
    'SELECT value FROM config WHERE key = ?',
    ['deadline']
  );

  return row?.value || DEFAULT_DEADLINE;
}

function isValidDateInput(value) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
  );
}


// =========================
// 📊 ADMIN SETTINGS PAGE
// =========================
router.get('/admin/settings', ensureAdmin, async (req, res) => {
  try {
    const deadline = await getDeadline();
    const backupInfo = getBackupOverview();

    return res.render('admin/settings', {
      username: req.session.username,
      deadline,
      backupInfo,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (err) {
    console.error('❌ Error loading admin settings:', err);
    return res.status(500).send('Error loading settings');
  }
});


// =========================
// 🕒 UPDATE DEADLINE
// =========================
router.post('/admin/settings/update-deadline', ensureAdmin, async (req, res) => {
  try {
    const deadline = String(req.body.deadline || '').trim();

    if (!isValidDateInput(deadline)) {
      return res.redirect(
        '/admin/settings?error=' +
        encodeURIComponent('Format deadline tidak valid')
      );
    }

    await dbRun(
      `INSERT INTO config (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`,
      ['deadline', deadline]
    );

    return res.redirect(
      '/admin/settings?success=' +
      encodeURIComponent('Deadline berhasil diperbarui')
    );

  } catch (err) {
    console.error('❌ Error updating deadline:', err);

    return res.redirect(
      '/admin/settings?error=' +
      encodeURIComponent('Gagal memperbarui deadline')
    );
  }
});

// =========================
// 🧹 RESET DATA UJI COBA
// =========================
router.post('/admin/settings/reset-trial-data', ensureAdmin, async (req, res) => {
  const confirmation = String(req.body.confirm_reset || '').trim().toUpperCase();
  if (confirmation !== 'HAPUS DATA UJI COBA') {
    return res.redirect(
      '/admin/settings?error=' +
      encodeURIComponent('Reset dibatalkan. Ketik HAPUS DATA UJI COBA dengan tepat.')
    );
  }

  const tables = [
    'evaluation_history',
    'evaluation_item_scores',
    'evaluation_reviews',
    'evaluation_results',
    'assessment_files',
    'assessment_progress',
    'aspect_a',
    'aspect_b',
    'aspect_c',
    'aspect_d',
    'aspect_e',
    'aspect_f'
  ];

  try {
    await dbRun('BEGIN');
    for (const table of tables) {
      await dbRun(`DELETE FROM ${table}`);
    }
    await dbRun('COMMIT');

    let uploadWarning = '';
    try {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      for (const entry of fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })) {
        if (entry.name === '.gitkeep') continue;
        fs.rmSync(path.join(UPLOADS_DIR, entry.name), {
          recursive: true,
          force: true
        });
      }
    } catch (uploadError) {
      console.error('⚠️ Data database sudah direset, tetapi folder upload gagal dibersihkan:', uploadError);
      uploadWarning = ' Data database sudah bersih, tetapi sebagian file upload perlu diperiksa manual.';
    }

    console.warn(`🧹 Data uji coba direset oleh ${req.session.username || req.session.userId}.`);
    return res.redirect(
      '/admin/settings?success=' +
      encodeURIComponent(
        'Data uji coba berhasil dihapus. Akun, pembagian evaluator, deadline, dan baseline Excel tetap dipertahankan.' +
        uploadWarning
      )
    );
  } catch (error) {
    try { await dbRun('ROLLBACK'); } catch (_) {}
    console.error('❌ Gagal mereset data uji coba:', error);
    return res.redirect(
      '/admin/settings?error=' +
      encodeURIComponent('Reset data gagal: ' + (error.message || 'kesalahan database'))
    );
  }
});


// =========================
// 📦 EXPORT
// =========================
module.exports = router;
