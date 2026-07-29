const { db } = require('../config/database');

class VendedorModel {
  static async getAll() {
    const result = await db.execute('SELECT codigo, nombre, supervisor FROM vendedores ORDER BY nombre');
    return result.rows;
  }

  static async search(term) {
    const result = await db.execute({
      sql: `SELECT codigo, nombre, supervisor FROM vendedores
            WHERE codigo LIKE ? OR nombre LIKE ? ORDER BY nombre LIMIT 20`,
      args: [`%${term}%`, `%${term}%`],
    });
    return result.rows;
  }

  static async getBySupervisor(supervisor) {
    const result = await db.execute({
      sql: 'SELECT codigo, nombre, supervisor FROM vendedores WHERE supervisor = ? ORDER BY nombre',
      args: [supervisor],
    });
    return result.rows;
  }
}

module.exports = VendedorModel;
