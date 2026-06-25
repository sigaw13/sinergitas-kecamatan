const { buildStorageKey, uploadBuffer } = require('./storageService')

function pickUser(req) {
  return req.user || req.session?.user || req.auth?.user || null
}

async function logFileAccess(pool, req, file, action = 'VIEW') {
  const user = pickUser(req)

  try {
    await pool.query(
      `INSERT INTO assessment_file_access_logs
       (file_id, user_id, user_role, kecamatan_id, action, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        file.id,
        user?.id || null,
        user?.role || null,
        file.kecamatan_id || file.kecamatanId || null,
        action,
        req.ip || req.headers['x-forwarded-for'] || null,
        req.headers['user-agent'] || null
      ]
    )
  } catch (err) {
    console.error('[SI ESELON] gagal menulis access log:', err.message)
  }
}

async function getAssessmentFile(pool, id) {
  const result = await pool.query(
    `SELECT
       af.*,
       COALESCE(af.original_filename, af.file_name, af.filename, af.name, 'bukti.pdf') AS display_name,
       COALESCE(af.mime_type, 'application/pdf') AS display_mime_type,
       COALESCE(af.storage_provider, 'local') AS display_storage_provider,
       COALESCE(af.storage_key, af.file_path, af.path, af.url) AS display_storage_key,
       COALESCE(af.file_path, af.path) AS display_file_path
     FROM assessment_files af
     WHERE af.id = $1
     LIMIT 1`,
    [id]
  )

  return result.rows[0] || null
}

async function canPreviewFile(pool, req, file) {
  const user = pickUser(req)
  if (!user) return false

  const role = String(user.role || '').toLowerCase()

  if (role === 'superadmin') return true
  if (role === 'admin') return true

  // Evaluator boleh preview. Jika tabel assignment tersedia, akan dibatasi ke wilayah tugasnya.
  if (role === 'evaluator') {
    try {
      const result = await pool.query(
        `SELECT 1
         FROM evaluator_assignments ea
         WHERE ea.user_id = $1 AND ea.kecamatan_id = $2
         LIMIT 1`,
        [user.id, file.kecamatan_id]
      )
      return result.rowCount > 0
    } catch (_) {
      // Kalau tabel assignment belum ada, jangan merusak sistem existing: evaluator tetap boleh preview.
      return true
    }
  }

  // Kecamatan hanya boleh lihat file miliknya sendiri, berguna kalau route dipakai ulang di halaman kecamatan.
  if (role === 'kecamatan') {
    return Number(user.kecamatan_id || user.kecamatanId) === Number(file.kecamatan_id)
  }

  return false
}

async function saveUploadedEvidence(pool, { file, kecamatanId, instrument, indicatorCode, uploadedBy }) {
  if (!file?.buffer) {
    throw new Error('Upload harus memakai multer.memoryStorage agar aman di Railway.')
  }

  const storageKey = buildStorageKey({
    kecamatanId,
    instrument,
    indicatorCode,
    originalName: file.originalname
  })

  const stored = await uploadBuffer({
    buffer: file.buffer,
    storageKey,
    mimeType: file.mimetype
  })

  // Insert umum. Jika struktur tabel existing berbeda, pakai fungsi patchAssessmentFileStorage() setelah insert lama.
  const result = await pool.query(
    `INSERT INTO assessment_files
      (kecamatan_id, instrument, indicator_code, original_filename, mime_type, file_size,
       storage_provider, storage_key, file_path, preview_only, uploaded_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10,NOW(),NOW())
     RETURNING *`,
    [
      kecamatanId,
      instrument,
      indicatorCode,
      file.originalname,
      file.mimetype,
      file.size,
      stored.provider,
      stored.key,
      stored.filePath || null,
      uploadedBy || null
    ]
  )

  return result.rows[0]
}

async function patchAssessmentFileStorage(pool, { fileId, file, kecamatanId, instrument, indicatorCode, uploadedBy }) {
  if (!file?.buffer) {
    throw new Error('Upload harus memakai multer.memoryStorage agar aman di Railway.')
  }

  const storageKey = buildStorageKey({ kecamatanId, instrument, indicatorCode, originalName: file.originalname })
  const stored = await uploadBuffer({ buffer: file.buffer, storageKey, mimeType: file.mimetype })

  const result = await pool.query(
    `UPDATE assessment_files
     SET original_filename = COALESCE($2, original_filename),
         mime_type = COALESCE($3, mime_type),
         file_size = COALESCE($4, file_size),
         storage_provider = $5,
         storage_key = $6,
         file_path = $7,
         preview_only = TRUE,
         uploaded_by = COALESCE($8, uploaded_by),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      fileId,
      file.originalname,
      file.mimetype,
      file.size,
      stored.provider,
      stored.key,
      stored.filePath || null,
      uploadedBy || null
    ]
  )

  return result.rows[0]
}

module.exports = {
  pickUser,
  getAssessmentFile,
  canPreviewFile,
  logFileAccess,
  saveUploadedEvidence,
  patchAssessmentFileStorage
}
