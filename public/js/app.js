// Punto de entrada: arranca Python, carga los materiales y gestiona la navegación.
// Rutas (con #, para que el botón «Atrás» del navegador funcione):
//   #/                      inicio
//   #/materiales[/id[/n]]   biblioteca / un material (n = fragmento)
//   #/temas[/id[/pestaña]]  ruta / un tema
//   #/seccion/clave         sección de un documento
//   #/ejercicios[/id]       lista / un ejercicio
//   #/codigo                editor y consola a pantalla completa

import { h, put, clear } from './ui.js';
import { PythonRunner } from './python/runner.js';
import { Workspace } from './views/workspace.js';
import { state, loadMaterials, orderedTopics, allExercises, exerciseById } from './state.js';
import { getProgress, saveProgress, exerciseState, requestPersistence } from './store.js';
import { renderMaterials, renderMaterial } from './views/materials.js';
import { renderTopics, renderTopic, renderSection } from './views/topics.js';
import { renderExercises, renderExercise } from './views/exercises.js';

const main = document.getElementById('main');

function renderHome(root) {
  const p = getProgress();
  const route = orderedTopics();
  const nextTopic = route.find((t) => !p.topicsDone[t.id]) || route[0];
  const doneTopics = route.filter((t) => p.topicsDone[t.id]).length;
  const exs = allExercises();
  const doneEx = exs.filter((e) => exerciseState(e.id).status === 'completado').length;
  const nMat = state.materials.length;

  put(root, 
    h('h1', { tabindex: '-1' }, 'Aprende Python con tus propios apuntes'),
    h('p', { class: 'lead' }, 'Un entorno de estudio para empezar desde cero: tus materiales, una ruta de temas paso a paso, ejercicios con pistas y una consola para probar código.'),
    h('div', { class: 'cards3' },
      h('a', { class: 'card big-link', href: '#/materiales' },
        h('span', { class: 'kicker' }, '1 · Materiales'),
        h('strong', null, nMat ? `${nMat} material(es) importado(s)` : 'Importa tus apuntes'),
        h('span', { class: 'muted' }, nMat ? 'Ver o añadir documentos' : 'PDF, Word, TXT o Markdown. Se quedan en tu navegador.')),
      h('a', { class: 'card big-link', href: nextTopic ? `#/temas/${nextTopic.id}` : '#/temas' },
        h('span', { class: 'kicker' }, '2 · Temas'),
        h('strong', null, doneTopics ? `Continuar: ${nextTopic.title}` : `Empezar: ${nextTopic ? nextTopic.title : 'la ruta'}`),
        h('span', { class: 'muted' }, `${doneTopics} de ${route.length} temas completados`)),
      h('a', { class: 'card big-link', href: '#/ejercicios' },
        h('span', { class: 'kicker' }, '3 · Ejercicios'),
        h('strong', null, `${doneEx} de ${exs.length} completados`),
        h('span', { class: 'muted' }, 'Con pistas, soluciones y pruebas')),
    ),
    h('section', { class: 'card' },
      h('h2', null, 'Cómo funciona'),
      h('ol', null,
        h('li', null, 'Importa los documentos de tu asignatura. La aplicación busca en ellos cada tema y sus ejercicios, y siempre te dice de qué documento y página o sección sale cada cosa.'),
        h('li', null, 'Estudia un tema cada vez. Primero verás lo que dicen tus materiales; después, una explicación paso a paso marcada como «Complemento».'),
        h('li', null, 'Practica en el editor y la consola. Si algo falla, verás qué significa el error en español y en qué línea está.')),
    ),
    h('p', { class: 'privacy' }, h('strong', null, 'Privacidad: '),
      'todo se guarda en este navegador. Tus documentos no se envían a ningún servidor ni a servicios de IA, y el código Python se ejecuta aislado dentro del navegador, sin acceso a tus archivos.'),
  );
}

function setActiveNav(section) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === section) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').map((s) => decodeURIComponent(s));
  const [section = '', a, b] = parts;
  document.body.dataset.view = section || 'inicio';
  setActiveNav(section);
  if (section === 'codigo') {
    document.title = 'Código · Estudia Python';
    setTimeout(() => state.workspace.editor.focus(), 30);
    return;
  }
  clear(main);
  try {
    switch (section) {
      case 'materiales': a ? renderMaterial(main, a, b) : renderMaterials(main); break;
      case 'temas': a ? renderTopic(main, a, b) : renderTopics(main); break;
      case 'seccion': renderSection(main, a); break;
      case 'ejercicios': a ? renderExercise(main, a) : renderExercises(main); break;
      default: renderHome(main);
    }
  } catch (err) {
    console.error(err);
    put(main, h('h1', null, 'Algo ha fallado al mostrar esta página'), h('p', null, String(err.message || err)),
      h('a', { href: '#/' }, 'Volver al inicio'));
  }
  const h1 = main.querySelector('h1');
  document.title = `${h1 ? h1.textContent + ' · ' : ''}Estudia Python`;
  if (!location.hash.match(/^#\/materiales\/[^/]+\/\d+/)) {
    window.scrollTo(0, 0);
    main.scrollTop = 0;
  }
  if (h1 && routeChangedByUser) h1.focus({ preventScroll: true });
  routeChangedByUser = true;
  getProgress().lastRoute = location.hash;
  saveProgress();
}

let routeChangedByUser = false;

function setupWorkspaceToggle() {
  const btn = document.getElementById('toggle-ws');
  const p = getProgress();
  const apply = () => {
    document.body.classList.toggle('ws-hidden', !!p.wsHidden);
    btn.setAttribute('aria-pressed', String(!p.wsHidden));
    btn.textContent = p.wsHidden ? 'Mostrar panel de código' : 'Ocultar panel de código';
  };
  btn.addEventListener('click', () => {
    p.wsHidden = !p.wsHidden;
    saveProgress();
    apply();
  });
  // El Workspace puede mostrar el panel (p. ej. con «Probar en el editor»).
  new MutationObserver(() => {
    const hidden = document.body.classList.contains('ws-hidden');
    if (p.wsHidden !== hidden) { p.wsHidden = hidden; saveProgress(); apply(); }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  apply();
}

async function start() {
  // En GitHub Pages, espera a que el service worker active el aislamiento (ver js/coi.js).
  if (window.coiPending) await window.coiPending;
  requestPersistence();
  state.runner = new PythonRunner();
  state.workspace = new Workspace(document.getElementById('workspace'), state.runner);
  state.workspace.exerciseLookup = exerciseById;
  setupWorkspaceToggle();
  try {
    await loadMaterials();
  } catch {
    put(main, h('p', { class: 'alert' }, 'No se pudo abrir el almacenamiento del navegador (¿modo privado?). Los materiales no se podrán guardar.'));
  }
  state.workspace.refreshContext();
  window.addEventListener('hashchange', route);
  if (!location.hash) {
    const last = getProgress().lastRoute;
    if (last && last !== '#/codigo') history.replaceState(null, '', last);
  }
  route();
}

start();
