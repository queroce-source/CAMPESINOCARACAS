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
  await clearCollection('usuarios');
  await clearCollection('vendedores');

  console.log('Insertando vendedores...');
  const vendedores = [
	['CGV','YOHANA MARQUEZ','-'],
	['CS0','ISMAR BENCOMO','CGV'],
	['CS1','VACANTE','CGV'],
	['CS5','LUIS GUARAMATO','CGV'],
	['CS8','ALIET RODRIGUEZ','CGV'],
	['CS3','YUSMERY SALAZAR','CGV'],
	['CS7','YEISSY DELGADO','CGV'],
	['CS2','SHEYLA RIVAS','CGV'],
	['CS6','VACANTE','CGV'],
	['CS4','AMALOA PINEDA','CGV'],
	['CS9','VACANTE','CGV'],
	['CA0','JORGE CONTRERAS','CS0'],
	['CA1','ANTONIO RODRIGUEZ','CS0'],
	['CFO','YORAXI DE GONZALEZ','CS0'],
	['CF1','MIGUELANGEL MENDOZA','CS0'],
	['CA2','RONNIEL LEMUS','CS0'],
	['CA5','IRVIS PERALTA','CS0'],
	['CA6','VACANTE','CS0'],
	['CA7','CAROLINE ROMERO','CS0'],
	['CN0','NINIVE RIVAS','CS1'],
	['CN1','HECTOR RUIZ','CS1'],
	['CN2','VACANTE','CS1'],
	['CN5','VACANTE','CS1'],
	['CN6','VACANTE','CS1'],
	['CN7','VACANTE','CS1'],
	['CAP','JOSE RAMIREZ','CS5'],
	['CFP','YERALDINE FARIAS','CS5'],
	['CAQ','VACANTE','CS5'],
	['CAR','BERNARDO SOAREZ','CS5'],
	['CNP','KRISBEL CANACHE','CS8'],
	['CNQ','TAASHAA CACERES','CS8'],
	['CNR','MILAINY DIAZ','CS8'],
	['CAH','ADAN GUILLEN','CS3'],
	['CAF','DANIEL RODRIGUEZ','CS3'],
	['CAG','LEIXER GUERRA','CS3'],
	['CAI','HENRY GONZALEZ','CS3'],
	['CNH','FRAYNER FERNANDEZ','CS7'],
	['CNF','VACANTE','CS7'],
	['CNG','VALERIA ALVARADO','CS7'],
	['CNI','VACANTE','CS7'],
	['CAA','ROBERTO CARRILLO','CS2'],
	['CAB','CLEVER RUDA','CS2'],
	['CAC','VIRGELIS ROMERO','CS2'],
	['CAD','JOHANDERLLYN PASTRANO','CS2'],
	['CAU','LOREN BASTIDAS','CS2'],
	['COA','ALVARO BRICEÑO','CS6'],
	['CNA','VACANTE','CS6'],
	['CNB','VACANTE','CS6'],
	['CNC','KARELIS VASQUEZ','CS6'],
	['CND','VACANTE','CS6'],
	['CNU','MIRLAY MORENO','CS6'],
	['CAK','MANUEL GARCIA','CS4'],
	['CAL','LUIS VILLEGAS','CS4'],
	['CAM','ARIANNY CRESPO','CS4'],
	['CNK','RENNEJ FUENTES','CS9'],
	['CNL','BEIBI CHACON','CS9'],
	['CNM','HELENTH ANDRADE','CS9'],
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
	{ usuario: 'HEIBER CHACON', clave: '30052150', rol: 'ADMIN', supervisorAsignado: 'TODOS' },
	{ usuario: 'CARLOS EMILIO QUERO', clave: 'ADMIN2026*', rol: 'ADMIN', supervisorAsignado: 'TODOS' },
	{ usuario: 'ISMAR BENCOMO', clave: 'CEC2026*', rol: 'SUPERVISOR', codigo: 'CS0', gerente: 'CGV', supervisorAsignado: 'CS0' },
	{ usuario: 'ALIET RODRIGUEZ', clave: 'CEC2026*', rol: 'SUPERVISOR', codigo: 'CS8', gerente: 'CGV', supervisorAsignado: 'CS8' },
	{ usuario: 'YUSMERY SALAZAR', clave: 'CEC2026*', rol: 'SUPERVISOR', codigo: 'CS3', gerente: 'CGV', supervisorAsignado: 'CS3' },
	{ usuario: 'YEISSY DELGADO', clave: 'CEC2026*', rol: 'SUPERVISOR', codigo: 'CS7', gerente: 'CGV', supervisorAsignado: 'CS7' },
	{ usuario: 'SHEYLA RIVAS', clave: 'CEC2026*', rol: 'SUPERVISOR', codigo: 'CS2', gerente: 'CGV', supervisorAsignado: 'CS2' },
	{ usuario: 'AMALOA PINEDA', clave: 'CEC2026*', rol: 'SUPERVISOR', codigo: 'CS4', gerente: 'CGV', supervisorAsignado: 'CS4' },
  ];
  for (const u of usuarios) {
    await db.collection('usuarios').doc(u.usuario).set({
      usuario: u.usuario,
      claveHash: hashClave(u.clave),
      rol: u.rol,
      supervisorAsignado: u.supervisorAsignado,
      codigo: u.codigo || null,
      gerente: u.gerente || null,
    });
  }
  console.log(`  ${usuarios.length} usuarios insertados`);

  console.log('Seed completado exitosamente.');
}

seedDatabase().catch(err => { console.error('Error en seed:', err); process.exit(1); });
