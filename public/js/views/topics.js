// Vistas «Temas»: la ruta, cada tema (materiales + explicación + ejemplos + ejercicios)
// y las secciones detectadas en tus documentos.

import { h, put, clear, rich, toast, highlightTerms, copyText } from '../ui.js';
import { getProgress, saveProgress, exerciseState } from '../store.js';
import { state, orderedTopics, exercisesForTopic, exHash, fragHash, setFragmentTopics } from '../state.js';
import { TOPICS, TOPIC_BY_ID } from '../content/topics.js';
import { extractiveSummary, scoreFragment } from '../analysis.js';
import { highlightPython } from '../editor.js';

// ---------------- Lista de la ruta ----------------
export function renderTopics(main) {
  const p = getProgress();
  let editing = false;
  const listWrap = h('div');
  const toolbar = h('div', { class: 'row' });

  const render = () => {
    clear(listWrap);
    clear(toolbar);
    const topics = orderedTopics({ includeHidden: editing });
    put(toolbar, 
      h('button', { class: 'btn', type: 'button', 'aria-pressed': String(editing), onclick: () => { editing = !editing; render(); } },
        editing ? 'Terminar de personalizar' : 'Personalizar la ruta'),
    );
    if (editing) {
      if (state.materials.length) {
        put(toolbar, h('button', { class: 'btn', type: 'button', onclick: () => {
          const pos = state.index.firstPos;
          const ids = orderedTopics({ includeHidden: true }).map((t) => t.id);
          const def = TOPICS.map((t) => t.id);
          ids.sort((a, b) => (pos[a] ?? Infinity) - (pos[b] ?? Infinity) || def.indexOf(a) - def.indexOf(b));
          p.routeOrder = ids;
          saveProgress();
          toast('Ruta ordenada según el orden en que aparecen los temas en tus materiales.');
          render();
        } }, 'Ordenar según mis materiales'));
      }
      put(toolbar, h('button', { class: 'btn', type: 'button', onclick: () => {
        p.routeOrder = null;
        p.routeHidden = [];
        saveProgress();
        toast('Ruta restablecida.');
        render();
      } }, 'Restablecer'));
    }

    const ol = h('ol', { class: 'route' });
    topics.forEach((t, i) => {
      const hidden = p.routeHidden.includes(t.id);
      const nMat = state.index.byTopic[t.id].length;
      const exs = exercisesForTopic(t.id);
      const done = exs.filter((e) => exerciseState(e.id).status === 'completado').length;
      const status = p.topicsDone[t.id] ? 'Completado' : (p.topicStep[t.id] != null ? 'Empezado' : 'Sin empezar');
      const li = h('li', { class: `route-item${hidden ? ' is-hidden' : ''}${p.topicsDone[t.id] ? ' is-done' : ''}` },
        h('span', { class: 'route-num', 'aria-hidden': 'true' }, p.topicsDone[t.id] ? '✓' : String(i + 1)),
        h('div', { class: 'route-body' },
          h('h3', null, editing ? t.title : h('a', { href: `#/temas/${t.id}` }, t.title), hidden ? h('span', { class: 'badge' }, 'Oculto') : null),
          h('p', null, t.short),
          h('p', { class: 'meta' },
            h('span', { class: `status s-${status === 'Completado' ? 'ok' : status === 'Empezado' ? 'mid' : 'none'}` }, status),
            ` · ${nMat ? `${nMat} fragmento(s) de tus materiales` : 'sin material tuyo todavía'} · ejercicios: ${done}/${exs.length} completados`),
        ),
      );
      if (editing) {
        const all = orderedTopics({ includeHidden: true }).map((x) => x.id);
        const move = (d) => {
          const idx = all.indexOf(t.id);
          const j = idx + d;
          if (j < 0 || j >= all.length) return;
          [all[idx], all[j]] = [all[j], all[idx]];
          p.routeOrder = all;
          saveProgress();
          render();
        };
        put(li, h('div', { class: 'route-edit' },
          h('button', { class: 'btn btn-small', type: 'button', disabled: i === 0, onclick: () => move(-1), 'aria-label': `Subir «${t.title}»` }, '↑'),
          h('button', { class: 'btn btn-small', type: 'button', disabled: i === topics.length - 1, onclick: () => move(1), 'aria-label': `Bajar «${t.title}»` }, '↓'),
          h('button', { class: 'btn btn-small', type: 'button', onclick: () => {
            p.routeHidden = hidden ? p.routeHidden.filter((x) => x !== t.id) : [...p.routeHidden, t.id];
            saveProgress();
            render();
          } }, hidden ? 'Mostrar' : 'Ocultar'),
        ));
      }
      put(ol, li);
    });
    put(listWrap, ol);
  };

  put(main, 
    h('h1', { tabindex: '-1' }, 'Temas'),
    h('p', { class: 'lead' }, 'Una ruta para empezar desde cero, un tema cada vez. En cada tema verás primero lo que dicen tus materiales y después una explicación paso a paso.'),
    toolbar,
    listWrap,
    sectionsBlock(),
  );
  render();
}

