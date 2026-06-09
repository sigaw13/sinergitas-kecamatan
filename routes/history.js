const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');

// GET - Halaman History Upload
router.get('/', ensureAuthenticated, isAdmin, (req, res) => {
  const query = `
    SELECT 
      k.id,
      k.nama,
      k.nama_pengelola,
      k.email,
      a.updated_at as upload_a,
      b.updated_at as upload_b,
      c.updated_at as upload_c,
      d.updated_at as upload_d,
      e.updated_at as upload_e,
      f.updated_at as upload_f,
      (a.total_score + b.total_score + c.total_score + d.total_score + e.total_score + f.total_score) as total_score
    FROM kecamatan k
    LEFT JOIN aspect_a a ON k.id = a.kecamatan_id
    LEFT JOIN aspect_b b ON k.id = b.kecamatan_id
    LEFT JOIN aspect_c c ON k.id = c.kecamatan_id
    LEFT JOIN aspect_d d ON k.id = d.kecamatan_id
    LEFT JOIN aspect_e e ON k.id = e.kecamatan_id
    LEFT JOIN aspect_f f ON k.id = f.kecamatan_id
    WHERE k.username != 'admin'
    ORDER BY k.id
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching history:', err);
      return res.status(500).send('Error loading history');
    }
    
    res.render('history', {
      kecamatans: rows,
      username: req.session.username
    });
  });
});

// GET - API untuk data grafik
router.get('/api/chart-data', ensureAuthenticated, isAdmin, (req, res) => {
  const query = `
    SELECT 
      k.nama,
      COALESCE(a.total_score, 0) as score_a,
      COALESCE(b.total_score, 0) as score_b,
      COALESCE(c.total_score, 0) as score_c,
      COALESCE(d.total_score, 0) as score_d,
      COALESCE(e.total_score, 0) as score_e,
      COALESCE(f.total_score, 0) as score_f,
      (COALESCE(a.total_score, 0) + COALESCE(b.total_score, 0) + COALESCE(c.total_score, 0) + 
       COALESCE(d.total_score, 0) + COALESCE(e.total_score, 0) + COALESCE(f.total_score, 0)) as total_score
    FROM kecamatan k
    LEFT JOIN aspect_a a ON k.id = a.kecamatan_id
    LEFT JOIN aspect_b b ON k.id = b.kecamatan_id
    LEFT JOIN aspect_c c ON k.id = c.kecamatan_id
    LEFT JOIN aspect_d d ON k.id = d.kecamatan_id
    LEFT JOIN aspect_e e ON k.id = e.kecamatan_id
    LEFT JOIN aspect_f f ON k.id = f.kecamatan_id
    WHERE k.username != 'admin'
    ORDER BY total_score DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching chart data' });
    }
    res.json(rows);
  });
});

module.exports = router;