const express = require('express');
const router = express.Router();
const db = require('../database/database');

const DEFAULT_DEADLINE = '2025-12-31';

// Middleware admin: hanya admin pusat yang boleh membuka halaman settings.
function ensureAdmin(req, res, next) {
  if (req.session && req.session.userId && (req.session.isAdmin || req.session.username === 'admin')) {
    return next();
  }
  res.redirect('/dashboard');
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

async function getDeadline() {
  const row = await dbGet('SELECT value FROM config WHERE key = ?', ['deadline']);
  return row && row.value ? row.value : DEFAULT_DEADLINE;
}

function isValidDateInput(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

// GET /admin/settings - halaman pengaturan admin.
router.get('/admin/settings', ensureAdmin, async (req, res) => {
  try {
    const deadline = await getDeadline();
    res.render('admin/settings', {
      username: req.session.username,
      deadline,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('❌ Error loading admin settings:', err);
    res.status(500).send('Error loading settings');
  }
});

// POST /admin/settings/update-deadline - update deadline pengisian.
router.post('/admin/settings/update-deadline', ensureAdmin, async (req, res) => {
  try {
    const deadline = String(req.body.deadline || '').trim();

    if (!isValidDateInput(deadline)) {
      return res.redirect('/admin/settings?error=' + encodeURIComponent('Format deadline tidak valid'));
    }

    await dbRun(
      `INSERT INTO config (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`,
      ['deadline', deadline]
    );

    res.redirect('/admin/settings?success=' + encodeURIComponent('Deadline berhasil diperbarui'));
  } catch (err) {
    console.error('❌ Error updating deadline:', err);
    res.redirect('/admin/settings?error=' + encodeURIComponent('Gagal memperbarui deadline'));
  }
});

module.exports = router;
