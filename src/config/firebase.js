const admin = require('firebase-admin');

if (!admin.apps || !admin.apps.length) {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envJson) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(envJson)) });
  } else {
    console.error('FIREBASE_SERVICE_ACCOUNT no configurado. Debes configurar esta variable con el JSON de la service account de Firebase.');
    process.exit(1);
  }
}

const db = admin.firestore();

module.exports = { db };