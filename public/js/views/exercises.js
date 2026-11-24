// Vistas «Ejercicios»: lista con filtros y detalle de cada ejercicio
// (pistas progresivas, solución oculta, pruebas, comparación, notas y estado).

import { h, put, clear, rich, toast, confirmDialog, formDialog, debounce } from '../ui.js';
import { getProgress, saveProgress, exerciseState } from '../store.js';
import { state, allExercises, exerciseById, orderedTopics, reindex, fragHash, navigate } from '../state.js';
import { TOPICS, TOPIC_BY_ID } from '../content/topics.js';
import { explainError } from '../python/errors.js';
import { exerciseRow, codeBlock } from './topics.js';
import { highlightPython } from '../editor.js';

const LEVELS = ['', 'Muy fácil', 'Fácil', 'Más abierto'];

// ---------------- Lista ----------------
const filters = { topic: '', origin: '', status: '' };

export function renderExercises(main) {
  const all = allExercises();
  const done = all.filter((e) => exerciseState(e.id).status === 'completado').length;
  const listWrap = h('div');

  const sel = (key, label, options) => {
    const id = `flt-${key}`;
    const s = h('select', { id, onchange: (e) => { filters[key] = e.target.value; draw(); } },
      options.map(([v, l]) => h('option', { value: v }, l)));
    s.value = filters[key];
    return h('div', { class: 'field' }, h('label', { for: id }, label), s);
  };

  const draw = () => {
    clear(listWrap);
    const list = all.filter((e) =>
      (!filters.topic || (filters.topic === '_none' ? !e.topicId : e.topicId === filters.topic)) &&
      (!filters.origin || e.origin === filters.origin) &&
      (!filters.status || exerciseState(e.id).status === filters.status));
    if (!list.length) {
      put(listWrap, h('p', { class: 'empty' }, 'No hay ejercicios con estos filtros.'));
      return;
    }
    const groups = [...orderedTopics({ includeHidden: true }).map((t) => [t.id, t.title]), [null, 'Sin tema asignado']];
    for (const [tid, title] of groups) {
      const items = list.filter((e) => (e.topicId || null) === tid);
      if (!items.length) continue;
      const order = { material: 0, adaptacion: 1, complemento: 2 };
      items.sort((a, b) => order[a.origin] - order[b.origin] || (a.level || 0) - (b.level || 0));
      put(listWrap, h('section', null, h('h2', null, title), h('ul', { class: 'ex-list' }, items.map(exerciseRow))));
    }
  };

  const fromMat = all.filter((e) => e.origin === 'material').length;
  put(main, 
    h('h1', { tabindex: '-1' }, 'Ejercicios'),
    h('p', { class: 'lead' }, `Has completado ${done} de ${all.length} ejercicios.`),
    state.materials.length
      ? h('p', { class: 'muted' }, `${fromMat} ejercicio(s) detectado(s) en tus materiales. Aparecen primero en cada tema.`)
      : h('p', { class: 'muted' }, 'Aún no hay ejercicios de tus materiales: importa tus documentos en «Materiales». Mientras, puedes practicar con los ejercicios complementarios.'),
    h('div', { class: 'filters' },
      sel('topic', 'Tema', [['', 'Todos'], ...TOPICS.map((t) => [t.id, t.title]), ['_none', 'Sin tema asignado']]),
      sel('origin', 'Origen', [['', 'Todos'], ['material', 'De tus materiales'], ['adaptacion', 'Adaptaciones'], ['complemento', 'Complemento']]),
      sel('status', 'Estado', [['', 'Todos'], ['pendiente', 'Pendientes'], ['completado', 'Completados']]),
    ),
    listWrap,
  );
  draw();
}

// ---------------- Detalle ----------------
export function renderExercise(main, id) {
  const ex = exerciseById(id);
  if (!ex) {
    put(main, h('h1', { tabindex: '-1' }, 'Ejercicio no encontrado'),
      h('p', null, 'Puede que el material del que procedía se haya quitado.'),
      h('a', { href: '#/ejercicios' }, 'Volver a los ejercicios'));
    return;
  }
  const st = exerciseState(id);
  const topic = ex.topicId ? TOPIC_BY_ID[ex.topicId] : null;

  put(main, 
    h('p', { class: 'crumbs' }, h('a', { href: '#/ejercicios' }, '← Ejercicios'),
      topic ? [' · ', h('a', { href: `#/temas/${topic.id}/ejercicios` }, topic.title)] : null),
    h('h1', { tabindex: '-1' }, ex.title),
    originLine(ex),
  );

  if (ex.type === 'predict') renderPredict(main, ex, st);
  else renderStatement(main, ex);

  if (ex.type !== 'predict') {
    put(main, workBlock(ex));
  }
  put(main, hintsBlock(ex, st));
  if (ex.type !== 'predict') put(main, solutionBlock(ex, st));
  put(main, trackingBlock(ex, st));
}

