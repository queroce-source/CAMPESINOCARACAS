const db = require('../config/database');

class RegistroModel {
  static crear({ codigo, nombre, tipo, comentario, latitud, longitud, foto }) {
    return new Promise((resolve, reject) => {
      const fecha = new Date();
      const fechaStr = fecha.toISOString().replace('T', ' ').substring(0, 19);
      db.run(
        `INSERT INTO registros (codigo, nombre, tipo, comentario, latitud, longitud, foto, fecha)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigo, nombre, tipo, comentario, latitud, longitud, foto, fechaStr],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  static getDashboard(fecha, supervisor) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          v.supervisor,
          COUNT(*) as total_vendedores,
          SUM(CASE WHEN r_ent.id IS NOT NULL THEN 1 ELSE 0 END) as entradas_reg,
          SUM(CASE WHEN r_sal.id IS NOT NULL THEN 1 ELSE 0 END) as salidas_reg
        FROM vendedores v
        LEFT JOIN registros r_ent ON r_ent.codigo = v.codigo
          AND r_ent.tipo LIKE '%ENTRADA%'
          AND DATE(r_ent.fecha) = ?
        LEFT JOIN registros r_sal ON r_sal.codigo = v.codigo
          AND r_sal.tipo LIKE '%SALIDA%'
          AND DATE(r_sal.fecha) = ?
        WHERE (? = 'TODOS' OR v.supervisor = ?)
        GROUP BY v.supervisor
        ORDER BY v.supervisor
      `;
      db.all(sql, [fecha, fecha, supervisor, supervisor], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static getDetalle({ fecha, supervisor, texto, estado }) {
    return new Promise((resolve, reject) => {
      let conditions = 'WHERE (? = ? OR 1=1)';
      const params = ['TODOS', supervisor];

      if (supervisor !== 'TODOS') {
        conditions += ' AND v.supervisor = ?';
        params.push(supervisor);
      }
      if (texto) {
        conditions += ' AND (v.codigo LIKE ? OR v.nombre LIKE ?)';
        params.push(`%${texto}%`, `%${texto}%`);
      }

      const sql = `
        SELECT
          v.codigo, v.nombre, v.supervisor,
          r_ent.id as ent_id, r_ent.fecha as ent_fecha, r_ent.foto as ent_foto,
          r_ent.comentario as ent_comentario, r_ent.latitud as ent_lat, r_ent.longitud as ent_lng,
          r_sal.id as sal_id, r_sal.fecha as sal_fecha, r_sal.foto as sal_foto,
          r_sal.comentario as sal_comentario, r_sal.latitud as sal_lat, r_sal.longitud as sal_lng
        FROM vendedores v
        LEFT JOIN registros r_ent ON r_ent.codigo = v.codigo
          AND r_ent.tipo LIKE '%ENTRADA%'
          AND DATE(r_ent.fecha) = ?
        LEFT JOIN registros r_sal ON r_sal.codigo = v.codigo
          AND r_sal.tipo LIKE '%SALIDA%'
          AND DATE(r_sal.fecha) = ?
        ${conditions}
        ORDER BY v.nombre
      `;

      const finalParams = [fecha, fecha, ...params];

      db.all(sql, finalParams, (err, rows) => {
        if (err) { reject(err); return; }

        let filtered = rows;
        if (estado && estado !== 'TODOS') {
          filtered = rows.filter(r => {
            switch (estado) {
              case 'ENTRADA_REG': return r.ent_id !== null;
              case 'ENTRADA_PEND': return r.ent_id === null;
              case 'SALIDA_REG': return r.sal_id !== null;
              case 'SALIDA_PEND': return r.sal_id === null;
              default: return true;
            }
          });
        }

        resolve(filtered);
      });
    });
  }

  static getGraficosTimeline(fecha) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT tipo, strftime('%H', fecha) as hora, COUNT(*) as total
        FROM registros
        WHERE DATE(fecha) = ?
        GROUP BY tipo, strftime('%H', fecha)
        ORDER BY hora
      `;
      db.all(sql, [fecha], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = RegistroModel;
