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
    { codigo: 'CS2', nombre: 'SHEYLA RIVAS', gerente: 'CGV' },
    { codigo: 'CS3', nombre: 'YUSMERY SALAZAR', gerente: 'CGV' },
    { codigo: 'CS4', nombre: 'AMALOA PINEDA', gerente: 'CGV' },
    { codigo: 'CS5', nombre: 'VACANTE', gerente: 'CGV' },
    { codigo: 'CS6', nombre: 'VACANTE', gerente: 'CGV' },
    { codigo: 'CS7', nombre: 'VACANTE', gerente: 'CGV' },
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
    ['CS2','SHEYLA RIVAS','CGV'],
    ['CS3','YUSMERY SALAZAR','CGV'],
    ['CS4','AMALOA PINEDA','CGV'],
    ['CS5','VACANTE','CGV'],
    ['CS6','VACANTE','CGV'],
    ['CS7','VACANTE','CGV'],
    ['COA','ALVARO BRICEÑO','CGV'],
    ['CA0','JORGE CONTRERAS','CS0'],
    ['CA1','ANTONIO RODRIGUEZ','CS0'],
    ['CA2','RONNIEL LEMUS','CGV'],
    ['CA5','FRAYNER FERNANDEZ','CGV'],
    ['CA6','VACANTE','CGV'],
    ['CA7','CAROLINE ROMERO','CGV'],
    ['CAA','ROBERTO CARRILLO','CS2'],
    ['CAB','CLEVER RUDA','CS2'],
    ['CAC','KARELIS VASQUEZ','CGV'],
    ['CAD','JOHANDERLLYN PASTRANO','CGV'],
    ['CAF','DANIEL RODRIGUEZ','CS3'],
    ['CAG','VALERIA ALVARADO','CS3'],
    ['CAH','ADAN GUILLEN','CS3'],
    ['CAI','HENRY GONZALEZ','CS3'],
    ['CAK','MANUEL GARCIA','CS4'],
    ['CAL','BEIBI CHACON','CS4'],
    ['CAM','HELENTH ANDRADE','CS4'],
    ['CAP','JOSE RAMIREZ','CS0'],
    ['CAQ','TAASHA CACERES','CGV'],
    ['CAR','BERNARDO SOAREZ','CGV'],
    ['CAU','LOREN BASTIDAS','CGV'],
    ['CF0','YORAXI DE GONZALEZ','CS0'],
    ['CF1','MIGUELANGEL MENDOZA','CS0'],
    ['CFP','YERALDINE FARIAS','CS0'],
    ['CN0','NINIVE RIVAS','CGV'],
    ['CN1','HECTOR RUIZ','CGV'],
    ['CNB','VACANTE','CS2'],
    ['CNK','VACANTE','CS4'],
    ['CNP','KRISBEL CANACHE','CGV'],
    ['CNQ','VACANTE','CGV'],
    ['CNU','MIRLAY MORENO','CGV'],
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