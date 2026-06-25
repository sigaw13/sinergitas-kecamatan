// Tambahkan di app.js/server.js SETELAH app, pool, dan ensureAuthenticated tersedia.

const path = require('path')
const express = require('express')
const makePreviewRouter = require('./routes/assessmentPreview.routes')
// const makeUploadSafeStorageRouter = require('./routes/assessmentUploadSafeStorage.routes') // opsional

// Public asset CSS viewer
app.use('/css', express.static(path.join(__dirname, 'public/css')))

// PDF.js dari node_modules. Jalankan dulu: npm i pdfjs-dist @supabase/supabase-js multer
app.use('/vendor/pdfjs', express.static(path.join(__dirname, 'node_modules/pdfjs-dist/build')))

app.use(makePreviewRouter({
  pool,
  ensureAuthenticated
}))

// Opsional kalau ingin upload baru langsung aman untuk Railway/Supabase.
// app.use(makeUploadSafeStorageRouter({ pool, ensureAuthenticated }))
