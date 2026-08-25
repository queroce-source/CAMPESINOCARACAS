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
  await clearCollection('usuarios');

  console.log('Insertando supervisores...');
  const supervisores = [
    { codigo: 'CGV', nombre: 'YOHANA MARQUEZ', gerente: 'CGV' },
    { codigo: 'CS0', nombre: 'ISMAR BENCOMO', gerente: 'CGV' },
    { codigo: 'CS1', nombre: 'ALI GALINDEZ', gerente: 'CGV' },
    { codigo: 'CS2', nombre: 'SHEYLA RIVAS', gerente: 'CGV' },
    { codigo: 'CS3', nombre: 'YUSMERY SALAZAR', gerente: 'CGV' },
    { codigo: 'CS4', nombre: 'AMALOA PINEDA', gerente: 'CGV' },
    { codigo: 'CS5', nombre: 'NORIS YANEZ', gerente: 'CGV' },
    { codigo: 'CS6', nombre: 'MARLYN MARCANO', gerente: 'CGV' },
    { codigo: 'CS7', nombre: 'YONATHAN GIL', gerente: 'CGV' },
  ];
  for (const s of supervisores) {
    await db.collection('supervisores').doc(s.codigo).set(s);
  }
  console.log(`  ${supervisores.length} supervisores insertados`);

  console.log('Insertando vendedores...');
  const vendedores = [
    ['CGV', 'YOHANA MARQUEZ', '-'],
    ['CS0', 'ISMAR BENCOMO', 'CGV'],
    ['CS1', 'ALI GALINDEZ', 'CGV'],
    ['CS2', 'SHEYLA RIVAS', 'CGV'],
    ['CS3', 'YUSMERY SALAZAR', 'CGV'],
    ['CS4', 'AMALOA PINEDA', 'CGV'],
    ['CS5', 'NORIS YANEZ', 'CGV'],
    ['CS6', 'MARLYN MARCANO', 'CGV'],
    ['CS7', 'YONATHAN GIL', 'CGV'],
    ['CA0', 'JORGE CONTRERAS', 'CS0'],
    ['CA1', 'ANTONIO RODRIGUEZ', 'CS0'],
    ['CF0', 'YORAXI DE GONZALEZ', 'CS0'],
    ['CF1', 'MIGUELANGEL MENDOZA', 'CS0'],
    ['CAP', 'JOSE RAMIREZ', 'CS0'],
    ['CFP', 'YERALDINE FARIAS', 'CS0'],
    ['CA2', 'RONNIEL LEMUS', 'CS7'],
    ['CA5', 'FRAYNER FERNANDEZ', 'CS7'],
    ['CA6', 'CRISTIAN FLORES', 'CS7'],
    ['CA7', 'CAROLINE ROMERO', 'CS7'],
    ['CN0', 'VACANTE', 'CS1'],
    ['CN1', 'ANTONY FERNANDEZ', 'CS1'],
    ['CNP', 'KRISBEL CANACHE', 'CS1'],
    ['CAQ', 'TAASHA CACERES', 'CS5'],
    ['CAR', 'BERNARDO SOAREZ', 'CS5'],
    ['CNQ', 'VACANTE', 'CS5'],
    ['CAH', 'ADAN GUILLEN', 'CS3'],
    ['CAF', 'DANIEL RODRIGUEZ', 'CS3'],
    ['CAG', 'VALERIA ALVARADO', 'CS3'],
    ['CAI', 'HENRY GONZALEZ', 'CS3'],
    ['CAA', 'ROBERTO CARRILLO', 'CS2'],
    ['CAB', 'CLEVER RUDA', 'CS2'],
    ['CNB', 'IVAN GUTIERREZ', 'CS2'],
    ['CAC', 'KARELIS VASQUEZ', 'CS6'],
    ['CAD', 'JOHANDERLLYN PASTRANO', 'CS6'],
    ['CAU', 'LOREN BASTIDAS', 'CS6'],
    ['CNU', 'MIRLAY MORENO', 'CS6'],
    ['COA', 'ALVARO BRICEÑO', 'CS6'],
    ['CAK', 'MANUEL GARCIA', 'CS4'],
    ['CAL', 'BEIBI CHACON', 'CS4'],
    ['CAM', 'HELENTH ANDRADE', 'CS4'],
    ['CNK', 'VACANTE', 'CS4'],
  ];
  for (const v of vendedores) {
    await db.collection('vendedores').doc(v[0]).set({
      codigo: v[0], nombre: v[1], supervisor: v[2],
    });
  }
  console.log(`  ${vendedores.length} vendedores insertados`);

  console.log('Insertando usuarios...');
  const usuarios = [
    { usuario: 'YOHANA MARQUEZ', rol: 'ADMIN', clave: 'ADMIN2026*' },
    { usuario: 'ISMAR BENCOMO', rol: 'SUPERVISOR', clave: 'CS0-2026*' },
    { usuario: 'ALI GALINDEZ', rol: 'SUPERVISOR', clave: 'CS1-2026*' },
    { usuario: 'SHEYLA RIVAS', rol: 'SUPERVISOR', clave: 'CS2-2026*' },
    { usuario: 'YUSMERY SALAZAR', rol: 'SUPERVISOR', clave: 'CS3-2026*' },
    { usuario: 'AMALOA PINEDA', rol: 'SUPERVISOR', clave: 'CS4-2026*' },
    { usuario: 'NORIS YANEZ', rol: 'SUPERVISOR', clave: 'CS5-2026*' },
    { usuario: 'MARLYN MARCANO', rol: 'SUPERVISOR', clave: 'CS6-2026*' },
    { usuario: 'YONATHAN GIL', rol: 'SUPERVISOR', clave: 'CS7-2026*' },
  ];
  for (const u of usuarios) {
    await db.collection('usuarios').doc(u.usuario).set({
      usuario: u.usuario,
      rol: u.rol,
      claveHash: hashClave(u.clave),
    });
  }
  console.log(`  ${usuarios.length} usuarios insertados`);

  console.log('Seed completado exitosamente.');
}

seedDatabase().catch(err => { console.error('Error en seed:', err); process.exit(1); });