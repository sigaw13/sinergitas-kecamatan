'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/database');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row || null)));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error, result) => (error ? reject(error) : resolve(result || {})));
  });
}

router.get('/account/password', ensureAuthenticated, (req, res) => {
  res.render('account/password', {
    username: req.session.username,
    success: req.query.success || null,
    error: req.query.error || null
  });
});

router.post('/account/password', ensureAuthenticated, async (req, res) => {
  try {
    const currentPassword = String(req.body.current_password || '');
    const newPassword = String(req.body.new_password || '');
    const confirmation = String(req.body.confirm_password || '');
    if (newPassword.length < 6) {
      throw new Error('Password baru minimal 6 karakter.');
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      throw new Error('Password baru harus memuat huruf dan angka.');
    }
    if (newPassword !== confirmation) {
      throw new Error('Konfirmasi password baru tidak sama.');
    }

    const user = await dbGet('SELECT password FROM kecamatan WHERE id = ?', [req.session.userId]);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new Error('Password saat ini tidak benar.');
    }
    await dbRun(
      'UPDATE kecamatan SET password = ? WHERE id = ?',
      [await bcrypt.hash(newPassword, 12), req.session.userId]
    );
    res.redirect('/account/password?success=' + encodeURIComponent('Password berhasil diperbarui.'));
  } catch (error) {
    res.redirect('/account/password?error=' + encodeURIComponent(error.message || 'Gagal memperbarui password.'));
  }
});

module.exports = router;
