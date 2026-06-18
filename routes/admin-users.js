'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/database');
const { ensureAuthenticated, isSuperAdmin } = require('../middleware/auth');

const router = express.Router();

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows || [])));
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row || null)));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error, result) => (error ? reject(error) : resolve(result || {})));
  });
}

function selectedIds(body) {
  const raw = body.kecamatan_ids;
  const values = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  return [...new Set(values.map(value => Number.parseInt(value, 10)).filter(Number.isInteger))];
}

async function replaceAssignments(adminId, kecamatanIds) {
  await dbRun('DELETE FROM admin_kecamatan_assignments WHERE admin_id = ?', [adminId]);
  for (const kecamatanId of kecamatanIds) {
    const target = await dbGet("SELECT id FROM kecamatan WHERE id = ? AND role = 'kecamatan'", [kecamatanId]);
    if (!target) throw new Error('Terdapat pilihan kecamatan yang tidak valid.');
    // Satu kecamatan memiliki satu evaluator penanggung jawab. Memilih kecamatan
    // di akun baru otomatis memindahkan penugasannya dari evaluator sebelumnya.
    await dbRun(
      'DELETE FROM admin_kecamatan_assignments WHERE kecamatan_id = ? AND admin_id != ?',
      [kecamatanId, adminId]
    );
    await dbRun(
      'INSERT INTO admin_kecamatan_assignments (admin_id, kecamatan_id) VALUES (?, ?)',
      [adminId, kecamatanId]
    );
  }
}

router.get('/admin/users', ensureAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const [admins, kecamatans, assignments] = await Promise.all([
      dbAll(
        `SELECT id, COALESCE(NULLIF(nama_pengelola, ''), nama) AS nama,
                username, email, no_hp
         FROM kecamatan WHERE role = 'evaluator' ORDER BY nama`
      ),
      dbAll(
        `SELECT id, nama FROM kecamatan WHERE role = 'kecamatan' ORDER BY nama`
      ),
      dbAll(
        `SELECT aka.admin_id, aka.kecamatan_id, k.nama AS kecamatan
         FROM admin_kecamatan_assignments aka
         JOIN kecamatan k ON k.id = aka.kecamatan_id
         ORDER BY k.nama`
      )
    ]);
    const assignmentMap = {};
    for (const row of assignments) {
      if (!assignmentMap[row.admin_id]) assignmentMap[row.admin_id] = [];
      assignmentMap[row.admin_id].push(row);
    }
    res.render('admin/users', {
      admins,
      kecamatans,
      assignmentMap,
      username: req.session.username,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Gagal memuat manajemen evaluator:', error);
    res.status(500).send('Gagal memuat manajemen evaluator.');
  }
});

router.post('/admin/users', ensureAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const nama = String(req.body.nama || '').trim();
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const email = String(req.body.email || '').trim();
    const noHp = String(req.body.no_hp || '').trim();
    const kecamatanIds = selectedIds(req.body);
    if (!nama || !/^[a-z0-9._-]{4,40}$/.test(username)) {
      throw new Error('Nama wajib diisi dan username harus 4–40 karakter tanpa spasi.');
    }
    if (password.length < 6 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new Error('Password minimal 6 karakter serta memuat huruf dan angka.');
    }
    if (!kecamatanIds.length) throw new Error('Pilih minimal satu kecamatan wilayah kerja.');
    if (await dbGet('SELECT id FROM kecamatan WHERE username = ?', [username])) {
      throw new Error('Username sudah digunakan.');
    }
    const hash = await bcrypt.hash(password, 12);
    // Tabel lama memakai UNIQUE pada kecamatan.nama. Gunakan identitas internal
    // berbasis username agar nama evaluator tidak berbenturan dengan nama
    // kecamatan atau evaluator lain, sedangkan nama tampil disimpan pada
    // nama_pengelola.
    const internalName = `__evaluator__:${username}`;
    const result = await dbRun(
      `INSERT INTO kecamatan
        (nama, username, password, role, nama_pengelola, email, no_hp)
       VALUES (?, ?, ?, 'evaluator', ?, ?, ?)`,
      [internalName, username, hash, nama, email || null, noHp || null]
    );
    let adminId = result.lastID;
    if (!adminId) {
      const created = await dbGet('SELECT id FROM kecamatan WHERE username = ?', [username]);
      adminId = created && created.id;
    }
    await replaceAssignments(adminId, kecamatanIds);
    res.redirect('/admin/users?success=' + encodeURIComponent(`Evaluator ${nama} berhasil dibuat.`));
  } catch (error) {
    const message = String(error && error.message || '');
    const friendlyMessage = /UNIQUE constraint failed: kecamatan\.username|duplicate key.*username/i.test(message)
      ? 'Username sudah digunakan. Silakan pilih username lain.'
      : (/UNIQUE constraint failed: kecamatan\.nama|duplicate key.*nama/i.test(message)
        ? 'Identitas evaluator sudah digunakan. Silakan pilih username lain.'
        : (message || 'Gagal membuat evaluator.'));
    res.redirect('/admin/users?error=' + encodeURIComponent(friendlyMessage));
  }
});