function sectionsBlock() {
  const secs = state.index.sections.filter((s) => s.heading.level <= 2);
  const block = h('section', { class: 'card', 'aria-labelledby': 'sec-h' },
    h('h2', { id: 'sec-h' }, 'Temas de tus materiales'));
  if (!secs.length) {
    put(block, h('p', { class: 'muted' }, state.materials.length
      ? 'No he encontrado títulos de sección en tus materiales (los PDF no conservan los títulos). Puedes consultar su contenido página a página en «Materiales».'
      : 'Cuando importes documentos con títulos (Word, Markdown o texto con encabezados), aquí aparecerán sus secciones para estudiarlas una a una.'));
    return block;
  }
  put(block, h('p', { class: 'muted' }, 'Secciones encontradas en tus documentos. Ábrelas para estudiar ese apartado concreto.'));
  const byMat = new Map();
  for (const s of secs) {
    if (!byMat.has(s.material.id)) byMat.set(s.material.id, []);
    byMat.get(s.material.id).push(s);
  }
  for (const list of byMat.values()) {
    put(block, h('h3', null, list[0].material.name),
      h('ul', { class: 'sec-list' }, list.map((s) => h('li', { class: s.heading.level === 2 ? 'sub' : '' },
        h('a', { href: `#/seccion/${encodeURIComponent(s.key)}` }, s.heading.title)))));
  }
  return block;
}

// ---------------- Un tema ----------------
const TABS = [
  ['materiales', 'Tus materiales'],
  ['explicacion', 'Explicación paso a paso'],
  ['ejemplos', 'Ejemplos guiados'],
  ['ejercicios', 'Ejercicios'],
];

export function renderTopic(main, id, tabArg) {
  const topic = TOPIC_BY_ID[id];
  if (!topic) {
    put(main, h('h1', { tabindex: '-1' }, 'Tema no encontrado'), h('a', { href: '#/temas' }, 'Volver a los temas'));
    return;
  }
  const p = getProgress();
  const route = orderedTopics();
  const pos = route.findIndex((t) => t.id === id);
  const prev = route[pos - 1];
  const next = route[pos + 1];
  const entries = state.index.byTopic[id];
  const exs = exercisesForTopic(id);
  if (p.topicStep[id] == null) { p.topicStep[id] = 0; saveProgress(); }

  const tab = TABS.some(([k]) => k === tabArg) ? tabArg : (entries.length ? 'materiales' : 'explicacion');
  const panel = h('div', { class: 'tab-panel', role: 'tabpanel', id: 'topic-panel', tabindex: '0' });
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Secciones del tema' },
    TABS.map(([k, label]) => {
      const count = k === 'materiales' ? entries.length : k === 'ejercicios' ? exs.length : null;
      return h('a', {
        role: 'tab', href: `#/temas/${id}/${k}`, 'aria-selected': String(k === tab), 'aria-controls': 'topic-panel',
        class: k === tab ? 'tab active' : 'tab',
      }, label, count != null ? h('span', { class: 'count' }, String(count)) : null);
    }));

  put(main, 
    h('p', { class: 'crumbs' }, h('a', { href: '#/temas' }, '← Ruta'), pos >= 0 ? ` · Tema ${pos + 1} de ${route.length}` : ''),
    h('h1', { tabindex: '-1' }, topic.title),
    h('p', { class: 'lead' }, topic.short),
    tabs,
    panel,
    h('nav', { class: 'pager', 'aria-label': 'Temas anterior y siguiente' },
      prev ? h('a', { class: 'btn', href: `#/temas/${prev.id}` }, `← ${prev.title}`) : h('span'),
      next ? h('a', { class: 'btn', href: `#/temas/${next.id}` }, `${next.title} →`) : h('span'),
    ),
  );

  // En móvil las pestañas se desplazan en horizontal: muestra la activa.
  requestAnimationFrame(() => tabs.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
  if (tab === 'materiales') renderMaterialsTab(panel, topic, entries);
  else if (tab === 'explicacion') renderStepsTab(panel, topic);
  else if (tab === 'ejemplos') renderExamplesTab(panel, topic);
  else renderExercisesTab(panel, topic, exs);
}

