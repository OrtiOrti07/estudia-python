// Almacenamiento local (solo en este navegador, nunca se envía a ningún servidor).
// - Materiales: IndexedDB (admite textos largos).
// - Progreso, notas, intentos de código: localStorage (datos pequeños).

const DB_NAME = 'estudia-python';
const DB_VERSION = 1;
const PROGRESS_KEY = 'estudia-python:progreso:v1';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('materials')) db.createObjectStore('materials', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const result = fn(s);
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Operación cancelada'));
  }));
}

export const materialsDB = {
  all: () => tx('materials', 'readonly', (s) => s.getAll()).then((list) =>
    (list || []).sort((a, b) => a.importedAt - b.importedAt)),
  put: (m) => tx('materials', 'readwrite', (s) => s.put(m)),
  remove: (id) => tx('materials', 'readwrite', (s) => s.delete(id)),
};

// ---------- Progreso ----------
const DEFAULT_PROGRESS = () => ({
  topicsDone: {},
  topicStep: {},
  routeOrder: null,
  routeHidden: [],
  exercises: {},
  fragmentTopics: {},
  exerciseTopic: {},
  customTests: {},
  scratch: '# Escribe aquí tu código y pulsa «Ejecutar» (o F5)\nprint("¡Hola, Python!")\n',
  context: { type: 'scratch' },
  lastRoute: '',
});

let progress = null;
let saveTimer = null;

export function getProgress() {
  if (progress) return progress;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    progress = Object.assign(DEFAULT_PROGRESS(), raw ? JSON.parse(raw) : {});
  } catch {
    progress = DEFAULT_PROGRESS();
  }
  return progress;
}

export function saveProgress() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (err) {
      console.warn('No se pudo guardar el progreso', err);
    }
  }, 250);
}

export function exerciseState(id) {
  const p = getProgress();
  if (!p.exercises[id]) p.exercises[id] = { status: 'pendiente', notes: '', attempt: null, hints: 0, solutionShown: false };
  return p.exercises[id];
}

/** Pide al navegador que no borre los datos automáticamente si falta espacio. */
export function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}
