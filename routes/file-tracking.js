const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');

// GET - Halaman File Tracking
router.get('/', ensureAuthenticated, isAdmin, (req, res) => {
  res.render('file-tracking', {
    username: req.session.username,
    dateStart: req.query.dateStart || new Date().toISOString().split('T')[0],
    dateEnd: req.query.dateEnd || new Date().toISOString().split('T')[0]
  });
});

// GET API - Data tracking untuk grafik dan tabel
router.get('/api/data', ensureAuthenticated, isAdmin, (req, res) => {
  const { dateStart, dateEnd } = req.query;
  
  const query = `
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect A' as aspect,
      a.upload_status as status,
      a.updated_at as upload_date,
      a.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_a a ON k.id = a.kecamatan_id
    WHERE k.username != 'admin'
    AND (a.updated_at IS NULL OR (DATE(a.updated_at) BETWEEN ? AND ?))
    
    UNION ALL
    
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect B' as aspect,
      b.upload_status as status,
      b.updated_at as upload_date,
      b.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_b b ON k.id = b.kecamatan_id
    WHERE k.username != 'admin'
    AND (b.updated_at IS NULL OR (DATE(b.updated_at) BETWEEN ? AND ?))
    
    UNION ALL
    
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect C' as aspect,
      c.upload_status as status,
      c.updated_at as upload_date,
      c.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_c c ON k.id = c.kecamatan_id
    WHERE k.username != 'admin'
    AND (c.updated_at IS NULL OR (DATE(c.updated_at) BETWEEN ? AND ?))
    
    UNION ALL
    
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect D' as aspect,
      d.upload_status as status,
      d.updated_at as upload_date,
      d.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_d d ON k.id = d.kecamatan_id
    WHERE k.username != 'admin'
    AND (d.updated_at IS NULL OR (DATE(d.updated_at) BETWEEN ? AND ?))
    
    UNION ALL
    
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect E' as aspect,
      e.upload_status as status,
      e.updated_at as upload_date,
      e.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_e e ON k.id = e.kecamatan_id
    WHERE k.username != 'admin'
    AND (e.updated_at IS NULL OR (DATE(e.updated_at) BETWEEN ? AND ?))
    
    UNION ALL
    
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect F' as aspect,
      f.upload_status as status,
      f.updated_at as upload_date,
      f.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_f f ON k.id = f.kecamatan_id
    WHERE k.username != 'admin'
    AND (f.updated_at IS NULL OR (DATE(f.updated_at) BETWEEN ? AND ?))
    
    ORDER BY upload_date DESC, kecamatan, aspect
  `;
  
  const params = [
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd
  ];
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching data' });
    }
    res.json(rows);
  });
});

// GET API - Statistik untuk dashboard
router.get('/api/statistics', ensureAuthenticated, isAdmin, (req, res) => {
  const { dateStart, dateEnd } = req.query;
  
  const query = `
    SELECT 
      COUNT(DISTINCT CASE WHEN upload_status = 'Sudah' THEN kecamatan || aspect END) as total_uploaded,
      COUNT(DISTINCT kecamatan || aspect) as total_aspects,
      COUNT(DISTINCT CASE WHEN upload_status = 'Sudah' THEN kecamatan END) as kecamatan_uploaded,
      COUNT(DISTINCT kecamatan) as total_kecamatan
    FROM (
      SELECT k.nama as kecamatan, 'A' as aspect, a.upload_status FROM kecamatan k LEFT JOIN aspect_a a ON k.id = a.kecamatan_id WHERE k.username != 'admin' AND (a.updated_at IS NULL OR DATE(a.updated_at) BETWEEN ? AND ?)
      UNION ALL
      SELECT k.nama, 'B', b.upload_status FROM kecamatan k LEFT JOIN aspect_b b ON k.id = b.kecamatan_id WHERE k.username != 'admin' AND (b.updated_at IS NULL OR DATE(b.updated_at) BETWEEN ? AND ?)
      UNION ALL
      SELECT k.nama, 'C', c.upload_status FROM kecamatan k LEFT JOIN aspect_c c ON k.id = c.kecamatan_id WHERE k.username != 'admin' AND (c.updated_at IS NULL OR DATE(c.updated_at) BETWEEN ? AND ?)
      UNION ALL
      SELECT k.nama, 'D', d.upload_status FROM kecamatan k LEFT JOIN aspect_d d ON k.id = d.kecamatan_id WHERE k.username != 'admin' AND (d.updated_at IS NULL OR DATE(d.updated_at) BETWEEN ? AND ?)
      UNION ALL
      SELECT k.nama, 'E', e.upload_status FROM kecamatan k LEFT JOIN aspect_e e ON k.id = e.kecamatan_id WHERE k.username != 'admin' AND (e.updated_at IS NULL OR DATE(e.updated_at) BETWEEN ? AND ?)
      UNION ALL
      SELECT k.nama, 'F', f.upload_status FROM kecamatan k LEFT JOIN aspect_f f ON k.id = f.kecamatan_id WHERE k.username != 'admin' AND (f.updated_at IS NULL OR DATE(f.updated_at) BETWEEN ? AND ?)
    )
  `;
  
  const params = [
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd
  ];
  
  db.get(query, params, (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching statistics' });
    }
    res.json(row);
  });
});

