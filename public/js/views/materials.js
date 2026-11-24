// Vista «Materiales»: importar, listar, ver, reemplazar y quitar documentos.

import { h, put, clear, toast, confirmDialog, formDialog, highlightTerms } from '../ui.js';
import { importFile, importPasted, ImportError, ACCEPT } from '../importers.js';
import { materialsDB } from '../store.js';
import { state, loadMaterials, materialById, setFragmentTopics, resetFragmentTopics, exHash, fragHash } from '../state.js';
import { TOPICS, TOPIC_BY_ID } from '../content/topics.js';
import { normalize } from '../analysis.js';

const FORMAT_LABEL = { pdf: 'PDF', docx: 'DOCX', txt: 'TXT', md: 'Markdown', py: 'Python', pasted: 'Texto pegado' };
const KIND_LABEL = { apuntes: 'Apuntes / teoría', ejercicios: 'Ejercicios' };

export function renderMaterials(main) {
  const statusList = h('ul', { class: 'import-status', 'aria-live': 'polite' });
  const kindSelect = h('select', { id: 'import-kind' },
    h('option', { value: 'apuntes' }, KIND_LABEL.apuntes),
    h('option', { value: 'ejercicios' }, KIND_LABEL.ejercicios));
  const fileInput = h('input', { type: 'file', accept: ACCEPT, multiple: true, hidden: true,
    onchange: (e) => { handleFiles([...e.target.files], kindSelect.value, statusList); e.target.value = ''; } });

  const drop = h('div', { class: 'dropzone' },
    h('p', { class: 'drop-title' }, 'Arrastra aquí tus archivos'),
    h('p', { class: 'muted' }, 'PDF, Word (.docx), texto (.txt), Markdown (.md) o Python (.py)'),
    h('div', { class: 'row center' },
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => fileInput.click() }, 'Elegir archivos'),
      h('button', { class: 'btn', type: 'button', onclick: () => pasteFlow(kindSelect.value) }, 'Pegar texto'),
    ),
    fileInput,
  );
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    handleFiles([...e.dataTransfer.files], kindSelect.value, statusList);
  });

  const listWrap = h('div');
  listWrapRef = listWrap;
  put(main, 
    h('h1', { tabindex: '-1' }, 'Biblioteca de materiales'),
    h('p', { class: 'lead' }, 'Importa los apuntes y ejercicios de tu asignatura. La aplicación los usará como material principal en los temas y ejercicios.'),
    h('div', { class: 'privacy' },
      h('strong', null, 'Privacidad: '),
      'tus documentos se procesan y guardan solo en este navegador. No se envían a ningún servidor ni a servicios de inteligencia artificial.'),
    h('section', { class: 'card', 'aria-labelledby': 'imp-h' },
      h('h2', { id: 'imp-h' }, 'Importar material'),
      h('div', { class: 'field inline' }, h('label', { for: 'import-kind' }, 'Tipo de material:'), kindSelect,
        h('span', { class: 'help' }, '«Ejercicios» hace que cada punto numerado se trate como un ejercicio.')),
      drop,
      statusList,
    ),
    listWrap,
  );
  renderList(listWrap);
}

function renderList(wrap) {
  clear(wrap);
  const mats = state.materials;
  if (!mats.length) {
    put(wrap, h('section', { class: 'empty' },
      h('h2', null, 'Todavía no has importado ningún material'),
      h('p', null, 'Cuando importes tus apuntes, la aplicación buscará en ellos los temas de la ruta (print, variables, bucles…), los ejercicios y los ejemplos de código, y te los mostrará con la cita del documento y la página o sección.'),
      h('p', { class: 'muted' }, 'Mientras tanto, puedes estudiar con la ruta para principiantes: sus explicaciones están marcadas como «Complemento» porque no proceden de tus documentos.'),
      h('a', { class: 'btn', href: '#/temas' }, 'Ir a la ruta de temas'),
    ));
    return;
  }
  const searchInput = h('input', { type: 'search', id: 'mat-search', placeholder: 'Por ejemplo: bucle while', autocomplete: 'off' });
  const results = h('div', { class: 'search-results', 'aria-live': 'polite' });
  searchInput.addEventListener('input', () => renderSearch(searchInput.value, results));

  put(wrap, 
    h('section', { 'aria-labelledby': 'list-h' },
      h('h2', { id: 'list-h' }, `Tus materiales (${mats.length})`),
      h('ul', { class: 'mat-list' }, mats.map((m) => materialCard(m, wrap))),
    ),
    h('section', { class: 'card', 'aria-labelledby': 'search-h' },
      h('h2', { id: 'search-h' }, 'Buscar en tus materiales'),
      h('div', { class: 'field' }, h('label', { for: 'mat-search' }, 'Palabras a buscar'), searchInput),
      results,
    ),
  );
}

