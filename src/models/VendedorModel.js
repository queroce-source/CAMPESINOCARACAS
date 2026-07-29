const db = require('../config/database');

class VendedorModel {
  static getAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT codigo, nombre, supervisor FROM vendedores ORDER BY nombre', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static search(term) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT codigo, nombre, supervisor FROM vendedores
         WHERE codigo LIKE ? OR nombre LIKE ?
         ORDER BY nombre LIMIT 20`,
        [`%${term}%`, `%${term}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  static getBySupervisor(supervisor) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT codigo, nombre, supervisor FROM vendedores WHERE supervisor = ? ORDER BY nombre',
        [supervisor],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = VendedorModel;
