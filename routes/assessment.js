const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { ensureAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const ScoringSystem = require('../utils/scoring');

// Konfigurasi multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Middleware untuk mendapatkan kecamatan_id
const getKecamatanId = (req, res, next) => {
  if (req.session.isAdmin && req.query.kecamatan_id) {
    req.kecamatan_id = req.query.kecamatan_id;
  } else {
    req.kecamatan_id = req.session.userId;
  }
  next();
};

// Fungsi untuk menghitung dan menyimpan skor
const calculateAndSaveScore = (kecamatanId, callback) => {
  db.get('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [kecamatanId], (err, aspectAData) => {
    db.get('SELECT * FROM aspect_b WHERE kecamatan_id = ?', [kecamatanId], (err, aspectBData) => {
      db.get('SELECT * FROM aspect_c WHERE kecamatan_id = ?', [kecamatanId], (err, aspectCData) => {
        db.get('SELECT * FROM aspect_d WHERE kecamatan_id = ?', [kecamatanId], (err, aspectDData) => {
          db.get('SELECT * FROM aspect_e WHERE kecamatan_id = ?', [kecamatanId], (err, aspectEData) => {
            db.get('SELECT * FROM aspect_f WHERE kecamatan_id = ?', [kecamatanId], (err, aspectFData) => {
              
              const aspectA = ScoringSystem.calculateAspectA(aspectAData || {});
              const aspectB = ScoringSystem.calculateAspectB(aspectBData || {});
              const aspectC = ScoringSystem.calculateAspectC(aspectCData || {});
              const aspectD = ScoringSystem.calculateAspectD(aspectDData || {});
              const aspectE = ScoringSystem.calculateAspectE(aspectEData || {});
              const aspectF = ScoringSystem.calculateAspectF(aspectFData || {});
              
              const totalScore = ScoringSystem.calculateTotalScore(
                aspectA, aspectB, aspectC, aspectD, aspectE, aspectF
              );
              
              db.run(`UPDATE aspect_a SET total_score = ? WHERE kecamatan_id = ?`, [aspectA.totalScore, kecamatanId]);
              db.run(`UPDATE aspect_b SET total_score = ? WHERE kecamatan_id = ?`, [aspectB.totalScore, kecamatanId]);
              db.run(`UPDATE aspect_c SET total_score = ? WHERE kecamatan_id = ?`, [aspectC.totalScore, kecamatanId]);
              db.run(`UPDATE aspect_d SET total_score = ? WHERE kecamatan_id = ?`, [aspectD.totalScore, kecamatanId]);
              db.run(`UPDATE aspect_e SET total_score = ? WHERE kecamatan_id = ?`, [aspectE.totalScore, kecamatanId]);
              db.run(`UPDATE aspect_f SET total_score = ? WHERE kecamatan_id = ?`, [aspectF.totalScore, kecamatanId]);
              
              callback(null, { aspectA, aspectB, aspectC, aspectD, aspectE, aspectF, totalScore });
            });
          });
        });
      });
    });
  });
};

// ==================== ASPECT A ====================
router.get('/aspect-a', ensureAuthenticated, getKecamatanId, (req, res) => {
  db.get('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (err) {
      console.error('Error fetching aspect A:', err);
      return res.status(500).send('Error loading data');
    }
    res.render('assessment/aspect-a', {
      saved: req.query.saved === '1',
      data: row || {},
      kecamatan: req.session.kecamatan,
      isAdmin: req.session.isAdmin,
      kecamatan_id: req.kecamatan_id,
      username: req.session.username
    });
  });
});