function originLine(ex) {
  if (ex.origin === 'material') {
    return h('div', { class: 'origin o-mat' },
      h('p', null, h('strong', null, 'De tu material: '), h('a', { href: fragHash(ex.fragId) }, `${ex.materialName} — ${ex.location}`)),
      topicSelect(ex));
  }
  if (ex.origin === 'adaptacion') {
    return h('div', { class: 'origin o-ad' },
      h('p', null, h('strong', null, 'Adaptación: '), 'ejercicio creado por la aplicación a partir del código de ',
        h('a', { href: fragHash(ex.fragId) }, `${ex.materialName} — ${ex.location}`), '. No es un enunciado de tu profesor/a.'));
  }
  return h('div', { class: 'origin o-comp' },
    h('p', null, h('strong', null, 'Complemento: '), 'ejercicio preparado por la aplicación (no procede de tus documentos). ',
      h('span', { class: 'badge' }, LEVELS[ex.level] || '')));
}

function topicSelect(ex) {
  const id = 'ex-topic';
  const s = h('select', { id, onchange: (e) => {
    const p = getProgress();
    p.exerciseTopic[ex.id] = e.target.value || null;
    saveProgress();
    reindex();
    toast('Tema del ejercicio actualizado.');
  } }, h('option', { value: '' }, 'Sin tema'), TOPICS.map((t) => h('option', { value: t.id }, t.title)));
  s.value = ex.topicId || '';
  return h('div', { class: 'field inline' }, h('label', { for: id }, 'Tema:'), s,
    h('span', { class: 'help' }, ex.autoTopicId ? 'Asignado automáticamente; corrígelo si no es correcto.' : 'No se pudo deducir el tema; elige uno.'));
}

function renderStatement(main, ex) {
  if (ex.origin === 'material') {
    put(main, h('section', { class: 'card', 'aria-labelledby': 'st-h' },
      h('h2', { id: 'st-h' }, 'Enunciado'),
      h('p', { class: 'muted small' }, 'Texto copiado literalmente de tu documento. Si se ve cortado o mezclado con otro texto, consulta el original con el enlace de arriba.'),
      h('pre', { class: 'frag-text' }, ex.statement)));
  } else {
    put(main, h('section', { class: 'card', 'aria-labelledby': 'st-h' },
      h('h2', { id: 'st-h' }, 'Enunciado'),
      h('p', null, rich(ex.statement)),
      ex.selfCheck ? h('p', { class: 'note' }, rich(ex.selfCheck)) : null));
  }
}

// --- Trabajar y comprobar ---
function testsFor(ex) {
  const custom = getProgress().customTests[ex.id] || [];
  return [...(ex.tests || []), ...custom.map((t) => ({ ...t, custom: true }))];
}

