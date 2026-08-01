const { test } = require('node:test');
const assert = require('node:assert');
const {
  hashClave,
  verificarClave,
  firmarToken,
  verificarToken,
  sanitizarTexto,
  validarFotoBase64,
  validarGeo,
  toleranciaFechaValida,
  fechaHoraCaracas,
  tipoServidor,
  SESSION_TTL_MS
} = require('../src/config/security');

test('scrypt: hash y verificación', () => {
  const h = hashClave('BB12345*');
  assert.ok(h.includes(':'));
  assert.ok(verificarClave('BB12345*', h));
  assert.ok(!verificarClave('incorrecta', h));
  assert.ok(!verificarClave('BB12345*', 'formato-invalido'));
  assert.ok(!verificarClave('BB12345*', null));
});

test('scrypt: hashes distintos para la misma clave (salt aleatorio)', () => {
  const h1 = hashClave('misma-clave');
  const h2 = hashClave('misma-clave');
  assert.notStrictEqual(h1, h2);
  assert.ok(verificarClave('misma-clave', h1));
  assert.ok(verificarClave('misma-clave', h2));
});

test('HMAC: token firmado se verifica', () => {
  const token = firmarToken({ tipo: 'sesion', usuario: 'JULIO BRICEÑO', rol: 'SUPERVISOR' }, SESSION_TTL_MS);
  const payload = verificarToken(token);
  assert.ok(payload);
  assert.strictEqual(payload.usuario, 'JULIO BRICEÑO');
  assert.strictEqual(payload.rol, 'SUPERVISOR');
});

test('HMAC: token alterado es rechazado', () => {
  const token = firmarToken({ tipo: 'sesion', usuario: 'A' }, SESSION_TTL_MS);
  const [body, sig] = token.split('.');
  const alterado = body.slice(0, body.length - 1) + (body.endsWith('A') ? 'B' : 'A') + '.' + sig;
  assert.strictEqual(verificarToken(alterado), null);
});

test('HMAC: token con firma inválida es rechazado', () => {
  const token = firmarToken({ tipo: 'sesion', usuario: 'A' }, SESSION_TTL_MS);
  assert.strictEqual(verificarToken(token + 'X'), null);
});

test('HMAC: token expirado es rechazado', () => {
  const token = firmarToken({ tipo: 'sesion' }, -1000);
  assert.strictEqual(verificarToken(token), null);
});

test('HMAC: entradas malformadas son rechazadas', () => {
  assert.strictEqual(verificarToken(null), null);
  assert.strictEqual(verificarToken(''), null);
  assert.strictEqual(verificarToken('sin-punto'), null);
  assert.strictEqual(verificarToken('a'.repeat(2000) + '.sig'), null);
});

test('sanitizarTexto: elimina bloques script y etiquetas HTML', () => {
  assert.strictEqual(sanitizarTexto('<script>alert(1)</script>Hola'), 'Hola');
  assert.strictEqual(sanitizarTexto('<script>alert(1)<img src=x onerror=alert(2)></script>'), '');
  assert.strictEqual(sanitizarTexto('<img src=x onerror=alert(1)>texto'), 'texto');
  assert.strictEqual(sanitizarTexto('<style>@import url(evil)</style>ok'), 'ok');
});

test('sanitizarTexto: elimina caracteres de control', () => {
  assert.strictEqual(sanitizarTexto('a\u0000b\u0007c'), 'abc');
});

test('sanitizarTexto: colapsa espacios y recorta', () => {
  assert.strictEqual(sanitizarTexto('  hola     mundo  '), 'hola mundo');
  assert.strictEqual(sanitizarTexto('x'.repeat(600)).length, 500);
});

test('sanitizarTexto: vacío y nulo', () => {
  assert.strictEqual(sanitizarTexto(''), '');
  assert.strictEqual(sanitizarTexto(null), '');
  assert.strictEqual(sanitizarTexto(undefined), '');
});

test('validarGeo: coordenadas válidas en Caracas', () => {
  assert.deepStrictEqual(validarGeo(10.4806, -66.9036, 50), { ok: true });
  assert.deepStrictEqual(validarGeo(10.25, -67.15, 500), { ok: true });
});

test('validarGeo: rechaza 0,0 y no numéricos', () => {
  assert.strictEqual(validarGeo(0, 0, 50).ok, false);
  assert.strictEqual(validarGeo(NaN, -67, 50).ok, false);
  assert.strictEqual(validarGeo(null, -67, 50).ok, false);
  assert.strictEqual(validarGeo('10.4', -67, 50).ok, false);
});

test('validarGeo: rechaza rangos inválidos', () => {
  assert.strictEqual(validarGeo(95, -67, 50).ok, false);
  assert.strictEqual(validarGeo(10.4, -190, 50).ok, false);
});

test('validarGeo: rechaza fuera de la zona de Caracas', () => {
  assert.strictEqual(validarGeo(8.6226, -70.2078, 50).ok, false);
  assert.strictEqual(validarGeo(5.0, -60.0, 50).ok, false);
});

test('validarGeo: rechaza precisión insuficiente o ausente', () => {
  assert.strictEqual(validarGeo(10.48, -66.90, 600).ok, false);
  assert.strictEqual(validarGeo(10.48, -66.90, undefined).ok, false);
  assert.strictEqual(validarGeo(10.48, -66.90, 0).ok, false);
});

test('validarFotoBase64: acepta JPEG real', () => {
  const jpeg = Buffer.concat([
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
    Buffer.alloc(100, 0x01)
  ]);
  const res = validarFotoBase64(jpeg.toString('base64'));
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.hash.length, 64);
});

test('validarFotoBase64: rechaza no-JPEG, vacío y gigante', () => {
  assert.strictEqual(validarFotoBase64(null).ok, false);
  assert.strictEqual(validarFotoBase64('').ok, false);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47]), Buffer.alloc(50)]);
  assert.strictEqual(validarFotoBase64(png.toString('base64')).ok, false);
  const grande = Buffer.alloc(1.2 * 1024 * 1024);
  assert.strictEqual(validarFotoBase64(grande.toString('base64')).ok, false);
});

test('fechaHoraCaracas: formato correcto', () => {
  const f = fechaHoraCaracas();
  assert.match(f, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('toleranciaFechaValida: acepta desfase menor a 5 min y rechaza mayor', () => {
  const server = fechaHoraCaracas();
  const ms = Date.parse(server.replace(' ', 'T'));
  const formatearLocal = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  assert.strictEqual(toleranciaFechaValida(server, server), true);
  assert.strictEqual(toleranciaFechaValida(formatearLocal(new Date(ms + 60 * 1000)), server), true);
  assert.strictEqual(toleranciaFechaValida(formatearLocal(new Date(ms - 60 * 1000)), server), true);
  assert.strictEqual(toleranciaFechaValida(formatearLocal(new Date(ms + 10 * 60 * 1000)), server), false);
  assert.strictEqual(toleranciaFechaValida(formatearLocal(new Date(ms - 10 * 60 * 1000)), server), false);
  assert.strictEqual(toleranciaFechaValida(null, server), false);
  assert.strictEqual(toleranciaFechaValida('fecha-invalida', server), false);
});

test('tipoServidor: retorna formato esperado', () => {
  const t = tipoServidor();
  assert.ok(t === 'ENTRADA (Mañana)' || t === 'SALIDA (Tarde)');
});