router.post('/aspect-a', ensureAuthenticated, getKecamatanId, (req, res) => {
  const uploadFields = upload.fields([
    { name: 'ind_1_file', maxCount: 1 },
    { name: 'ind_2a_file', maxCount: 1 },
    { name: 'ind_2b_file', maxCount: 1 },
    { name: 'ind_2c_file', maxCount: 1 },
    { name: 'ind_3_file', maxCount: 1 },
    { name: 'ind_4_file', maxCount: 1 },
    { name: 'ind_5a_file', maxCount: 1 },
    { name: 'ind_5b_file', maxCount: 1 },
    { name: 'ind_6_file', maxCount: 1 },
    { name: 'ind_7_file', maxCount: 1 },
    { name: 'ind_8_file', maxCount: 1 },
    { name: 'ind_9_file', maxCount: 1 },
    { name: 'ind_10_file', maxCount: 5 },
    { name: 'ind_11_file', maxCount: 1 },
    { name: 'ind_12_file', maxCount: 1 },
    { name: 'ind_13_file', maxCount: 1 },
    { name: 'ind_14_file', maxCount: 5 },
    { name: 'ind_15_file', maxCount: 1 },
    { name: 'ind_16_file', maxCount: 1 }
  ]);

  uploadFields(req, res, (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return res.status(400).send('Error upload file: ' + err.message);
    }

    const data = req.body;
    
    // ✅ PERBAIKAN: Tidak ada spasi di field names!
    const fieldMapping = {
      'ind_1_status': 'ind_1_status',
      'ind_2a_status': 'ind_2a_status',
      'ind_2b_status': 'ind_2b_status',
      'ind_2c_status': 'ind_2c_status',
      'ind_3_status': 'ind_3_status',
      'ind_4_jumlah': 'ind_4_jumlah',
      'ind_5a_jumlah': 'ind_5a_jumlah',
      'ind_5b_jumlah': 'ind_5b_jumlah',
      'ind_6_status': 'ind_6_status',
      'ind_7_jumlah': 'ind_7_jumlah',
      'ind_8_status': 'ind_8_status',
      'ind_9a_status': 'ind_9a_status',
      'ind_9b_status': 'ind_9b_status',
      'ind_9c_status': 'ind_9c_status',
      'ind_9d_status': 'ind_9d_status',
      'ind_9e_status': 'ind_9e_status',
      'ind_10a_status': 'ind_10a_status',
      'ind_10b_status': 'ind_10b_status',
      'ind_10c_status': 'ind_10c_status',
      'ind_10d_status': 'ind_10d_status',
      'ind_10e_status': 'ind_10e_status',
      'ind_10f_status': 'ind_10f_status',
      'ind_10g_status': 'ind_10g_status',
      'ind_11_status': 'ind_11_status',
      'ind_12a_jumlah': 'ind_12a_jumlah',
      'ind_12b_jumlah': 'ind_12b_jumlah',
      'ind_13_status': 'ind_13_status',
      'ind_14a_status': 'ind_14a_status',
      'ind_14b_status': 'ind_14b_status',
      'ind_14c_status': 'ind_14c_status',
      'ind_15_persen': 'ind_15_persen',
      'ind_16_persen': 'ind_16_persen'
    };
    
    db.get('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
      if (row) {
        const updates = [];
        const values = [];
        
        Object.keys(fieldMapping).forEach(formField => {
          if (data[formField] !== undefined) {
            updates.push(`${fieldMapping[formField]} = ?`);
            values.push(data[formField]);
          }
        });
        
        if (req.files && Object.keys(req.files).length > 0) {
          Object.keys(req.files).forEach(fieldName => {
            const files = req.files[fieldName];
            if (files && files.length > 0) {
              const filenames = files.map(f => f.filename).join(',');
              updates.push(`${fieldName} = ?`);
              values.push(filenames);
            }
          });
        }
        
        values.push(req.kecamatan_id);
        
        db.run(
          `UPDATE aspect_a SET ${updates.join(', ')}, upload_status = 'Sudah', updated_at = CURRENT_TIMESTAMP WHERE kecamatan_id = ?`,
          values,
          (err) => {
            if (err) {
              console.error('Error updating aspect A:', err);
              return res.status(500).send('Error saving data');
            }
            calculateAndSaveScore(req.kecamatan_id, () => {
              res.redirect('/assessment/aspect-a?kecamatan_id=' + req.kecamatan_id + '&saved=1');
            });
          }
        );
      } else {
        const fields = ['kecamatan_id', 'upload_status'];
        const values = [req.kecamatan_id, 'Sudah'];
        const placeholders = ['?', '?'];
        
        Object.keys(fieldMapping).forEach(formField => {
          if (data[formField] !== undefined) {
            fields.push(fieldMapping[formField]);
            values.push(data[formField]);
            placeholders.push('?');
          }
        });
        
        if (req.files && Object.keys(req.files).length > 0) {
          Object.keys(req.files).forEach(fieldName => {
            const files = req.files[fieldName];
            if (files && files.length > 0) {
              const filenames = files.map(f => f.filename).join(',');
              fields.push(fieldName);
              values.push(filenames);
              placeholders.push('?');
            }
          });
        }
        
        db.run(
          `INSERT INTO aspect_a (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
          values,
          (err) => {
            if (err) {
              console.error('Error inserting aspect A:', err);
              return res.status(500).send('Error saving data');
            }
            calculateAndSaveScore(req.kecamatan_id, () => {
              res.redirect('/assessment/aspect-a?kecamatan_id=' + req.kecamatan_id + '&saved=1');
            });
          }
        );
      }
    });
  });
});

// ==================== ASPECT B ====================
router.get('/aspect-b', ensureAuthenticated, getKecamatanId, (req, res) => {
  db.get('SELECT * FROM aspect_b WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (err) {
      console.error('Error fetching aspect B:', err);
      return res.status(500).send('Error loading data');
    }
    res.render('assessment/aspect-b', { 
      data: row || {}, 
      kecamatan: req.session.kecamatan,
      isAdmin: req.session.isAdmin,
      saved: req.query.saved === '1',
      kecamatan_id: req.kecamatan_id,
      username: req.session.username
    });
  });
});

router.post('/aspect-b', ensureAuthenticated, getKecamatanId, upload.any(), (req, res) => {
  const data = req.body;
    
  // ✅ PERBAIKAN: Tidak ada spasi di field names!
  const fieldMapping = {
    'ind_1_jumlah': 'ind_1_jumlah',
    'ind_2_jumlah': 'ind_2_jumlah',
    'ind_3_jumlah': 'ind_3_jumlah',
    'ind_4a_jumlah': 'ind_4a_jumlah',
    'ind_4b_jumlah': 'ind_4b_jumlah',
    'ind_5_persen': 'ind_5_persen',
    'ind_6_jumlah': 'ind_6_jumlah',
    'ind_7a_jumlah': 'ind_7a_jumlah',
    'ind_7b_jumlah': 'ind_7b_jumlah',
    'ind_8a_jumlah': 'ind_8a_jumlah',
    'ind_8b_jumlah': 'ind_8b_jumlah',
    'ind_9a_jumlah': 'ind_9a_jumlah',
    'ind_9b_jumlah': 'ind_9b_jumlah',
    'ind_10a_status': 'ind_10a_status',
    'ind_10b_status': 'ind_10b_status',
    'ind_10c_status': 'ind_10c_status',
    'ind_11a_jumlah': 'ind_11a_jumlah',
    'ind_11b_jumlah': 'ind_11b_jumlah',
    'ind_12a_jumlah': 'ind_12a_jumlah',
    'ind_12b_jumlah': 'ind_12b_jumlah',
    'ind_13a_jumlah': 'ind_13a_jumlah',
    'ind_13b_jumlah': 'ind_13b_jumlah',
    'ind_14a_jumlah': 'ind_14a_jumlah',
    'ind_14b_jumlah': 'ind_14b_jumlah',
    'ind_14c_jumlah': 'ind_14c_jumlah',
    'ind_15a_jumlah': 'ind_15a_jumlah',
    'ind_15b_jumlah': 'ind_15b_jumlah',
    'ind_15c_jumlah': 'ind_15c_jumlah',
    'ind_15d_jumlah': 'ind_15d_jumlah',
    'ind_16a1_jumlah': 'ind_16a1_jumlah',
    'ind_16a2_jumlah': 'ind_16a2_jumlah',
    'ind_16a3_jumlah': 'ind_16a3_jumlah',
    'ind_16b1_jumlah': 'ind_16b1_jumlah',
    'ind_16b2_jumlah': 'ind_16b2_jumlah',
    'ind_16b3_jumlah': 'ind_16b3_jumlah',
    'ind_17_jumlah': 'ind_17_jumlah',
    'ind_18a_jumlah': 'ind_18a_jumlah',
    'ind_18b_jumlah': 'ind_18b_jumlah',
    'ind_19a_jumlah': 'ind_19a_jumlah',
    'ind_19b_jumlah': 'ind_19b_jumlah',
    'ind_20a_jumlah': 'ind_20a_jumlah',
    'ind_20b_jumlah': 'ind_20b_jumlah',
    'ind_20c_jumlah': 'ind_20c_jumlah',
    'ind_20d_jumlah': 'ind_20d_jumlah',
    'ind_20e_jumlah': 'ind_20e_jumlah',
    'ind_21_jumlah': 'ind_21_jumlah',
    'ind_22_jumlah': 'ind_22_jumlah',
    'ind_23a_jumlah': 'ind_23a_jumlah',
    'ind_23b_jumlah': 'ind_23b_jumlah',
    'ind_24a_jumlah': 'ind_24a_jumlah',
    'ind_24b_jumlah': 'ind_24b_jumlah',
    'ind_25a_jumlah': 'ind_25a_jumlah',
    'ind_25b_jumlah': 'ind_25b_jumlah',
    'ind_26a_jumlah': 'ind_26a_jumlah',
    'ind_26b_jumlah': 'ind_26b_jumlah',
    'ind_27_jumlah': 'ind_27_jumlah',
    'ind_28_persen': 'ind_28_persen',
    'ind_29_persen': 'ind_29_persen',
    'ind_30_persen': 'ind_30_persen',
    'ind_31_persen': 'ind_31_persen',
    'ind_32_persen': 'ind_32_persen',
    'ind_33a_jumlah': 'ind_33a_jumlah',
    'ind_33b_jumlah': 'ind_33b_jumlah',
    'ind_33c_jumlah': 'ind_33c_jumlah',
    'ind_33d_jumlah': 'ind_33d_jumlah',
    'ind_34_persen': 'ind_34_persen',
    'ind_35_persen': 'ind_35_persen',
    'ind_36_persen': 'ind_36_persen',
    'ind_37_persen': 'ind_37_persen',
    'ind_38a_jumlah': 'ind_38a_jumlah',
    'ind_39_persen': 'ind_39_persen',
    'ind_40_persen': 'ind_40_persen',
    'ind_41_nilai': 'ind_41_nilai',
    'ind_42_status': 'ind_42_status',
    'ind_43_status': 'ind_43_status'
  };
  
  db.get('SELECT * FROM aspect_b WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (row) {
      const updates = [];
      const values = [];
      
      Object.keys(fieldMapping).forEach(formField => {
        if (data[formField] !== undefined) {
          updates.push(`${fieldMapping[formField]} = ?`);
          values.push(data[formField]);
        }
      });
      
      values.push(req.kecamatan_id);
      
      db.run(
        `UPDATE aspect_b SET ${updates.join(', ')}, upload_status = 'Sudah', updated_at = CURRENT_TIMESTAMP WHERE kecamatan_id = ?`,
        values,
        (err) => {
          if (err) console.error('Error updating aspect B:', err);
          calculateAndSaveScore(req.kecamatan_id, () => {
            res.redirect('/assessment/aspect-b?kecamatan_id=' + req.kecamatan_id + '&saved=1');
          });
        }
      );
    } else {
      const fields = ['kecamatan_id', 'upload_status'];
      const values = [req.kecamatan_id, 'Sudah'];
      const placeholders = ['?', '?'];
      
      Object.keys(fieldMapping).forEach(formField => {
        if (data[formField] !== undefined) {
          fields.push(fieldMapping[formField]);
          values.push(data[formField]);
          placeholders.push('?');
        }
      });
      
      db.run(
        `INSERT INTO aspect_b (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
        values,
        (err) => {
          if (err) console.error('Error inserting aspect B:', err);
          calculateAndSaveScore(req.kecamatan_id, () => {
            res.redirect('/assessment/aspect-b?kecamatan_id=' + req.kecamatan_id + '&saved=1');
          });
        }
      );
    }
  });
});

// ==================== ASPECT C ====================
// ✅ PERBAIKAN: Pakai aspect_c (bukan aspect_b)!
router.get('/aspect-c', ensureAuthenticated, getKecamatanId, (req, res) => {
  db.get('SELECT * FROM aspect_c WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (err) {
      console.error('Error fetching aspect C:', err);
      return res.status(500).send('Error loading data');
    }
    res.render('assessment/aspect-c', { 
      data: row || {}, 
      kecamatan: req.session.kecamatan,
      isAdmin: req.session.isAdmin,
      saved: req.query.saved === '1',
      kecamatan_id: req.kecamatan_id,
      username: req.session.username
    });
  });
});

