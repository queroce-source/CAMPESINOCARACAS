const db = require('./database');

function seed() {
  db.serialize(() => {
    db.get("SELECT COUNT(*) as count FROM vendedores", (err, row) => {
      if (err) throw err;
      if (row.count > 0) {
        console.log('La base de datos ya tiene datos. Omitiendo seed.');
        return;
      }

      console.log('Insertando datos de prueba...');

      const insertVendedor = db.prepare(
        'INSERT OR IGNORE INTO vendedores (codigo, nombre, supervisor) VALUES (?, ?, ?)'
      );
      const vendedores = [
        ['001', 'JUAN PEREZ', 'MARIA LOPEZ'],
        ['002', 'PEDRO GARCIA', 'MARIA LOPEZ'],
        ['003', 'ANA MARTINEZ', 'MARIA LOPEZ'],
        ['004', 'LUIS RAMIREZ', 'CARLOS MENDOZA'],
        ['005', 'SOFIA TORRES', 'CARLOS MENDOZA'],
        ['006', 'DIEGO CASTRO', 'CARLOS MENDOZA'],
        ['007', 'LAURA JIMENEZ', 'ANA PATIÑO'],
        ['008', 'CARLOS MEJIA', 'ANA PATIÑO'],
        ['009', 'VALENTINA ROJAS', 'ANA PATIÑO'],
        ['010', 'ANDRES GOMEZ', 'MARIA LOPEZ'],
        ['011', 'CAMILA HERRERA', 'CARLOS MENDOZA'],
        ['012', 'FELIPE ORTIZ', 'ANA PATIÑO'],
      ];
      vendedores.forEach(v => insertVendedor.run(v[0], v[1], v[2]));
      insertVendedor.finalize();

      const insertUsuario = db.prepare(
        'INSERT OR IGNORE INTO usuarios (usuario, clave, rol, supervisorAsignado) VALUES (?, ?, ?, ?)'
      );
      insertUsuario.run('ADMIN', 'admin123', 'ADMIN', 'TODOS');
      insertUsuario.run('MARIA LOPEZ', 'maria123', 'SUPERVISOR', 'MARIA LOPEZ');
      insertUsuario.run('CARLOS MENDOZA', 'carlos123', 'SUPERVISOR', 'CARLOS MENDOZA');
      insertUsuario.run('ANA PATIÑO', 'ana123', 'SUPERVISOR', 'ANA PATIÑO');
      insertUsuario.finalize();

      const hoy = new Date().toISOString().split('T')[0];
      const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const insertRegistro = db.prepare(
        'INSERT INTO registros (codigo, nombre, tipo, comentario, latitud, longitud, foto, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );

      const registrosHoy = [
        ['001', 'JUAN PEREZ', 'ENTRADA (Mañana)', 'Llegué puntual', 4.711, -74.072, null, `${hoy} 07:15:00`],
        ['002', 'PEDRO GARCIA', 'ENTRADA (Mañana)', null, 4.712, -74.073, null, `${hoy} 07:30:00`],
        ['001', 'JUAN PEREZ', 'SALIDA (Tarde)', 'Terminando ruta', 4.715, -74.070, null, `${hoy} 17:00:00`],
      ];

      const registrosAyer = [
        ['001', 'JUAN PEREZ', 'ENTRADA (Mañana)', null, 4.710, -74.071, null, `${ayer} 07:00:00`],
        ['002', 'PEDRO GARCIA', 'ENTRADA (Mañana)', 'Retraso de 10 min', 4.713, -74.074, null, `${ayer} 07:45:00`],
        ['003', 'ANA MARTINEZ', 'ENTRADA (Mañana)', null, 4.714, -74.075, null, `${ayer} 08:00:00`],
        ['001', 'JUAN PEREZ', 'SALIDA (Tarde)', null, 4.716, -74.076, null, `${ayer} 16:30:00`],
        ['003', 'ANA MARTINEZ', 'SALIDA (Tarde)', 'Reporte entregado', 4.717, -74.077, null, `${ayer} 17:30:00`],
      ];

      registrosHoy.concat(registrosAyer).forEach(r =>
        insertRegistro.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7])
      );
      insertRegistro.finalize();

      console.log('Seed completado exitosamente.');
    });
  });
}

seed();