function complementBanner(text = 'Explicación general de Python preparada por la aplicación. No procede de tus documentos.') {
  return h('p', { class: 'complement' }, h('strong', null, 'Complemento · '), text);
}

export function codeBlock(code, { label, run = true } = {}) {
  const pre = h('pre', { class: 'code' }, h('code'));
  pre.firstChild.innerHTML = highlightPython(code); // highlightPython escapa todo el texto
  return h('div', { class: 'code-wrap' },
    pre,
    h('div', { class: 'code-actions' },
      run ? h('button', { class: 'btn btn-small', type: 'button', onclick: () => state.workspace.loadCode(code, label) }, 'Probar en el editor') : null,
      h('button', { class: 'btn btn-small', type: 'button', onclick: async () => {
        toast((await copyText(code)) ? 'Código copiado.' : 'No se pudo copiar.');
      } }, 'Copiar'),
    ),
  );
}

// --- Pestaña: tus materiales ---
function renderMaterialsTab(panel, topic, entries) {
  const diffs = state.index.differences.filter((d) => d.topicId === topic.id);
  const snippets = state.index.snippets.filter((s) => s.topicId === topic.id);

  if (!state.materials.length) {
    put(panel, h('div', { class: 'empty' },
      h('h2', null, 'Aún no has importado materiales'),
      h('p', null, 'Cuando importes tus apuntes, aquí verás los fragmentos que hablan de este tema, con su cita (documento y página o sección).'),
      h('div', { class: 'row' },
        h('a', { class: 'btn btn-primary', href: '#/materiales' }, 'Importar materiales'),
        h('a', { class: 'btn', href: `#/temas/${topic.id}/explicacion` }, 'Ver la explicación complementaria')),
    ));
    return;
  }
  if (!entries.length) {
    put(panel, h('div', { class: 'empty' },
      h('h2', null, 'No he encontrado este tema en tus materiales'),
      h('p', null, `He buscado palabras clave como ${topic.keywords.slice(0, 4).map((k) => `«${k[2]}»`).join(', ')} y no aparecen lo suficiente. Puede que tus apuntes lo traten con otras palabras, o que no lo incluyan.`),
      h('p', null, 'Si sabes en qué parte está, ábrela en «Materiales» y asígnale este tema con «Cambiar temas».'),
      h('a', { class: 'btn', href: `#/temas/${topic.id}/explicacion` }, 'Ver la explicación complementaria'),
    ));
    return;
  }

  for (const d of diffs) {
    put(panel, h('div', { class: 'alert', role: 'note' },
      h('p', { class: 'alert-title' }, '⚠ ', d.title),
      h('p', null, d.text),
      h('ul', null, d.sources.map((s) => h('li', null, h('a', { href: fragHash(s.fragId) }, `${s.name} — ${s.location}`), `: ${s.says}`))),
    ));
  }

  const mats = new Set(entries.map((e) => e.material.id));
  put(panel, h('p', { class: 'muted' },
    `${entries.length} fragmento(s) de ${mats.size} material(es) parecen tratar este tema. Se han encontrado buscando palabras clave: revisa siempre el texto original.`,
    mats.size > 1 ? ' Como hay varias fuentes, compáralas: la aplicación no puede comprobar automáticamente si dicen exactamente lo mismo.' : ''));

  const summary = extractiveSummary(entries, topic);
  if (summary.length) {
    put(panel, h('section', { class: 'card summary', 'aria-labelledby': 'sum-h' },
      h('h2', { id: 'sum-h' }, 'Resumen de tus materiales'),
      h('p', { class: 'muted small' }, 'Resumen extractivo: frases copiadas literalmente de tus documentos y seleccionadas automáticamente. No se ha añadido ni cambiado nada.'),
      h('ul', { class: 'summary-list' }, summary.map((s) => h('li', null,
        h('blockquote', null, s.text),
        h('a', { class: 'cite', href: fragHash(s.frag.id) }, `${s.material.name} — ${s.frag.label}`)))),
    ));
  }

  if (snippets.length) {
    put(panel, h('h2', null, 'Código de tus materiales'));
    if (snippets.some((s) => s.fromPdf)) put(panel, h('p', { class: 'muted small' }, 'El código copiado de un PDF puede perder la sangría o tener caracteres raros: revísalo antes de ejecutarlo.'));
    for (const s of snippets.slice(0, 6)) {
      put(panel, h('figure', { class: 'snippet' },
        h('figcaption', null, h('a', { class: 'cite', href: fragHash(s.fragId) }, `${s.materialName} — ${s.location}`), s.isRepl ? ' (sesión interactiva >>>, solo las órdenes)' : ''),
        codeBlock(s.code, { label: `código de «${s.materialName}», ${s.location}` })));
    }
  }

  put(panel, h('h2', null, 'Fragmentos relacionados'));
  const list = h('div', { class: 'frags' });
  const SHOW = 5;
  const renderFrags = (n) => {
    clear(list);
    entries.slice(0, n).forEach((e) => put(list, fragmentCard(e, topic)));
    if (entries.length > n) {
      put(list, h('button', { class: 'btn', type: 'button', onclick: () => renderFrags(entries.length) }, `Mostrar ${entries.length - n} fragmento(s) más`));
    }
  };
  renderFrags(SHOW);
  put(panel, list);
}

