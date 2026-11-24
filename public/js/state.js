// Estado compartido de la aplicación: materiales, índice de análisis y utilidades.

import { materialsDB, getProgress, saveProgress } from './store.js';
import { analyze } from './analysis.js';
import { TOPICS, TOPIC_BY_ID, BUILTIN_EXERCISES } from './content/topics.js';

export const state = {
  materials: [],
  index: analyze([]),
  runner: null,
  workspace: null,
};

export async function loadMaterials() {
  try {
    state.materials = await materialsDB.all();
  } catch (err) {
    console.error(err);
    state.materials = [];
    throw err;
  }
  reindex();
}

export function reindex() {
  const p = getProgress();
  state.index = analyze(state.materials, { fragmentTopics: p.fragmentTopics, exerciseTopic: p.exerciseTopic });
}

export function materialById(id) {
  return state.materials.find((m) => m.id === id);
}

export function fragmentById(fragId) {
  const [mid] = fragId.split(':');
  const m = materialById(mid);
  if (!m) return null;
  const frag = m.fragments.find((f) => f.id === fragId);
  return frag ? { material: m, frag, index: m.fragments.indexOf(frag) } : null;
}

/** Ejercicios «adaptados»: «predice la salida» a partir del código de tus materiales. */
function adaptations() {
  return state.index.snippets
    .filter((s) => s.hasPrint && !s.usesInput && !s.isRepl && s.code.split('\n').length <= 25)
    .map((s) => ({
      id: `ad:${s.id}`,
      origin: 'adaptacion',
      type: 'predict',
      topicId: s.topicId,
      title: `Predice la salida (código de «${s.materialName}»)`,
      materialId: s.materialId,
      materialName: s.materialName,
      location: s.location,
      fragId: s.fragId,
      snippet: s,
    }));
}

/** Todos los ejercicios: primero los de tus materiales, luego adaptaciones y complementos. */
export function allExercises() {
  return [...state.index.exercises, ...adaptations(), ...BUILTIN_EXERCISES];
}

export function exerciseById(id) {
  return allExercises().find((e) => e.id === id);
}

export function exercisesForTopic(topicId) {
  return allExercises().filter((e) => e.topicId === topicId);
}

/** Temas en el orden elegido por el usuario (sin los ocultos, salvo que se pidan). */
export function orderedTopics({ includeHidden = false } = {}) {
  const p = getProgress();
  let ids = TOPICS.map((t) => t.id);
  if (Array.isArray(p.routeOrder)) {
    const known = p.routeOrder.filter((id) => TOPIC_BY_ID[id]);
    ids = [...known, ...ids.filter((id) => !known.includes(id))];
  }
  if (!includeHidden) ids = ids.filter((id) => !p.routeHidden.includes(id));
  return ids.map((id) => TOPIC_BY_ID[id]);
}

export function setFragmentTopics(fragId, topicIds) {
  const p = getProgress();
  p.fragmentTopics[fragId] = topicIds;
  saveProgress();
  reindex();
}

export function resetFragmentTopics(fragId) {
  const p = getProgress();
  delete p.fragmentTopics[fragId];
  saveProgress();
  reindex();
}

export function navigate(hash) {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}

export function exHash(id) {
  return `#/ejercicios/${encodeURIComponent(id)}`;
}

export function fragHash(fragId) {
  const f = fragmentById(fragId);
  return f ? `#/materiales/${f.material.id}/${f.index}` : '#/materiales';
}
