/* ==========================================================
   Browser persistence for the Admin demo.
   There is no backend in this repository: admin data lives in
   localStorage and uploaded SCORM package files in IndexedDB.
   Replace these calls with the content API when one exists.
   ========================================================== */
(function () {
  const KEY = 'lu.admin.state.v2';
  const DB_NAME = 'lu-admin', STORE = 'packages';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
  }

  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const tx = async (mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(STORE, mode), req = fn(t.objectStore(STORE));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  };

  window.Store = {
    KEY, load, save,
    putPackage: (id, blob) => tx('readwrite', (s) => s.put(blob, id)),
    getPackage: (id) => tx('readonly', (s) => s.get(id)),
    deletePackage: (id) => tx('readwrite', (s) => s.delete(id)),
  };
})();
