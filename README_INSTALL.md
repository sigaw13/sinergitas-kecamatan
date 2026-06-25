# SI ESELON - Full Module Preview Evaluator

Modul ini menambahkan:

1. Preview file bukti evaluator tanpa tombol download.
2. PDF.js viewer production-ready.
3. Watermark overlay SI ESELON.
4. Audit log preview file.
5. Storage aman Railway via Supabase Storage.

Modul ini tidak menyentuh rumus, nilai, verifikasi, ranking, atau logic instrumen A-F.

---

## 1. Install dependency

```bash
npm i pdfjs-dist @supabase/supabase-js multer
```

---

## 2. Copy folder

Copy isi folder ini ke root project SI ESELON:

```text
migrations/
routes/
services/
views/
public/
docs/
```

Jika project kamu sudah punya folder yang sama, gabungkan isinya.

---

## 3. Jalankan migration PostgreSQL Railway

```bash
psql $DATABASE_URL -f migrations/20260625_preview_evaluator.sql
```

Atau copy isi SQL ke Railway PostgreSQL Query console.

---

## 4. Tambah ENV Railway

```env
FILE_STORAGE_PROVIDER=supabase
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=isi_service_role_key
SUPABASE_BUCKET=sieselon-bukti
```

Buat bucket di Supabase Storage bernama `sieselon-bukti`. Untuk server-side streaming, bucket boleh private.

---

## 5. Mount route di app.js/server.js

Lihat file:

```text
docs/app-mount-example.js
```

Intinya:

```js
const makePreviewRouter = require('./routes/assessmentPreview.routes')
app.use('/vendor/pdfjs', express.static(path.join(__dirname, 'node_modules/pdfjs-dist/build')))
app.use(makePreviewRouter({ pool, ensureAuthenticated }))
```

---

## 6. Ganti tombol Unduh menjadi Preview

Di halaman Verifikasi Penilaian Evaluator, cari tombol:

```ejs
<a href="/assessment/download/<%= file.id %>">Unduh</a>
```

Ganti menjadi:

```ejs
<a class="btn-preview" href="/assessment/preview/<%= file.id %>" target="_blank" rel="noopener">👁 Preview</a>
```

---

## 7. Fix Railway: upload baru harus masuk Supabase Storage

Railway filesystem bisa hilang ketika redeploy/restart. Karena itu file baru wajib disimpan ke Supabase Storage.

Cara paling aman tanpa mengubah alur lama:

1. Biarkan validasi dan insert file existing tetap berjalan.
2. Setelah mendapatkan `fileId`, panggil `patchAssessmentFileStorage()`.

Lihat contoh:

```text
docs/upload-integration-example.js
```

---

## 8. Catatan penting untuk file lama

Jika file lama sudah pernah tersimpan di local Railway dan sekarang muncul pesan:

```text
File fisik tidak ditemukan
```

Maka file lama tersebut memang tidak bisa dipreview sampai diupload ulang atau dipindahkan ke storage cloud. Database masih ada, tetapi file fisiknya sudah tidak ada di server.

---

## 9. Route yang tersedia

```text
GET /assessment/preview/:id       halaman PDF.js viewer
GET /assessment/preview/raw/:id   stream file inline
GET /assessment/preview-logs      audit log superadmin/admin
```

---

## 10. Aman untuk alur existing

Yang berubah hanya tampilan file bukti dan storage file. Modul ini tidak mengubah:

- rumus penilaian
- nilai indikator
- status evaluasi
- finalisasi
- ranking kecamatan
- progress instrumen
