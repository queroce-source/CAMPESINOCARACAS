require('./firebase');
const { db } = require('./firebase');
const { hashClave } = require('./security');

async function clearCollection(name) {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  ${name}: ${snap.size} documentos eliminados`);
}

async function seedDatabase() {
  console.log('Limpiando datos existentes...');
  await clearCollection('registros');
  await clearCollection('usuarios');
  await clearCollection('vendedores');

  console.log('Insertando vendedores...');
  const vendedores = [
    ['CGV','YOHANA MARQUEZ','-'],
    ['CS0','ISMAR BENCOMO','CGV YOHANA MARQUEZ'],
    ['CS1','VACANTE','CGV YOHANA MARQUEZ'],
    ['CS5','LUIS GUARAMATO','CGV YOHANA MARQUEZ'],
    ['CS8','ALIET RODRIGUEZ','CGV YOHANA MARQUEZ'],
    ['CS3','YUSMERY SALAZAR','CGV YOHANA MARQUEZ'],
    ['CS7','YEISSY DELGADO','CGV YOHANA MARQUEZ'],
    ['CS2','SHEYLA RIVAS','CGV YOHANA MARQUEZ'],
    ['CS6','VACANTE','CGV YOHANA MARQUEZ'],
    ['CS4','AMALOA PINEDA','CGV YOHANA MARQUEZ'],
    ['CS9','VACANTE','CGV YOHANA MARQUEZ'],
    ['CA0','JORGE CONTRERAS','CS0 ISMAR BENCOMO'],
    ['CA1','ANTONIO RODRIGUEZ','CS0 ISMAR BENCOMO'],
    ['CFO','YORAXI DE GONZALEZ','CS0 ISMAR BENCOMO'],
    ['CF1','MIGUELANGEL MENDOZA','CS0 ISMAR BENCOMO'],
    ['CA2','RONNIEL LEMUS','CS0 ISMAR BENCOMO'],
    ['CA5','IRVIS PERALTA','CS0 ISMAR BENCOMO'],
    ['CA6','VACANTE','CS0 ISMAR BENCOMO'],
    ['CA7','CAROLINE ROMERO','CS0 ISMAR BENCOMO'],
    ['CN0','NINIVE RIVAS','CS1 VACANTE'],
    ['CN1','HECTOR RUIZ','CS1 VACANTE'],
    ['CN2','VACANTE','CS1 VACANTE'],
    ['CN5','VACANTE','CS1 VACANTE'],
    ['CN6','VACANTE','CS1 VACANTE'],
    ['CN7','VACANTE','CS1 VACANTE'],
    ['CAP','JOSE RAMIREZ','CS5 LUIS GUARAMATO'],
    ['CFP','YERALDINE FARIAS','CS5 LUIS GUARAMATO'],
    ['CAQ','VACANTE','CS5 LUIS GUARAMATO'],
    ['CAR','BERNARDO SOAREZ','CS5 LUIS GUARAMATO'],
    ['CNP','KRISBEL CANACHE','CS8 ALIET RODRIGUEZ'],
    ['CNQ','TAASHAA CACERES','CS8 ALIET RODRIGUEZ'],
    ['CNR','MILAINY DIAZ','CS8 ALIET RODRIGUEZ'],
    ['CAH','ADAN GUILLEN','CS3 YUSMERY SALAZAR'],
    ['CAF','DANIEL RODRIGUEZ','CS3 YUSMERY SALAZAR'],
    ['CAG','LEIXER GUERRA','CS3 YUSMERY SALAZAR'],
    ['CAI','HENRY GONZALEZ','CS3 YUSMERY SALAZAR'],
    ['CNH','FRAYNER FERNANDEZ','CS7 YEISSY DELGADO'],
    ['CNF','VACANTE','CS7 YEISSY DELGADO'],
    ['CNG','VALERIA ALVARADO','CS7 YEISSY DELGADO'],
    ['CNI','VACANTE','CS7 YEISSY DELGADO'],
    ['CAA','ROBERTO CARRILLO','CS2 SHEYLA RIVAS'],
    ['CAB','CLEVER RUDA','CS2 SHEYLA RIVAS'],
    ['CAC','VIRGELIS ROMERO','CS2 SHEYLA RIVAS'],
    ['CAD','JOHANDERLLYN PASTRANO','CS2 SHEYLA RIVAS'],
    ['CAU','LOREN BASTIDAS','CS2 SHEYLA RIVAS'],
    ['COA','ALVARO BRICEÑO','CS6 VACANTE'],
    ['CNA','VACANTE','CS6 VACANTE'],
    ['CNB','VACANTE','CS6 VACANTE'],
    ['CNC','KARELIS VASQUEZ','CS6 VACANTE'],
    ['CND','VACANTE','CS6 VACANTE'],
    ['CNU','MIRLAY MORENO','CS6 VACANTE'],
    ['CAK','MANUEL GARCIA','CS4 AMALOA PINEDA'],
    ['CAL','LUIS VILLEGAS','CS4 AMALOA PINEDA'],
    ['CAM','ARIANNY CRESPO','CS4 AMALOA PINEDA'],
    ['CNK','RENNEJ FUENTES','CS9 VACANTE'],
    ['CNL','BEIBI CHACON','CS9 VACANTE'],
    ['CNM','HELENTH ANDRADE','CS9 VACANTE'],
  ];
  for (const v of vendedores) {
    await db.collection('vendedores').doc(v[0]).set({
      codigo: v[0], nombre: v[1], supervisor: v[2],
    });
  }
  console.log(`  ${vendedores.length} vendedores insertados`);

  console.log('Insertando usuarios...');
  const usuarios = [
    { usuario: 'YOHANA MARQUEZ', clave: 'ADMIN2026*', rol: 'ADMIN', supervisorAsignado: 'TODOS' },
    { usuario: 'ISMAR BENCOMO', clave: 'CEC2026*', rol: 'SUPERVISOR', supervisorAsignado: 'CS0 ISMAR BENCOMO' },
    { usuario: 'ALIET RODRIGUEZ', clave: 'CEC2026*', rol: 'SUPERVISOR', supervisorAsignado: 'CS8 ALIET RODRIGUEZ' },
    { usuario: 'YUSMERY SALAZAR', clave: 'CEC2026*', rol: 'SUPERVISOR', supervisorAsignado: 'CS3 YUSMERY SALAZAR' },
    { usuario: 'YEISSY DELGADO', clave: 'CEC2026*', rol: 'SUPERVISOR', supervisorAsignado: 'CS7 YEISSY DELGADO' },
    { usuario: 'SHEYLA RIVAS', clave: 'CEC2026*', rol: 'SUPERVISOR', supervisorAsignado: 'CS2 SHEYLA RIVAS' },
    { usuario: 'AMALOA PINEDA', clave: 'CEC2026*', rol: 'SUPERVISOR', supervisorAsignado: 'CS4 AMALOA PINEDA' },
  ];
  for (const u of usuarios) {
    await db.collection('usuarios').doc(u.usuario).set({
      usuario: u.usuario,
      claveHash: hashClave(u.clave),
      rol: u.rol,
      supervisorAsignado: u.supervisorAsignado
    });
  }
  console.log(`  ${usuarios.length} usuarios insertados`);

  console.log('Seed completado exitosamente.');
}

seedDatabase().catch(err => { console.error('Error en seed:', err); process.exit(1); });
