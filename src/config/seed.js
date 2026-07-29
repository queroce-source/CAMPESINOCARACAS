require('./firebase');
const { db } = require('./firebase');

async function seedDatabase() {
  const vendedoresSnap = await db.collection('vendedores').limit(1).get();
  if (!vendedoresSnap.empty) {
    console.log('Firestore ya tiene datos. Omitiendo seed.');
    return;
  }

  console.log('Insertando datos de prueba en Firestore...');

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
    await db.collection('vendedores').doc(v[0]).set({
      codigo: v[0], nombre: v[1], supervisor: v[2],
    });
  }

  const usuarios = [
    { usuario: 'HEIBER CHACON', clave: '30052150', rol: 'ADMIN', supervisorAsignado: 'TODOS' },
    { usuario: 'JULIO BRICEÑO', clave: 'BB12345*', rol: 'SUPERVISOR', supervisorAsignado: 'BS5 JULIO BRICEÑO' },
    { usuario: 'INGRI FERNANDEZ', clave: 'BB12345*', rol: 'SUPERVISOR', supervisorAsignado: 'BS8 INGRID FERNANDES' },
    { usuario: 'ROBERT PAREDES', clave: 'BB12345*', rol: 'SUPERVISOR', supervisorAsignado: 'BS0 ROBERT PAREDES' },
    { usuario: 'LUIS MANRIQUE', clave: 'BB12345*', rol: 'SUPERVISOR', supervisorAsignado: 'BS1 LUIS EDUARDO MANRIQUE' },
    { usuario: 'MAKIEL CARBALLO', clave: 'BB12345*', rol: 'SUPERVISOR', supervisorAsignado: 'BS6 MAKIEL CARBALLO' },
    { usuario: 'OSCAR PUENTES', clave: 'BB12345*', rol: 'SUPERVISOR', supervisorAsignado: 'BS4 OSCAR PUENTES' },
    { usuario: 'FRANK ESCORCHA', clave: 'BB12345*', rol: 'SUPERVISOR', supervisorAsignado: 'BS3 FRANK RICARDO ESCORCHA' },
    { usuario: 'JOUSSEF GUTIERREZ', clave: 'BB12345*', rol: 'SUPERVISOR', supervisorAsignado: 'BS9 JOUSEF GUTIERREZ' },
    { usuario: 'CARLOS OMAR QUERO', clave: 'GERENTE', rol: 'ADMIN', supervisorAsignado: 'TODOS' },
  ];
  for (const u of usuarios) {
    await db.collection('usuarios').doc(u.usuario).set(u);
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
    await db.collection('registros').add({
      codigo: r[0], nombre: r[1], tipo: r[2],
      comentario: r[3], latitud: r[4] ? Number(r[4]) : null,
      longitud: r[5] ? Number(r[5]) : null, foto: r[6], fecha: r[7],
    });
  }

  console.log('Seed completado exitosamente.');
}

seedDatabase().catch(err => { console.error('Error en seed:', err); process.exit(1); });