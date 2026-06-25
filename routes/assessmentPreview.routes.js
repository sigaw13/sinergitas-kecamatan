const express = require('express')
const path = require('path')
const { readStoredFile } = require('../services/storageService')
const {
  pickUser,
  getAssessmentFile,
  canPreviewFile,
  logFileAccess
} = require('../services/assessmentFileService')

function makePreviewRouter({ pool, ensureAuthenticated }) {
  if (!pool) throw new Error('pool PostgreSQL wajib dikirim ke makePreviewRouter({ pool })')

  const router = express.Router()
  const auth = ensureAuthenticated || ((req, res, next) => {
    const user = pickUser(req)
    if (!user) return res.status(401).send('Silakan login terlebih dahulu')
    next()
  })

  // Halaman viewer evaluator: tidak ada tombol download.
  router.get('/assessment/preview/:id', auth, async (req, res) => {
    try {
      const file = await getAssessmentFile(pool, req.params.id)
      if (!file) return res.status(404).send('Data file tidak ditemukan')

      const allowed = await canPreviewFile(pool, req, file)
      if (!allowed) return res.status(403).send('Anda tidak memiliki akses melihat file ini')

      await logFileAccess(pool, req, file, 'OPEN_VIEWER')

      const user = pickUser(req)
      return res.render('assessment/preview', {
        title: 'Preview Bukti Dukung',
        file,
        rawUrl: `/assessment/preview/raw/${file.id}`,
        user,
        watermarkText: `SI ESELON - ${user?.name || user?.username || 'Evaluator'} - ${new Date().toLocaleString('id-ID')}`
      })
    } catch (err) {
      console.error('[SI ESELON] preview error:', err)
      return res.status(500).send('Gagal membuka preview file')
    }
  })

  // Stream file untuk PDF.js. Inline, no-store, bukan attachment.
  router.get('/assessment/preview/raw/:id', auth, async (req, res) => {
    try {
      const file = await getAssessmentFile(pool, req.params.id)
      if (!file) return res.status(404).send('Data file tidak ditemukan')

      const allowed = await canPreviewFile(pool, req, file)
      if (!allowed) return res.status(403).send('Anda tidak memiliki akses melihat file ini')

      const buffer = await readStoredFile({
        provider: file.display_storage_provider,
        storageKey: file.display_storage_key,
        filePath: file.display_file_path
      })

      await logFileAccess(pool, req, file, 'STREAM_FILE')

      const mimeType = file.display_mime_type || 'application/pdf'
      const displayName = String(file.display_name || 'bukti.pdf').replace(/[\r\n"]/g, '')

      res.setHeader('Content-Type', mimeType)
      res.setHeader('Content-Disposition', `inline; filename="${displayName}"`)
      res.setHeader('Content-Length', buffer.length)
      res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'SAMEORIGIN')

      return res.end(buffer)
    } catch (err) {
      console.error('[SI ESELON] raw preview error:', err)
      if (err.code === 'FILE_NOT_FOUND') {
        return res.status(404).send('File fisik tidak ditemukan. Untuk Railway, pindahkan upload ke Supabase Storage/S3.')
      }
      return res.status(500).send('Gagal membaca file')
    }
  })

  // Rekap log akses file untuk superadmin/admin.
  router.get('/assessment/preview-logs', auth, async (req, res) => {
    try {
      const user = pickUser(req)
      const role = String(user?.role || '').toLowerCase()
      if (!['superadmin', 'admin'].includes(role)) {
        return res.status(403).send('Hanya superadmin/admin yang dapat melihat log preview')
      }

      const result = await pool.query(
        `SELECT l.*, af.original_filename, af.file_name, af.filename
         FROM assessment_file_access_logs l
         LEFT JOIN assessment_files af ON af.id = l.file_id
         ORDER BY l.created_at DESC
         LIMIT 300`
      )

      return res.render('assessment/preview-logs', {
        title: 'Log Preview Bukti Dukung',
        logs: result.rows
      })
    } catch (err) {
      console.error('[SI ESELON] preview logs error:', err)
      return res.status(500).send('Gagal membaca log preview')
    }
  })

  return router
}

module.exports = makePreviewRouter
