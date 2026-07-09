# Patch Final Rekap Wawancara + Grafik Dashboard

## File yang diubah
- routes/interview-recap.js
- views/interview-recap.ejs
- views/dashboard.ejs

## Perbaikan
1. Rekap wawancara tidak error saat tabel belum tersedia.
2. Route rekap memastikan tabel dibuat dulu sebelum hitung ranking.
3. Rekap wawancara menampilkan semua kecamatan.
4. Ranking rekap dihitung ulang otomatis saat halaman dibuka dan saat ekspor CSV.
5. Grafik capaian upload data tetap memakai persentase capaian.
6. Bar Top 5 diberi warna berbeda dan border lebih tebal.
7. Grafik status verifikasi upload dikembalikan:
   - Sudah Diverifikasi
   - Belum Diverifikasi

## Cara pasang
Copy semua folder/file dalam patch ini ke project utama dan pilih Replace/Timpa.

Lalu jalankan:
```bash
git add .
git commit -m "Fix interview recap and dashboard verification chart"
git push origin main
```

## Setelah deploy Railway
Buka:
- /dashboard
- /interview-recap

Jika /interview-recap masih error, buka log Railway untuk melihat detail error database.