router.post('/aspect-c', ensureAuthenticated, getKecamatanId, upload.any(), (req, res) => {
  const data = req.body;
  const fields = [
    'ind_1a', 'ind_1b', 'ind_1c', 'ind_1d',
    'ind_2a', 'ind_2b',
    'ind_3a', 'ind_3b', 'ind_3c', 'ind_3d', 'ind_3e', 'ind_3f',
    'ind_4',
    'ind_5a', 'ind_5b', 'ind_5c', 'ind_5d', 'ind_5e', 'ind_5f', 'ind_5g',
    'ind_6a', 'ind_6b'
  ];

  db.get('SELECT * FROM aspect_c WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (row) {
      let updates = [];
      let values = [];
      
      fields.forEach(field => {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(data[field]);
        }
      });
      
      values.push(req.kecamatan_id);
      const query = `UPDATE aspect_c SET ${updates.join(', ')}, upload_status = 'Sudah', updated_at = CURRENT_TIMESTAMP WHERE kecamatan_id = ?`;
      
      db.run(query, values, (err) => {
        if (err) return console.error(err);
        calculateAndSaveScore(req.kecamatan_id, () => {
          res.redirect('/assessment/aspect-c?kecamatan_id=' + req.kecamatan_id + '&saved=1');
        });
      });
    } else {
      let placeholders = fields.map(() => '?').join(', ');
      let values = fields.map(field => data[field] || null);
      
      const query = `INSERT INTO aspect_c (kecamatan_id, ${fields.join(', ')}, upload_status) VALUES (?, ${placeholders}, 'Sudah')`;
      values.unshift(req.kecamatan_id);
      
      db.run(query, values, (err) => {
        if (err) return console.error(err);
        calculateAndSaveScore(req.kecamatan_id, () => {
          res.redirect('/assessment/aspect-c?kecamatan_id=' + req.kecamatan_id + '&saved=1');
        });
      });
    }
  });
});

