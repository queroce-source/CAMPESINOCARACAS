const VendedorModel = require('../models/VendedorModel');
const RegistroModel = require('../models/RegistroModel');
const UsuarioModel = require('../models/UsuarioModel');
const TokenModel = require('../models/TokenModel');
const cache = require('../config/cache');
const {
  hashClave,
  verificarClave,
  firmarToken,
  SESSION_TTL_MS,
  fechaCaracas,
  fechaHoraCaracas,
  tipoServidor,
  toleranciaFechaValida,
  sanitizarTexto,
  validarGeo,
  validarFotoBase64,
  cookieSesion,
  cookieSesionBorrada,
  COMENTARIO_MIN,
  COMENTARIO_MAX
} = require('../config/security');

function esSolicitudSegura(req) {
  return Boolean(req.secure || String(req.headers['x-forwarded-proto'] || '').startsWith('https'));
}

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
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: vendedores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSupervisores = async (req, res) => {
  try {
    const snap = await db.collection('supervisores').orderBy('codigo').get();
    const supervisores = [];
    snap.forEach(doc => {
      supervisores.push(doc.data());
    });
    res.json({ success: true, data: supervisores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const { fecha, supervisor } = req.query;
    const targetDate = fecha || fechaCaracas();
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
    const hoy = fechaCaracas();
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
    const targetDate = fecha || fechaCaracas();

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

exports.getAllRegistros = async (req, res) => {
  try {
    const { supervisor } = req.query;
    const sesionSup = req.usuarioSesion && req.usuarioSesion.supervisorAsignado;
    const esSupervisorFiltrado = req.usuarioSesion && req.usuarioSesion.rol !== 'ADMIN' && sesionSup && sesionSup !== 'TODOS';

    let codigos = null;
    let cacheKey = 'all_registros';
    const sup = esSupervisorFiltrado ? sesionSup : (supervisor && supervisor !== 'TODOS' ? supervisor : null);
    if (sup) {
      cacheKey = `registros_sup_${sup}`;
      const vendedores = await cache.get(`vendedores_sup_${sup}`, 300000, () => VendedorModel.getBySupervisor(sup));
      codigos = vendedores.map(v => v.codigo);
    }
    const registros = await cache.get(cacheKey, 5000, () => RegistroModel.getAll(codigos));
    res.setHeader('Cache-Control', 'no-store');
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

    const user = await UsuarioModel.findByUsuario(String(usuario).trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario o clave incorrectos' });
    }

    let ok = false;
    if (user.claveHash) {
      ok = verificarClave(clave, user.claveHash);
    } else if (user.clave !== undefined) {
      ok = user.clave === clave;
    }

    if (!ok) {
      return res.status(401).json({ success: false, message: 'Usuario o clave incorrectos' });
    }

    if (!user.claveHash) {
      try {
        await UsuarioModel.actualizarCredenciales(user.usuario, { claveHash: hashClave(clave) });
      } catch (err) {
        console.error('No se pudo migrar credencial de', user.usuario, err.message);
      }
    }

    const token = firmarToken(
      {
        tipo: 'sesion',
        usuario: user.usuario,
        rol: user.rol,
        supervisorAsignado: user.supervisorAsignado || 'TODOS'
      },
      SESSION_TTL_MS
    );
    res.setHeader('Set-Cookie', cookieSesion(token, { secure: esSolicitudSegura(req) }));
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

exports.logout = async (req, res) => {
  res.setHeader('Set-Cookie', cookieSesionBorrada({ secure: esSolicitudSegura(req) }));
  res.json({ success: true, message: 'Sesión cerrada' });
};

exports.me = async (req, res) => {
  const s = req.usuarioSesion;
  res.json({
    success: true,
    usuario: s.usuario,
    rol: s.rol,
    supervisorAsignado: s.supervisorAsignado || 'TODOS'
  });
};

exports.emitirCapturaToken = async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) {
      return res.status(400).json({ success: false, message: 'Código de vendedor requerido' });
    }
    const codigoNorm = String(codigo).trim().toUpperCase();
    const vendedor = await VendedorModel.getByCodigo(codigoNorm);
    if (!vendedor) {
      return res.status(404).json({ success: false, message: 'Vendedor no encontrado' });
    }

    const tipo = tipoServidor();
    const { token, expiraMs } = await TokenModel.emitir({ codigo: codigoNorm, tipo });
    res.json({
      success: true,
      token,
      tipo,
      expiraMs,
      horaServidor: fechaHoraCaracas()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportarExcel = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { anio, mes, supervisor } = req.query;

    const hoy = fechaCaracas();
    const anioUsar = anio || hoy.slice(0, 4);
    const mesUsar = mes != null ? String(parseInt(mes, 10) + 1).padStart(2, '0') : hoy.slice(5, 7);
    const ultimoDia = new Date(parseInt(anioUsar, 10), parseInt(mesUsar, 10), 0).getDate();

    const fechaInicio = `${anioUsar}-${mesUsar}-01`;
    const fechaFin = `${anioUsar}-${mesUsar}-${String(ultimoDia).padStart(2, '0')}`;

    const sup = (supervisor && supervisor !== 'TODOS') ? supervisor : 'TODOS';
    const filas = await RegistroModel.getExportacionMes({ fechaInicio, fechaFin, supervisor: sup });

    const nombreMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(mesUsar, 10) - 1];
    const hoja = XLSX.utils.json_to_sheet(filas.map(f => ({
      'Código': f.codigo,
      'Nombre': f.nombre,
      'Supervisor': f.supervisor,
      'Tipo': f.tipo,
      'Fecha': f.fecha,
      'Comentario': f.comentario,
      'Latitud': f.latitud,
      'Longitud': f.longitud
    })));

    hoja['!cols'] = [
      { wch: 8 }, { wch: 25 }, { wch: 10 }, { wch: 20 },
      { wch: 22 }, { wch: 40 }, { wch: 12 }, { wch: 12 }
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, nombreMes);

    const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
    const nombreArchivo = `asistencia_${anioUsar}_${mesUsar}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crearRegistro = async (req, res) => {
  try {
    const {
      idSolicitud,
      codigo,
      nombre,
      capturaToken,
      comentario,
      latitud,
      longitud,
      accuracy,
      fotoBase64,
      fechaDispositivo
    } = req.body;

    if (!idSolicitud || !/^[A-Za-z0-9_-]{8,64}$/.test(String(idSolicitud))) {
      return res.status(400).json({ success: false, message: 'Identificador de solicitud inválido' });
    }
    if (!codigo || !nombre) {
      return res.status(400).json({ success: false, message: 'Código y nombre de vendedor requeridos' });
    }

    const codigoNorm = String(codigo).trim().toUpperCase();
    const nombreLimpio = sanitizarTexto(nombre, 120);

    const vendedor = await VendedorModel.getByCodigo(codigoNorm);
    if (!vendedor) {
      return res.status(404).json({ success: false, message: 'Vendedor no encontrado. Selecciona un vendedor válido de la lista.' });
    }
    if (vendedor.nombre.toUpperCase() !== nombreLimpio.toUpperCase()) {
      return res.status(400).json({ success: false, message: 'El nombre no corresponde al código del vendedor. Selecciona de la lista.' });
    }

    const tokenValido = await TokenModel.verificarYConsumir(capturaToken, codigoNorm);
    if (!tokenValido.ok) {
      const mensajes = {
        TOKEN_INVALIDO: 'Token de captura inválido.',
        TOKEN_YA_USADO: 'Este token de captura ya fue utilizado.',
        TOKEN_EXPIRADO: 'El token de captura expiró. Vuelve a seleccionar el vendedor e intenta nuevamente.',
        TOKEN_CODIGO_INCORRECTO: 'El token no corresponde al vendedor seleccionado.'
      };
      return res.status(409).json({
        success: false,
        message: mensajes[tokenValido.motivo] || 'No se pudo validar el token de captura.'
      });
    }

    const fechaServer = fechaHoraCaracas();
    if (!toleranciaFechaValida(fechaDispositivo, fechaServer)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha/hora del dispositivo no coincide con la del servidor. Ajusta el reloj e intenta nuevamente.'
      });
    }

    const comentarioLimpio = sanitizarTexto(comentario, COMENTARIO_MAX);
    if (comentarioLimpio.length < COMENTARIO_MIN) {
      return res.status(400).json({ success: false, message: 'La observación es obligatoria (mínimo 3 caracteres).' });
    }

    const geo = validarGeo(latitud, longitud, accuracy);
    if (!geo.ok) {
      const mensajes = {
        COORDENADAS_INVALIDAS: 'Coordenadas GPS inválidas.',
        COORDENADAS_CERO: 'La ubicación GPS no fue capturada.',
        COORDENADAS_FUERA_RANGO: 'Las coordenadas están fuera de rango válido.',
        COORDENADAS_FUERA_ZONA: 'La ubicación GPS está fuera de la zona de operación (Maracay a Puerto La Cruz).',
        PRECISION_GPS_INSUFICIENTE: 'La precisión del GPS es insuficiente. Acércate a un lugar abierto e intenta nuevamente.'
      };
      return res.status(400).json({ success: false, message: mensajes[geo.motivo] || 'Ubicación GPS no válida.' });
    }

    const foto = validarFotoBase64(fotoBase64);
    if (!foto.ok) {
      const mensajes = {
        SIN_FOTO: 'Debes capturar una fotografía con la cámara para registrar la asistencia.',
        FOTO_DEMASIADO_GRANDE: 'La fotografía excede el tamaño máximo permitido.',
        BASE64_INVALIDO: 'La fotografía enviada está corrupta.',
        FOTO_INVALIDA: 'La fotografía no es válida.',
        FORMATO_NO_JPEG: 'La fotografía debe ser una imagen JPEG capturada con la cámara.'
      };
      return res.status(400).json({ success: false, message: mensajes[foto.motivo] || 'Fotografía no válida.' });
    }

    const yaUsada = await RegistroModel.existeFotoHashHoy(codigoNorm, foto.hash, fechaCaracas());
    if (yaUsada) {
      return res.status(409).json({
        success: false,
        message: 'Esta fotografía ya fue utilizada hoy para este vendedor. Debes tomar una foto nueva en este momento.'
      });
    }

    const tipo = tipoServidor();
    const result = await RegistroModel.crearConValidacionSecuencia({
      idSolicitud,
      codigo: codigoNorm,
      nombre: nombreLimpio,
      supervisor: vendedor.supervisor || '',
      tipo,
      comentario: comentarioLimpio,
      latitud,
      longitud,
      accuracy,
      foto: `data:image/jpeg;base64,${fotoBase64}`,
      fotoHash: foto.hash,
      fechaDispositivo: sanitizarTexto(fechaDispositivo, 40),
      fecha: fechaServer
    });

    if (result.error) {
      return res.status(409).json({ success: false, message: result.error });
    }

    cache.clear();

    res.json({ success: true, id: result.id, duplicado: Boolean(result.duplicado) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
