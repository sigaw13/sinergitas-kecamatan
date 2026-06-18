'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  currentDateInJakarta,
  isDeadlineExpired
} = require('../utils/deadline');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

assert.strictEqual(
  currentDateInJakarta(new Date('2026-06-18T16:59:59Z')),
  '2026-06-18',
  'Tanggal harus dihitung menggunakan zona waktu Asia/Jakarta.'
);
assert.strictEqual(
  currentDateInJakarta(new Date('2026-06-18T17:00:01Z')),
  '2026-06-19',
  'Pergantian hari Jakarta harus terjadi pada UTC+7.'
);
assert.strictEqual(
  isDeadlineExpired('2026-06-18', new Date('2026-06-18T16:59:59Z')),
  false,
  'Kecamatan masih boleh mengisi sampai akhir tanggal batas waktu.'
);
assert.strictEqual(
  isDeadlineExpired('2026-06-18', new Date('2026-06-18T17:00:01Z')),
  true,
  'Kecamatan harus dikunci setelah tanggal batas waktu terlewati.'
);

const assessment = read('routes/assessment.js');
const protectedRoutes = assessment.match(/ensureBeforeDeadline, ensureAssessmentEditable/g) || [];
assert.strictEqual(protectedRoutes.length, 6, 'Seluruh enam instrumen wajib dilindungi pemeriksaan batas waktu.');
assert(
  assessment.includes("req.session.role !== 'kecamatan'"),
  'Penguncian batas waktu hanya berlaku bagi akun kecamatan.'
);
assert(
  assessment.includes("router.post('/files/:id/delete'"),
  'Perubahan bukti setelah batas waktu juga wajib dilindungi.'
);

const account = read('routes/account.js');
const adminUsers = read('routes/admin-users.js');
const accountView = read('views/account/password.ejs');
const adminUsersView = read('views/admin/users.ejs');
assert(account.includes('newPassword.length < 6'), 'Password akun wajib minimal enam karakter.');
assert(adminUsers.includes('password.length < 6'), 'Password evaluator wajib minimal enam karakter.');
assert(accountView.includes('minlength="6"'), 'Form ganti password wajib memakai batas minimal enam karakter.');
assert(adminUsersView.includes('minlength="6"'), 'Form evaluator wajib memakai batas minimal enam karakter.');

console.log('✅ Pengujian password dan penguncian batas waktu lulus.');
