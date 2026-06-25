// Integrasi aman tanpa mengubah alur penilaian.
// Letakkan di route upload lama setelah record assessment_files berhasil dibuat.

const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const { patchAssessmentFileStorage } = require('./services/assessmentFileService')

router.post('/assessment/upload', ensureAuthenticated, upload.single('file'), async (req, res) => {
  // 1. Biarkan logic validasi, indikator, dan alur lama tetap berjalan.
  // 2. Setelah INSERT lama menghasilkan fileId, panggil patch berikut.

  const fileId = insertedFile.id // sesuaikan dengan variable existing kamu

  await patchAssessmentFileStorage(pool, {
    fileId,
    file: req.file,
    kecamatanId: req.body.kecamatan_id || req.user.kecamatan_id,
    instrument: req.body.instrument || 'A',
    indicatorCode: req.body.indicator_code,
    uploadedBy: req.user.id
  })

  return res.redirect(req.get('referer'))
})
