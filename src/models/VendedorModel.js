const { db } = require('../config/firebase');

const COLLECTION = 'vendedores';

class VendedorModel {
  static async getAll() {
    const snap = await db.collection(COLLECTION).get();
    const vendedores = [];
    snap.forEach(doc => {
      const v = doc.data();
      if (!/(^| )VACANTE/i.test(v.nombre || '')) vendedores.push(v);
    });
    return vendedores;
  }

  static async getBySupervisor(supervisor) {
    const snap = await db.collection(COLLECTION).where('supervisor', '==', supervisor).get();
    const vendedores = [];
    snap.forEach(doc => {
      const v = doc.data();
      if (!/(^| )VACANTE/i.test(v.nombre || '')) vendedores.push(v);
    });
    return vendedores;
  }

  static async getByCodigo(codigo) {
    const doc = await db.collection(COLLECTION).doc(codigo).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  static async search(q) {
    const snap = await db.collection(COLLECTION).get();
    const lower = q.toLowerCase();
    const vendedores = [];
    snap.forEach(doc => {
      const v = doc.data();
      if (!/(^| )VACANTE/i.test(v.nombre || '') &&
          (String(v.codigo || '').toLowerCase().includes(lower) || String(v.nombre || '').toLowerCase().includes(lower))) {
        vendedores.push({ id: doc.id, ...v });
      }
    });
    return vendedores;
  }
}

module.exports = VendedorModel;