router.post('/admin/users/:id/assignments', ensureAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const adminId = Number.parseInt(req.params.id, 10);
    const admin = await dbGet(
      `SELECT id, COALESCE(NULLIF(nama_pengelola, ''), nama) AS nama
       FROM kecamatan WHERE id = ? AND role = 'evaluator'`,
      [adminId]
    );
    if (!admin) throw new Error('Evaluator tidak ditemukan.');
    const kecamatanIds = selectedIds(req.body);
    if (!kecamatanIds.length) throw new Error('Pilih minimal satu kecamatan wilayah kerja.');
    await replaceAssignments(adminId, kecamatanIds);
    res.redirect('/admin/users?success=' + encodeURIComponent(`Wilayah kerja ${admin.nama} diperbarui.`));
  } catch (error) {
    res.redirect('/admin/users?error=' + encodeURIComponent(error.message || 'Gagal memperbarui wilayah.'));
  }
});

router.post('/admin/users/:id/password', ensureAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const adminId = Number.parseInt(req.params.id, 10);
    const password = String(req.body.password || '');
    if (password.length < 6 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new Error('Password minimal 6 karakter serta memuat huruf dan angka.');
    }
    const admin = await dbGet(
      `SELECT id, COALESCE(NULLIF(nama_pengelola, ''), nama) AS nama
       FROM kecamatan WHERE id = ? AND role = 'evaluator'`,
      [adminId]
    );
    if (!admin) throw new Error('Evaluator tidak ditemukan.');
    await dbRun('UPDATE kecamatan SET password = ? WHERE id = ?', [await bcrypt.hash(password, 12), adminId]);
    res.redirect('/admin/users?success=' + encodeURIComponent(`Password ${admin.nama} berhasil direset.`));
  } catch (error) {
    res.redirect('/admin/users?error=' + encodeURIComponent(error.message || 'Gagal mereset password.'));
  }
});

router.post('/admin/users/:id/delete', ensureAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const adminId = Number.parseInt(req.params.id, 10);
    const admin = await dbGet(
      `SELECT id, COALESCE(NULLIF(nama_pengelola, ''), nama) AS nama
       FROM kecamatan WHERE id = ? AND role = 'evaluator'`,
      [adminId]
    );
    if (!admin) throw new Error('Evaluator tidak ditemukan.');
    await dbRun('DELETE FROM admin_kecamatan_assignments WHERE admin_id = ?', [adminId]);
    await dbRun('UPDATE evaluation_reviews SET reviewed_by = NULL WHERE reviewed_by = ?', [adminId]);
    await dbRun('UPDATE evaluation_item_scores SET reviewed_by = NULL WHERE reviewed_by = ?', [adminId]);
    await dbRun('UPDATE evaluation_results SET finalized_by = NULL WHERE finalized_by = ?', [adminId]);
    await dbRun('UPDATE evaluation_history SET actor_id = NULL WHERE actor_id = ?', [adminId]);
    await dbRun('DELETE FROM kecamatan WHERE id = ? AND role = ?', [adminId, 'evaluator']);
    res.redirect('/admin/users?success=' + encodeURIComponent(`Akun ${admin.nama} dihapus.`));
  } catch (error) {
    res.redirect('/admin/users?error=' + encodeURIComponent(error.message || 'Gagal menghapus evaluator.'));
  }
});

module.exports = router;
