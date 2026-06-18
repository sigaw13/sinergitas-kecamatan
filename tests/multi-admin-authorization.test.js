'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const database = read('database/database.js');
assert(database.includes('admin_kecamatan_assignments'), 'Tabel penugasan admin wajib tersedia.');
assert(database.includes("role = 'superadmin'"), 'Akun admin utama wajib dimigrasikan menjadi superadmin.');

const auth = read('middleware/auth.js');
assert(auth.includes('canAccessKecamatan'), 'Pemeriksaan akses kecamatan wajib tersedia.');
assert(auth.includes("'evaluator'"), 'Role evaluator wajib didukung.');
assert(auth.includes('getAuthorizedKecamatanIds'), 'Daftar wilayah resmi evaluator wajib tersedia.');

const adminUsers = read('routes/admin-users.js');
assert(adminUsers.includes("role = 'evaluator'"), 'Pembuatan akun evaluator wajib tersedia.');
assert(adminUsers.includes('replaceAssignments'), 'Pembaruan pembagian wilayah wajib tersedia.');
assert(adminUsers.includes('isSuperAdmin'), 'Manajemen evaluator hanya boleh dilakukan superadmin.');
assert(
  adminUsers.includes('const internalName = `__evaluator__:${username}`'),
  'Nama internal evaluator wajib unik agar tidak berbenturan dengan nama kecamatan.'
);
assert(
  adminUsers.includes('(nama, username, password, role, nama_pengelola, email, no_hp)'),
  'Nama tampilan evaluator wajib disimpan terpisah dari identitas internal.'
);

const evaluation = read('routes/evaluation.js');
assert(evaluation.includes("requireKecamatanAccess('id')"), 'Detail dan aksi evaluasi wajib dibatasi per wilayah.');
assert(evaluation.includes('getAuthorizedKecamatanIds(req)'), 'Daftar evaluasi wajib mengikuti wilayah evaluator.');

const assessment = read('routes/assessment.js');
assert(assessment.includes('ensureCanEditInstrument'), 'Evaluator wajib dicegah mengubah isian kecamatan.');
assert(assessment.includes('canAccessKecamatan'), 'Akses bukti wajib mengikuti penugasan wilayah.');

console.log('✅ Pengujian otorisasi multiadmin lulus.');