// ==================== ASPECT D ====================
// ✅ PERBAIKAN: Pakai aspect_d (bukan aspect_b)!
router.get('/aspect-d', ensureAuthenticated, getKecamatanId, (req, res) => {
  db.get('SELECT * FROM aspect_d WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (err) {
      console.error('Error fetching aspect D:', err);
      return res.status(500).send('Error loading data');
    }
    res.render('assessment/aspect-d', { 
      data: row || {}, 
      kecamatan: req.session.kecamatan,
      isAdmin: req.session.isAdmin,
      saved: req.query.saved === '1',
      kecamatan_id: req.kecamatan_id,
      username: req.session.username
    });
  });
});

router.post('/aspect-d', ensureAuthenticated, getKecamatanId, upload.any(), (req, res) => {
  const data = req.body;
  const fields = [
    'ind_1a_nama', 'ind_1b_nama',
    'ind_2a_jumlah', 'ind_2b_jumlah',
    'ind_3_jumlah',
    'ind_4a_nasional', 'ind_4a_provinsi', 'ind_4a_kabupaten',
    'ind_4b_nasional', 'ind_4b_provinsi'
  ];

  db.get('SELECT * FROM aspect_d WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (row) {
      let updates = [];
      let values = [];
      
      fields.forEach(field => {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(data[field]);
        }
      });
      
      values.push(req.kecamatan_id);
      const query = `UPDATE aspect_d SET ${updates.join(', ')}, upload_status = 'Sudah', updated_at = CURRENT_TIMESTAMP WHERE kecamatan_id = ?`;
      
      db.run(query, values, (err) => {
        if (err) return console.error(err);
        calculateAndSaveScore(req.kecamatan_id, () => {
          res.redirect('/assessment/aspect-d?kecamatan_id=' + req.kecamatan_id + '&saved=1');
        });
      });
    } else {
      let placeholders = fields.map(() => '?').join(', ');
      let values = fields.map(field => data[field] || null);
      
      const query = `INSERT INTO aspect_d (kecamatan_id, ${fields.join(', ')}, upload_status) VALUES (?, ${placeholders}, 'Sudah')`;
      values.unshift(req.kecamatan_id);
      
      db.run(query, values, (err) => {
        if (err) return console.error(err);
        calculateAndSaveScore(req.kecamatan_id, () => {
          res.redirect('/assessment/aspect-d?kecamatan_id=' + req.kecamatan_id + '&saved=1');
        });
      });
    }
  });
});

