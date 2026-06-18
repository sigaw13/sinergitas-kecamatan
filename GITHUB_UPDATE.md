# Mengganti Repository GitHub dengan SIESELON v2.3.2

Repository tujuan:

```text
https://github.com/sigaw13/sinergitas-kecamatan
```

## Data yang tidak boleh diunggah

- `.env`
- `database/*.db`
- `node_modules`
- `uploads`
- `backups`
- workbook yang berisi data kerja

Paket GitHub sudah membersihkan seluruh data tersebut.

## Cara aman melalui Git di Windows

Pastikan Git for Windows sudah terpasang, lalu buka Command Prompt:

```cmd
cd /d "%USERPROFILE%\Documents"
git clone https://github.com/sigaw13/sinergitas-kecamatan.git sinergitas-kecamatan-update
cd sinergitas-kecamatan-update
```

Ekstrak isi paket `SIESELON_GITHUB_READY_v2.3.2.zip` ke folder sementara.
Kemudian hapus isi folder `sinergitas-kecamatan-update`, tetapi jangan menghapus
folder tersembunyi `.git`. Salin seluruh isi folder `SIESELON_GITHUB_READY_v2.3.2`
ke dalam `sinergitas-kecamatan-update`.

Jalankan:

```cmd
git add -A
git status
git commit -m "release: SIESELON v2.3.2 multiadmin dan tema Sumedang"
git push origin main
```

Jika diminta login, masuk menggunakan akun GitHub pemilik repository.

## Setelah push

Jika layanan hosting terhubung ke branch `main`, deployment baru biasanya
berjalan otomatis. Periksa log deployment dan pastikan variabel berikut tetap
tersedia pada hosting:

```text
NODE_ENV=production
SESSION_SECRET=<rahasia minimal 32 karakter>
INITIAL_ADMIN_PASSWORD=<password admin>
ALLOWED_ORIGINS=https://alamat-aplikasi
```

Jangan mengganti atau menghapus persistent volume database dan uploads pada
hosting.
