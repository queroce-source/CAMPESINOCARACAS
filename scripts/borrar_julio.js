require('../src/config/firebase');
const { db } = require('../src/config/firebase');

async function main() {
  const snap = await db.collection('registros').get();
  let deleted = 0;
  const batch = db.batch();

  snap.forEach(doc => {
    const data = doc.data();
    const fecha = data.fecha || '';
    if (fecha.startsWith('2026-07')) {
      batch.delete(doc.ref);
      deleted++;
    }
  });

  if (deleted > 0) {
    await batch.commit();
    console.log(`Eliminados ${deleted} registros de julio 2026.`);
  } else {
    console.log('No se encontraron registros de julio 2026.');
  }

  process.exit(0);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });