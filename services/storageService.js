const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const STORAGE_PROVIDER = process.env.FILE_STORAGE_PROVIDER || 'local'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'sieselon-bukti'
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'uploads')

let supabase = null
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })
}

function safeFileName(name = 'file.pdf') {
  const ext = path.extname(name).toLowerCase() || '.pdf'
  const base = path.basename(name, ext)
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'bukti'
  return `${base}${ext}`
}

function buildStorageKey({ kecamatanId, instrument = 'instrument', indicatorCode = 'indikator', originalName }) {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const stamp = `${yyyy}${mm}${dd}-${Date.now()}`
  return [
    'assessment-files',
    `kecamatan-${kecamatanId || 'unknown'}`,
    String(instrument).toLowerCase(),
    String(indicatorCode).toLowerCase().replace(/[^a-z0-9._-]/g, '-'),
    `${stamp}-${safeFileName(originalName)}`
  ].join('/')
}

async function uploadBuffer({ buffer, storageKey, mimeType }) {
  if (STORAGE_PROVIDER === 'supabase') {
    if (!supabase) {
      throw new Error('Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.')
    }

    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storageKey, buffer, {
        contentType: mimeType || 'application/pdf',
        upsert: false
      })

    if (error) throw error
    return { provider: 'supabase', key: storageKey }
  }

  const finalPath = path.join(LOCAL_UPLOAD_DIR, storageKey)
  fs.mkdirSync(path.dirname(finalPath), { recursive: true })
  fs.writeFileSync(finalPath, buffer)
  return { provider: 'local', key: storageKey, filePath: finalPath }
}

async function readStoredFile({ provider, storageKey, filePath }) {
  if (provider === 'supabase') {
    if (!supabase) {
      throw new Error('Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.')
    }

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .download(storageKey)

    if (error) throw error
    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  const resolvedPath = filePath && path.isAbsolute(filePath)
    ? filePath
    : path.join(LOCAL_UPLOAD_DIR, filePath || storageKey || '')

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    const err = new Error('File fisik tidak ditemukan')
    err.code = 'FILE_NOT_FOUND'
    throw err
  }

  return fs.readFileSync(resolvedPath)
}

module.exports = {
  STORAGE_PROVIDER,
  SUPABASE_BUCKET,
  safeFileName,
  buildStorageKey,
  uploadBuffer,
  readStoredFile
}
