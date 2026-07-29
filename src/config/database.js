const { createClient } = require('@libsql/client');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DB_URL || `file:${path.join(__dirname, '..', '..', 'asistencia.db')}`,
  authToken: process.env.TURSO_DB_TOKEN,
});

async function initDB() {
  await db.execute(`CREATE TABLE IF NOT EXISTS vendedores (
    codigo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    supervisor TEXT DEFAULT NULL
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    clave TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'VENDEDOR',
    supervisorAsignado TEXT DEFAULT NULL
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    comentario TEXT DEFAULT NULL,
    latitud REAL DEFAULT NULL,
    longitud REAL DEFAULT NULL,
    foto TEXT DEFAULT NULL,
    fecha TEXT NOT NULL,
    FOREIGN KEY (codigo) REFERENCES vendedores(codigo)
  )`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_registros_codigo_fecha ON registros(codigo, fecha)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_registros_tipo_fecha ON registros(tipo, fecha)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_vendedores_codigo ON vendedores(codigo)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario)`);
  console.log('Base de datos inicializada');
}

module.exports = { db, initDB };
