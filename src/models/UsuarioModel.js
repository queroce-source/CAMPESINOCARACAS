const db = require('../config/database');

class UsuarioModel {
  static findByUsuario(usuario) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, usuario, clave, rol, supervisorAsignado FROM usuarios WHERE usuario = ?',
        [usuario],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }
}

module.exports = UsuarioModel;
