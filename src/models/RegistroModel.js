const { db } = require('../config/firebase');

const VENDEDORES = 'vendedores';
const REGISTROS = 'registros';

class RegistroModel {
  static async crear({ codigo, nombre, tipo, comentario, latitud, longitud, foto }) {
    const fecha = new Date().toISOString().replace('T', ' ').substring(0, 19);
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

    const registros = await this._getRegistrosPorFecha(fecha);

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

  static async getDetalle({ fecha, supervisor, texto, estado }) {
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

    const registros = await this._getRegistrosPorFecha(fecha);

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

      const item = {
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
      };

      if (estado && estado !== 'TODOS') {
        switch (estado) {
          case 'ENTRADA_REG': if (!entrada) return; break;
          case 'ENTRADA_PEND': if (entrada) return; break;
          case 'SALIDA_REG': if (!salida) return; break;
          case 'SALIDA_PEND': if (salida) return; break;
        }
      }

      result.push(item);
    });

    return result;
  }

  static async getGraficosTimeline(fecha) {
    const startDate = `${fecha} 00:00:00`;
    const endDate = `${fecha} 23:59:59`;
    const snap = await db.collection(REGISTROS)
      .where('fecha', '>=', startDate)
      .where('fecha', '<=', endDate)
      .get();

    const hourMap = {};
    snap.forEach(doc => {
      const r = doc.data();
      const hour = r.fecha.split(' ')[1].split(':')[0];
      const key = `${r.tipo}_${hour}`;
      if (!hourMap[key]) {
        hourMap[key] = { tipo: r.tipo, hora: hour, total: 0 };
      }
      hourMap[key].total++;
    });

    return Object.values(hourMap);
  }

  static async _getRegistrosPorFecha(fecha) {
    const startDate = `${fecha} 00:00:00`;
    const endDate = `${fecha} 23:59:59`;
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