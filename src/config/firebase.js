const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (!admin.apps || !admin.apps.length) {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!envJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no configurado en las variables de entorno.');
  }
  try {
    admin.initializeApp({ credential: admin.cert(JSON.parse(envJson)) });
  } catch (err) {
    throw new Error('Error al inicializar Firebase: ' + err.message);
  }
}

const db = getFirestore();

module.exports = { db };