const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!admin.apps || !admin.apps.length) {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envJson) {
    admin.initializeApp({ credential: admin.cert(JSON.parse(envJson)) });
  } else {
    console.error('FIREBASE_SERVICE_ACCOUNT no configurado.');
    process.exit(1);
  }
}

const db = getFirestore();

module.exports = { db, FieldValue };