// EXPORT - Excel format
router.get('/export/excel', ensureAuthenticated, isAdmin, (req, res) => {
  const { dateStart, dateEnd } = req.query;
  
  const query = `
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect A' as aspect,
      a.upload_status as status,
      a.updated_at as upload_date,
      a.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_a a ON k.id = a.kecamatan_id
    WHERE k.username != 'admin'
    AND (a.updated_at IS NULL OR (DATE(a.updated_at) BETWEEN ? AND ?))
    
    UNION ALL
    
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect B' as aspect,
      b.upload_status as status,
      b.updated_at as upload_date,
      b.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_b b ON k.id = b.kecamatan_id
    WHERE k.username != 'admin'
    AND (b.updated_at IS NULL OR (DATE(b.updated_at) BETWEEN ? AND ?))
    
    UNION ALL
    
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect C' as aspect,
      c.upload_status as status,
      c.updated_at as upload_date,
      c.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_c c ON k.id = c.kecamatan_id
    WHERE k.username != 'admin'
    AND (c.updated_at IS NULL OR (DATE(c.updated_at) BETWEEN ? AND ?))
    
    UNION ALL
    
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect D' as aspect,
      d.upload_status as status,
      d.updated_at as upload_date,
      d.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_d d ON k.id = d.kecamatan_id
    WHERE k.username != 'admin'
    AND (d.updated_at IS NULL OR (DATE(d.updated_at) BETWEEN ? AND ?))
    
    UNION ALL
    
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect E' as aspect,
      e.upload_status as status,
      e.updated_at as upload_date,
      e.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_e e ON k.id = e.kecamatan_id
    WHERE k.username != 'admin'
    AND (e.updated_at IS NULL OR (DATE(e.updated_at) BETWEEN ? AND ?))
    
    UNION ALL
    
    SELECT 
      k.nama as kecamatan,
      k.nama_pengelola,
      'Aspect F' as aspect,
      f.upload_status as status,
      f.updated_at as upload_date,
      f.total_score as score
    FROM kecamatan k
    LEFT JOIN aspect_f f ON k.id = f.kecamatan_id
    WHERE k.username != 'admin'
    AND (f.updated_at IS NULL OR (DATE(f.updated_at) BETWEEN ? AND ?))
    
    ORDER BY upload_date DESC, kecamatan, aspect
  `;
  
  const params = [
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd,
    dateStart, dateEnd
  ];
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).send('Error exporting data');
    }
    
    // Create CSV content
    let csv = 'No,Kecamatan,Pengelola,Aspek,Status,Tanggal Upload,Skor\n';
    rows.forEach((row, index) => {
      csv += `${index + 1},"${row.kecamatan}","${row.nama_pengelola || '-'}","${row.aspect}","${row.status || 'Belum'}","${row.upload_date || '-'}","${row.score || 0}"\n`;
    });
    
    // Set headers for download
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`File-Tracking-${dateStart}-to-${dateEnd}.csv`);
    res.send(csv);
  });
});

module.exports = router;