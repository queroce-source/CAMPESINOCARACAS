const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const COLLECTION = 'usuarios';

class UsuarioModel {
  static async findByUsuario(usuario) {
    const doc = await db.collection(COLLECTION).doc(usuario).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  static async actualizarCredenciales(usuario, { claveHash }) {
    await db.collection(COLLECTION).doc(usuario).update({
      claveHash,
      clave: FieldValue.delete()
    });
  }
}

module.exports = UsuarioModel;