function materialCard(m, wrap) {
  const exCount = state.index.exercises.filter((e) => e.materialId === m.id).length;
  const topics = TOPICS.filter((t) => state.index.byTopic[t.id].some((e) => e.material.id === m.id));
  const replaceInput = h('input', { type: 'file', accept: ACCEPT, hidden: true, onchange: async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) await replaceMaterial(m, file, wrap);
  } });
  const kindSel = h('select', { 'aria-label': `Tipo de «${m.name}»`, onchange: async (e) => {
    m.kind = e.target.value;
    await materialsDB.put(m);
    await loadMaterials();
    toast(`«${m.name}» ahora es de tipo ${KIND_LABEL[m.kind]}.`);
    renderList(wrap);
  } }, Object.entries(KIND_LABEL).map(([v, l]) => h('option', { value: v }, l)));
  kindSel.value = m.kind || 'apuntes';

  return h('li', { class: 'mat-card' },
    h('div', { class: 'mat-main' },
      h('h3', null, h('a', { href: `#/materiales/${m.id}` }, m.name)),
      h('p', { class: 'meta' },
        h('span', { class: 'badge' }, FORMAT_LABEL[m.format] || m.format),
        ` ${m.pages ? m.pages + ' páginas · ' : ''}${m.fragments.length} fragmentos · ${exCount} ejercicio(s) detectado(s) · importado el ${new Date(m.importedAt).toLocaleDateString('es-ES')}`),
      topics.length
        ? h('p', { class: 'chips' }, h('span', { class: 'muted' }, 'Temas encontrados: '), topics.map((t) => h('a', { class: 'chip', href: `#/temas/${t.id}` }, t.title)))
        : h('p', { class: 'muted' }, 'No se han encontrado temas de la ruta en este material (puedes asignarlos a mano desde «Ver contenido»).'),
      m.warnings && m.warnings.length ? h('ul', { class: 'warnings' }, m.warnings.map((w) => h('li', null, w))) : null,
    ),
    h('div', { class: 'mat-actions' },
      h('a', { class: 'btn btn-small', href: `#/materiales/${m.id}` }, 'Ver contenido'),
      h('label', { class: 'sr-only' }, 'Tipo'), kindSel,
      h('button', { class: 'btn btn-small', type: 'button', onclick: () => {
        if (m.format === 'pasted') replacePasted(m, wrap);
        else replaceInput.click();
      } }, m.format === 'pasted' ? 'Editar texto' : 'Volver a cargar'),
      replaceInput,
      h('button', { class: 'btn btn-small btn-danger-soft', type: 'button', onclick: () => removeMaterial(m, wrap) }, 'Quitar'),
    ),
  );
}

async function handleFiles(files, kind, statusList) {
  for (const file of files) {
    const li = h('li', { class: 'st-loading' }, `Leyendo «${file.name}»…`);
    statusList.prepend(li);
    try {
      const material = await importFile(file, { kind });
      await materialsDB.put(material);
      put(clear(li), `✓ «${file.name}» importado: ${material.fragments.length} fragmentos.`);
      li.className = 'st-ok';
      await loadMaterials();
      refreshView();
    } catch (err) {
      if (!(err instanceof ImportError)) console.error(err);
      li.className = 'st-error';
      const msg = err instanceof ImportError ? err.message : `Error inesperado al leer el archivo: ${err.message || err}`;
      put(clear(li), 
        h('strong', null, `No se pudo importar «${file.name}». `), msg, ' ',
        (!(err instanceof ImportError) || err.canPaste)
          ? h('button', { class: 'btn btn-small', type: 'button', onclick: () => pasteFlow(kind, file.name.replace(/\.[^.]+$/, '')) }, 'Pegar el texto a mano')
          : null,
      );
    }
  }
}

