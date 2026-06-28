const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const {
  corsOptions,
  sameOriginProtection,
  secureSessionSecret
} = require('./utils/security');

// Terapkan restore yang sudah dijadwalkan sebelum koneksi database dibuka.
const { applyPendingRestore } = require('./utils/backup');
try {
  applyPendingRestore();
} catch (error) {
  console.error('❌ Gagal menerapkan pending restore:', error);
  process.exit(1);
}

const { UPLOADS_DIR } = require('./utils/storage');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const db = require('./database/database');
const { synchronizeAllScores } = require('./utils/score-sync');

// Railway dan reverse proxy membutuhkan trust proxy agar secure cookie tersimpan.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware utama aplikasi.
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy': 'same-site'
  });
  next();
});
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use(sameOriginProtection);
// File bukti tidak diekspos secara publik; unduhan melalui route terotorisasi.

// Session configuration.
app.use(session({
  secret: secureSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Set view engine.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Folder bukti dapat dipindahkan melalui UPLOADS_DIR.
console.log('📁 Uploads directory:', UPLOADS_DIR);

// Routes.
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/account'));
app.use('/', require('./routes/admin-users'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/interview-recap'));
app.use('/', require('./routes/admin'));
app.use('/assessment', require('./routes/assessment'));
app.use('/export', require('./routes/export'));
app.use('/', require('./routes/backup'));
app.use('/history', require('./routes/history'));
app.use('/file-tracking', require('./routes/file-tracking'));
app.use('/evaluation', require('./routes/evaluation'));
app.use('/official-report', require('./routes/official-report'));

// Home redirect.
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Endpoint ringan untuk health check Railway dan pemantauan server.
app.get('/health', (req, res) => {
  db.get('SELECT 1 AS ok', [], (error) => {
    if (error) {
      return res.status(503).json({ status: 'error', database: 'disconnected' });
    }
    res.status(200).json({ status: 'ok', database: 'connected' });
  });
});

// Penanganan 404 dan error umum agar respons produksi tetap jelas.
app.use((req, res) => {
  res.status(404).send('Halaman tidak ditemukan.');
});

app.use((error, req, res, next) => {
  console.error('❌ Unhandled application error:', error);
  if (res.headersSent) return next(error);
  res.status(500).send('Terjadi kesalahan pada server.');
});

async function startServer() {
  try {
    if (db.ready) await db.ready;
    const scoreSync = await synchronizeAllScores(db);
    console.log(`✅ Skor ${scoreSync.synchronized} kecamatan telah diselaraskan dengan workbook resmi 2026.`);

    return app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   APLIKASI SIESELON                                      ║
║   Sistem Informasi Evaluasi Sinergitas Kinerja            ║
║   dan Laporan Kecamatan - Kabupaten Sumedang              ║
║                                                           ║
║   Server berjalan di http://localhost:${PORT}             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Server gagal dimulai karena database belum siap:', error);
    process.exitCode = 1;
    return null;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