// ==================== ASPECT E ====================
// ✅ PERBAIKAN: Pakai aspect_e (bukan aspect_b)!
router.get('/aspect-e', ensureAuthenticated, getKecamatanId, (req, res) => {
  db.get('SELECT * FROM aspect_e WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (err) {
      console.error('Error fetching aspect E:', err);
      return res.status(500).send('Error loading data');
    }
    res.render('assessment/aspect-e', { 
      data: row || {}, 
      kecamatan: req.session.kecamatan,
      isAdmin: req.session.isAdmin,
      saved: req.query.saved === '1',
      kecamatan_id: req.kecamatan_id,
      username: req.session.username
    });
  });
});

router.post('/aspect-e', ensureAuthenticated, getKecamatanId, upload.any(), (req, res) => {
  const data = req.body;
  const fields = [
    'ind_1a_sd', 'ind_1b_smp', 'ind_1c_sma', 'ind_1d_d3', 'ind_1e_s1', 'ind_1f_s2', 'ind_1g_s3',
    'ind_1_persen_tertinggi',
    'ind_2_jumlah',
    'ind_3_jumlah',
    'ind_4_jumlah',
    'ind_5_status'
  ];

  db.get('SELECT * FROM aspect_e WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (row) {
      let updates = [];
      let values = [];
      
      fields.forEach(field => {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(data[field]);
        }
      });
      
      values.push(req.kecamatan_id);
      const query = `UPDATE aspect_e SET ${updates.join(', ')}, upload_status = 'Sudah', updated_at = CURRENT_TIMESTAMP WHERE kecamatan_id = ?`;
      
      db.run(query, values, (err) => {
        if (err) return console.error(err);
        calculateAndSaveScore(req.kecamatan_id, () => {
          res.redirect('/assessment/aspect-e?kecamatan_id=' + req.kecamatan_id + '&saved=1');
        });
      });
    } else {
      let placeholders = fields.map(() => '?').join(', ');
      let values = fields.map(field => data[field] || null);
      
      const query = `INSERT INTO aspect_e (kecamatan_id, ${fields.join(', ')}, upload_status) VALUES (?, ${placeholders}, 'Sudah')`;
      values.unshift(req.kecamatan_id);
      
      db.run(query, values, (err) => {
        if (err) return console.error(err);
        calculateAndSaveScore(req.kecamatan_id, () => {
          res.redirect('/assessment/aspect-e?kecamatan_id=' + req.kecamatan_id + '&saved=1');
        });
      });
    }
  });
});

