const { db } = require('../config/database');

class UsuarioModel {
  static async findByUsuario(usuario) {
    const result = await db.execute({
      sql: 'SELECT id, usuario, clave, rol, supervisorAsignado FROM usuarios WHERE usuario = ?',
      args: [usuario],
    });
    return result.rows[0] || null;
  }
}

module.exports = UsuarioModel;
