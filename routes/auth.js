const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/database');
const { loginRateLimit, clearLoginAttempts } = require('../utils/security');

// GET Login
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  
  res.render('login', { 
    error: null,
    success: null
  });
});

// POST Login
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.render('login', { 
        error: 'Username dan password harus diisi',
        success: null
      });
    }
    
    const query = 'SELECT * FROM kecamatan WHERE username = ?';
    
    db.get(query, [username], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.render('login', { 
          error: 'Terjadi kesalahan sistem',
          success: null
        });
      }
      
      if (!row) {
        return res.render('login', { 
          error: 'Username tidak ditemukan',
          success: null
        });
      }
      
      const isPasswordValid = await bcrypt.compare(password, row.password);
      
      if (!isPasswordValid) {
        return res.render('login', { 
          error: 'Password salah',
          success: null
        });
      }
      
      req.session.userId = row.id;
      req.session.username = row.username;
      const validRoles = new Set(['superadmin', 'evaluator', 'kecamatan']);
      const role = String(row.role || '').trim().toLowerCase();
      req.session.role = validRoles.has(role) ? role : 'kecamatan';
      req.session.kecamatan = req.session.role === 'evaluator'
        ? (row.nama_pengelola || row.nama)
        : row.nama;
      req.session.isAdmin = ['superadmin', 'evaluator'].includes(req.session.role);
      clearLoginAttempts(req);
      
      res.redirect('/dashboard');
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { 
      error: 'Terjadi kesalahan. Silakan coba lagi.',
      success: null
    });
  }
});

// GET Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;
