import test from 'node:test';
import assert from 'node:assert/strict';

// In-memory browser storage boundary: no access to real personal data.
const disk = new Map();
const ls = new Map();
let failKey = null;
let failLocal = false;
globalThis.localStorage = {
  getItem: k => ls.get(k) ?? null,
  setItem(k, v) { if (failLocal) throw new Error('quota'); ls.set(k, v); },
  removeItem: k => ls.delete(k),
};
globalThis.indexedDB = { open() {
  const req = { result: { transaction() {
    const tx = { objectStore() { return {
      get(k) { const r = { result: disk.get(k) }; queueMicrotask(() => tx.oncomplete()); return r; },
      put(v, k) { const copy = structuredClone(v); queueMicrotask(() => {
        if (k === failKey) { tx.error = new Error('write failed'); tx.onerror(); }
        else { disk.set(k, copy); tx.oncomplete(); }
      }); },
      delete(k) { queueMicrotask(() => { disk.delete(k); tx.oncomplete(); }); },
    }; } };
    return tx;
  } } };
  queueMicrotask(() => req.onsuccess()); return req;
} };
const S = await import('../src/store.js');

test('fallback retains the newest state after IndexedDB write failure', async () => {
  S.saveState({ workouts: [], marker: 1 }); assert.equal(await S.flush(), true);
  failKey = 'state';
  S.saveState({ workouts: [], marker: 2 }); assert.equal(await S.flush(), true);
  assert.equal((await S.loadState()).marker, 2);
  failKey = null;
  S.saveState({ workouts: [], marker: 3 }); assert.equal(await S.flush(), true);
  assert.equal((await S.loadState()).marker, 3);
  assert.equal(ls.has('forma-state'), false);
});

test('restore stops if rollback snapshot cannot be saved', async () => {
  const old = { workouts: [], marker: 3 }, next = { workouts: [], marker: 4 };
  failKey = 'before-restore';
  assert.equal(await S.replaceStateWithSnapshot(old, next), false);
  assert.equal((await S.loadState()).marker, 3);
  failKey = null;
  assert.equal(await S.replaceStateWithSnapshot(old, next), true);
  assert.equal((await S.loadState()).marker, 4);
  assert.equal((await S.loadSnapshot()).state.marker, 3);
  failKey = 'state'; failLocal = true;
  assert.equal(await S.replaceStateWithSnapshot(next, old), false);
  assert.equal((await S.loadState()).marker, 4);
  failKey = null; failLocal = false;
});
