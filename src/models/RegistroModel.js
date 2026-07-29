const { db } = require('../config/database');

class RegistroModel {
  static async crear({ codigo, nombre, tipo, comentario, latitud, longitud, foto }) {
    const fecha = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const result = await db.execute({
      sql: `INSERT INTO registros (codigo, nombre, tipo, comentario, latitud, longitud, foto, fecha)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [codigo, nombre, tipo, comentario, latitud, longitud, foto, fecha],
    });
    return { id: Number(result.lastInsertRowid) };
  }

  static async getDashboard(fecha, supervisor) {
    const result = await db.execute({
      sql: `
        SELECT v.supervisor,
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
      `,
      args: [fecha, fecha, supervisor, supervisor],
    });
    return result.rows;
  }

  static async getDetalle({ fecha, supervisor, texto, estado }) {
    let sql = `
      SELECT v.codigo, v.nombre, v.supervisor,
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
    `;
    const args = [fecha, fecha];

    if (supervisor !== 'TODOS') {
      sql += ' AND v.supervisor = ?';
      args.push(supervisor);
    }
    if (texto) {
      sql += ' AND (v.codigo LIKE ? OR v.nombre LIKE ?)';
      args.push(`%${texto}%`, `%${texto}%`);
    }

    sql += ' ORDER BY v.nombre';

    let rows = (await db.execute({ sql, args })).rows;

    if (estado && estado !== 'TODOS') {
      rows = rows.filter(r => {
        switch (estado) {
          case 'ENTRADA_REG': return r.ent_id !== null;
          case 'ENTRADA_PEND': return r.ent_id === null;
          case 'SALIDA_REG': return r.sal_id !== null;
          case 'SALIDA_PEND': return r.sal_id === null;
          default: return true;
        }
      });
    }
    return rows;
  }

  static async getGraficosTimeline(fecha) {
    const result = await db.execute({
      sql: `SELECT tipo, CAST(strftime('%H', fecha) AS TEXT) as hora, COUNT(*) as total
            FROM registros
            WHERE DATE(fecha) = ?
            GROUP BY tipo, strftime('%H', fecha)
            ORDER BY hora`,
      args: [fecha],
    });
    return result.rows;
  }
}

module.exports = RegistroModel;
