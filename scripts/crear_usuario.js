const { db } = require('../src/config/firebase');
const { hashClave } = require('../src/config/security');

async function main() {
  const args = process.argv.slice(2);
  const [usuario, rol, clave] = args;

  if (!usuario || !clave) {
    console.error('Uso: node scripts/crear_usuario.js "<usuario>" <rol> <clave>');
    console.error('Ejemplo: node scripts/crear_usuario.js "ALI GALINDEZ" ADMIN 0704');
    process.exit(1);
  }

  const doc = {
    usuario,
    rol: rol || 'ADMIN',
    claveHash: hashClave(clave),
  };

  await db.collection('usuarios').doc(usuario).set(doc);
  console.log(`✓ Usuario creado/actualizado: "${usuario}" (rol: ${doc.rol})`);
  process.exit(0);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