// ==================== ASPECT F ====================
// ✅ PERBAIKAN: Pakai aspect_f (bukan aspect_b)!
router.get('/aspect-f', ensureAuthenticated, getKecamatanId, (req, res) => {
  db.get('SELECT * FROM aspect_f WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (err) {
      console.error('Error fetching aspect F:', err);
      return res.status(500).send('Error loading data');
    }
    res.render('assessment/aspect-f', { 
      data: row || {}, 
      kecamatan: req.session.kecamatan,
      isAdmin: req.session.isAdmin,
      saved: req.query.saved === '1',
      kecamatan_id: req.kecamatan_id,
      username: req.session.username
    });
  });
});

router.post('/aspect-f', ensureAuthenticated, getKecamatanId, upload.any(), (req, res) => {
  const data = req.body;
  
  const fields = [];
  for (let i = 1; i <= 40; i++) {
    fields.push(`ind_${i}_status`);
  }

  db.get('SELECT * FROM aspect_f WHERE kecamatan_id = ?', [req.kecamatan_id], (err, row) => {
    if (row) {
      let updates = [];
      let values = [];
      
      fields.forEach(field => {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(data[field]);
        }
      });
      
      values.push(req.kecamatan_id);
      const query = `UPDATE aspect_f SET ${updates.join(', ')}, upload_status = 'Sudah', updated_at = CURRENT_TIMESTAMP WHERE kecamatan_id = ?`;
      
      db.run(query, values, (err) => {
        if (err) return console.error(err);
        calculateAndSaveScore(req.kecamatan_id, () => {
          res.redirect('/assessment/aspect-f?kecamatan_id=' + req.kecamatan_id + '&saved=1');
        });
      });
    } else {
      let placeholders = fields.map(() => '?').join(', ');
      let values = fields.map(field => data[field] || null);
      
      const query = `INSERT INTO aspect_f (kecamatan_id, ${fields.join(', ')}, upload_status) VALUES (?, ${placeholders}, 'Sudah')`;
      values.unshift(req.kecamatan_id);
      
      db.run(query, values, (err) => {
        if (err) return console.error(err);
        calculateAndSaveScore(req.kecamatan_id, () => {
          res.redirect('/assessment/aspect-f?kecamatan_id=' + req.kecamatan_id + '&saved=1');
        });
      });
    }
  });
});

