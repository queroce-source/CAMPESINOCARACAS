class RateLimiter {
  constructor() {
    this._buckets = new Map();
    this._intervalo = setInterval(() => this._limpiar(), 10 * 60 * 1000);
    if (this._intervalo.unref) this._intervalo.unref();
  }

  middleware({ nombre, windowMs, max }) {
    return (req, res, next) => {
      const key = `${nombre}:${req.ip || 'desconocido'}`;
      const now = Date.now();
      let bucket = this._buckets.get(key);
      if (!bucket || now - bucket.ts > windowMs) {
        bucket = { ts: now, count: 0 };
      }
      bucket.count++;
      if (bucket.count > max) {
        const retryAfter = Math.max(1, Math.ceil((bucket.ts + windowMs - now) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes. Espera unos segundos e intenta nuevamente.'
        });
      }
      this._buckets.set(key, bucket);
      next();
    };
  }

  _limpiar() {
    const now = Date.now();
    for (const [key, bucket] of this._buckets) {
      if (now - bucket.ts > 15 * 60 * 1000) this._buckets.delete(key);
    }
  }
}

const limiter = new RateLimiter();

module.exports = {
  login: limiter.middleware({ nombre: 'login', windowMs: 15 * 60 * 1000, max: 5 }),
  captura: limiter.middleware({ nombre: 'captura', windowMs: 60 * 60 * 1000, max: 30 }),
  registros: limiter.middleware({ nombre: 'registros', windowMs: 60 * 1000, max: 10 }),
  vendedores: limiter.middleware({ nombre: 'vendedores', windowMs: 60 * 1000, max: 60 }),
  admin: limiter.middleware({ nombre: 'admin', windowMs: 60 * 1000, max: 120 })
};
