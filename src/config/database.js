const sqlite3 = require('sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'asistencia.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
    process.exit(1);
  }
  console.log('Conectado a SQLite:', DB_PATH);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS vendedores (
      codigo TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      supervisor TEXT DEFAULT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT NOT NULL UNIQUE,
      clave TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'VENDEDOR',
      supervisorAsignado TEXT DEFAULT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS registros (
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
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_registros_codigo_fecha ON registros(codigo, fecha)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_registros_tipo_fecha ON registros(tipo, fecha)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_vendedores_codigo ON vendedores(codigo)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario)`);
});

module.exports = db;
