'use strict';

const db = require('../database/database');

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row || null)));
  });
}

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.session && ['superadmin', 'evaluator'].includes(req.session.role)) return next();
  res.status(403).send('Akses hanya untuk administrator atau evaluator.');
}

function isSuperAdmin(req, res, next) {
  if (req.session && req.session.role === 'superadmin') return next();
  res.status(403).send('Akses hanya untuk superadmin.');
}

async function canAccessKecamatan(userId, role, kecamatanId) {
  if (role === 'superadmin') return true;
  if (role === 'kecamatan') return Number(userId) === Number(kecamatanId);
  if (role !== 'evaluator') return false;
  const assignment = await dbGet(
    'SELECT 1 AS allowed FROM admin_kecamatan_assignments WHERE admin_id = ? AND kecamatan_id = ?',
    [userId, kecamatanId]
  );
  return Boolean(assignment);
}

function requireKecamatanAccess(paramName = 'id') {
  return async (req, res, next) => {
    try {
      const raw = req.params[paramName] || req.query.kecamatan_id || req.body.kecamatan_id;
      const kecamatanId = Number.parseInt(raw, 10);
      if (!Number.isInteger(kecamatanId)) return res.status(400).send('Kecamatan tidak valid.');
      const allowed = await canAccessKecamatan(
        req.session.userId,
        req.session.role,
        kecamatanId
      );
      if (!allowed) return res.status(403).send('Kecamatan ini bukan wilayah kerja akun Anda.');
      req.authorizedKecamatanId = kecamatanId;
      next();
    } catch (error) {
      console.error('Gagal memeriksa otoritas kecamatan:', error);
      res.status(500).send('Gagal memeriksa otoritas akun.');
    }
  };
}

async function getAuthorizedKecamatanIds(req) {
  if (req.session.role === 'superadmin') return null;
  if (req.session.role === 'kecamatan') return [Number(req.session.userId)];
  const rows = await new Promise((resolve, reject) => {
    db.all(
      'SELECT kecamatan_id FROM admin_kecamatan_assignments WHERE admin_id = ? ORDER BY kecamatan_id',
      [req.session.userId],
      (error, result) => (error ? reject(error) : resolve(result || []))
    );
  });
  return rows.map(row => Number(row.kecamatan_id));
}

module.exports = {
  ensureAuthenticated,
  isAdmin,
  isSuperAdmin,
  canAccessKecamatan,
  requireKecamatanAccess,
  getAuthorizedKecamatanIds
};
