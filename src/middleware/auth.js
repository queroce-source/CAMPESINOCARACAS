const { verificarToken } = require('../config/security');

function leerCookie(req, nombre) {
  const header = req.headers.cookie || '';
  for (const parte of header.split(';')) {
    const idx = parte.indexOf('=');
    if (idx > -1 && parte.slice(0, idx).trim() === nombre) {
      try {
        return decodeURIComponent(parte.slice(idx + 1).trim());
      } catch (err) {
        return parte.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

function requireAuth(req, res, next) {
  const token = leerCookie(req, 'admin_session');
  const payload = verificarToken(token);
  if (!payload || payload.tipo !== 'sesion') {
    return res.status(401).json({ success: false, message: 'Sesión no válida o expirada. Inicia sesión.' });
  }
  req.usuarioSesion = payload;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const rol = req.usuarioSesion && req.usuarioSesion.rol;
    if (rol !== 'ADMIN' && rol !== 'SUPERVISOR') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin, leerCookie };