// ==================== SCORING ====================
router.get('/scoring', ensureAuthenticated, getKecamatanId, (req, res) => {
  db.get('SELECT * FROM aspect_a WHERE kecamatan_id = ?', [req.kecamatan_id], (err, aspectAData) => {
    db.get('SELECT * FROM aspect_b WHERE kecamatan_id = ?', [req.kecamatan_id], (err, aspectBData) => {
      db.get('SELECT * FROM aspect_c WHERE kecamatan_id = ?', [req.kecamatan_id], (err, aspectCData) => {
        db.get('SELECT * FROM aspect_d WHERE kecamatan_id = ?', [req.kecamatan_id], (err, aspectDData) => {
          db.get('SELECT * FROM aspect_e WHERE kecamatan_id = ?', [req.kecamatan_id], (err, aspectEData) => {
            db.get('SELECT * FROM aspect_f WHERE kecamatan_id = ?', [req.kecamatan_id], (err, aspectFData) => {
              
              const aspectA = ScoringSystem.calculateAspectA(aspectAData || {});
              const aspectB = ScoringSystem.calculateAspectB(aspectBData || {});
              const aspectC = ScoringSystem.calculateAspectC(aspectCData || {});
              const aspectD = ScoringSystem.calculateAspectD(aspectDData || {});
              const aspectE = ScoringSystem.calculateAspectE(aspectEData || {});
              const aspectF = ScoringSystem.calculateAspectF(aspectFData || {});
              
              const totalScoreResult = ScoringSystem.calculateTotalScore(
                aspectA, aspectB, aspectC, aspectD, aspectE, aspectF
              );
              
              res.render('assessment/scoring-result', {
                scoring: totalScoreResult,
                kecamatan: req.session.kecamatan,
                isAdmin: req.session.isAdmin,
                kecamatan_id: req.kecamatan_id,
                username: req.session.username
              });
            });
          });
        });
      });
    });
  });
});

// ==================== FILES ====================
router.get('/files/:aspect', ensureAuthenticated, getKecamatanId, (req, res) => {
  const aspect = req.params.aspect;
  const tableName = `aspect_${aspect.toLowerCase()}`;
  
  db.get(`SELECT * FROM ${tableName} WHERE kecamatan_id = ?`, [req.kecamatan_id], (err, row) => {
    if (err || !row) {
      return res.json({ files: [] });
    }
    
    const fileFields = Object.keys(row).filter(key => key.includes('_file'));
    const files = [];
    
    fileFields.forEach(field => {
      if (row[field]) {
        const fileNames = row[field].split(',');
        fileNames.forEach(fileName => {
          if (fileName.trim()) {
            files.push({
              fieldName: field,
              fileName: fileName.trim(),
              url: `/uploads/${fileName.trim()}`
            });
          }
        });
      }
    });
    
    res.json({ files: files });
  });
});

router.get('/download/:filename', ensureAuthenticated, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', filename);
  
  res.download(filePath, filename, (err) => {
    if (err) {
      res.status(404).send('File tidak ditemukan');
    }
  });
});

module.exports = router;
