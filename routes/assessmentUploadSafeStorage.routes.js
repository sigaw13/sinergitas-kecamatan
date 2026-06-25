// OPTIONAL: route upload aman Railway.
// Pakai ini hanya kalau kamu mau mengganti route upload file bukti existing.
// Jika upload existing sudah jalan, cukup panggil patchAssessmentFileStorage() setelah insert database lama.

const express = require('express')
const multer = require('multer')
const { pickUser, saveUploadedEvidence } = require('../services/assessmentFileService')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (!allowed.includes(file.mimetype)) return cb(new Error('Tipe file tidak diizinkan'))
    cb(null, true)
  }
})

function makeUploadSafeStorageRouter({ pool, ensureAuthenticated }) {
  const router = express.Router()
  const auth = ensureAuthenticated || ((req, res, next) => {
    if (!pickUser(req)) return res.status(401).send('Silakan login terlebih dahulu')
    next()
  })

  router.post('/assessment/upload-safe-storage', auth, upload.single('file'), async (req, res) => {
    try {
      const user = pickUser(req)
      const role = String(user?.role || '').toLowerCase()
      if (!['kecamatan', 'superadmin', 'admin'].includes(role)) {
        return res.status(403).send('Anda tidak memiliki akses upload')
      }

      const saved = await saveUploadedEvidence(pool, {
        file: req.file,
        kecamatanId: req.body.kecamatan_id || user.kecamatan_id,
        instrument: req.body.instrument || req.body.instrument_code || 'A',
        indicatorCode: req.body.indicator_code || req.body.indicator || 'unknown',
        uploadedBy: user.id
      })

      return res.redirect(req.get('referer') || `/assessment/instrument-a?kecamatan_id=${saved.kecamatan_id}`)
    } catch (err) {
      console.error('[SI ESELON] upload safe storage error:', err)
      return res.status(500).send(err.message || 'Upload gagal')
    }
  })

  return router
}

module.exports = makeUploadSafeStorageRouter
