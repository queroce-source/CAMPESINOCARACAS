const crypto = require('crypto');
const app = require('../app');
const { db } = require('../src/config/firebase');
const { fechaCaracas, tipoServidor, TIPO_ENTRADA } = require('../src/config/security');

const JPG_1x1 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

const idAzar = () => 'it_' + crypto.randomBytes(8).toString('hex').slice(0, 12);

(async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  let cookie = '';
  const fallos = [];
  const limpieza = [];

  async function req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    if (cookie) opts.headers.Cookie = cookie;
    const res = await fetch(base + path, opts);
    const sc = res.headers.get('set-cookie');
    if (sc) {
      const m = sc.match(/admin_session=([^;]*)/);
      if (m) cookie = `admin_session=${m[1]}`;
    }
    let data = null;
    try { data = await res.json(); } catch (e) {}
    return { status: res.status, data };
  }

  function check(nombre, cond, extra) {
    if (cond) console.log('  OK ' + nombre);
    else {
      fallos.push(nombre);
      console.log('  FAIL ' + nombre + (extra ? ' :: ' + extra : ''));
    }
  }

  try {
    console.log('1) Endpoints públicos y protección');
    let r = await req('GET', '/api/vendedores');
    check('GET /api/vendedores → 200', r.status === 200 && r.data && r.data.success);
    const vendedores = (r.data && r.data.data) || [];
    check('vendedores no vacío', vendedores.length > 0);

    r = await req('GET', '/api/registros/all');
    check('GET /api/registros/all sin sesión → 401', r.status === 401);

    r = await req('GET', '/api/auth/me');
    check('GET /api/auth/me sin sesión → 401', r.status === 401);

    r = await req('POST', '/api/auth/login', { usuario: 'inexistente', clave: 'x' });
    check('login credenciales incorrectas → 401', r.status === 401 && r.data && !r.data.success);

    r = await req('POST', '/api/auth/login', { usuario: 'YOHANA MARQUEZ', clave: 'ADMIN2026*' });
    const sesionOk = r.status === 200 && r.data && r.data.success;
    check('login credenciales seed → 200', sesionOk, JSON.stringify(r.data));

    if (sesionOk) {
      r = await req('GET', '/api/registros/all');
      check('GET /api/registros/all con sesión → 200', r.status === 200 && r.data && r.data.success);
      r = await req('GET', '/api/auth/me');
      check('GET /api/auth/me con sesión → 200', r.status === 200 && r.data && r.data.success);
      r = await req('POST', '/api/auth/logout', {});
      check('POST /api/auth/logout → 200', r.status === 200);
      r = await req('GET', '/api/auth/me');
      check('GET /api/auth/me tras logout → 401', r.status === 401);
    } else {
      console.log('  (ADVERTENCIA: no se pudo verificar el flujo autenticado con credenciales seed)');
    }

    if (vendedores.length > 0) {
      console.log('2) Flujo de captura de registro');
      const hoy = fechaCaracas();
      const snap = await db.collection('registros')
        .where('fecha', '>=', `${hoy} 00:00:00`)
        .where('fecha', '<=', `${hoy} 23:59:59`)
        .get();
      const marcadosHoy = new Set();
      snap.forEach((doc) => {
        const d = doc.data();
        const marca = String(d.tipo || '').toUpperCase().includes('ENTRADA') ? 'E' : 'S';
        marcadosHoy.add(`${d.codigo}|${marca}`);
      });
      const tipoHoyEsEntrada = tipoServidor() === TIPO_ENTRADA;
      const marcaRequerida = tipoHoyEsEntrada ? 'E' : 'S';
      const candidato = vendedores.find(
        (v) => v.codigo && !marcadosHoy.has(`${v.codigo}|${marcaRequerida}`)
      ) || vendedores[0];
      const codigo = String(candidato.codigo).toUpperCase();
      const nombre = candidato.nombre;

      const geoValida = { latitud: 10.4806, longitud: -66.9036, accuracy: 20 };
      const baseReg = (extra) => ({
        idSolicitud: idAzar(),
        codigo,
        nombre,
        capturaToken: '',
        comentario: 'Prueba de integración',
        fotoBase64: JPG_1x1,
        fechaDispositivo: '',
        ...geoValida,
        ...extra
      });

      r = await req('POST', '/api/registros', baseReg({ capturaToken: 'token-falso' }));
      check('token de captura inválido → 409', r.status === 409 && r.data && !r.data.success);

      const emitirToken = async () => {
        const t = await req('POST', '/api/registros/captura-token', { codigo });
        check('captura-token → 200', t.status === 200 && t.data && t.data.token);
        if (t.data && t.data.token) limpieza.push({ col: 'captura_tokens', id: t.data.token });
        return t.data || {};
      };

      const t1 = await emitirToken();
      r = await req('POST', '/api/registros', baseReg({ capturaToken: t1.token, fechaDispositivo: '2000-01-01 00:00:00' }));
      check('fecha de dispositivo errónea → 400', r.status === 400 && r.data && r.data.message.includes('fecha'));

      const t2 = await emitirToken();
      r = await req('POST', '/api/registros', baseReg({ capturaToken: t2.token, fechaDispositivo: t2.horaServidor, latitud: 0, longitud: 0 }));
      check('coordenadas 0,0 → 400', r.status === 400 && r.data && !r.data.success);

      const t3 = await emitirToken();
      r = await req('POST', '/api/registros', baseReg({ capturaToken: t3.token, fechaDispositivo: t3.horaServidor, latitud: 8.6226, longitud: -70.2078 }));
      check('coordenadas fuera de Caracas → 400', r.status === 400 && r.data && !r.data.success);

      const t4 = await emitirToken();
      r = await req('POST', '/api/registros', baseReg({ capturaToken: t4.token, fechaDispositivo: t4.horaServidor, fotoBase64: Buffer.from('no es jpeg').toString('base64') }));
      check('foto no JPEG → 400', r.status === 400 && r.data && !r.data.success);

      const t5 = await emitirToken();
      const idHappy = idAzar();
      r = await req('POST', '/api/registros', baseReg({ capturaToken: t5.token, fechaDispositivo: t5.horaServidor, idSolicitud: idHappy }));
      check('registro válido → 200', r.status === 200 && r.data && r.data.success, JSON.stringify(r.data));
      if (r.data && r.data.success) {
        limpieza.push({ col: 'registros', id: idHappy });
        const creado = await db.collection('registros').doc(idHappy).get();
        const cdata = creado.data();
        check('horaServer guardado como serverTimestamp de Firestore', Boolean(cdata && cdata.horaServer && typeof cdata.horaServer.toMillis === 'function'));
        check('fecha oficial igual a la hora del servidor (día)', Boolean(cdata && t5.horaServidor && cdata.fecha.startsWith(t5.horaServidor.split(' ')[0])));
        check('fechaDispositivo almacenado para auditoría', Boolean(cdata && cdata.fechaDispositivo));
      }

      r = await req('POST', '/api/registros', baseReg({ capturaToken: t5.token, fechaDispositivo: t5.horaServidor }));
      check('reutilización de token → 409', r.status === 409 && r.data && r.data.message.includes('ya fue utilizado'));

      const t6 = await emitirToken();
      r = await req('POST', '/api/registros', baseReg({ capturaToken: t6.token, fechaDispositivo: t6.horaServidor, idSolicitud: idHappy }));
      check('duplicado por idSolicitud → 200 duplicado=true', r.status === 200 && r.data && r.data.duplicado === true, JSON.stringify(r.data));
    } else {
      console.log('  (ADVERTENCIA: no hay vendedores para probar el flujo de captura)');
    }

    console.log('3) Rate limit');
    let con429 = false;
    for (let i = 0; i < 7; i++) {
      const rl = await req('POST', '/api/auth/login', { usuario: 'rate' + i, clave: 'x' });
      if (rl.status === 429) { con429 = true; break; }
    }
    check('login satura con 429', con429);
  } catch (err) {
    fallos.push('EXCEPCIÓN: ' + err.message);
    console.log('  FAIL excepción ::', err.message);
  } finally {
    for (const item of limpieza) {
      try {
        await db.collection(item.col).doc(item.id).delete();
      } catch (e) {
        console.log('  (limpieza parcial:', item.col, e.message, ')');
      }
    }
    server.close();
  }

  console.log('');
  if (fallos.length === 0) {
    console.log('INTEGRACIÓN OK: todos los flujos verificados');
    process.exit(0);
  } else {
    console.log(`INTEGRACIÓN CON FALLOS (${fallos.length}):`);
    fallos.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
})();
