const { db, initDB } = require('./database');

async function seed() {
  await initDB();

  const existing = await db.execute('SELECT COUNT(*) as count FROM vendedores');
  if (existing.rows[0].count > 0) {
    console.log('La base de datos ya tiene datos. Omitiendo seed.');
    return;
  }

  console.log('Insertando datos de prueba...');

  const vendedores = [
    ['001','JUAN PEREZ','MARIA LOPEZ'],
    ['002','PEDRO GARCIA','MARIA LOPEZ'],
    ['003','ANA MARTINEZ','MARIA LOPEZ'],
    ['004','LUIS RAMIREZ','CARLOS MENDOZA'],
    ['005','SOFIA TORRES','CARLOS MENDOZA'],
    ['006','DIEGO CASTRO','CARLOS MENDOZA'],
    ['007','LAURA JIMENEZ','ANA PATIÑO'],
    ['008','CARLOS MEJIA','ANA PATIÑO'],
    ['009','VALENTINA ROJAS','ANA PATIÑO'],
    ['010','ANDRES GOMEZ','MARIA LOPEZ'],
    ['011','CAMILA HERRERA','CARLOS MENDOZA'],
    ['012','FELIPE ORTIZ','ANA PATIÑO'],
  ];
  for (const v of vendedores) {
    await db.execute({ sql: 'INSERT OR IGNORE INTO vendedores (codigo, nombre, supervisor) VALUES (?, ?, ?)', args: v });
  }

  const usuarios = [
    ['ADMIN', 'admin123', 'ADMIN', 'TODOS'],
    ['MARIA LOPEZ', 'maria123', 'SUPERVISOR', 'MARIA LOPEZ'],
    ['CARLOS MENDOZA', 'carlos123', 'SUPERVISOR', 'CARLOS MENDOZA'],
    ['ANA PATIÑO', 'ana123', 'SUPERVISOR', 'ANA PATIÑO'],
  ];
  for (const u of usuarios) {
    await db.execute({ sql: 'INSERT OR IGNORE INTO usuarios (usuario, clave, rol, supervisorAsignado) VALUES (?, ?, ?, ?)', args: u });
  }

  const hoy = new Date().toISOString().split('T')[0];
  const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const registros = [
    ['001','JUAN PEREZ','ENTRADA (Mañana)','Llegué puntual','4.711','-74.072',null,`${hoy} 07:15:00`],
    ['002','PEDRO GARCIA','ENTRADA (Mañana)',null,'4.712','-74.073',null,`${hoy} 07:30:00`],
    ['001','JUAN PEREZ','SALIDA (Tarde)','Terminando ruta','4.715','-74.070',null,`${hoy} 17:00:00`],
    ['001','JUAN PEREZ','ENTRADA (Mañana)',null,'4.710','-74.071',null,`${ayer} 07:00:00`],
    ['002','PEDRO GARCIA','ENTRADA (Mañana)','Retraso de 10 min','4.713','-74.074',null,`${ayer} 07:45:00`],
    ['003','ANA MARTINEZ','ENTRADA (Mañana)',null,'4.714','-74.075',null,`${ayer} 08:00:00`],
    ['001','JUAN PEREZ','SALIDA (Tarde)',null,'4.716','-74.076',null,`${ayer} 16:30:00`],
    ['003','ANA MARTINEZ','SALIDA (Tarde)','Reporte entregado','4.717','-74.077',null,`${ayer} 17:30:00`],
  ];
  for (const r of registros) {
    await db.execute({
      sql: 'INSERT INTO registros (codigo, nombre, tipo, comentario, latitud, longitud, foto, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: r,
    });
  }

  console.log('Seed completado exitosamente.');
}

seed().catch(err => { console.error('Error en seed:', err); process.exit(1); });
