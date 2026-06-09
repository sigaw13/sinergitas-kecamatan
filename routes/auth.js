const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../database/database');

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM kecamatan WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.render('login', { error: 'Terjadi kesalahan sistem' });
    }

    if (!user) {
      return res.render('login', { error: 'Username tidak ditemukan' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { error: 'Password salah' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.kecamatan = user.nama;
    req.session.isAdmin = user.username === 'admin';

    res.redirect('/dashboard');
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/dashboard');
    }
    res.redirect('/login');
  });
});

module.exports = router;