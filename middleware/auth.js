module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.session && req.session.userId) {
      return next();
    }
    res.redirect('/login');
  },

  isAdmin: (req, res, next) => {
    if (req.session && req.session.username === 'admin') {
      return next();
    }
    res.status(403).send('Akses ditolak');
  }
};