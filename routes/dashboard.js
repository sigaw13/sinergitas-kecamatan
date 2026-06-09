const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');
const ScoringSystem = require('../utils/scoring');

router.get('/dashboard', ensureAuthenticated, (req, res) => {
  if (req.session.isAdmin) {
    // Query JOIN untuk mendapatkan status dari semua tabel aspek
    const query = `
      SELECT 
        k.id,
        k.nama,
        k.username,
        k.nama_pengelola,
        k.email,
        COALESCE(a.upload_status, 'Belum') as status_a,
        COALESCE(b.upload_status, 'Belum') as status_b,
        COALESCE(c.upload_status, 'Belum') as status_c,
        COALESCE(d.upload_status, 'Belum') as status_d,
        COALESCE(e.upload_status, 'Belum') as status_e,
        COALESCE(f.upload_status, 'Belum') as status_f
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
        console.error(' Error fetching dashboard data:', err);
        return res.status(500).send('Error loading dashboard');
      }
      
      console.log(`✅ Dashboard admin: ${rows.length} kecamatan loaded`);
      
      res.render('dashboard', { 
        kecamatans: rows || [], // Pastikan selalu array
        isAdmin: true,
        username: req.session.username,
        success: req.query.success
      });
    });
  } else {
    // Untuk kecamatan - kirim data kosong untuk kecamatans
    db.get('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [req.session.userId], (err, aspectA) => {
      db.get('SELECT * FROM aspect_b WHERE kecamatan_id = ?', [req.session.userId], (err, aspectB) => {
        db.get('SELECT * FROM aspect_c WHERE kecamatan_id = ?', [req.session.userId], (err, aspectC) => {
          db.get('SELECT * FROM aspect_d WHERE kecamatan_id = ?', [req.session.userId], (err, aspectD) => {
            db.get('SELECT * FROM aspect_e WHERE kecamatan_id = ?', [req.session.userId], (err, aspectE) => {
              db.get('SELECT * FROM aspect_f WHERE kecamatan_id = ?', [req.session.userId], (err, aspectF) => {
                res.render('dashboard', {
                  kecamatan: req.session.kecamatan,
                  aspectA: aspectA || {},
                  aspectB: aspectB || {},
                  aspectC: aspectC || {},
                  aspectD: aspectD || {},
                  aspectE: aspectE || {},
                  aspectF: aspectF || {},
                  isAdmin: false,
                  username: req.session.username,
                  success: req.query.success,
                  kecamatans: [] // Kirim array kosong untuk kecamatan
                });
              });
            });
          });
        });
      });
    });
  }
});

// GET Report
router.get('/report', ensureAuthenticated, isAdmin, (req, res) => {
  const query = `
    SELECT 
      k.id,
      k.nama,
      k.username,
      k.nama_pengelola,
      k.email,
      COALESCE(a.upload_status, 'Belum') as status_a,
      COALESCE(b.upload_status, 'Belum') as status_b,
      COALESCE(c.upload_status, 'Belum') as status_c,
      COALESCE(d.upload_status, 'Belum') as status_d,
      COALESCE(e.upload_status, 'Belum') as status_e,
      COALESCE(f.upload_status, 'Belum') as status_f
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
      console.error('❌ Error fetching report data:', err);
      return res.status(500).send('Error loading report');
    }
    
    const kecamatans = rows || [];
    console.log(`✅ Report: ${kecamatans.length} kecamatan loaded`);
    
    res.render('report', { 
      kecamatans: kecamatans,
      username: req.session.username 
    });
  });
});

// GET Ranking
router.get('/ranking', ensureAuthenticated, isAdmin, (req, res) => {
  db.all('SELECT * FROM kecamatan WHERE username != "admin" ORDER BY nama', (err, kecamatans) => {
    if (err) return res.status(500).send('Error');
    
    const allScores = [];
    let processed = 0;
    
    kecamatans.forEach(kc => {
      db.get('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [kc.id], (err, a) => {
        db.get('SELECT * FROM aspect_b WHERE kecamatan_id = ?', [kc.id], (err, b) => {
          db.get('SELECT * FROM aspect_c WHERE kecamatan_id = ?', [kc.id], (err, c) => {
            db.get('SELECT * FROM aspect_d WHERE kecamatan_id = ?', [kc.id], (err, d) => {
              db.get('SELECT * FROM aspect_e WHERE kecamatan_id = ?', [kc.id], (err, e) => {
                db.get('SELECT * FROM aspect_f WHERE kecamatan_id = ?', [kc.id], (err, f) => {
                  
                  const aspectA = ScoringSystem.calculateAspectA(a || {});
                  const aspectB = ScoringSystem.calculateAspectB(b || {});
                  const aspectC = ScoringSystem.calculateAspectC(c || {});
                  const aspectD = ScoringSystem.calculateAspectD(d || {});
                  const aspectE = ScoringSystem.calculateAspectE(e || {});
                  const aspectF = ScoringSystem.calculateAspectF(f || {});
                  
                  const totalScore = ScoringSystem.calculateTotalScore(
                    aspectA, aspectB, aspectC, aspectD, aspectE, aspectF
                  );
                  
                  allScores.push({
                    kecamatan: kc.nama,
                    username: kc.username,
                    ...totalScore
                  });
                  
                  processed++;
                  if (processed === kecamatans.length) {
                    const ranked = ScoringSystem.calculateRanking(allScores);
                    res.render('ranking', {
                      rankings: ranked,
                      username: req.session.username
                    });
                  }
                });
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router;