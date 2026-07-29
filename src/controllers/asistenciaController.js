const VendedorModel = require('../models/VendedorModel');
const RegistroModel = require('../models/RegistroModel');
const UsuarioModel = require('../models/UsuarioModel');

exports.getVendedores = async (req, res) => {
  try {
    const { q } = req.query;
    const vendedores = q
      ? await VendedorModel.search(q)
      : await VendedorModel.getAll();
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
    const { fecha, supervisor, texto, estado } = req.query;
    const targetDate = fecha || new Date().toISOString().split('T')[0];

    const rows = await RegistroModel.getDetalle({
      fecha: targetDate,
      supervisor: supervisor || 'TODOS',
      texto: texto || '',
      estado: estado || 'TODOS'
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
    const { codigo, nombre, tipo, comentario, latitud, longitud, fotoBase64, fotoNombre } = req.body;

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
      foto: rutaFoto
    });

    res.json({ success: true, id: result.id });
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
