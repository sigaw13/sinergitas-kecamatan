# Patch Kecil: Rekap Wawancara Error + Grafik Status Verifikasi Upload

## File yang diubah
- routes/interview-recap.js
- views/dashboard.ejs

## Yang diperbaiki
1. Rekap wawancara error di Railway/PostgreSQL karena fungsi ensureTables masih memakai syntax SQLite `AUTOINCREMENT`.
   - Sekarang otomatis memakai `SERIAL PRIMARY KEY` kalau database PostgreSQL.
   - SQLite lokal tetap memakai `AUTOINCREMENT`.
2. Grafik Status Verifikasi Upload sekarang menampilkan semua kecamatan.
   - Sudah Diverifikasi
   - Belum Diverifikasi
   - Belum Upload Final
3. Grafik capaian persentase yang sudah OK tidak diubah.
4. View rekap wawancara tidak diubah.

## Cara pasang
Copy folder `routes` dan `views` ke project utama, pilih Replace/Timpa.

Lalu jalankan:
```bash
git add .
git commit -m "Fix interview recap postgres and verification status chart"
git push origin main
```

Setelah Railway selesai deploy, buka:
- /interview-recap
- /dashboard
