const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware utama aplikasi.
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session configuration.
app.use(session({
  secret: process.env.SESSION_SECRET || 'sinergitas-kecamatan-sumedang-2025-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Set view engine.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create uploads directory if not exists.
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Routes.
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/admin'));
app.use('/assessment', require('./routes/assessment'));
app.use('/export', require('./routes/export'));
app.use('/backup', require('./routes/backup'));
app.use('/history', require('./routes/history'));
app.use('/file-tracking', require('./routes/file-tracking'));

// Home redirect.
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Start server.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   APLIKASI SIESELON                                      ║
║   Sistem Informasi Evaluasi Sinergitas Kinerja            ║
║   dan Laporan Kecamatan - Kabupaten Sumedang              ║
║                                                           ║
║   Server berjalan di: http://localhost:${PORT}            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