function fragmentCard(entry, topic) {
  const { material, frag, terms } = entry;
  const full = frag.text;
  const short = full.length > 700 ? full.slice(0, 700) + '…' : full;
  const words = terms.map((t) => t.sample);
  const textEl = h('div', { class: 'quote-text' }, highlightTerms(short, words));
  let expanded = false;
  return h('article', { class: 'quote' },
    h('p', { class: 'cite' }, h('a', { href: fragHash(frag.id) }, `${material.name} — ${frag.label}`)),
    textEl,
    h('p', { class: 'meta' },
      entry.manual ? 'Asignado por ti a este tema' : `Detectado por: ${terms.map((t) => t.label).join(', ')}`, ' · ',
      full.length > 700 ? h('button', { class: 'link', type: 'button', onclick: (e) => {
        expanded = !expanded;
        put(clear(textEl), ...highlightTerms(expanded ? full : short, words));
        e.target.textContent = expanded ? 'Mostrar menos' : 'Leer completo';
      } }, 'Leer completo') : null,
      full.length > 700 ? ' · ' : null,
      h('button', { class: 'link', type: 'button', onclick: () => {
        const cur = state.index.fragTopics[frag.id].assigned.filter((x) => x !== topic.id);
        setFragmentTopics(frag.id, cur);
        toast('Fragmento quitado de este tema. Puedes deshacerlo desde «Materiales».');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } }, 'No es de este tema'),
    ),
  );
}

