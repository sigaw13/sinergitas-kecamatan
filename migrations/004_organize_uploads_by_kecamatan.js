const fs = require('fs');
const path = require('path');
const db = require('../database/database');
const {
  UPLOADS_DIR,
  normalizeIndicatorKey,
  buildEvidenceRelativeDir,
  buildStoredFilename,
  toPosixRelative,
  safeResolveRelative
} = require('../utils/storage');

const APPLY = process.argv.includes('--apply');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportDir = path.join(UPLOADS_DIR, 'migration-reports');
const backupDir = path.join(UPLOADS_DIR, '_migration-backup', timestamp);
const unmappedDir = path.join(UPLOADS_DIR, 'legacy-unmapped');

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => error ? reject(error) : resolve(row || null));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows || []));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error, result) => error ? reject(error) : resolve(result || {}));
  });
}

function isDuplicateColumnError(error) {
  const message = String(error && error.message || '').toLowerCase();
  return message.includes('duplicate column') || message.includes('already exists');
}

async function hasRelativePathColumn() {
  if (db.pool) {
    const row = await dbGet(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = ? AND column_name = ?`,
      ['assessment_files', 'relative_path']
    );
    return Boolean(row);
  }

  const columns = await dbAll('PRAGMA table_info(assessment_files)');
  return columns.some(column => String(column.name || '').toLowerCase() === 'relative_path');
}

async function ensureRelativePathColumn() {
  if (await hasRelativePathColumn()) return true;

  try {
    await dbRun('ALTER TABLE assessment_files ADD COLUMN relative_path TEXT');
  } catch (error) {
    if (!isDuplicateColumnError(error)) throw error;
  }

  return hasRelativePathColumn();
}

function walkFiles(root) {
  const result = [];
  if (!fs.existsSync(root)) return result;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === 'migration-reports') continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(fullPath));
    else if (entry.isFile()) result.push(fullPath);
  }
  return result;
}

function rootFiles() {
  if (!fs.existsSync(UPLOADS_DIR)) return [];
  return fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(UPLOADS_DIR, entry.name));
}

function fileIndex() {
  const index = new Map();
  for (const filePath of walkFiles(UPLOADS_DIR)) {
    const base = path.basename(filePath);
    if (!index.has(base)) index.set(base, []);
    index.get(base).push(filePath);
  }
  return index;
}

function chooseCandidate(record, index) {
  if (record.relative_path) {
    try {
      const relativeCandidate = safeResolveRelative(record.relative_path);
      if (fs.existsSync(relativeCandidate)) return relativeCandidate;
    } catch (_) {}
  }

  for (const name of [record.stored_name, record.original_name]) {
    const base = path.basename(String(name || ''));
    if (!base) continue;
    const rootCandidate = path.join(UPLOADS_DIR, base);
    if (fs.existsSync(rootCandidate)) return rootCandidate;
    const candidates = index.get(base) || [];
    if (candidates.length > 0) return candidates[0];
  }
  return null;
}

function mimeTypeFromName(fileName) {
  const extension = path.extname(String(fileName || '')).toLowerCase();
  const mapping = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png'
  };
  return mapping[extension] || 'application/octet-stream';
}

function parseLegacyFileNames(value) {
  return String(value || '')
    .split(/,\s*(?=\d{10,}[-_])/)
    .map(fileName => fileName.trim())
    .filter(Boolean);
}

function legacyIndicatorFromField(fieldName) {
  return normalizeIndicatorKey(String(fieldName || '').replace(/_file$/i, ''));
}

function uniqueDestination(dir, filename) {
  let target = path.join(dir, filename);
  if (!fs.existsSync(target)) return target;
  const extension = path.extname(filename);
  const stem = path.basename(filename, extension);
  let counter = 2;
  while (fs.existsSync(target)) {
    target = path.join(dir, `${stem}-${counter}${extension}`);
    counter += 1;
  }
  return target;
}

async function migrateModernFiles(report, index, usedRootFiles) {
  const rows = await dbAll(
    `SELECT af.*, k.nama AS kecamatan_nama
     FROM assessment_files af
     JOIN kecamatan k ON k.id = af.kecamatan_id
     ORDER BY af.id`
  );

  for (const row of rows) {
    const instrument = String(row.instrument || '').toLowerCase();
    let indicatorKey;
    try {
      indicatorKey = normalizeIndicatorKey(row.indicator_key);
    } catch (error) {
      report.modern.invalid.push({ id: row.id, reason: error.message, indicator_key: row.indicator_key });
      continue;
    }

    const relativeDir = buildEvidenceRelativeDir({
      kecamatanId: row.kecamatan_id,
      kecamatanName: row.kecamatan_nama,
      instrument,
      indicatorKey
    });
    const absoluteDir = safeResolveRelative(relativeDir);
    const storedName = path.basename(String(row.stored_name || ''));
    const targetPath = path.join(absoluteDir, storedName);
    const targetRelative = toPosixRelative(targetPath);

    if (row.relative_path === targetRelative && fs.existsSync(targetPath)) {
      report.modern.alreadyOrganized.push({ id: row.id, relative_path: targetRelative });
      continue;
    }

    const candidate = chooseCandidate(row, index);
    if (!candidate && !fs.existsSync(targetPath)) {
      report.modern.missing.push({
        id: row.id,
        kecamatan: row.kecamatan_nama,
        instrument: row.instrument,
        indicator_key: row.indicator_key,
        stored_name: row.stored_name,
        original_name: row.original_name
      });
      continue;
    }

    if (APPLY) {
      fs.mkdirSync(absoluteDir, { recursive: true });
      if (!fs.existsSync(targetPath)) fs.copyFileSync(candidate, targetPath);
      await dbRun('UPDATE assessment_files SET relative_path = ? WHERE id = ?', [targetRelative, row.id]);
    }

    if (candidate && path.dirname(candidate) === UPLOADS_DIR) usedRootFiles.add(candidate);
    report.modern.organized.push({
      id: row.id,
      source: candidate ? toPosixRelative(candidate) : null,
      relative_path: targetRelative
    });
  }
}

async function migrateLegacyAspectA(report, index, usedRootFiles, relativePathAvailable) {
  const rows = await dbAll(
    `SELECT a.*, k.nama AS kecamatan_nama
     FROM aspect_a a
     JOIN kecamatan k ON k.id = a.kecamatan_id`
  );

  for (const row of rows) {
    const fileFields = Object.keys(row).filter(key => key.endsWith('_file') && row[key]);
    for (const fieldName of fileFields) {
      const names = parseLegacyFileNames(row[fieldName]);
      const remaining = [];

      for (const originalName of names) {
        const indicatorKey = legacyIndicatorFromField(fieldName);
        const relativePathSelect = relativePathAvailable
          ? 'relative_path'
          : 'NULL AS relative_path';
        const existing = await dbGet(
          `SELECT id, ${relativePathSelect} FROM assessment_files
           WHERE kecamatan_id = ? AND instrument = 'A' AND indicator_key = ? AND original_name = ?`,
          [row.kecamatan_id, indicatorKey, originalName]
        );
        if (existing) {
          report.legacy.alreadyConverted.push({ field: fieldName, original_name: originalName, file_id: existing.id });
          continue;
        }

        const candidate = chooseCandidate({ stored_name: originalName, original_name: originalName }, index);
        if (!candidate) {
          remaining.push(originalName);
          report.legacy.missing.push({
            kecamatan: row.kecamatan_nama,
            field: fieldName,
            indicator_key: indicatorKey,
            original_name: originalName
          });
          continue;
        }

        const relativeDir = buildEvidenceRelativeDir({
          kecamatanId: row.kecamatan_id,
          kecamatanName: row.kecamatan_nama,
          instrument: 'a',
          indicatorKey
        });
        const absoluteDir = safeResolveRelative(relativeDir);
        const storedName = buildStoredFilename(originalName);
        const targetPath = path.join(absoluteDir, storedName);
        const relativePath = toPosixRelative(targetPath);
        const sizeBytes = fs.statSync(candidate).size;

        if (APPLY) {
          fs.mkdirSync(absoluteDir, { recursive: true });
          fs.copyFileSync(candidate, targetPath);
          await dbRun(
            `INSERT INTO assessment_files
              (kecamatan_id, instrument, indicator_key, original_name, stored_name, relative_path, mime_type, size_bytes, uploaded_by)
             VALUES (?, 'A', ?, ?, ?, ?, ?, ?, ?)`,
            [row.kecamatan_id, indicatorKey, originalName, storedName, relativePath,
              mimeTypeFromName(originalName), sizeBytes, row.kecamatan_id]
          );
        }

        if (path.dirname(candidate) === UPLOADS_DIR) usedRootFiles.add(candidate);
        report.legacy.converted.push({
          kecamatan: row.kecamatan_nama,
          field: fieldName,
          indicator_key: indicatorKey,
          original_name: originalName,
          relative_path: relativePath
        });
      }

      if (APPLY) {
        await dbRun(
          `UPDATE aspect_a SET ${fieldName} = ?, updated_at = CURRENT_TIMESTAMP WHERE kecamatan_id = ?`,
          [remaining.length ? remaining.join(',') : null, row.kecamatan_id]
        );
      }
    }
  }
}

function organizeRootFiles(report, usedRootFiles) {
  for (const source of rootFiles()) {
    const used = usedRootFiles.has(source);
    const destinationRoot = used ? backupDir : unmappedDir;
    const destination = uniqueDestination(destinationRoot, path.basename(source));
    report.rootFiles.push({
      file: path.basename(source),
      classification: used ? 'migration-backup' : 'legacy-unmapped',
      destination: toPosixRelative(destination)
    });
    if (APPLY) {
      fs.mkdirSync(destinationRoot, { recursive: true });
      fs.renameSync(source, destination);
    }
  }
}

async function main() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  let relativePathAvailable = await hasRelativePathColumn();
  if (APPLY && !relativePathAvailable) {
    relativePathAvailable = await ensureRelativePathColumn();
  }

  const report = {
    mode: APPLY ? 'apply' : 'dry-run',
    generated_at: new Date().toISOString(),
    uploads_dir: UPLOADS_DIR,
    schema: {
      relative_path_available: relativePathAvailable,
      note: relativePathAvailable
        ? 'Kolom relative_path tersedia.'
        : 'Kolom relative_path belum tersedia. Audit tetap berjalan; jalankan npm run migrate:uploads untuk menambah kolom dan menerapkan migrasi.'
    },
    modern: { organized: [], alreadyOrganized: [], missing: [], invalid: [] },
    legacy: { converted: [], alreadyConverted: [], missing: [] },
    rootFiles: []
  };

  const index = fileIndex();
  const usedRootFiles = new Set();
  await migrateModernFiles(report, index, usedRootFiles);
  await migrateLegacyAspectA(report, index, usedRootFiles, relativePathAvailable);
  organizeRootFiles(report, usedRootFiles);

  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `stage5-2-${APPLY ? 'apply' : 'audit'}-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const summary = {
    mode: report.mode,
    modernOrganized: report.modern.organized.length,
    modernAlreadyOrganized: report.modern.alreadyOrganized.length,
    modernMissing: report.modern.missing.length,
    legacyConverted: report.legacy.converted.length,
    legacyMissing: report.legacy.missing.length,
    rootFilesClassified: report.rootFiles.length,
    relativePathColumnAvailable: report.schema.relative_path_available,
    schemaNote: report.schema.note,
    report: reportPath
  };
  console.log(JSON.stringify(summary, null, 2));

  if (db.pool && typeof db.pool.end === 'function') await db.pool.end();
  setTimeout(() => process.exit(report.modern.invalid.length ? 1 : 0), 100);
}

main().catch(error => {
  console.error('Migrasi folder uploads gagal:', error);
  process.exit(1);
});