function workBlock(ex) {
  const results = h('div', { class: 'test-results', 'aria-live': 'polite' });
  const customList = h('ul', { class: 'custom-tests' });
  const checkBtn = h('button', { class: 'btn', type: 'button', onclick: () => runChecks(ex, results, checkBtn) }, 'Comprobar con las pruebas');

  const drawCustom = () => {
    clear(customList);
    const custom = getProgress().customTests[ex.id] || [];
    custom.forEach((t, i) => put(customList, h('li', null,
      h('span', null, t.desc),
      h('button', { class: 'link', type: 'button', onclick: () => {
        custom.splice(i, 1);
        saveProgress();
        drawCustom();
        syncBtn();
      } }, 'Eliminar'))));
  };
  const syncBtn = () => {
    const n = testsFor(ex).length;
    checkBtn.hidden = n === 0;
    checkBtn.textContent = `Comprobar con las pruebas (${n})`;
    noTests.hidden = n > 0;
  };
  const noTests = h('p', { class: 'muted' }, ex.origin === 'material'
    ? 'Este ejercicio procede de tu material y no tiene pruebas automáticas. Puedes añadir tú una prueba: los datos que escribirías y lo que esperas ver en la salida.'
    : 'Este ejercicio no tiene pruebas automáticas: compruébalo tú leyendo la salida en la consola.');

  const block = h('section', { class: 'card', 'aria-labelledby': 'work-h' },
    h('h2', { id: 'work-h' }, 'Tu solución'),
    h('p', null, 'Escribe tu código en el editor. Se guarda automáticamente como tu intento de este ejercicio.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => state.workspace.openExercise(ex) }, 'Trabajar en el editor'),
      checkBtn),
    noTests,
    results,
    h('details', { class: 'sub' },
      h('summary', null, 'Pruebas añadidas por ti'),
      customList,
      h('button', { class: 'btn btn-small', type: 'button', onclick: async () => {
        const v = await formDialog({
          title: 'Añadir una prueba',
          intro: 'Una prueba ejecuta tu programa con unos datos de entrada y comprueba que en la salida aparezcan ciertos textos (en orden).',
          fields: [
            { name: 'stdin', label: 'Datos de entrada (uno por línea, en el orden en que los pide input())', type: 'textarea', rows: 3 },
            { name: 'expect', label: 'Textos que deben aparecer en la salida (uno por línea)', type: 'textarea', rows: 3, required: true },
          ],
          submitText: 'Añadir prueba',
        });
        if (!v) return;
        const stdin = v.stdin.split('\n').map((s) => s.trim()).filter((s, i, a) => s || i < a.length - 1);
        const expect = v.expect.split('\n').map((s) => s.trim()).filter(Boolean);
        if (!expect.length) return;
        const p = getProgress();
        (p.customTests[ex.id] ||= []).push({
          desc: `${stdin.length ? 'Con «' + stdin.join(', ') + '»' : 'Sin datos'} → debe mostrar «${expect.join(' / ')}»`,
          stdin, expect,
        });
        saveProgress();
        drawCustom();
        syncBtn();
        toast('Prueba añadida.');
      } }, 'Añadir una prueba')),
  );
  drawCustom();
  syncBtn();
  return block;
}

async function runChecks(ex, results, btn) {
  const code = state.workspace.codeForExercise(ex);
  clear(results);
  if (!code.trim()) {
    put(results, h('p', { class: 'muted' }, 'Todavía no has escrito código para este ejercicio. Pulsa «Trabajar en el editor».'));
    return;
  }
  btn.disabled = true;
  put(results, h('p', { class: 'muted' }, 'Ejecutando pruebas…'));
  const res = await state.runner.runTests(code, testsFor(ex));
  btn.disabled = false;
  clear(results);
  if (res.notReady) { put(results, h('p', { class: 'muted' }, 'Python todavía se está cargando. Inténtalo en unos segundos.')); return; }
  if (res.busy) { put(results, h('p', { class: 'muted' }, 'Hay otro programa ejecutándose en la consola. Detenlo o espera a que termine.')); return; }
  if (res.timedOut || res.stopped) {
    put(results, h('p', { class: 'fail' }, '✗ Las pruebas han tardado demasiado y se han detenido. ¿Hay un bucle infinito (un while cuya condición nunca cambia)?'));
    return;
  }
  if (res.internal) { put(results, h('p', { class: 'fail' }, `Error interno: ${res.internal}`)); return; }
  if (res.compileError) {
    put(results, h('p', { class: 'fail' }, '✗ El código tiene un error de escritura y no se puede ejecutar.'), errorBox(res.compileError));
    return;
  }
  const tests = testsFor(ex);
  const passed = res.results.filter((r) => r.ok).length;
  const all = passed === tests.length;
  put(results, h('p', { class: all ? 'pass big' : 'fail big' },
    all ? `✓ ¡Todas las pruebas superadas (${passed}/${tests.length})!` : `${passed} de ${tests.length} pruebas superadas.`));
  const ul = h('ul', { class: 'tests' });
  res.results.forEach((r, i) => {
    const t = tests[i];
    const li = h('li', { class: r.ok ? 'pass' : 'fail' }, h('span', null, `${r.ok ? '✓' : '✗'} ${t.desc}`), t.custom ? h('span', { class: 'muted small' }, ' (prueba tuya)') : null);
    if (!r.ok) {
      if (r.timeout) put(li, h('p', null, 'Se detuvo por tardar demasiado (¿bucle infinito?).'));
      if (r.error) put(li, errorBox(r.error));
      if (r.missing) put(li, h('p', null, 'No aparece en la salida: ', r.missing.map((m) => h('code', null, m)).reduce((a, b) => [a, ', ', b])));
      if (r.want != null) put(li, h('p', null, 'Se esperaba ', h('code', null, r.want), ' y se obtuvo ', h('code', null, r.got)));
      if (t.stdin && t.stdin.length) put(li, h('p', { class: 'muted small' }, `Datos de entrada usados: ${t.stdin.join(' · ')}`));
      if (r.output != null) put(li, h('details', null, h('summary', null, 'Ver la salida de tu programa'), h('pre', { class: 'out' }, r.output || '(sin salida)')));
    }
    put(ul, li);
  });
  if (res.results.length < tests.length) put(ul, h('li', { class: 'muted' }, 'Las pruebas restantes no se ejecutaron.'));
  put(results, ul);
  const st = exerciseState(ex.id);
  if (all && st.status !== 'completado') {
    put(results, h('button', { class: 'btn btn-primary', type: 'button', onclick: (e) => {
      st.status = 'completado';
      saveProgress();
      e.target.replaceWith(h('p', { class: 'pass' }, 'Marcado como completado.'));
      const sel = document.querySelector('[name="ex-status"][value="completado"]');
      if (sel) sel.checked = true;
    } }, 'Marcar como completado'));
  }
}