// --- Pestaña: explicación paso a paso ---
function renderStepsTab(panel, topic) {
  const p = getProgress();
  let i = Math.min(p.topicStep[topic.id] || 0, topic.steps.length - 1);
  const stepWrap = h('div', { class: 'step', 'aria-live': 'polite' });
  const progress = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(topic.steps.length) },
    h('div', { class: 'progress-bar' }));
  const prevBtn = h('button', { class: 'btn', type: 'button', onclick: () => go(-1) }, '← Anterior');
  const nextBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => go(1) }, 'Siguiente →');
  const endBox = h('div', { class: 'card end-box', hidden: true });

  const draw = () => {
    const s = topic.steps[i];
    put(clear(stepWrap), 
      h('p', { class: 'step-count' }, `Paso ${i + 1} de ${topic.steps.length}`),
      h('h2', { tabindex: '-1' }, s.title),
      s.body.map((b) => h('p', null, rich(b))),
      s.code ? codeBlock(s.code, { label: `${topic.title}, paso ${i + 1}` }) : null,
      s.note ? h('p', { class: 'note' }, rich(s.note)) : null,
    );
    progress.setAttribute('aria-valuenow', String(i + 1));
    progress.firstChild.style.width = `${((i + 1) / topic.steps.length) * 100}%`;
    prevBtn.disabled = i === 0;
    nextBtn.hidden = i === topic.steps.length - 1;
    endBox.hidden = i !== topic.steps.length - 1;
    p.topicStep[topic.id] = i;
    saveProgress();
  };
  const go = (d) => {
    i = Math.max(0, Math.min(topic.steps.length - 1, i + d));
    draw();
    stepWrap.querySelector('h2').focus?.();
  };

  const doneBtn = h('button', { class: 'btn btn-primary', type: 'button' });
  const syncDone = () => { doneBtn.textContent = p.topicsDone[topic.id] ? '✓ Tema completado (desmarcar)' : 'Marcar tema como completado'; };
  doneBtn.addEventListener('click', () => {
    p.topicsDone[topic.id] = !p.topicsDone[topic.id];
    saveProgress();
    syncDone();
    toast(p.topicsDone[topic.id] ? '¡Tema completado!' : 'Tema marcado como no completado.');
  });
  syncDone();
  put(endBox, 
    h('p', null, 'Has llegado al final de la explicación. Ahora prueba los ejemplos guiados y los ejercicios.'),
    h('div', { class: 'row' }, doneBtn,
      h('a', { class: 'btn', href: `#/temas/${topic.id}/ejemplos` }, 'Ejemplos guiados'),
      h('a', { class: 'btn', href: `#/temas/${topic.id}/ejercicios` }, 'Ejercicios')),
  );

  put(panel, 
    complementBanner(),
    h('details', { class: 'terms' },
      h('summary', null, 'Palabras clave de este tema'),
      h('dl', null, topic.terms.map(([t, d]) => [h('dt', null, t), h('dd', null, rich(d))]))),
    progress,
    stepWrap,
    h('div', { class: 'row between' }, prevBtn, nextBtn),
    endBox,
  );
  draw();
}

// --- Pestaña: ejemplos ---
function renderExamplesTab(panel, topic) {
  put(panel, complementBanner('Ejemplos preparados por la aplicación. Los ejemplos de tus documentos están en la pestaña «Tus materiales».'));
  topic.examples.forEach((ex, n) => {
    put(panel, h('section', { class: 'card' },
      h('h2', null, `Ejemplo ${n + 1}: ${ex.title}`),
      codeBlock(ex.code, { label: `${topic.title}: ${ex.title}` }),
      h('h3', null, 'Qué hace, paso a paso'),
      h('ol', null, ex.explain.map((e) => h('li', null, rich(e)))),
    ));
  });
}

