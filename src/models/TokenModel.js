const crypto = require('crypto');
const { db } = require('../config/firebase');

const COLLECTION = 'captura_tokens';
const TTL_MS = 5 * 60 * 1000;

class TokenModel {
  static async emitir({ codigo, tipo }) {
    const token = crypto.randomBytes(32).toString('hex');
    await db.collection(COLLECTION).doc(token).set({
      codigo,
      tipo,
      creadoEn: Date.now(),
      expira: Date.now() + TTL_MS,
      usados: false
    });
    return { token, expiraMs: TTL_MS };
  }

  static async verificarYConsumir(token, codigo) {
    if (!token || typeof token !== 'string' || token.length < 16 || token.length > 128) {
      return { ok: false, motivo: 'TOKEN_INVALIDO' };
    }
    const ref = db.collection(COLLECTION).doc(token);
    try {
      return await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return { ok: false, motivo: 'TOKEN_INVALIDO' };
        const d = snap.data();
        if (d.usados) return { ok: false, motivo: 'TOKEN_YA_USADO' };
        if (!d.expira || d.expira < Date.now()) return { ok: false, motivo: 'TOKEN_EXPIRADO' };
        if (d.codigo !== codigo) return { ok: false, motivo: 'TOKEN_CODIGO_INCORRECTO' };
        tx.update(ref, { usados: true, consumidoEn: Date.now() });
        return { ok: true };
      });
    } catch (err) {
      return { ok: false, motivo: 'ERROR_TRANSACCION' };
    }
  }

  static async limpiarExpirados() {
    const snap = await db.collection(COLLECTION).where('expira', '<', Date.now()).limit(200).get();
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    if (snap.size > 0) await batch.commit();
    return snap.size;
  }
}

module.exports = TokenModel;
