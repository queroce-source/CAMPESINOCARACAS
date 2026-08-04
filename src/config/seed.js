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
  await clearCollection('vendedores');
  await clearCollection('supervisores');

  console.log('Insertando supervisores...');
  const supervisores = [
    { codigo: 'CGV', nombre: 'YOHANA MARQUEZ', gerente: 'CGV' },
    { codigo: 'CS0', nombre: 'ISMAR BENCOMO', gerente: 'CGV' },
    { codigo: 'CS1', nombre: 'VACANTE', gerente: 'CGV' },
    { codigo: 'CS5', nombre: 'VACANTE', gerente: 'CGV' },
    { codigo: 'CS8', nombre: 'VACANTE', gerente: 'CGV' },
    { codigo: 'CS3', nombre: 'YUSMERY SALAZAR', gerente: 'CGV' },
    { codigo: 'CS7', nombre: 'YEISSY DELGADO', gerente: 'CGV' },
    { codigo: 'CS2', nombre: 'SHEYLA RIVAS', gerente: 'CGV' },
    { codigo: 'CS6', nombre: 'VACANTE', gerente: 'CGV' },
    { codigo: 'CS4', nombre: 'AMALOA PINEDA', gerente: 'CGV' },
    { codigo: 'CS9', nombre: 'VACANTE', gerente: 'CGV' },
  ];
  for (const s of supervisores) {
    await db.collection('supervisores').doc(s.codigo).set(s);
  }
  console.log(`  ${supervisores.length} supervisores insertados`);

  console.log('Insertando vendedores...');
  const vendedores = [
    ['CGV','YOHANA MARQUEZ','-'],
    ['CS0','ISMAR BENCOMO','CGV'],
    ['CS1','VACANTE','CGV'],
    ['CS5','VACANTE','CGV'],
    ['CS8','VACANTE','CGV'],
    ['CS3','YUSMERY SALAZAR','CGV'],
    ['CS7','YEISSY DELGADO','CGV'],
    ['CS2','SHEYLA RIVAS','CGV'],
    ['CS6','VACANTE','CGV'],
    ['CS4','AMALOA PINEDA','CGV'],
    ['CS9','VACANTE','CGV'],
    ['CA0','JORGE CONTRERAS','CS0'],
    ['CA1','ANTONIO RODRIGUEZ','CS0'],
    ['CF0','YORAXI DE GONZALEZ','CS0'],
    ['CF1','MIGUELANGEL MENDOZA','CS0'],
    ['CA2','RONNIEL LEMUS','CS0'],
    ['CA5','VACANTE','CS0'],
    ['CA6','FRAYNER FERNANDEZ','CS0'],
    ['CA7','CAROLINE ROMERO','CS0'],
    ['CN0','NINIVE RIVAS','CS0'],
    ['CN1','HECTOR RUIZ','CS0'],
    ['CN2','VACANTE','CS0'],
    ['CN5','VACANTE','CS0'],
    ['CN6','VACANTE','CS0'],
    ['CN7','VACANTE','CS0'],
    ['CAP','JOSE RAMIREZ','CGV'],
    ['CFP','YERALDINE FARIAS','CGV'],
    ['CAQ','TAASHAA CACERES','CGV'],
    ['CAR','BERNARDO SOAREZ','CGV'],
    ['CNP','KRISBEL CANACHE','CGV'],
    ['CNQ','VACANTE','CGV'],
    ['CNR','MILAINY DIAZ','CGV'],
    ['CAH','ADAN GUILLEN','CS3'],
    ['CAF','DANIEL RODRIGUEZ','CS3'],
    ['CAG','VACANTE','CS3'],
    ['CAI','HENRY GONZALEZ','CS3'],
    ['CNH','VACANTE','CS7'],
    ['CNF','VACANTE','CS7'],
    ['CNG','VALERIA ALVARADO','CS7'],
    ['CNI','VACANTE','CS7'],
    ['CAA','ROBERTO CARRILLO','CS2'],
    ['CAB','CLEVER RUDA','CS2'],
    ['CAC','VIRGELIS ROMERO','CS2'],
    ['CAD','JOHANDERLLYN PASTRANO','CS2'],
    ['CAU','LOREN BASTIDAS','CS2'],
    ['COA','ALVARO BRICEÑO','CS2'],
    ['CNA','VACANTE','CS2'],
    ['CNB','LEIXER GUERRA','CS2'],
    ['CNC','KARELIS VASQUEZ','CS2'],
    ['CND','VACANTE','CS2'],
    ['CNU','MIRLAY MORENO','CS2'],
    ['CAK','VACANTE','CS4'],
    ['CAL','VACANTE','CS4'],
    ['CAM','VACANTE','CS4'],
    ['CNK','RENNEJ FUENTES','CS4'],
    ['CNL','BEIBI CHACON','CS4'],
    ['CNM','HELENTH ANDRADE','CS4'],
  ];
  for (const v of vendedores) {
    await db.collection('vendedores').doc(v[0]).set({
      codigo: v[0], nombre: v[1], supervisor: v[2],
    });
  }
  console.log(`  ${vendedores.length} vendedores insertados`);

  console.log('Seed completado exitosamente.');
}

seedDatabase().catch(err => { console.error('Error en seed:', err); process.exit(1); });