/**
 * Storage Abstraction Layer
 *
 * All platform data flows through this module.
 * Currently backed by localStorage. To switch to a backend later,
 * replace the adapter via Storage.setAdapter(newAdapter).
 *
 * Adapter contract:
 *   async save(key, data) → boolean
 *   async load(key) → object|null
 *   async remove(key) → boolean
 */

const PREFIX = 'amaragame_';

class LocalStorageAdapter {
  async save(key, data) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[Storage] save failed:', e);
      return false;
    }
  }

  async load(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[Storage] load failed:', e);
      return null;
    }
  }

  async remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return true;
    } catch (e) {
      console.error('[Storage] remove failed:', e);
      return false;
    }
  }
}

let adapter = new LocalStorageAdapter();

export const Storage = {
  save: (key, data) => adapter.save(key, data),
  load: (key) => adapter.load(key),
  remove: (key) => adapter.remove(key),

  /** Replace the storage backend (e.g. with a REST API adapter) */
  setAdapter(newAdapter) {
    adapter = newAdapter;
  }
};
