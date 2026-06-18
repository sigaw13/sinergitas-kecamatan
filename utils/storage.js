const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.resolve(
  process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads')
);

function slugify(value, fallback = 'tanpa-nama') {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return normalized || fallback;
}

function normalizeInstrument(value) {
  const instrument = String(value || '').trim().toLowerCase();
  if (!/^[a-f]$/.test(instrument)) {
    throw new Error('Kode instrumen tidak valid.');
  }
  return instrument;
}

function normalizeIndicatorKey(value) {
  let normalized = String(value || '').trim()
    .replace(/^file_(\d+[a-z]?\d*)$/i, 'ind_$1_file')
    .replace(/_file$/i, '')
    .toLowerCase();

  const match = normalized.match(/^ind_(\d+)([a-z]?)(\d*)$/i);
  if (!match) throw new Error('Kode indikator tidak valid.');

  const number = Number.parseInt(match[1], 10);
  const letter = match[2] || '';
  const subNumber = match[3] || '';
  return `ind_${number}${letter}${subNumber}`;
}

function indicatorFolderName(indicatorKey) {
  const normalized = normalizeIndicatorKey(indicatorKey);
  const match = normalized.match(/^ind_(\d+)([a-z]?)(\d*)$/);
  const pieces = ['indikator', String(Number.parseInt(match[1], 10))];
  if (match[2]) pieces.push(match[2]);
  if (match[3]) pieces.push(String(Number.parseInt(match[3], 10)));
  return pieces.join('-');
}

function kecamatanFolderName(kecamatanId, kecamatanName) {
  const id = Number.parseInt(kecamatanId, 10);
  if (!Number.isInteger(id) || id <= 0) throw new Error('ID kecamatan tidak valid.');
  return `${id}-${slugify(kecamatanName, 'kecamatan')}`;
}

function findExistingKecamatanFolder(kecamatanId, kecamatanName, uploadsRoot = UPLOADS_DIR) {
  const parent = path.join(uploadsRoot, 'kecamatan');
  const prefix = `${Number.parseInt(kecamatanId, 10)}-`;
  try {
    const existing = fs.readdirSync(parent, { withFileTypes: true })
      .find(entry => entry.isDirectory() && entry.name.startsWith(prefix));
    if (existing) return existing.name;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return kecamatanFolderName(kecamatanId, kecamatanName);
}

function buildEvidenceRelativeDir({ kecamatanId, kecamatanName, instrument, indicatorKey, uploadsRoot = UPLOADS_DIR }) {
  const instrumentCode = normalizeInstrument(instrument);
  const kecamatanFolder = findExistingKecamatanFolder(kecamatanId, kecamatanName, uploadsRoot);
  return path.posix.join(
    'kecamatan',
    kecamatanFolder,
    `instrumen-${instrumentCode}`,
    indicatorFolderName(indicatorKey)
  );
}

function ensureEvidenceDirectory(options) {
  const relativeDir = buildEvidenceRelativeDir(options);
  const absoluteDir = safeResolveRelative(relativeDir, options.uploadsRoot || UPLOADS_DIR);
  fs.mkdirSync(absoluteDir, { recursive: true });
  return { relativeDir, absoluteDir };
}

function sanitizeFileStem(originalName) {
  const extension = path.extname(String(originalName || ''));
  const stem = path.basename(String(originalName || 'berkas'), extension);
  return slugify(stem, 'berkas').slice(0, 60);
}

function buildStoredFilename(originalName) {
  const extension = path.extname(String(originalName || '')).toLowerCase();
  const safeExtension = /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '';
  const compactTimestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `${compactTimestamp}-${crypto.randomUUID()}-${sanitizeFileStem(originalName)}${safeExtension}`;
}

function toPosixRelative(absolutePath, uploadsRoot = UPLOADS_DIR) {
  const root = path.resolve(uploadsRoot);
  const resolved = path.resolve(absolutePath);
  const relative = path.relative(root, resolved);
  if (!relative || relative === '.') throw new Error('Path berkas tidak valid.');
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path berkas berada di luar folder uploads.');
  }
  return relative.split(path.sep).join('/');
}

function safeResolveRelative(relativePath, uploadsRoot = UPLOADS_DIR) {
  const root = path.resolve(uploadsRoot);
  const normalized = String(relativePath || '').replace(/\\/g, '/');
  if (!normalized || path.posix.isAbsolute(normalized)) {
    throw new Error('Path relatif berkas tidak valid.');
  }
  const resolved = path.resolve(root, ...normalized.split('/'));
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Path berkas berada di luar folder uploads.');
  }
  return resolved;
}

function resolveAssessmentFilePath(fileRecord, uploadsRoot = UPLOADS_DIR) {
  if (fileRecord && fileRecord.relative_path) {
    return safeResolveRelative(fileRecord.relative_path, uploadsRoot);
  }
  const storedName = path.basename(String(fileRecord && fileRecord.stored_name || ''));
  if (!storedName) throw new Error('Nama berkas tidak valid.');
  return safeResolveRelative(storedName, uploadsRoot);
}

function resolveLegacyRootFile(filename, uploadsRoot = UPLOADS_DIR) {
  return safeResolveRelative(path.basename(String(filename || '')), uploadsRoot);
}

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

module.exports = {
  UPLOADS_DIR,
  slugify,
  normalizeInstrument,
  normalizeIndicatorKey,
  indicatorFolderName,
  kecamatanFolderName,
  buildEvidenceRelativeDir,
  ensureEvidenceDirectory,
  buildStoredFilename,
  toPosixRelative,
  safeResolveRelative,
  resolveAssessmentFilePath,
  resolveLegacyRootFile
};
