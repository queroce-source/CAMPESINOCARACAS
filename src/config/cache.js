class SimpleCache {
  constructor() {
    this._store = new Map();
  }

  async get(key, ttlMs, fetcher) {
    const now = Date.now();
    const entry = this._store.get(key);
    if (entry && now - entry.ts < ttlMs) {
      return entry.value;
    }
    const value = await fetcher();
    this._store.set(key, { ts: now, value });
    return value;
  }

  invalidate(key) {
    this._store.delete(key);
  }

  clear() {
    this._store.clear();
  }
}

module.exports = new SimpleCache();
