const { db } = require('../config/firebase');

const COLLECTION = 'vendedores';

class VendedorModel {
  static async getAll() {
    const snap = await db.collection(COLLECTION).get();
    const vendedores = [];
    snap.forEach(doc => vendedores.push({ id: doc.id, ...doc.data() }));
    return vendedores;
  }

  static async getBySupervisor(supervisor) {
    const snap = await db.collection(COLLECTION).where('supervisor', '==', supervisor).get();
    const vendedores = [];
    snap.forEach(doc => vendedores.push(doc.data()));
    return vendedores;
  }

  static async search(q) {
    const snap = await db.collection(COLLECTION).get();
    const lower = q.toLowerCase();
    const vendedores = [];
    snap.forEach(doc => {
      const v = doc.data();
      if (v.codigo.toLowerCase().includes(lower) || v.nombre.toLowerCase().includes(lower)) {
        vendedores.push({ id: doc.id, ...v });
      }
    });
    return vendedores;
  }
}

module.exports = VendedorModel;