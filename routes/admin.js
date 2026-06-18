const express = require('express');
const router = express.Router();

const db = require('../database/database');
const { getBackupOverview } = require('../utils/backup');
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
// 📦 EXPORT
// =========================
module.exports = router;
