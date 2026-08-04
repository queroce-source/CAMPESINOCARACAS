const fs = require('fs');
const path = require('path');
const { db } = require('../src/config/firebase');

function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field.trim());
        field = '';
      } else if (ch === '\n') {
        current.push(field.trim());
        if (current.length > 1) rows.push(current);
        current = [];
        field = '';
      } else if (ch === '\r') {
      } else {
        field += ch;
      }
    }
  }
  if (field || current.length) {
    current.push(field.trim());
    if (current.length > 1) rows.push(current);
  }
  return rows;
}

function leerCSV(nombreArchivo) {
  const ruta = path.join(__dirname, '..', 'data', nombreArchivo);
  if (!fs.existsSync(ruta)) {
    console.error(`✗ No se encontró ${ruta}. Debes crear el archivo en data/.`);
    process.exit(1);
  }
  const rows = parseCSV(fs.readFileSync(ruta, 'utf8'));
  if (rows.length < 2) {
    console.error(`✗ El archivo ${nombreArchivo} no tiene filas de datos (falta header + datos).`);
    process.exit(1);
  }
  const header = rows[0].map(h => h.toLowerCase().trim());
  const datos = rows.slice(1).map(r => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
    return obj;
  });
  console.log(`  ${nombreArchivo}: ${datos.length} filas de datos. Cabecera: [${header.join(', ')}]`);
  return datos;
}

async function clearCollection(name) {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  ${name}: ${snap.size} documentos eliminados`);
}

async function main() {
  const modoBorrar = process.argv.includes('--borrar');

  console.log('Leyendo archivos de data/...');
  const supervisores = leerCSV('supervisores.csv');
  const vendedores = leerCSV('vendedores.csv');

  const errores = [];
  const setCodigosSupervisores = new Set(supervisores.map(s => s.codigo).filter(Boolean));
  const setCodigosVendedores = new Set();

  supervisores.forEach(s => {
    if (!s.codigo) errores.push('Supervisor sin código');
    if (!s.nombre) errores.push(`Supervisor ${s.codigo}: falta nombre`);
  });

  vendedores.forEach(v => {
    if (!v.codigo) { errores.push('Vendedor sin código'); return; }
    if (setCodigosVendedores.has(v.codigo)) { errores.push(`Vendedor duplicado: ${v.codigo}`); }
    setCodigosVendedores.add(v.codigo);
    if (!v.nombre) errores.push(`Vendedor ${v.codigo}: falta nombre`);
    const sup = v.supervisor || '';
    if (sup !== '-' && sup !== '' && !setCodigosSupervisores.has(sup)) {
      errores.push(`Vendedor ${v.codigo}: el supervisor "${sup}" no existe en supervisores.csv`);
    }
  });

  if (errores.length > 0) {
    console.error(`\n✗ Se encontraron ${errores.length} errores de validación:`);
    errores.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  if (modoBorrar) {
    console.log('\nModo --borrar: eliminando colecciones vendedores y supervisores...');
    await clearCollection('vendedores');
    await clearCollection('supervisores');
  }

  console.log('\nGuardando supervisores...');
  let supInsertados = 0;
  for (const s of supervisores) {
    await db.collection('supervisores').doc(s.codigo).set({
      codigo: s.codigo,
      nombre: s.nombre,
      gerente: s.gerente || s.codigo,
    });
    supInsertados++;
  }

  console.log('Guardando vendedores...');
  let vendInsertados = 0;
  for (const v of vendedores) {
    await db.collection('vendedores').doc(v.codigo).set({
      codigo: v.codigo,
      nombre: v.nombre,
      supervisor: v.supervisor || '-',
    });
    vendInsertados++;
  }

  console.log(`\n✓ Importación completada:`);
  console.log(`   Supervisores: ${supInsertados}`);
  console.log(`   Vendedores: ${vendInsertados}`);
  process.exit(0);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });