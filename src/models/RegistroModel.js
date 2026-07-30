const { db } = require('../config/firebase');

const VENDEDORES = 'vendedores';
const REGISTROS = 'registros';

class RegistroModel {
  static async crear({ codigo, nombre, tipo, comentario, latitud, longitud, foto, fecha }) {
    fecha = fecha || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const docRef = await db.collection(REGISTROS).add({
      codigo, nombre, tipo, comentario,
      latitud: latitud || null,
      longitud: longitud || null,
      foto, fecha,
    });
    return { id: docRef.id };
  }

  static async getDashboard(fecha, supervisor) {
    let vendedoresQuery = db.collection(VENDEDORES);
    if (supervisor !== 'TODOS') {
      vendedoresQuery = vendedoresQuery.where('supervisor', '==', supervisor);
    }
    const vendedoresSnap = await vendedoresQuery.get();
    const vendedores = [];
    vendedoresSnap.forEach(doc => vendedores.push(doc.data()));

    const registros = await this._getRegistrosPorRango(fecha, fecha);

    const regsByCodigo = {};
    registros.forEach(r => {
      if (!regsByCodigo[r.codigo]) regsByCodigo[r.codigo] = [];
      regsByCodigo[r.codigo].push(r);
    });

    const supMap = {};
    vendedores.forEach(v => {
      const sup = v.supervisor || 'SIN SUPERVISOR';
      if (!supMap[sup]) {
        supMap[sup] = { supervisor: sup, total_vendedores: 0, entradas_reg: 0, salidas_reg: 0 };
      }
      supMap[sup].total_vendedores++;
      const regs = regsByCodigo[v.codigo] || [];
      if (regs.some(r => r.tipo.toUpperCase().includes('ENTRADA'))) supMap[sup].entradas_reg++;
      if (regs.some(r => r.tipo.toUpperCase().includes('SALIDA'))) supMap[sup].salidas_reg++;
    });

    return Object.values(supMap);
  }

  static async getDetalle({ fechaInicio, fechaFin, supervisor, texto }) {
    const vendedoresSnap = await db.collection(VENDEDORES).get();
    let vendedores = [];
    vendedoresSnap.forEach(doc => vendedores.push(doc.data()));

    if (supervisor !== 'TODOS') {
      vendedores = vendedores.filter(v => v.supervisor === supervisor);
    }
    if (texto) {
      const t = texto.toLowerCase();
      vendedores = vendedores.filter(v =>
        v.codigo.toLowerCase().includes(t) || v.nombre.toLowerCase().includes(t)
      );
    }

    const registros = await this._getRegistrosPorRango(fechaInicio, fechaFin);

    const regsByCodigo = {};
    registros.forEach(r => {
      if (!regsByCodigo[r.codigo]) regsByCodigo[r.codigo] = [];
      regsByCodigo[r.codigo].push(r);
    });

    const result = [];
    vendedores.forEach(v => {
      const regs = regsByCodigo[v.codigo] || [];
      const entrada = regs.find(r => r.tipo.toUpperCase().includes('ENTRADA'));
      const salida = regs.find(r => r.tipo.toUpperCase().includes('SALIDA'));

      result.push({
        codigo: v.codigo,
        nombre: v.nombre,
        supervisor: v.supervisor || '-',
        ent_id: entrada ? 1 : null,
        ent_fecha: entrada ? entrada.fecha : null,
        ent_foto: entrada ? entrada.foto : null,
        ent_comentario: entrada ? entrada.comentario : null,
        ent_lat: entrada ? entrada.latitud : null,
        ent_lng: entrada ? entrada.longitud : null,
        sal_id: salida ? 1 : null,
        sal_fecha: salida ? salida.fecha : null,
        sal_foto: salida ? salida.foto : null,
        sal_comentario: salida ? salida.comentario : null,
        sal_lat: salida ? salida.latitud : null,
        sal_lng: salida ? salida.longitud : null,
      });
    });

    return result;
  }

  static async getGraficosTimeline(fecha) {
    const snap = await this._getRegistrosPorRango(fecha, fecha);
    const hourMap = {};
    snap.forEach(r => {
      const hour = r.fecha.split(' ')[1].split(':')[0];
      const key = `${r.tipo}_${hour}`;
      if (!hourMap[key]) {
        hourMap[key] = { tipo: r.tipo, hora: hour, total: 0 };
      }
      hourMap[key].total++;
    });
    return Object.values(hourMap);
  }

  static async getAll(codigos) {
    if (codigos && codigos.length > 0) {
      const promises = codigos.map(codigo =>
        db.collection(REGISTROS).where('codigo', '==', codigo).get()
          .then(snap => {
            const regs = [];
            snap.forEach(doc => { const d = doc.data(); d.id = doc.id; regs.push(d); });
            return regs;
          })
      );
      const results = await Promise.all(promises);
      return results.flat();
    }
    const snap = await db.collection(REGISTROS).get();
    const registros = [];
    snap.forEach(doc => {
      const data = doc.data();
      data.id = doc.id;
      registros.push(data);
    });
    return registros;
  }

  static async _getRegistrosPorRango(fechaInicio, fechaFin) {
    const startDate = `${fechaInicio} 00:00:00`;
    const endDate = `${fechaFin} 23:59:59`;
    const snap = await db.collection(REGISTROS)
      .where('fecha', '>=', startDate)
      .where('fecha', '<=', endDate)
      .get();

    const registros = [];
    snap.forEach(doc => registros.push(doc.data()));
    return registros;
  }
}

module.exports = RegistroModel;