function errorBox(err) {
  const ex = explainError(err);
  return h('div', { class: 'err-card' },
    h('p', { class: 'err-title' }, `${ex.title}${err.line ? ` (línea ${err.line})` : ''}`),
    h('pre', { class: 'out' }, err.traceback),
    h('p', null, ex.text),
    ex.detail ? h('p', null, ex.detail) : null);
}

// --- Pistas ---
const PREDICT_HINTS = [
  'Lee el código línea a línea, de arriba abajo, como hace Python.',
  'Anota en un papel el valor de cada variable después de cada línea.',
  'Cada print escribe una línea (salvo que use end=). Fíjate también en los espacios que añade la coma.',
];

function hintsBlock(ex, st) {
  const hints = ex.type === 'predict' ? PREDICT_HINTS : ex.hints || [];
  const block = h('section', { class: 'card', 'aria-labelledby': 'hint-h' }, h('h2', { id: 'hint-h' }, 'Pistas'));
  if (!hints.length) {
    put(block, h('p', { class: 'muted' }, 'Este ejercicio procede de tu material y la aplicación no tiene pistas específicas para él. Consulta el tema relacionado: la explicación paso a paso y los ejemplos te ayudarán.'),
      ex.topicId ? h('a', { class: 'btn btn-small', href: `#/temas/${ex.topicId}/explicacion` }, `Repasar «${TOPIC_BY_ID[ex.topicId].title}»`) : null);
    return block;
  }
  const list = h('ol', { class: 'hints' });
  const btn = h('button', { class: 'btn', type: 'button' });
  const draw = () => {
    clear(list);
    hints.slice(0, st.hints).forEach((t) => put(list, h('li', null, rich(t))));
    btn.hidden = st.hints >= hints.length;
    btn.textContent = st.hints === 0 ? `Ver la primera pista (hay ${hints.length})` : `Ver otra pista (${st.hints} de ${hints.length})`;
  };
  btn.addEventListener('click', () => { st.hints = Math.min(hints.length, st.hints + 1); saveProgress(); draw(); });
  put(block, h('p', { class: 'muted small' }, 'Las pistas aparecen de una en una: intenta el ejercicio después de cada pista.'), list, btn);
  draw();
  return block;
}