async function pasteFlow(kind, title = '') {
  const values = await formDialog({
    title: 'Pegar texto',
    intro: 'Copia el texto de tu documento (Ctrl+C) y pégalo aquí (Ctrl+V). Si tiene títulos, déjalos en su propia línea: así se podrá citar cada sección.',
    fields: [
      { name: 'title', label: 'Nombre del material', value: title, required: true },
      { name: 'kind', label: 'Tipo', type: 'select', value: kind, options: Object.entries(KIND_LABEL) },
      { name: 'text', label: 'Texto', type: 'textarea', rows: 12, required: true },
    ],
    submitText: 'Importar',
  });
  if (!values) return;
  try {
    const material = importPasted(values.title.trim(), values.text, values.kind);
    await materialsDB.put(material);
    await loadMaterials();
    toast(`«${material.name}» importado.`);
    refreshView();
  } catch (err) {
    toast(err.message || String(err), 'error');
  }
}

async function replaceMaterial(m, file, wrap) {
  try {
    const material = await importFile(file, { kind: m.kind, replaceId: m.id });
    material.importedAt = m.importedAt;
    await materialsDB.put(material);
    await loadMaterials();
    toast(`«${m.name}» se ha vuelto a cargar desde «${file.name}».`);
    renderList(wrap);
  } catch (err) {
    toast(err.message || String(err), 'error');
  }
}

async function replacePasted(m, wrap) {
  const values = await formDialog({
    title: `Editar «${m.name}»`,
    fields: [
      { name: 'title', label: 'Nombre', value: m.name, required: true },
      { name: 'text', label: 'Texto', type: 'textarea', rows: 14, value: m.fragments.map((f) => f.text).join('\n\n'), required: true },
    ],
  });
  if (!values) return;
  try {
    const material = importPasted(values.title.trim(), values.text, m.kind, m.id);
    material.importedAt = m.importedAt;
    await materialsDB.put(material);
    await loadMaterials();
    toast('Material actualizado.');
    renderList(wrap);
  } catch (err) {
    toast(err.message || String(err), 'error');
  }
}

async function removeMaterial(m, wrap) {
  const ok = await confirmDialog({
    title: `¿Quitar «${m.name}»?`,
    message: 'Se borrará de este navegador junto con su análisis. Tus notas y estados de ejercicios se conservan por si vuelves a importarlo. Puedes volver a cargar el archivo cuando quieras.',
    confirmText: 'Quitar',
    danger: true,
  });
  if (!ok) return;
  await materialsDB.remove(m.id);
  await loadMaterials();
  toast(`«${m.name}» se ha quitado.`);
  renderList(wrap);
  if (state.workspace) state.workspace.refreshContext();
}

let listWrapRef = null;

/** Vuelve a pintar la lista sin borrar los mensajes de importación. */
function refreshView() {
  if (listWrapRef && listWrapRef.isConnected) renderList(listWrapRef);
  if (state.workspace) state.workspace.refreshContext();
}

function renderSearch(q, results) {
  clear(results);
  const terms = normalize(q).split(/\s+/).filter((t) => t.length >= 2);
  if (!terms.length) return;
  const hits = [];
  for (const m of state.materials) {
    for (const f of m.fragments) {
      const n = normalize(f.text);
      if (terms.every((t) => n.includes(t))) hits.push({ m, f, n });
    }
  }
  if (!hits.length) {
    put(results, h('p', { class: 'muted' }, 'No aparece en tus materiales.'));
    return;
  }
  put(results, h('p', { class: 'muted' }, `${hits.length} fragmento(s) encontrados${hits.length > 20 ? ' (se muestran 20)' : ''}.`));
  for (const { m, f, n } of hits.slice(0, 20)) {
    const pos = Math.max(0, n.indexOf(terms[0]) - 120);
    const excerpt = (pos > 0 ? '…' : '') + f.text.slice(pos, pos + 360) + (f.text.length > pos + 360 ? '…' : '');
    put(results, h('article', { class: 'quote' },
      h('p', { class: 'cite' }, h('a', { href: fragHash(f.id) }, `${m.name} — ${f.label}`)),
      h('p', { class: 'quote-text' }, highlightTerms(excerpt, q.split(/\s+/))),
    ));
  }
}

