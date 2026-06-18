const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile, spawnSync } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(PROJECT_ROOT, 'backups'));
const DATABASE_DIR = path.join(PROJECT_ROOT, 'database');
const SQLITE_DB_PATH = path.join(DATABASE_DIR, 'sinergitas.db');
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(PROJECT_ROOT, 'uploads'));
const PENDING_RESTORE_DIR = path.join(PROJECT_ROOT, '.restore-pending');
const PENDING_MARKER = path.join(PENDING_RESTORE_DIR, 'pending.json');
const AUDIT_LOG = path.join(BACKUP_DIR, 'backup-restore-audit.log');

function ensureDirectories() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(DATABASE_DIR, { recursive: true });
}

function isValidDatabaseUrl(url) {
  if (!url) return false;
  if (url.includes('user:pass@host') || url.includes('placeholder')) return false;
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

function getDatabaseMode() {
  return isValidDatabaseUrl(process.env.DATABASE_URL) ? 'PostgreSQL' : 'SQLite';
}

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(2)} KB`;
  if (value < 1024 ** 3) return `${(value / (1024 ** 2)).toFixed(2)} MB`;
  return `${(value / (1024 ** 3)).toFixed(2)} GB`;
}

function tarAvailable() {
  const result = spawnSync('tar', ['--version'], { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function safeBackupFilename(filename) {
  const value = path.basename(String(filename || ''));
  if (!/^sieselon-[a-z0-9-]+\.tar\.gz$/i.test(value)) {
    throw new Error('Nama berkas backup tidak valid.');
  }
  return value;
}

function safeArchiveEntry(entry) {
  const normalized = String(entry || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized === '.') return true;
  if (path.posix.isAbsolute(normalized)) return false;
  const parts = normalized.split('/');
  return !parts.some(part => part === '..' || part.includes('\0'));
}

function listFilesRecursively(root) {
  if (!fs.existsSync(root)) return { files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile()) {
        const stat = fs.statSync(absolute);
        files += 1;
        bytes += stat.size;
      }
    }
  }
  return { files, bytes };
}

function appendAudit(action, details = {}) {
  ensureDirectories();
  const record = {
    at: new Date().toISOString(),
    action,
    ...details
  };
  fs.appendFileSync(AUDIT_LOG, `${JSON.stringify(record)}\n`, 'utf8');
}

function dbRun(sql, params = []) {
  const db = require('../database/database');
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

async function checkpointSqlite() {
  try {
    await dbRun('PRAGMA wal_checkpoint(FULL)');
  } catch (error) {
    console.warn('⚠️ SQLite checkpoint warning:', error.message);
  }
}

async function createPostgresDump(targetPath) {
  const databaseUrl = process.env.DATABASE_URL;
  try {
    await execFileAsync('pg_dump', [
      `--dbname=${databaseUrl}`,
      '--no-owner',
      '--no-privileges',
      '--format=custom',
      `--file=${targetPath}`
    ], { maxBuffer: 10 * 1024 * 1024 });
  } catch (error) {
    throw new Error('Backup PostgreSQL memerlukan utilitas pg_dump pada server. ' + error.message);
  }
}

async function createBackup({ createdBy = 'admin', reason = 'manual', prefix = 'sieselon-backup' } = {}) {
  ensureDirectories();
  if (!tarAvailable()) {
    throw new Error('Perintah tar tidak tersedia pada sistem operasi ini.');
  }

  const mode = getDatabaseMode();
  const stamp = timestampForFilename();
  const random = crypto.randomBytes(3).toString('hex');
  const filename = `${prefix}-${stamp}-${random}.tar.gz`;
  const outputPath = path.join(BACKUP_DIR, filename);
  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sieselon-backup-'));

  try {
    const databaseStage = path.join(stagingRoot, 'database');
    const uploadsStage = path.join(stagingRoot, 'uploads');
    fs.mkdirSync(databaseStage, { recursive: true });

    if (mode === 'SQLite') {
      await checkpointSqlite();
      if (!fs.existsSync(SQLITE_DB_PATH)) throw new Error('Database SQLite tidak ditemukan.');
      fs.copyFileSync(SQLITE_DB_PATH, path.join(databaseStage, 'sinergitas.db'));
    } else {
      await createPostgresDump(path.join(databaseStage, 'postgres.dump'));
    }

    if (fs.existsSync(UPLOADS_DIR)) {
      fs.cpSync(UPLOADS_DIR, uploadsStage, { recursive: true, force: true, dereference: false });
    } else {
      fs.mkdirSync(uploadsStage, { recursive: true });
    }

    const uploadStats = listFilesRecursively(uploadsStage);
    const manifest = {
      format: 'SIESELON_FULL_BACKUP_V1',
      createdAt: new Date().toISOString(),
      createdBy,
      reason,
      databaseMode: mode,
      databaseFile: mode === 'SQLite' ? 'database/sinergitas.db' : 'database/postgres.dump',
      uploadsDirectory: 'uploads',
      uploadFileCount: uploadStats.files,
      uploadBytes: uploadStats.bytes,
      appVersion: (() => {
        try { return require('../package.json').version; } catch (_) { return null; }
      })()
    };
    fs.writeFileSync(path.join(stagingRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    await execFileAsync('tar', ['-czf', outputPath, '-C', stagingRoot, '.'], {
      maxBuffer: 10 * 1024 * 1024
    });

    appendAudit('backup-created', {
      filename,
      createdBy,
      reason,
      databaseMode: mode,
      uploadFileCount: uploadStats.files,
      uploadBytes: uploadStats.bytes
    });

    return { filename, outputPath, manifest };
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

function listBackups() {
  ensureDirectories();
  return fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^sieselon-[a-z0-9-]+\.tar\.gz$/i.test(entry.name))
    .map(entry => {
      const absolute = path.join(BACKUP_DIR, entry.name);
      const stat = fs.statSync(absolute);
      return {
        filename: entry.name,
        sizeBytes: stat.size,
        sizeLabel: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getBackupPath(filename) {
  const safe = safeBackupFilename(filename);
  const absolute = path.join(BACKUP_DIR, safe);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    throw new Error('Berkas backup tidak ditemukan.');
  }
  return absolute;
}

function deleteBackup(filename, deletedBy = 'admin') {
  const absolute = getBackupPath(filename);
  fs.unlinkSync(absolute);
  appendAudit('backup-deleted', { filename: path.basename(absolute), deletedBy });
}

async function inspectArchive(archivePath) {
  if (!tarAvailable()) throw new Error('Perintah tar tidak tersedia.');
  const { stdout } = await execFileAsync('tar', ['-tzf', archivePath], {
    maxBuffer: 50 * 1024 * 1024
  });
  const entries = String(stdout || '').split(/\r?\n/).filter(Boolean);
  if (!entries.length) throw new Error('Arsip backup kosong.');
  if (entries.some(entry => !safeArchiveEntry(entry))) {
    throw new Error('Arsip backup mengandung path yang tidak aman.');
  }
  return entries;
}

function rejectSymlinks(root) {
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) throw new Error('Arsip backup tidak boleh berisi symbolic link.');
      if (stat.isDirectory()) stack.push(absolute);
    }
  }
}

async function stageRestore({ archivePath, restoredBy = 'admin', sourceName = null }) {
  ensureDirectories();
  if (getDatabaseMode() !== 'SQLite') {
    throw new Error('Restore melalui aplikasi saat ini hanya tersedia untuk database SQLite.');
  }

  await inspectArchive(archivePath);
  const extractRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sieselon-restore-'));
  try {
    await execFileAsync('tar', ['-xzf', archivePath, '-C', extractRoot], {
      maxBuffer: 10 * 1024 * 1024
    });
    rejectSymlinks(extractRoot);

    const manifestPath = path.join(extractRoot, 'manifest.json');
    const dbSource = path.join(extractRoot, 'database', 'sinergitas.db');
    const uploadsSource = path.join(extractRoot, 'uploads');
    if (!fs.existsSync(manifestPath)) throw new Error('Manifest backup tidak ditemukan.');
    if (!fs.existsSync(dbSource)) throw new Error('Database SQLite tidak ditemukan dalam backup.');
    if (!fs.existsSync(uploadsSource)) throw new Error('Folder uploads tidak ditemukan dalam backup.');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.format !== 'SIESELON_FULL_BACKUP_V1') {
      throw new Error('Format backup tidak dikenali.');
    }
    if (manifest.databaseMode !== 'SQLite') {
      throw new Error('Backup ini bukan backup SQLite.');
    }

    const safety = await createBackup({
      createdBy: restoredBy,
      reason: 'automatic-pre-restore',
      prefix: 'sieselon-pre-restore'
    });

    fs.rmSync(PENDING_RESTORE_DIR, { recursive: true, force: true });
    fs.mkdirSync(path.join(PENDING_RESTORE_DIR, 'database'), { recursive: true });
    fs.copyFileSync(dbSource, path.join(PENDING_RESTORE_DIR, 'database', 'sinergitas.db'));
    fs.cpSync(uploadsSource, path.join(PENDING_RESTORE_DIR, 'uploads'), {
      recursive: true,
      force: true,
      dereference: false
    });

    const marker = {
      format: 'SIESELON_PENDING_RESTORE_V1',
      stagedAt: new Date().toISOString(),
      stagedBy: restoredBy,
      sourceName: sourceName || path.basename(archivePath),
      safetyBackup: safety.filename,
      sourceManifest: manifest
    };
    fs.writeFileSync(PENDING_MARKER, JSON.stringify(marker, null, 2), 'utf8');
    appendAudit('restore-staged', marker);
    return marker;
  } finally {
    fs.rmSync(extractRoot, { recursive: true, force: true });
  }
}

function cancelPendingRestore(cancelledBy = 'admin') {
  if (!fs.existsSync(PENDING_MARKER)) return false;
  let marker = null;
  try { marker = JSON.parse(fs.readFileSync(PENDING_MARKER, 'utf8')); } catch (_) {}
  fs.rmSync(PENDING_RESTORE_DIR, { recursive: true, force: true });
  appendAudit('restore-cancelled', { cancelledBy, marker });
  return true;
}

function copyDirectoryReplacing(source, target) {
  const temporaryTarget = `${target}.restore-${Date.now()}`;
  fs.rmSync(temporaryTarget, { recursive: true, force: true });
  fs.cpSync(source, temporaryTarget, { recursive: true, force: true, dereference: false });
  fs.rmSync(target, { recursive: true, force: true });
  try {
    fs.renameSync(temporaryTarget, target);
  } catch (error) {
    fs.cpSync(temporaryTarget, target, { recursive: true, force: true, dereference: false });
    fs.rmSync(temporaryTarget, { recursive: true, force: true });
  }
}

function applyPendingRestore() {
  ensureDirectories();
  if (!fs.existsSync(PENDING_MARKER)) return null;
  if (getDatabaseMode() !== 'SQLite') {
    console.error('❌ Pending restore tidak diterapkan karena mode database bukan SQLite.');
    return null;
  }

  const marker = JSON.parse(fs.readFileSync(PENDING_MARKER, 'utf8'));
  const pendingDb = path.join(PENDING_RESTORE_DIR, 'database', 'sinergitas.db');
  const pendingUploads = path.join(PENDING_RESTORE_DIR, 'uploads');
  if (!fs.existsSync(pendingDb) || !fs.existsSync(pendingUploads)) {
    throw new Error('Pending restore tidak lengkap.');
  }

  const dbTemporary = `${SQLITE_DB_PATH}.restore-${Date.now()}`;
  fs.copyFileSync(pendingDb, dbTemporary);
  fs.rmSync(`${SQLITE_DB_PATH}-wal`, { force: true });
  fs.rmSync(`${SQLITE_DB_PATH}-shm`, { force: true });
  fs.rmSync(SQLITE_DB_PATH, { force: true });
  fs.renameSync(dbTemporary, SQLITE_DB_PATH);
  copyDirectoryReplacing(pendingUploads, UPLOADS_DIR);

  fs.rmSync(PENDING_RESTORE_DIR, { recursive: true, force: true });
  appendAudit('restore-applied', marker);
  console.log(`✅ Restore SIESELON diterapkan dari ${marker.sourceName || 'backup'}.`);
  return marker;
}

function getBackupOverview() {
  ensureDirectories();
  const backups = listBackups();
  let pendingRestore = null;
  if (fs.existsSync(PENDING_MARKER)) {
    try { pendingRestore = JSON.parse(fs.readFileSync(PENDING_MARKER, 'utf8')); }
    catch (_) { pendingRestore = { invalid: true }; }
  }
  return {
    databaseMode: getDatabaseMode(),
    tarAvailable: tarAvailable(),
    uploadsDir: UPLOADS_DIR,
    backupDir: BACKUP_DIR,
    backupCount: backups.length,
    backups,
    lastBackup: backups[0] || null,
    pendingRestore
  };
}

module.exports = {
  BACKUP_DIR,
  SQLITE_DB_PATH,
  UPLOADS_DIR,
  PENDING_RESTORE_DIR,
  getDatabaseMode,
  formatBytes,
  tarAvailable,
  safeBackupFilename,
  safeArchiveEntry,
  createBackup,
  listBackups,
  getBackupPath,
  deleteBackup,
  stageRestore,
  cancelPendingRestore,
  applyPendingRestore,
  getBackupOverview
};