// --- Pestaña: ejercicios ---
export function exerciseRow(e) {
  const st = exerciseState(e.id);
  const origin = e.origin === 'material' ? ['De tu material', 'o-mat'] : e.origin === 'adaptacion' ? ['Adaptación', 'o-ad'] : ['Complemento', 'o-comp'];
  return h('li', { class: 'ex-row' },
    h('a', { href: exHash(e.id) }, e.title),
    h('span', { class: `badge ${origin[1]}` }, origin[0]),
    e.level ? h('span', { class: 'badge' }, ['', 'Muy fácil', 'Fácil', 'Más abierto'][e.level] || `Nivel ${e.level}`) : null,
    e.materialName ? h('span', { class: 'muted small' }, `${e.materialName}${e.location ? ' — ' + e.location : ''}`) : null,
    h('span', { class: `status s-${st.status === 'completado' ? 'ok' : 'none'}` }, st.status === 'completado' ? '✓ Completado' : 'Pendiente'),
  );
}

function renderExercisesTab(panel, topic, exs) {
  const mat = exs.filter((e) => e.origin === 'material');
  const ad = exs.filter((e) => e.origin === 'adaptacion');
  const comp = exs.filter((e) => e.origin === 'complemento').sort((a, b) => a.level - b.level);
  if (mat.length) {
    put(panel, h('h2', null, 'De tus materiales'),
      h('p', { class: 'muted small' }, 'Enunciados copiados de tus documentos. Primero estos: son los de tu asignatura.'),
      h('ul', { class: 'ex-list' }, mat.map(exerciseRow)));
  } else {
    put(panel, h('p', { class: 'muted' }, state.materials.length
      ? 'No he detectado ejercicios de este tema en tus materiales. (Se detectan por títulos como «Ejercicio 3» o frases como «Escribe un programa que…»; si un ejercicio no aparece, revisa en «Ejercicios» si está asignado a otro tema.)'
      : 'Cuando importes tus materiales, sus ejercicios aparecerán aquí primero.'));
  }
  if (ad.length) {
    put(panel, h('h2', null, 'Adaptaciones de tus materiales'),
      h('p', { class: 'muted small' }, 'Ejercicios creados por la aplicación a partir del código de tus documentos (no son enunciados de tu profesor/a).'),
      h('ul', { class: 'ex-list' }, ad.map(exerciseRow)));
  }
  put(panel, h('h2', null, 'Ejercicios graduados (complemento)'),
    h('p', { class: 'muted small' }, 'Preparados por la aplicación, de más fácil a más abierto. Tienen pistas, solución explicada y pruebas automáticas.'),
    h('ul', { class: 'ex-list' }, comp.map(exerciseRow)));
}

// ---------------- Sección de un material ----------------
export function renderSection(main, key) {
  const sec = state.index.sections.find((s) => s.key === key);
  if (!sec) {
    put(main, h('h1', { tabindex: '-1' }, 'Sección no encontrada'), h('a', { href: '#/temas' }, 'Volver a los temas'));
    return;
  }
  const text = sec.frags.map((f) => f.text).join('\n');
  const related = TOPICS.map((t) => ({ t, s: scoreFragment(text, t).score })).filter((x) => x.s >= 4).sort((a, b) => b.s - a.s).slice(0, 4);
  const fragIds = new Set(sec.frags.map((f) => f.id));
  const exs = state.index.exercises.filter((e) => fragIds.has(e.fragId));

  put(main, 
    h('p', { class: 'crumbs' }, h('a', { href: '#/temas' }, '← Temas'), ` · ${sec.material.name}`),
    h('h1', { tabindex: '-1' }, sec.heading.title),
    h('p', { class: 'muted' }, `Texto de «${sec.material.name}», tal como aparece en el documento.`),
    related.length ? h('p', { class: 'chips' }, h('span', { class: 'muted' }, 'Relacionado con la ruta: '),
      related.map(({ t }) => h('a', { class: 'chip', href: `#/temas/${t.id}` }, t.title))) : null,
    exs.length ? h('section', { class: 'card' }, h('h2', null, 'Ejercicios de esta sección'), h('ul', { class: 'ex-list' }, exs.map(exerciseRow))) : null,
    sec.frags.map((f) => h('article', { class: 'quote' },
      h('p', { class: 'cite' }, h('a', { href: fragHash(f.id) }, `${sec.material.name} — ${f.label}`)),
      h('pre', { class: 'frag-text' }, f.text))),
  );
}
