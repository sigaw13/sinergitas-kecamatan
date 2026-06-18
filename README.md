# SIESELON 2.0

Konversi instrumen spreadsheet Evaluasi Sinergitas Kinerja Kecamatan Kabupaten
Sumedang menjadi aplikasi web multiakun.

## Fitur

- Form Instrumen A sampai F dan upload bukti per indikator.
- Skor maksimum resmi 30 + 30 + 5 + 20 + 5 + 10 = 100.
- Progres pengisian, verifikasi admin, penilaian per pertanyaan, finalisasi,
  peringkat, laporan resmi, CSV, backup, dan restore.
- Import data master dashboard Excel dan baseline skor workbook.
- Audit selisih skor workbook dengan skor kerja web.
- Password akun dapat diubah sendiri.
- Multiadmin evaluator dengan pembagian wilayah kerja per kecamatan.
- Halaman login responsif bertema Kabupaten Sumedang dengan ilustrasi Monumen
  Lingga, perbukitan, dan warna hijau–emas.
- Password baru minimal 6 karakter serta tetap wajib memuat huruf dan angka.
- Setelah tanggal batas waktu terlewati, akun kecamatan tidak dapat lagi
  menyimpan isian, mengunggah bukti, atau menghapus bukti. Superadmin tetap
  dapat memperbarui batas waktu dari dashboard.

## Pembagian tugas evaluator

Login sebagai superadmin, lalu buka **Evaluator** pada dashboard. Superadmin dapat:

- membuat akun evaluator;
- memilih kecamatan wilayah kerja setiap evaluator;
- memperbarui pembagian wilayah;
- mereset password evaluator; dan
- menghapus akun evaluator.

Evaluator hanya melihat kecamatan yang ditugaskan kepadanya pada dashboard,
verifikasi, laporan, ranking, dan hasil resmi. Evaluator dapat menilai dan
memfinalisasi wilayahnya, tetapi tidak dapat mengubah isian instrumen kecamatan.

## Menjalankan secara lokal

Persyaratan: Node.js 20 atau 22 dan Python 3.

```bash
cp .env.example .env
npm ci
npm start
```

Buka `http://localhost:3000`. Pada penggunaan pertama, database SQLite dibuat
otomatis. Ubah `INITIAL_ADMIN_PASSWORD` sebelum menjalankan aplikasi pertama kali.

## Import workbook

Salin workbook ke `imports/input`, jalankan aplikasi sekali agar database dibuat,
lalu:

```bash
npm run import:excel
npm run audit:excel
```

Importer memperbarui nama pengelola, email, nomor telepon, dan baseline skor.
Importer tidak membuat bukti palsu atau menandai hasil sebagai final.

## Deployment Docker/Railway

Atur environment berikut:

```text
NODE_ENV=production
SESSION_SECRET=<acak minimal 32 karakter>
INITIAL_ADMIN_PASSWORD=<password kuat>
ALLOWED_ORIGINS=https://domain-aplikasi
UPLOADS_DIR=/data/uploads
BACKUP_DIR=/data/backups
```

Untuk SQLite, pasang volume persisten pada `/app/database` dan lokasi uploads.
Untuk banyak instance server, gunakan PostgreSQL melalui `DATABASE_URL`.

## Catatan keamanan

- Jangan mengunggah `.env`, database, folder uploads, atau backup ke Git.
- Segera ubah password awal melalui menu **Ubah Password**.
- Hasil resmi hanya muncul setelah keenam instrumen terverifikasi dan difinalkan.
