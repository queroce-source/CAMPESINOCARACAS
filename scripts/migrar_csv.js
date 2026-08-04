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

function parseDate(venezuelanDate) {
  const parts = venezuelanDate.split(' ');
  if (parts.length < 2) return null;
  const dateParts = parts[0].split('/');
  if (dateParts.length !== 3) return null;
  const timeParts = parts[1].split(':');
  const hora = timeParts[0].padStart(2, '0');
  const minuto = timeParts[1] ? timeParts[1].padStart(2, '0') : '00';
  const segundo = timeParts[2] ? timeParts[2].padStart(2, '0') : '00';
  return `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')} ${hora}:${minuto}:${segundo}`;
}

function parseCoord(val) {
  if (!val) return null;
  const normalized = String(val).replace(',', '.').trim();
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

async function main() {
  const csvPath = path.join(__dirname, '..', 'registro_de_campo.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(raw);

  const header = rows[0];
  console.log(`Cabecera (${header.length} cols):`, header);
  console.log(`Filas de datos: ${rows.length - 1}`);

  let inserted = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const fecha = parseDate(r[0]);
    if (!fecha) { skipped++; continue; }

    const codigo = (r[2] || '').trim();
    const nombre = (r[3] || '').trim();

    let supervisor = '';
    try {
      const vDoc = await db.collection('vendedores').doc(codigo).get();
      if (vDoc.exists) {
        supervisor = vDoc.data().supervisor || '';
      }
    } catch (e) {
      supervisor = '';
    }

    const record = {
      codigo,
      nombre,
      tipo: (r[1] || '').trim(),
      comentario: (r[8] || '').trim(),
      latitud: parseCoord(r[4]),
      longitud: parseCoord(r[5]),
      foto: (r[7] || '').trim() || null,
      supervisor,
      fecha,
    };

    if (!record.codigo || !record.nombre || !record.tipo) {
      skipped++;
      continue;
    }

    await db.collection('registros').add(record);
    inserted++;
    if (inserted % 20 === 0) console.log(`  → ${inserted} registros insertados...`);
  }

  console.log(`\n✓ Migración completada: ${inserted} insertados, ${skipped} omitidos.`);
  process.exit(0);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
