const crypto = require('crypto');

const ZONA_OFFSET_HORAS = -4;
const HORA_ENTRADA_LIMITE = 13;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret-no-utilizar-en-produccion';
if (!process.env.SESSION_SECRET) {
  console.warn('[SECURITY] SESSION_SECRET no configurado: usando secreto de desarrollo. Define SESSION_SECRET en .env en producción.');
}
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const TIPO_ENTRADA = 'ENTRADA (Mañana)';
const TIPO_SALIDA = 'SALIDA (Tarde)';

const ZONA_BBOX = {
  latMin: 10.00,
  latMax: 10.80,
  lngMin: -67.80,
  lngMax: -64.50
};

const GPS_ACCURACY_MAX = 500;
const FECHA_TOLERANCIA_MS = 5 * 60 * 1000;
const FOTO_MAX_BYTES = 1.1 * 1024 * 1024;
const COMENTARIO_MIN = 3;
const COMENTARIO_MAX = 500;

function hashClave(clave) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(clave), salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

function verificarClave(clave, almacenada) {
  if (!almacenada || !String(almacenada).includes(':')) return false;
  const [salt, hashHex] = String(almacenada).split(':');
  try {
    const hash = crypto.scryptSync(String(clave), salt, 64);
    const esperado = Buffer.from(hashHex, 'hex');
    return esperado.length === hash.length && crypto.timingSafeEqual(esperado, hash);
  } catch (err) {
    return false;
  }
}

function firmarToken(payload, ttlMs) {
  const exp = Date.now() + ttlMs;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verificarToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.') || token.length > 1024) return null;
  const [bodyB64, sig] = token.split('.');
  const esperado = crypto.createHmac('sha256', SESSION_SECRET).update(bodyB64).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

function fechaHoraCaracas() {
  const msLocal = Date.now() + (ZONA_OFFSET_HORAS * 60 * 60 * 1000);
  const d = new Date(msLocal);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${dia} ${h}:${min}:${s}`;
}

function fechaCaracas() {
  return fechaHoraCaracas().split(' ')[0];
}

function tipoServidor() {
  const hora = Number(fechaHoraCaracas().split(' ')[1].split(':')[0]);
  return hora < HORA_ENTRADA_LIMITE ? TIPO_ENTRADA : TIPO_SALIDA;
}

function toleranciaFechaValida(fechaDispositivo, fechaServer) {
  if (!fechaDispositivo) return false;
  const tsCliente = Date.parse(fechaDispositivo.replace(' ', 'T'));
  if (isNaN(tsCliente)) return false;
  const tsServer = Date.parse(fechaServer.replace(' ', 'T'));
  return Math.abs(tsServer - tsCliente) <= FECHA_TOLERANCIA_MS;
}

function sanitizarTexto(texto, maxLen = COMENTARIO_MAX) {
  return String(texto || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function validarGeo(lat, lng, accuracy) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) {
    return { ok: false, motivo: 'COORDENADAS_INVALIDAS' };
  }
  if (lat === 0 && lng === 0) return { ok: false, motivo: 'COORDENADAS_CERO' };
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { ok: false, motivo: 'COORDENADAS_FUERA_RANGO' };
  if (lat < ZONA_BBOX.latMin || lat > ZONA_BBOX.latMax ||
      lng < ZONA_BBOX.lngMin || lng > ZONA_BBOX.lngMax) {
    return { ok: false, motivo: 'COORDENADAS_FUERA_ZONA' };
  }
  if (typeof accuracy !== 'number' || !isFinite(accuracy) || accuracy <= 0 || accuracy > GPS_ACCURACY_MAX) {
    return { ok: false, motivo: 'PRECISION_GPS_INSUFICIENTE' };
  }
  return { ok: true };
}

function validarFotoBase64(b64) {
  if (!b64 || typeof b64 !== 'string') return { ok: false, motivo: 'SIN_FOTO' };
  if (b64.length > FOTO_MAX_BYTES * 1.4) return { ok: false, motivo: 'FOTO_DEMASIADO_GRANDE' };
  let buffer;
  try {
    buffer = Buffer.from(b64, 'base64');
  } catch (err) {
    return { ok: false, motivo: 'BASE64_INVALIDO' };
  }
  if (buffer.length < 3) return { ok: false, motivo: 'FOTO_INVALIDA' };
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
    return { ok: false, motivo: 'FORMATO_NO_JPEG' };
  }
  if (buffer.length > FOTO_MAX_BYTES) return { ok: false, motivo: 'FOTO_DEMASIADO_GRANDE' };
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  return { ok: true, buffer, hash };
}

function headersSeguridad(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self)');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "frame-src https://maps.google.com https://drive.google.com https://www.google.com; " +
    "connect-src 'self'; " +
    "font-src 'self' data:; " +
    "base-uri 'self'; form-action 'self'"
  );
  next();
}

function cookieSesion(token, { secure }) {
  const atributos = [
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ];
  if (secure) atributos.push('Secure');
  return `admin_session=${token}; ${atributos.join('; ')}`;
}

function cookieSesionBorrada({ secure }) {
  const atributos = ['Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) atributos.push('Secure');
  return `admin_session=; ${atributos.join('; ')}`;
}

module.exports = {
  ZONA_OFFSET_HORAS,
  SESSION_TTL_MS,
  TIPO_ENTRADA,
  TIPO_SALIDA,
  COMENTARIO_MIN,
  COMENTARIO_MAX,
  hashClave,
  verificarClave,
  firmarToken,
  verificarToken,
  fechaHoraCaracas,
  fechaCaracas,
  tipoServidor,
  toleranciaFechaValida,
  sanitizarTexto,
  validarGeo,
  validarFotoBase64,
  headersSeguridad,
  cookieSesion,
  cookieSesionBorrada
};