// ---------------- Detalle de un material ----------------
export function renderMaterial(main, id, fragIndex) {
  const m = materialById(id);
  if (!m) {
    put(main, h('h1', { tabindex: '-1' }, 'Material no encontrado'),
      h('p', null, 'Puede que se haya quitado. '), h('a', { href: '#/materiales' }, 'Volver a la biblioteca'));
    return;
  }
  const exs = state.index.exercises.filter((e) => e.materialId === m.id);
  const snippets = state.index.snippets.filter((s) => s.materialId === m.id);

  put(main, 
    h('p', { class: 'crumbs' }, h('a', { href: '#/materiales' }, '← Biblioteca')),
    h('h1', { tabindex: '-1' }, m.name),
    h('p', { class: 'meta' }, h('span', { class: 'badge' }, FORMAT_LABEL[m.format] || m.format), ' ',
      KIND_LABEL[m.kind] || '', m.fileName ? ` · archivo: ${m.fileName}` : '', ` · ${m.fragments.length} fragmentos`),
    m.warnings && m.warnings.length ? h('ul', { class: 'warnings' }, m.warnings.map((w) => h('li', null, w))) : null,
    h('p', { class: 'muted' }, 'Este es el texto que la aplicación ha podido leer, dividido en fragmentos citables. Debajo de cada fragmento ves a qué temas lo ha asociado (búsqueda automática por palabras clave); puedes corregirlo.'),
  );

  if (exs.length || snippets.length) {
    put(main, h('details', { class: 'card' },
      h('summary', null, `Detectado en este material: ${exs.length} ejercicio(s) y ${snippets.length} fragmento(s) de código`),
      exs.length ? h('ul', null, exs.map((e) => h('li', null, h('a', { href: exHash(e.id) }, e.title), h('span', { class: 'muted' }, ` — ${e.location}`)))) : null,
      snippets.length ? h('ul', null, snippets.map((s) => h('li', null,
        h('code', null, s.code.split('\n')[0].slice(0, 60)), h('span', { class: 'muted' }, ` — ${s.location} `),
        h('button', { class: 'link', type: 'button', onclick: () => state.workspace.loadCode(s.code, `código de «${m.name}», ${s.location}`) }, 'Probar en el editor')))) : null,
    ));
  }

  const list = h('ol', { class: 'frag-list' });
  m.fragments.forEach((f, i) => put(list, fragmentItem(m, f, i, Number(fragIndex) === i)));
  put(main, list);

  if (fragIndex != null) {
    const target = list.children[Number(fragIndex)];
    if (target) setTimeout(() => { target.scrollIntoView({ block: 'start' }); target.focus({ preventScroll: true }); }, 30);
  }
}

function fragmentItem(m, f, i, focused) {
  const chips = h('p', { class: 'chips' });
  const renderChips = () => {
    clear(chips);
    const cur = state.index.fragTopics[f.id] || { assigned: [], manual: false };
    put(chips, h('span', { class: 'muted' }, cur.manual ? 'Temas (asignados por ti): ' : 'Temas (detección automática): '));
    if (!cur.assigned.length) put(chips, h('span', { class: 'muted' }, 'ninguno '));
    cur.assigned.forEach((tid) => put(chips, h('a', { class: 'chip', href: `#/temas/${tid}` }, TOPIC_BY_ID[tid].title)));
    put(chips, h('button', { class: 'link', type: 'button', onclick: () => editTopics(m, f, renderChips) }, 'Cambiar temas'));
    if (cur.manual) put(chips, ' · ', h('button', { class: 'link', type: 'button', onclick: () => { resetFragmentTopics(f.id); renderChips(); } }, 'Volver a la detección automática'));
  };
  renderChips();
  return h('li', { class: focused ? 'frag focused' : 'frag', tabindex: '-1', id: `frag-${i}` },
    h('p', { class: 'cite' }, f.label),
    h('pre', { class: 'frag-text' }, f.text),
    chips,
  );
}

async function editTopics(m, f, done) {
  const cur = (state.index.fragTopics[f.id] || { assigned: [] }).assigned;
  const values = await new Promise((resolve) => {
    const dlg = h('dialog', { class: 'dialog' });
    const boxes = TOPICS.map((t) => {
      const cb = h('input', { type: 'checkbox', value: t.id, checked: cur.includes(t.id), id: `cb-${t.id}` });
      return h('label', { class: 'check', for: `cb-${t.id}` }, cb, ' ', t.title);
    });
    const finish = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(null); });
    put(dlg, 
      h('h2', null, 'Temas de este fragmento'),
      h('p', { class: 'muted' }, `${m.name} — ${f.label}`),
      h('div', { class: 'checks' }, boxes),
      h('div', { class: 'dialog-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => finish(null) }, 'Cancelar'),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () =>
          finish(boxes.map((b) => b.querySelector('input')).filter((i) => i.checked).map((i) => i.value)) }, 'Guardar'),
      ),
    );
    document.body.appendChild(dlg);
    dlg.showModal();
  });
  if (!values) return;
  setFragmentTopics(f.id, values);
  toast('Temas actualizados.');
  done();
}
