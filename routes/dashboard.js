const express = require('express');
const router = express.Router();
const db = require('../database/database');
const ScoringSystem = require('../utils/scoring');

// Middleware untuk cek login
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.username === 'admin') {
    return next();
  }
  res.redirect('/dashboard');
}

// GET Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  if (req.session.isAdmin) {
    // Admin dashboard - tampilkan semua kecamatan
    const query = `
      SELECT 
        k.id, k.nama, k.username, k.nama_pengelola, k.email,
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
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('❌ Error fetching dashboard data:', err);
        return res.status(500).send('Error loading dashboard: ' + err.message);
      }
      
      // Pastikan rows adalah array
      const kecamatans = Array.isArray(rows) ? rows : [];
      console.log(`✅ Dashboard admin: ${kecamatans.length} kecamatan loaded`);
      
      res.render('dashboard', { 
        kecamatans: kecamatans,
        isAdmin: true,
        username: req.session.username,
        success: req.query.success || null,
        error: null
      });
    });
  } else {
    // Kecamatan dashboard
    const userId = req.session.userId;
    
    db.all('SELECT * FROM aspect_a WHERE kecamatan_id = $1', [userId], (err, aspectA) => {
      db.all('SELECT * FROM aspect_b WHERE kecamatan_id = $1', [userId], (err, aspectB) => {
        db.all('SELECT * FROM aspect_c WHERE kecamatan_id = $1', [userId], (err, aspectC) => {
          db.all('SELECT * FROM aspect_d WHERE kecamatan_id = $1', [userId], (err, aspectD) => {
            db.all('SELECT * FROM aspect_e WHERE kecamatan_id = $1', [userId], (err, aspectE) => {
              db.all('SELECT * FROM aspect_f WHERE kecamatan_id = $1', [userId], (err, aspectF) => {
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
                  success: req.query.success || null,
                  error: null,
                  kecamatans: []
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
      k.id, k.nama, k.username, k.nama_pengelola, k.email,
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
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('❌ Error fetching report data:', err);
      return res.status(500).send('Error loading report');
    }
    
    const kecamatans = Array.isArray(rows) ? rows : [];
    console.log(`✅ Report: ${kecamatans.length} kecamatan loaded`);
    
    res.render('report', { 
      kecamatans: kecamatans,
      username: req.session.username 
    });
  });
});

// GET Ranking
router.get('/ranking', ensureAuthenticated, isAdmin, (req, res) => {
  db.all('SELECT * FROM kecamatan WHERE username != $1 ORDER BY nama', ['admin'], (err, kecamatans) => {
    if (err) {
      console.error('Error fetching kecamatan:', err);
      return res.status(500).send('Error');
    }
    
    const kcList = Array.isArray(kecamatans) ? kecamatans : [];
    const allScores = [];
    let processed = 0;
    
    if (kcList.length === 0) {
      return res.render('ranking', { rankings: [], username: req.session.username });
    }
    
    kcList.forEach(kc => {
      db.all('SELECT * FROM aspect_a WHERE kecamatan_id = $1', [kc.id], (err, a) => {
        db.all('SELECT * FROM aspect_b WHERE kecamatan_id = $1', [kc.id], (err, b) => {
          db.all('SELECT * FROM aspect_c WHERE kecamatan_id = $1', [kc.id], (err, c) => {
            db.all('SELECT * FROM aspect_d WHERE kecamatan_id = $1', [kc.id], (err, d) => {
              db.all('SELECT * FROM aspect_e WHERE kecamatan_id = $1', [kc.id], (err, e) => {
                db.all('SELECT * FROM aspect_f WHERE kecamatan_id = $1', [kc.id], (err, f) => {
                  
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
                  if (processed === kcList.length) {
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
