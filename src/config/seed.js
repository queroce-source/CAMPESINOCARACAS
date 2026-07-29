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
    ['BA0','ARNOLDO SALVATIERRA','BS4 OSCAR PUENTES'],
    ['BA1','KERWIN PEÑA','BS9 JOUSEF GUTIERREZ'],
    ['BA2','JORGE GONZÁLEZ','BS4 OSCAR PUENTES'],
    ['BA3','JOSE GIL','BS9 JOUSEF GUTIERREZ'],
    ['BA4','JOSE PEÑA','BS9 JOUSEF GUTIERREZ'],
    ['BAA','HENRY GARCES','BS5 JULIO BRICEÑO'],
    ['BAB','CARLOS RAUL MENDOZA','BS0 ROBERT PAREDES'],
    ['BAC','DANIELA BECERRA','BS5 JULIO BRICEÑO'],
    ['BAD','BRAYAN MENDEZ','BS5 JULIO BRICEÑO'],
    ['BAE','RUBEN SALAS','BS0 ROBERT PAREDES'],
    ['BAF','RONALD BAZAN','BS0 ROBERT PAREDES'],
    ['BAH','EDI ROSALES','BS8 INGRID FERNANDES'],
    ['BAI','HILDERLING APITZ','BS8 INGRID FERNANDES'],
    ['BAJ','DARIANNY PÉREZ','BS8 INGRID FERNANDES'],
    ['BAK','CARMEN MOLINA','BS8 INGRID FERNANDES'],
    ['BAM','YESENIA ROJAS','BS8 INGRID FERNANDES'],
    ['BAO','LEONARDO ZORRILLA','BS1 LUIS EDUARDO MANRIQUE'],
    ['BAQ','KEYNER GUZMAN','BS1 LUIS EDUARDO MANRIQUE'],
    ['BM0','LUIS PADRON','BS5 JULIO BRICEÑO'],
    ['BM1','VERÓNICA PEÑA','BS0 ROBERT PAREDES'],
    ['BM2','MARIA LORETO','BS1 LUIS EDUARDO MANRIQUE'],
    ['BN0','RICHARD DELGADO','BS3 FRANK RICARDO ESCORCHA'],
    ['BN1','PEDRO CABRERA','BS3 FRANK RICARDO ESCORCHA'],
    ['BN2','ANDRES CABALLERO','BS3 FRANK RICARDO ESCORCHA'],
    ['BN3','YADIRIS TORO','BS3 FRANK RICARDO ESCORCHA'],
    ['BN4','GEBER GARRANCHAN','BS3 FRANK RICARDO ESCORCHA'],
    ['BNA','ANNYS PÉREZ','BS6 MAKIEL CARBALLO'],
    ['BNB','ALEXANDER RANGEL','BS6 MAKIEL CARBALLO'],
    ['BNC','CARLOS CRAVO','BS6 MAKIEL CARBALLO'],
    ['BND','LUIS VALERO','BS6 MAKIEL CARBALLO'],
    ['BNE','VACANTE','BS6 MAKIEL CARBALLO'],
    ['BNF','DONNYS GALLARDO','BS6 MAKIEL CARBALLO'],
    ['BNH','JAIME PERAZA','BS8 INGRID FERNANDES'],
    ['BNI','WILMAR MUJICA','BS8 INGRID FERNANDES'],
    ['BNJ','ELVIA BERMUDEZ','BS8 INGRID FERNANDES'],
    ['BNK','MARIA GUERRERO','BS8 INGRID FERNANDES'],
    ['BNM','AILIN VARGAS','BS8 INGRID FERNANDES'],
    ['BNO','CARLOS FERNANDEZ','BS1 LUIS EDUARDO MANRIQUE'],
    ['BNQ','YETSI ESCALONA','BS1 LUIS EDUARDO MANRIQUE'],
    ['BP0','RENIER HERNANDEZ','BS4 OSCAR PUENTES'],
    ['BP1','OSCAR TORRES','BS9 JOUSEF GUTIERREZ'],
    ['BP2','JOHAN CONTRERAS','BS4 OSCAR PUENTES'],
    ['BP3','FRANCISCO BRICEÑO','BS9 JOUSEF GUTIERREZ'],
    ['BP4','HECTOR MENDOZA','BS9 JOUSEF GUTIERREZ'],
    ['BPA','JOSÉ SALINAS','BS5 JULIO BRICEÑO'],
    ['BPB','JULIAN NIEVES','BS0 ROBERT PAREDES'],
    ['BPC','MARTIN OCANTO','BS5 JULIO BRICEÑO'],
    ['BPD','EDGAR ZURBARAN','BS5 JULIO BRICEÑO'],
    ['BPE','ALVARO BUSTO','BS0 ROBERT PAREDES'],
    ['BPF','ANDERZON JIMENEZ','BS0 ROBERT PAREDES'],
    ['BPH','ANGIE MOLINA','BS8 INGRID FERNANDES'],
    ['BPI','NELSON CORTEZ','BS8 INGRID FERNANDES'],
    ['BPJ','ANGEL PARRA','BS8 INGRID FERNANDES'],
    ['BPK','MARIA JIMENEZ','BS8 INGRID FERNANDES'],
    ['BPM','VACANTE','BS8 INGRID FERNANDES'],
    ['BPO','ARMANYELITH LOZANO','BS1 LUIS EDUARDO MANRIQUE'],
    ['BPQ','CARLOS FRIAS','BS1 LUIS EDUARDO MANRIQUE'],
    ['BS0','ROBERT PAREDES','BGV CARLOS OMAR QUERO'],
    ['BS1','LUIS MANRIQUE','BGV CARLOS OMAR QUERO'],
    ['BS2','VACANTE','BGV CARLOS OMAR QUERO'],
    ['BS3','JULIO BRICEÑO','BGV CARLOS OMAR QUERO'],
    ['BS4','OSCAR PUENTES','BGV CARLOS OMAR QUERO'],
    ['BS5','FRANK ESCORCHA','BGV CARLOS OMAR QUERO'],
    ['BS6','MAKIEL CARBALLO','BGV CARLOS OMAR QUERO'],
    ['BS7','VACANTE','BGV CARLOS OMAR QUERO'],
    ['BS8','INGRI FERNANDEZ','BGV CARLOS OMAR QUERO'],
    ['BS9','JOUSSEF GUTIERREZ','BGV CARLOS OMAR QUERO'],
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
    ['BA0','ARNOLDO SALVATIERRA','ENTRADA (Mañana)','Llegué puntual','8.652','-70.215',null,`${hoy} 07:15:00`],
    ['BA1','KERWIN PEÑA','ENTRADA (Mañana)',null,'8.651','-70.214',null,`${hoy} 07:30:00`],
    ['BA0','ARNOLDO SALVATIERRA','SALIDA (Tarde)','Terminando ruta','8.653','-70.216',null,`${hoy} 17:00:00`],
    ['BA2','JORGE GONZÁLEZ','ENTRADA (Mañana)',null,'8.650','-70.213',null,`${ayer} 07:05:00`],
    ['BA3','JOSE GIL','ENTRADA (Mañana)','Retraso de 10 min','8.654','-70.217',null,`${ayer} 07:45:00`],
    ['BS0','ROBERT PAREDES','ENTRADA (Mañana)',null,'8.655','-70.218',null,`${ayer} 08:00:00`],
    ['BA1','KERWIN PEÑA','SALIDA (Tarde)',null,'8.656','-70.219',null,`${ayer} 16:30:00`],
    ['BS8','INGRI FERNANDEZ','SALIDA (Tarde)','Reporte entregado','8.657','-70.220',null,`${ayer} 17:30:00`],
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