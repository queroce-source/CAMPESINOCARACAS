const VendedorModel = require('../models/VendedorModel');
const RegistroModel = require('../models/RegistroModel');
const UsuarioModel = require('../models/UsuarioModel');
const cache = require('../config/cache');

exports.getVendedores = async (req, res) => {
  try {
    const { q, supervisor } = req.query;
    if (q) {
      const vendedores = await VendedorModel.search(q);
      return res.json({ success: true, data: vendedores });
    }
    const cacheKey = supervisor && supervisor !== 'TODOS' ? `vendedores_sup_${supervisor}` : 'all_vendedores';
    const vendedores = await cache.get(cacheKey, 300000, () =>
      supervisor && supervisor !== 'TODOS' ? VendedorModel.getBySupervisor(supervisor) : VendedorModel.getAll()
    );
    res.json({ success: true, data: vendedores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const { fecha, supervisor } = req.query;
    const targetDate = fecha || new Date().toISOString().split('T')[0];
    const sup = supervisor || 'TODOS';

    const rows = await RegistroModel.getDashboard(targetDate, sup);
    let totalVendedores = 0, entradasReg = 0, salidasReg = 0;

    const supervisores = rows.map(r => {
      totalVendedores += r.total_vendedores;
      entradasReg += r.entradas_reg;
      salidasReg += r.salidas_reg;
      return {
        supervisor: r.supervisor || 'SIN SUPERVISOR',
        total: r.total_vendedores,
        entradasReg: r.entradas_reg,
        salidasReg: r.salidas_reg
      };
    });

    res.json({
      success: true,
      data: {
        kpi: {
          totalVendedores,
          entradasReg,
          salidasReg,
          entradasPend: totalVendedores - entradasReg,
          salidasPend: totalVendedores - salidasReg,
          pctEntrada: totalVendedores > 0 ? Math.round((entradasReg / totalVendedores) * 100) : 0,
          pctSalida: totalVendedores > 0 ? Math.round((salidasReg / totalVendedores) * 100) : 0
        },
        supervisores
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDetalle = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, supervisor, texto } = req.query;
    const hoy = new Date().toISOString().split('T')[0];
    const inicio = fechaInicio || hoy;
    const fin = fechaFin || hoy;

    const rows = await RegistroModel.getDetalle({
      fechaInicio: inicio,
      fechaFin: fin,
      supervisor: supervisor || 'TODOS',
      texto: texto || '',
    });

    const detalle = rows.map(r => ({
      codigo: r.codigo,
      nombre: r.nombre,
      supervisor: r.supervisor || '-',
      entrada: r.ent_id ? {
        fecha: r.ent_fecha,
        foto: r.ent_foto,
        comentario: r.ent_comentario,
        latitud: r.ent_lat,
        longitud: r.ent_lng
      } : null,
      salida: r.sal_id ? {
        fecha: r.sal_fecha,
        foto: r.sal_foto,
        comentario: r.sal_comentario,
        latitud: r.sal_lat,
        longitud: r.sal_lng
      } : null,
      efectividad: ((r.ent_id ? 1 : 0) + (r.sal_id ? 1 : 0)) * 50
    }));

    res.json({ success: true, data: detalle });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGraficos = async (req, res) => {
  try {
    const { fecha } = req.query;
    const targetDate = fecha || new Date().toISOString().split('T')[0];

    const [dashboardRows, timelineRows] = await Promise.all([
      RegistroModel.getDashboard(targetDate, 'TODOS'),
      RegistroModel.getGraficosTimeline(targetDate)
    ]);

    const supervisores = dashboardRows.map(r => ({
      supervisor: r.supervisor || 'SIN SUPERVISOR',
      total: r.total_vendedores,
      entradasReg: r.entradas_reg,
      salidasReg: r.salidas_reg
    }));

    const horas = Array.from({ length: 15 }, (_, i) =>
      String(i + 6).padStart(2, '0') + ':00'
    );
    const entradas = new Array(15).fill(0);
    const salidas = new Array(15).fill(0);

    timelineRows.forEach(r => {
      const idx = parseInt(r.hora, 10) - 6;
      if (idx >= 0 && idx < 15) {
        if (r.tipo.toUpperCase().includes('ENTRADA')) {
          entradas[idx] += r.total;
        } else if (r.tipo.toUpperCase().includes('SALIDA')) {
          salidas[idx] += r.total;
        }
      }
    });

    res.json({
      success: true,
      data: {
        supervisores,
        timeline: { labels: horas, entradas, salidas }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crearRegistro = async (req, res) => {
  try {
    const { codigo, nombre, tipo, comentario, latitud, longitud, fotoBase64, fotoNombre, fechaDispositivo } = req.body;

    if (!codigo || !nombre || !tipo) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
    }

    let rutaFoto = null;
    if (fotoBase64) {
      rutaFoto = `data:image/jpeg;base64,${fotoBase64}`;
    }

    const result = await RegistroModel.crear({
      codigo,
      nombre,
      tipo,
      comentario,
      latitud,
      longitud,
      foto: rutaFoto,
      fecha: fechaDispositivo
    });

    cache.invalidate('all_registros');

    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllRegistros = async (req, res) => {
  try {
    const { supervisor } = req.query;
    let codigos = null;
    let cacheKey = 'all_registros';
    if (supervisor && supervisor !== 'TODOS') {
      cacheKey = `registros_sup_${supervisor}`;
      const vendedores = await cache.get(`vendedores_sup_${supervisor}`, 300000, () => VendedorModel.getBySupervisor(supervisor));
      codigos = vendedores.map(v => v.codigo);
    }
    const registros = await cache.get(cacheKey, 60000, () => RegistroModel.getAll(codigos));
    res.json({ success: true, data: registros });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { usuario, clave } = req.body;

    if (!usuario || !clave) {
      return res.status(400).json({ success: false, message: 'Usuario y clave requeridos' });
    }

    const user = await UsuarioModel.findByUsuario(usuario);
    if (!user || user.clave !== clave) {
      return res.json({ success: false, message: 'Usuario o clave incorrectos' });
    }

    res.json({
      success: true,
      usuario: user.usuario,
      rol: user.rol,
      supervisorAsignado: user.supervisorAsignado || 'TODOS'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
