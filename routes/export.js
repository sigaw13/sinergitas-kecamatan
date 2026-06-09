const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');
const ScoringSystem = require('../utils/scoring');

// Export data ke format CSV
router.get('/csv', ensureAuthenticated, isAdmin, (req, res) => {
  db.all('SELECT * FROM kecamatan WHERE username != "admin" ORDER BY nama', (err, kecamatans) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).send('Error mengambil data');
    }

    // CSV Header
    let csv = 'No,Kecamatan,Pengelola,Email,Aspek A,Aspek B,Aspek C,Aspek D,Aspek E,Aspek F,Total Skor,Persentase,Kategori,Peringkat\n';

    let processed = 0;
    const results = [];

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
                  
                  results.push({
                    nama: kc.nama,
                    pengelola: kc.nama_pengelola || '-',
                    email: kc.email || '-',
                    scoreA: aspectA.totalScore,
                    scoreB: aspectB.totalScore,
                    scoreC: aspectC.totalScore,
                    scoreD: aspectD.totalScore,
                    scoreE: aspectE.totalScore,
                    scoreF: aspectF.totalScore,
                    totalScore: totalScore.totalScore,
                    percentage: totalScore.percentage,
                    category: totalScore.category
                  });
                  
                  processed++;
                  if (processed === kecamatans.length) {
                    // Sort by total score descending untuk ranking
                    results.sort((a, b) => b.totalScore - a.totalScore);
                    
                    // Add ranking dan generate CSV
                    results.forEach((r, idx) => {
                      csv += `${idx + 1},"${r.nama}","${r.pengelola}","${r.email}",${r.scoreA},${r.scoreB},${r.scoreC},${r.scoreD},${r.scoreE},${r.scoreF},${r.totalScore},${r.percentage}%,${r.category},${idx + 1}\n`;
                    });
                    
                    // Set headers untuk download CSV
                    res.header('Content-Type', 'text/csv; charset=utf-8');
                    res.attachment(`Laporan-Sinergitas-Kecamatan-${new Date().toISOString().split('T')[0]}.csv`);
                    res.send(csv);
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