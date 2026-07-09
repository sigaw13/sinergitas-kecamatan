# Patch Grafik Dashboard + Rekap Wawancara

## File yang diubah
- views/dashboard.ejs
- routes/interview-recap.js
- views/interview-recap.ejs

## Perubahan
1. Grafik capaian kecamatan di dashboard superadmin sekarang menampilkan **persentase capaian upload data** per kecamatan.
2. Angka persentase tampil di atas setiap bar grafik.
3. Tooltip grafik tetap menampilkan jumlah instrumen yang sudah diverifikasi dan belum diverifikasi.
4. Rekap wawancara sekarang menampilkan **semua kecamatan**, bukan hanya top 5.
5. Peringkat rekap wawancara dihitung ulang otomatis saat halaman dibuka dan saat ekspor CSV.
6. Ekspor CSV rekap wawancara sekarang berisi semua kecamatan.

## Cara pasang
Copy file sesuai struktur folder ke project utama lalu replace.

Setelah itu jalankan:
```bash
git add .
git commit -m "Fix dashboard chart and full interview recap"
git push origin main
```
