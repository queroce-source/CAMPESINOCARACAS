const { db } = require('../config/firebase');

const COLLECTION = 'usuarios';

class UsuarioModel {
  static async findByUsuario(usuario) {
    const doc = await db.collection(COLLECTION).doc(usuario).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
}

module.exports = UsuarioModel;