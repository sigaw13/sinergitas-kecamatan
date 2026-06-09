const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');

// Backup database
router.get('/backup', ensureAuthenticated, isAdmin, (req, res) => {
  const dbPath = path.join(__dirname, '..', 'database', 'sinergitas.db');
  const backupDir = path.join(__dirname, '..', 'backups');
  
  // Buat folder backups jika belum ada
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Nama file backup dengan timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `sinergitas-backup-${timestamp}.db`;
  const backupPath = path.join(backupDir, backupFileName);
  
  // Copy file database
  fs.copyFile(dbPath, backupPath, (err) => {
    if (err) {
      console.error('Error backup:', err);
      return res.status(500).send('Gagal membuat backup: ' + err.message);
    }
    
    // Download file backup
    res.download(backupPath, backupFileName, (err) => {
      if (err) {
        console.error('Error download:', err);
      }
      // Hapus file backup setelah download (opsional)
      // fs.unlinkSync(backupPath);
    });
  });
});

// List semua backup
router.get('/backups', ensureAuthenticated, isAdmin, (req, res) => {
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    return res.json({ backups: [] });
  }
  
  const files = fs.readdirSync(backupDir);
  const backups = files
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stats = fs.statSync(path.join(backupDir, f));
      return {
        filename: f,
        size: (stats.size / 1024).toFixed(2) + ' KB',
        date: stats.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  res.json({ backups });
});

module.exports = router;