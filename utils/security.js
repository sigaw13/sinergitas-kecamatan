'use strict';

const crypto = require('crypto');

function parseAllowedOrigins() {
  return String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function corsOptions(req, callback) {
  const allowed = parseAllowedOrigins();
  const origin = req.get('origin');
  const accepted = allowed.length > 0
    ? allowed.includes(origin)
    : origin === expectedOrigin(req);
  if (!origin || accepted) {
    return callback(null, { origin: true, credentials: true });
  }
  callback(new Error('Origin tidak diizinkan oleh konfigurasi CORS.'));
}

function expectedOrigin(req) {
  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  return `${forwardedProto || req.protocol}://${req.get('host')}`;
}

function sameOriginProtection(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const source = req.get('origin') || req.get('referer');
  if (!source) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).send('Permintaan ditolak karena sumber permintaan tidak dapat diverifikasi.');
    }
    return next();
  }
  try {
    if (new URL(source).origin !== expectedOrigin(req)) {
      return res.status(403).send('Permintaan lintas situs ditolak.');
    }
  } catch (_) {
    return res.status(403).send('Sumber permintaan tidak valid.');
  }
  next();
}

const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const key = String(req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;
  const previous = loginAttempts.get(key);
  const active = previous && previous.resetAt > now
    ? previous
    : { count: 0, resetAt: now + windowMs };
  active.count += 1;
  loginAttempts.set(key, active);
  if (active.count > maxAttempts) {
    res.set('Retry-After', String(Math.ceil((active.resetAt - now) / 1000)));
    return res.status(429).render('login', {
      error: 'Terlalu banyak percobaan login. Coba kembali beberapa menit lagi.',
      success: null
    });
  }
  next();
}

function clearLoginAttempts(req) {
  loginAttempts.delete(String(req.ip || req.socket.remoteAddress || 'unknown'));
}

function secureSessionSecret() {
  const configured = String(process.env.SESSION_SECRET || '').trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET wajib diatur pada environment produksi.');
  }
  return crypto.randomBytes(48).toString('hex');
}

module.exports = {
  corsOptions,
  sameOriginProtection,
  loginRateLimit,
  clearLoginAttempts,
  secureSessionSecret
};