// --- Solución ---
function solutionBlock(ex, st) {
  const block = h('section', { class: 'card', 'aria-labelledby': 'sol-h' }, h('h2', { id: 'sol-h' }, 'Solución'));
  if (!ex.solution) {
    put(block, h('p', null, 'Tu material no incluye una solución que la aplicación pueda mostrar con seguridad, y la aplicación no se la inventa. Si tu documento tiene la solución, búscala en él; si no, compruébala con las pruebas o pregunta en clase.'));
    return block;
  }
  const content = h('div');
  const show = async () => {
    if (st.hints < (ex.hints || []).length && !st.solutionShown) {
      const ok = await confirmDialog({
        title: '¿Ver la solución?',
        message: `Aún te quedan ${(ex.hints || []).length - st.hints} pista(s) por ver. Intentarlo un poco más ayuda mucho a aprender. ¿Quieres ver la solución igualmente?`,
        confirmText: 'Ver la solución',
        cancelText: 'Seguir intentándolo',
      });
      if (!ok) return;
    }
    st.solutionShown = true;
    saveProgress();
    drawSolution();
  };
  const drawSolution = () => {
    put(clear(content), 
      codeBlock(ex.solution, { label: `solución de «${ex.title}»` }),
      h('h3', null, 'Explicación paso a paso'),
      h('ol', null, ex.steps.map((s) => h('li', null, rich(s)))),
      h('p', { class: 'muted small' }, 'Hay muchas formas correctas de resolver un ejercicio: si tu código es distinto pero pasa las pruebas, también vale.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', type: 'button', onclick: () => put(content, compareBlock(ex)) }, 'Comparar con mi intento'),
        h('button', { class: 'btn', type: 'button', onclick: () => { st.solutionShown = false; saveProgress(); drawHidden(); } }, 'Ocultar solución')),
    );
  };
  const drawHidden = () => {
    put(clear(content), 
      h('p', null, 'La solución está oculta para que puedas intentarlo primero.'),
      h('button', { class: 'btn', type: 'button', onclick: show }, 'Mostrar la solución'));
  };
  if (st.solutionShown) drawSolution(); else drawHidden();
  put(block, content);
  return block;
}

/** Diferencias línea a línea (algoritmo LCS) entre tu intento y la solución. */
function diffLines(a, b) {
  const A = a.replace(/\s+$/, '').split('\n').map((l) => l.replace(/\s+$/, ''));
  const B = b.replace(/\s+$/, '').split('\n').map((l) => l.replace(/\s+$/, ''));
  const n = A.length;
  const m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const out = [];
  let i = 0; let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push(['same', A[i], B[j]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(['mine', A[i], null]); i++; }
    else { out.push(['sol', null, B[j]]); j++; }
  }
  while (i < n) out.push(['mine', A[i++], null]);
  while (j < m) out.push(['sol', null, B[j++]]);
  return out;
}

function compareBlock(ex) {
  document.querySelectorAll('.compare').forEach((el) => el.remove());
  const mine = state.workspace.codeForExercise(ex);
  if (!mine.trim()) return h('p', { class: 'compare muted' }, 'Aún no has escrito ningún intento para este ejercicio.');
  const rows = diffLines(mine, ex.solution);
  const line = (txt, cls) => {
    const code = h('code');
    code.innerHTML = txt == null ? '' : highlightPython(txt) || ' ';
    return h('td', { class: cls }, code);
  };
  return h('div', { class: 'compare' },
    h('p', { class: 'muted small' }, 'En verde, líneas iguales; en amarillo, líneas que solo están en tu intento; en azul, líneas que solo están en la solución.'),
    h('div', { class: 'compare-scroll' },
      h('table', null,
        h('thead', null, h('tr', null, h('th', null, 'Tu intento'), h('th', null, 'Solución'))),
        h('tbody', null, rows.map(([k, a, b]) => h('tr', { class: `d-${k}` }, line(a, 'mine'), line(b, 'sol')))))));
}

