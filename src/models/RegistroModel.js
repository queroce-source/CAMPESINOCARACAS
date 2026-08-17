const { db, FieldValue } = require('../config/firebase');
const { TIPO_ENTRADA, TIPO_SALIDA } = require('../config/security');

const VENDEDORES = 'vendedores';
const REGISTROS = 'registros';
const CHUNK_IN = 10;

function normalizarNombre(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function esVendedorActivo(v) {
  return !/(^| )VACANTE/i.test(v.nombre || '') && String(v.codigo || '') !== 'CGV';
}

function esErrorIndice(err) {
  if (!err || err.code == null) return false;
  return err.code === 9 || err.code === 3 || /index/i.test(String(err.message || ''));
}

function indexarRegistros(registros) {
  const regsByCodigo = {};
  const regsByNombre = {};
  registros.forEach(r => {
    if (r.codigo) {
      if (!regsByCodigo[r.codigo]) regsByCodigo[r.codigo] = [];
      regsByCodigo[r.codigo].push(r);
    }
    const nombreKey = String(r.nombre || '').trim().toUpperCase();
    if (nombreKey) {
      if (!regsByNombre[nombreKey]) regsByNombre[nombreKey] = [];
      regsByNombre[nombreKey].push(r);
    }
  });
  return { regsByCodigo, regsByNombre };
}

function construirSupMap(vendedoresActivos, regsByCodigo, regsByNombre) {
  const supMap = {};
  vendedoresActivos.forEach(v => {
    const sup = v.supervisor || 'SIN SUPERVISOR';
    if (!supMap[sup]) supMap[sup] = { supervisor: sup, total_vendedores: 0, entradas_reg: 0, salidas_reg: 0 };
    const regs = regsByCodigo[v.codigo] || regsByNombre[String(v.nombre || '').trim().toUpperCase()] || [];
    const entrada = regs.some(r => r.tipo.toUpperCase().includes('ENTRADA'));
    const salida = regs.some(r => r.tipo.toUpperCase().includes('SALIDA'));
    supMap[sup].total_vendedores++;
    if (entrada) supMap[sup].entradas_reg++;
    if (salida) supMap[sup].salidas_reg++;
  });
  return supMap;
}

function mapearDetalle(vendedores, regsByCodigo, regsByNombre) {
  const result = [];
  vendedores.forEach(v => {
    const regs = regsByCodigo[v.codigo] || regsByNombre[String(v.nombre || '').trim().toUpperCase()] || [];
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

class RegistroModel {
  static _rangoDia(dia) {
    return { inicio: `${dia} 00:00:00`, fin: `${dia} 23:59:59` };
  }

  static _tiposPermitidos(ultimo) {
    const esEntrada = (t) => String(t || '').toUpperCase().includes('ENTRADA');
    if (!ultimo) return [TIPO_ENTRADA, TIPO_SALIDA];
    return esEntrada(ultimo) ? [TIPO_SALIDA] : [TIPO_ENTRADA];
  }

  static async crearConValidacionSecuencia({ idSolicitud, codigo, fecha, ...datos }) {
    const ref = db.collection(REGISTROS).doc(idSolicitud);
    try {
      // Rama rápida: usa índice compuesto (codigo ASC, fecha DESC) y lee 1 documento.
      const resultado = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) {
          return { id: idSolicitud, duplicado: true, error: null };
        }

        const { inicio, fin } = this._rangoDia(String(fecha).split(' ')[0]);
        const ultSnap = await tx.get(
          db.collection(REGISTROS)
            .where('codigo', '==', codigo)
            .where('fecha', '>=', inicio)
            .where('fecha', '<=', fin)
            .orderBy('fecha', 'desc')
            .limit(1)
            .select('codigo', 'fecha', 'tipo')
        );
        const ultimo = ultSnap.empty ? null : (ultSnap.docs[0].data().tipo || null);

        return this._transaccionFinal(tx, ref, idSolicitud, ultimo, datos, fecha);
      });
      return resultado;
    } catch (err) {
      if (!esErrorIndice(err)) throw err;
    }
    // Fallback si el índice compuesto aún no existe: escaneo del día.
    return this._crearConEscaneoLegacy(ref, idSolicitud, codigo, fecha, datos);
  }

  static async _crearConEscaneoLegacy(ref, idSolicitud, codigo, fecha, datos) {
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        return { id: idSolicitud, duplicado: true, error: null };
      }

      const dia = String(fecha).split(' ')[0];
      const regsSnap = await tx.get(
        db.collection(REGISTROS)
          .where('fecha', '>=', `${dia} 00:00:00`)
          .where('fecha', '<=', `${dia} 23:59:59`)
          .select('codigo', 'fecha', 'tipo')
      );
      const delVendedor = [];
      regsSnap.forEach(doc => {
        const d = doc.data();
        if (d.codigo === codigo) delVendedor.push(d);
      });
      delVendedor.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
      const ultimo = delVendedor.length ? delVendedor[delVendedor.length - 1].tipo : null;

      return this._transaccionFinal(tx, ref, idSolicitud, ultimo, datos, fecha);
    });
  }

  static _transaccionFinal(tx, ref, idSolicitud, ultimo, datos, fecha) {
    if (!this._tiposPermitidos(ultimo).includes(datos.tipo)) {
      const ya = ultimo || TIPO_ENTRADA;
      return {
        id: null,
        duplicado: false,
        error: `Secuencia de marcación no permitida: ya existe un registro de tipo "${ya}" para este vendedor hoy.`
      };
    }

    tx.set(ref, { ...datos, fecha, horaServer: FieldValue.serverTimestamp(), creadoUtc: new Date().toISOString() });
    return { id: idSolicitud, duplicado: false, error: null };
  }

  static async getDashboard(fecha, supervisor) {
    let vendedoresQuery = db.collection(VENDEDORES);
    if (supervisor !== 'TODOS') {
      vendedoresQuery = vendedoresQuery.where('supervisor', '==', supervisor);
    }
    const vendedoresSnap = await vendedoresQuery.get();
    const vendedores = [];
    vendedoresSnap.forEach(doc => vendedores.push(doc.data()));
    const vendedoresActivos = vendedores.filter(esVendedorActivo);

    const registros = await this._getRegistrosPorRango(fecha, fecha, ['codigo', 'nombre', 'tipo', 'fecha']);
    const { regsByCodigo, regsByNombre } = indexarRegistros(registros);

    return Object.values(construirSupMap(vendedoresActivos, regsByCodigo, regsByNombre));
  }

  static async getDetalle({ fechaInicio, fechaFin, supervisor, texto }) {
    let vendedoresQuery = db.collection(VENDEDORES);
    if (supervisor !== 'TODOS') {
      vendedoresQuery = vendedoresQuery.where('supervisor', '==', supervisor);
    }
    const vendedoresSnap = await vendedoresQuery.get();
    let vendedores = [];
    vendedoresSnap.forEach(doc => vendedores.push(doc.data()));
    vendedores = vendedores.filter(esVendedorActivo);

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
    const { regsByCodigo, regsByNombre } = indexarRegistros(registros);

    return mapearDetalle(vendedores, regsByCodigo, regsByNombre);
  }

  static async getPanel({ fechaInicio, fechaFin, supervisor, texto }) {
    const vendedoresSnap = await db.collection(VENDEDORES).get();
    const vendedores = [];
    vendedoresSnap.forEach(doc => vendedores.push(doc.data()));
    const vendedoresActivos = vendedores.filter(esVendedorActivo);

    const registros = await this._getRegistrosPorRango(fechaInicio, fechaFin);
    const { regsByCodigo, regsByNombre } = indexarRegistros(registros);

    const vendedoresKpi = supervisor !== 'TODOS'
      ? vendedoresActivos.filter(v => v.supervisor === supervisor)
      : vendedoresActivos;
    const supervisores = Object.values(construirSupMap(vendedoresKpi, regsByCodigo, regsByNombre));

    let totalVendedores = 0, entradasReg = 0, salidasReg = 0;
    supervisores.forEach(s => {
      totalVendedores += s.total_vendedores;
      entradasReg += s.entradas_reg;
      salidasReg += s.salidas_reg;
    });

    const kpi = {
      totalVendedores,
      entradasReg,
      salidasReg,
      entradasPend: totalVendedores - entradasReg,
      salidasPend: totalVendedores - salidasReg,
      pctEntrada: totalVendedores > 0 ? Math.round((entradasReg / totalVendedores) * 100) : 0,
      pctSalida: totalVendedores > 0 ? Math.round((salidasReg / totalVendedores) * 100) : 0
    };

    let vendedoresDetalle = vendedoresActivos;
    if (supervisor !== 'TODOS') {
      vendedoresDetalle = vendedoresDetalle.filter(v => v.supervisor === supervisor);
    }
    if (texto) {
      const t = texto.toLowerCase();
      vendedoresDetalle = vendedoresDetalle.filter(v =>
        v.codigo.toLowerCase().includes(t) || v.nombre.toLowerCase().includes(t)
      );
    }

    return {
      kpi,
      supervisores,
      detalle: mapearDetalle(vendedoresDetalle, regsByCodigo, regsByNombre)
    };
  }

  static async getEstadisticas(fecha) {
    const vendedoresSnap = await db.collection(VENDEDORES).get();
    const vendedores = [];
    vendedoresSnap.forEach(doc => vendedores.push(doc.data()));
    const vendedoresActivos = vendedores.filter(esVendedorActivo);

    const registros = await this._getRegistrosPorRango(fecha, fecha, ['codigo', 'nombre', 'tipo', 'fecha']);
    const { regsByCodigo, regsByNombre } = indexarRegistros(registros);

    const hourMap = {};
    registros.forEach(r => {
      const hour = r.fecha.split(' ')[1].split(':')[0];
      const key = `${r.tipo}_${hour}`;
      if (!hourMap[key]) {
        hourMap[key] = { tipo: r.tipo, hora: hour, total: 0 };
      }
      hourMap[key].total++;
    });

    return {
      supervisores: Object.values(construirSupMap(vendedoresActivos, regsByCodigo, regsByNombre)),
      timeline: Object.values(hourMap)
    };
  }

  static async existeFotoHashHoy(codigo, fotoHash, fecha) {
    if (!fotoHash) return false;
    const { inicio, fin } = this._rangoDia(fecha);
    try {
      // Rama rápida: índice compuesto (codigo, fotoHash, fecha). Lee 1 documento.
      const snap = await db.collection(REGISTROS)
        .where('codigo', '==', codigo)
        .where('fotoHash', '==', fotoHash)
        .where('fecha', '>=', inicio)
        .where('fecha', '<=', fin)
        .limit(1)
        .select('fotoHash')
        .get();
      return !snap.empty;
    } catch (err) {
      if (!esErrorIndice(err)) throw err;
    }
    // Fallback si el índice compuesto aún no existe: escaneo del día.
    const registros = await this._getRegistrosPorRango(fecha, fecha, ['codigo', 'fotoHash']);
    return registros.some(r => r.codigo === codigo && r.fotoHash === fotoHash);
  }

  static async getGraficosTimeline(fecha) {
    const registros = await this._getRegistrosPorRango(fecha, fecha, ['tipo', 'fecha']);
    const hourMap = {};
    registros.forEach(r => {
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
      const resultado = [];
      for (let i = 0; i < codigos.length; i += CHUNK_IN) {
        const chunk = codigos.slice(i, i + CHUNK_IN);
        const snap = await db.collection(REGISTROS).where('codigo', 'in', chunk).get();
        snap.forEach(doc => {
          const d = doc.data();
          d.id = doc.id;
          resultado.push(d);
        });
      }
      return resultado;
    }
    if (codigos && codigos.length === 0) {
      return [];
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

  static async getExportacionMes({ fechaInicio, fechaFin, supervisor }) {
    const vendedoresQuery = supervisor && supervisor !== 'TODOS'
      ? db.collection(VENDEDORES).where('supervisor', '==', supervisor)
      : db.collection(VENDEDORES);
    const vendedoresSnap = await vendedoresQuery.get();

    const codigos = supervisor && supervisor !== 'TODOS' ? [] : null;
    const codigoPorNombre = {};
    vendedoresSnap.forEach(doc => {
      const v = doc.data();
      if (!esVendedorActivo(v) || !v.codigo) return;
      if (codigos) codigos.push(v.codigo);
      const nombre = normalizarNombre(v.nombre);
      if (nombre) codigoPorNombre[nombre] = v.codigo;
    });

    const registros = await this._getRegistrosPorRango(fechaInicio, fechaFin, [
      'codigo', 'nombre', 'supervisor', 'tipo', 'fecha', 'comentario', 'latitud', 'longitud'
    ]);

    const filas = [];
    registros.forEach(r => {
      const codigoReg = r.codigo || codigoPorNombre[normalizarNombre(r.nombre)] || '';
      if (codigos && !codigos.includes(codigoReg)) return;
      filas.push({
        codigo: codigoReg,
        nombre: r.nombre || '',
        supervisor: r.supervisor || '',
        tipo: r.tipo || '',
        fecha: r.fecha || '',
        comentario: r.comentario || '',
        latitud: r.latitud != null ? r.latitud : '',
        longitud: r.longitud != null ? r.longitud : ''
      });
    });
    filas.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    return filas;
  }

  static async _getRegistrosPorRango(fechaInicio, fechaFin, campos) {
    let query = db.collection(REGISTROS)
      .where('fecha', '>=', `${fechaInicio} 00:00:00`)
      .where('fecha', '<=', `${fechaFin} 23:59:59`);
    if (campos && campos.length) {
      query = query.select(...campos);
    }

    const snap = await query.get();
    const registros = [];
    snap.forEach(doc => registros.push(doc.data()));
    return registros;
  }
}

module.exports = RegistroModel;