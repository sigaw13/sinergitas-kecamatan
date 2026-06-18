const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { ensureAuthenticated, isSuperAdmin } = require('../middleware/auth');
const {
  BACKUP_DIR,
  createBackup,
  getBackupPath,
  deleteBackup,
  stageRestore,
  cancelPendingRestore,
  getDatabaseMode
} = require('../utils/backup');

const router = express.Router();
const incomingDir = path.join(BACKUP_DIR, 'incoming');
fs.mkdirSync(incomingDir, { recursive: true });

const restoreUpload = multer({
  dest: incomingDir,
  limits: {
    fileSize: Math.max(1, Number.parseInt(process.env.MAX_RESTORE_MB || '2048', 10)) * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    const name = String(file.originalname || '').toLowerCase();
    if (!name.endsWith('.tar.gz') && !name.endsWith('.tgz')) {
      return callback(new Error('Berkas restore harus berformat .tar.gz atau .tgz.'));
    }
    callback(null, true);
  }
});

function adminName(req) {
  return req.session && (req.session.username || req.session.userId)
    ? String(req.session.username || req.session.userId)
    : 'admin';
}

function redirectSettings(res, type, message) {
  const query = new URLSearchParams({ [type]: message });
  res.redirect(`/admin/settings?${query.toString()}#backup-restore`);
}

// Membuat backup lengkap database dan folder uploads.
router.post('/admin/settings/backup/create', ensureAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const result = await createBackup({ createdBy: adminName(req), reason: 'manual' });
    redirectSettings(res, 'success', `Backup lengkap berhasil dibuat: ${result.filename}`);
  } catch (error) {
    console.error('❌ Gagal membuat backup:', error);
    redirectSettings(res, 'error', `Gagal membuat backup: ${error.message}`);
  }
});

// Mengunduh backup yang sudah tersimpan.
router.get('/admin/settings/backup/:filename/download', ensureAuthenticated, isSuperAdmin, (req, res) => {
  try {
    const absolute = getBackupPath(req.params.filename);
    res.download(absolute, path.basename(absolute));
  } catch (error) {
    redirectSettings(res, 'error', error.message);
  }
});

// Menghapus backup dari server.
router.post('/admin/settings/backup/:filename/delete', ensureAuthenticated, isSuperAdmin, (req, res) => {
  try {
    deleteBackup(req.params.filename, adminName(req));
    redirectSettings(res, 'success', 'Backup berhasil dihapus.');
  } catch (error) {
    redirectSettings(res, 'error', `Gagal menghapus backup: ${error.message}`);
  }
});

// Menjadwalkan restore dari backup yang sudah tersimpan.
router.post('/admin/settings/backup/:filename/restore', ensureAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    if (String(req.body.confirm_restore || '').trim().toUpperCase() !== 'PULIHKAN') {
      return redirectSettings(res, 'error', 'Restore dibatalkan karena konfirmasi tidak sesuai.');
    }
    const absolute = getBackupPath(req.params.filename);
    await stageRestore({
      archivePath: absolute,
      restoredBy: adminName(req),
      sourceName: path.basename(absolute)
    });
    redirectSettings(
      res,
      'success',
      'Restore sudah dijadwalkan. Hentikan server lalu jalankan npm start kembali agar restore diterapkan.'
    );
  } catch (error) {
    console.error('❌ Gagal menjadwalkan restore:', error);
    redirectSettings(res, 'error', `Gagal menjadwalkan restore: ${error.message}`);
  }
});

// Menjadwalkan restore dari backup yang diunggah admin.
router.post(
  '/admin/settings/restore/upload',
  ensureAuthenticated,
  isSuperAdmin,
  (req, res, next) => {
    restoreUpload.single('backup_file')(req, res, error => {
      if (error) return redirectSettings(res, 'error', `Upload backup gagal: ${error.message}`);
      next();
    });
  },
  async (req, res) => {
    const uploadedPath = req.file && req.file.path;
    try {
      if (getDatabaseMode() !== 'SQLite') {
        throw new Error('Restore melalui aplikasi hanya tersedia pada mode SQLite.');
      }
      if (String(req.body.confirm_restore || '').trim().toUpperCase() !== 'PULIHKAN') {
        throw new Error('Ketik PULIHKAN untuk mengonfirmasi restore.');
      }
      if (!req.file) throw new Error('Pilih berkas backup terlebih dahulu.');

      await stageRestore({
        archivePath: uploadedPath,
        restoredBy: adminName(req),
        sourceName: req.file.originalname
      });
      redirectSettings(
        res,
        'success',
        'Backup berhasil diverifikasi dan restore dijadwalkan. Restart server untuk menerapkannya.'
      );
    } catch (error) {
      console.error('❌ Restore upload gagal:', error);
      redirectSettings(res, 'error', `Restore gagal: ${error.message}`);
    } finally {
      if (uploadedPath) fs.rmSync(uploadedPath, { force: true });
    }
  }
);

router.post('/admin/settings/restore/cancel', ensureAuthenticated, isSuperAdmin, (req, res) => {
  try {
    const cancelled = cancelPendingRestore(adminName(req));
    redirectSettings(
      res,
      cancelled ? 'success' : 'error',
      cancelled ? 'Restore terjadwal berhasil dibatalkan.' : 'Tidak ada restore yang sedang menunggu.'
    );
  } catch (error) {
    redirectSettings(res, 'error', `Gagal membatalkan restore: ${error.message}`);
  }
});

// Kompatibilitas route lama: arahkan ke Pengaturan Admin.
router.get('/backup/backup', ensureAuthenticated, isSuperAdmin, (req, res) => {
  res.redirect('/admin/settings#backup-restore');
});
router.get('/backup/backups', ensureAuthenticated, isSuperAdmin, (req, res) => {
  res.redirect('/admin/settings#backup-restore');
});

module.exports = router;