// --- Predice la salida (adaptación) ---
function renderPredict(main, ex, st) {
  const sn = ex.snippet;
  const pred = h('textarea', { id: 'pred', rows: 5, spellcheck: 'false', class: 'mono' });
  pred.value = st.prediction || '';
  pred.addEventListener('input', debounce(() => { st.prediction = pred.value; saveProgress(); }, 300));
  const result = h('div', { 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn btn-primary', type: 'button' }, 'Comprobar mi predicción');
  btn.addEventListener('click', async () => {
    if (!pred.value.trim()) { toast('Escribe primero lo que crees que mostrará.', 'error'); return; }
    btn.disabled = true;
    const res = await state.runner.runSnippet(sn.code);
    btn.disabled = false;
    clear(result);
    if (res.notReady || res.busy) { put(result, h('p', { class: 'muted' }, 'Python está ocupado o cargándose. Inténtalo de nuevo en un momento.')); return; }
    if (res.timedOut || res.stopped) { put(result, h('p', { class: 'fail' }, 'El código tardó demasiado y se detuvo.')); return; }
    const norm = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.trimEnd()).join('\n').trim();
    const ok = !res.error && norm(res.output) === norm(pred.value);
    put(result, 
      h('p', { class: ok ? 'pass big' : 'fail big' }, ok ? '✓ ¡Tu predicción coincide con la salida real!' : 'No coincide del todo. Compara las dos columnas.'),
      h('div', { class: 'two-col' },
        h('div', null, h('h3', null, 'Tu predicción'), h('pre', { class: 'out' }, pred.value)),
        h('div', null, h('h3', null, 'Salida real (ejecutada por Python)'), h('pre', { class: 'out' }, res.output || '(sin salida)'))),
      res.error ? h('div', null,
        h('p', null, 'El código produce un error. Si viene de un PDF, puede que se haya copiado mal (por ejemplo, la sangría o las comillas).'),
        errorBox(res.error)) : null,
    );
    if (ok && st.status !== 'completado') { st.status = 'completado'; saveProgress(); toast('Ejercicio marcado como completado.'); syncStatusRadios('completado'); }
  });

  put(main, h('section', { class: 'card', 'aria-labelledby': 'st-h' },
    h('h2', { id: 'st-h' }, 'Enunciado'),
    h('p', null, '¿Qué mostrará este código al ejecutarse? Escribe tu predicción, exactamente como crees que aparecerá en la consola, y compruébala.'),
    sn.fromPdf ? h('p', { class: 'muted small' }, 'Este código se ha extraído de un PDF: la sangría puede no ser exacta.') : null,
    codeBlock(sn.code, { run: false }),
    h('div', { class: 'field' }, h('label', { for: 'pred' }, 'Tu predicción de la salida'), pred),
    h('div', { class: 'row' }, btn,
      h('button', { class: 'btn', type: 'button', onclick: () => state.workspace.loadCode(sn.code, `código de «${sn.materialName}»`) }, 'Abrir en el editor')),
    result,
  ));
}

// --- Estado y notas ---
function syncStatusRadios(value) {
  const r = document.querySelector(`[name="ex-status"][value="${value}"]`);
  if (r) r.checked = true;
}

function trackingBlock(ex, st) {
  const saved = h('span', { class: 'muted small', 'aria-live': 'polite' });
  const notes = h('textarea', { id: 'ex-notes', rows: 4, placeholder: 'Dudas, cosas que has aprendido, qué preguntar en clase…' });
  notes.value = st.notes || '';
  notes.addEventListener('input', debounce(() => {
    st.notes = notes.value;
    saveProgress();
    saved.textContent = 'Nota guardada.';
    setTimeout(() => { saved.textContent = ''; }, 1500);
  }, 400));
  const radio = (value, label) => h('label', { class: 'radio' },
    h('input', { type: 'radio', name: 'ex-status', value, checked: st.status === value, onchange: () => {
      st.status = value;
      saveProgress();
      toast(value === 'completado' ? 'Marcado como completado.' : 'Marcado como pendiente.');
    } }), ' ', label);
  return h('section', { class: 'card', 'aria-labelledby': 'trk-h' },
    h('h2', { id: 'trk-h' }, 'Seguimiento'),
    h('fieldset', { class: 'radios' }, h('legend', null, 'Estado'), radio('pendiente', 'Pendiente'), radio('completado', 'Completado')),
    h('div', { class: 'field' }, h('label', { for: 'ex-notes' }, 'Mis notas'), notes, saved),
    h('div', { class: 'row' },
      st.attempt != null ? h('button', { class: 'btn btn-small', type: 'button', onclick: async () => {
        const ok = await confirmDialog({ title: 'Borrar mi intento', message: 'Se borrará el código que has escrito para este ejercicio. ¿Continuar?', confirmText: 'Borrar', danger: true });
        if (!ok) return;
        st.attempt = null;
        saveProgress();
        if (state.workspace.context.type === 'exercise' && state.workspace.context.id === ex.id) state.workspace.openExercise(ex);
        toast('Intento borrado.');
        navigate(location.hash);
      } }, 'Empezar de cero') : null,
    ),
  );
}
