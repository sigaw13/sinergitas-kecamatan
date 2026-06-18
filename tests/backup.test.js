const assert = require('assert');
const {
  safeBackupFilename,
  safeArchiveEntry,
  formatBytes,
  getDatabaseMode
} = require('../utils/backup');

assert.strictEqual(safeBackupFilename('sieselon-backup-20260613-abcdef.tar.gz'), 'sieselon-backup-20260613-abcdef.tar.gz');
assert.throws(() => safeBackupFilename('../evil.tar.gz'));
assert.throws(() => safeBackupFilename('backup.zip'));

assert.strictEqual(safeArchiveEntry('./manifest.json'), true);
assert.strictEqual(safeArchiveEntry('database/sinergitas.db'), true);
assert.strictEqual(safeArchiveEntry('uploads/kecamatan/2-wado/file.pdf'), true);
assert.strictEqual(safeArchiveEntry('../outside.txt'), false);
assert.strictEqual(safeArchiveEntry('/absolute/path'), false);
assert.strictEqual(safeArchiveEntry('uploads/../../outside.txt'), false);

assert.strictEqual(formatBytes(100), '100 B');
assert.strictEqual(formatBytes(1024), '1.00 KB');
assert.ok(['SQLite', 'PostgreSQL'].includes(getDatabaseMode()));

console.log('✅ Semua pengujian backup dan restore lulus.');
