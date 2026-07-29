class SimpleCache {
  constructor() {
    this._store = new Map();
    this._pending = new Map();
  }

  async get(key, ttlMs, fetcher) {
    const now = Date.now();
    const entry = this._store.get(key);
    if (entry && now - entry.ts < ttlMs) {
      return entry.value;
    }

    if (this._pending.has(key)) {
      return this._pending.get(key);
    }

    const promise = fetcher().then(value => {
      this._store.set(key, { ts: now, value });
      this._pending.delete(key);
      return value;
    }).catch(err => {
      this._pending.delete(key);
      throw err;
    });

    this._pending.set(key, promise);
    return promise;
  }

  invalidate(key) {
    this._store.delete(key);
    this._pending.delete(key);
  }

  clear() {
    this._store.clear();
    this._pending.clear();
  }
}

module.exports = new SimpleCache();
