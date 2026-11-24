// Utilidades de interfaz: creación de elementos, avisos y diálogos.
// Nunca usamos innerHTML con texto de los documentos: siempre nodos de texto,
// así el contenido importado no puede inyectar código en la página.

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

/** Como el.append(), pero ignora null/false y aplana listas. Devuelve el elemento. */
export function put(el, ...children) {
  append(el, children);
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/**
 * Convierte un texto con marcas mínimas en nodos:
 *  `código` -> <code>, **negrita** -> <strong>
 * Solo para el contenido propio de la app (explicaciones), no para documentos.
 */
export function rich(text) {
  const out = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(h('code', null, m[1]));
    else out.push(h('strong', null, m[2]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Resalta (con <mark>) las palabras dadas dentro de un texto plano. */
export function highlightTerms(text, terms) {
  if (!terms || !terms.length) return [text];
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const nText = norm(text);
  const ranges = [];
  for (const t of terms) {
    const nt = norm(t);
    if (nt.length < 2) continue;
    let i = 0;
    while ((i = nText.indexOf(nt, i)) !== -1) {
      ranges.push([i, i + nt.length]);
      i += nt.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out = [];
  let pos = 0;
  for (const [s, e] of ranges) {
    if (s < pos) continue;
    if (s > pos) out.push(text.slice(pos, s));
    out.push(h('mark', null, text.slice(s, e)));
    pos = e;
  }
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}

// ---------- Avisos breves («toasts») ----------
export function toast(message, kind = 'ok') {
  const region = document.getElementById('toasts');
  const el = h('div', { class: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' }, message);
  region.appendChild(el);
  setTimeout(() => el.classList.add('leaving'), 3800);
  setTimeout(() => el.remove(), 4300);
}

// ---------- Diálogos modales ----------
function openDialog(build) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'dialog' });
    const close = (value) => {
      dlg.close();
      dlg.remove();
      resolve(value);
    };
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(null); });
    build(dlg, close);
    document.body.appendChild(dlg);
    dlg.showModal();
  });
}

export function confirmDialog({ title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', danger = false }) {
  return openDialog((dlg, close) => {
    dlg.append(
      h('h2', null, title),
      h('p', null, message),
      h('div', { class: 'dialog-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => close(false) }, cancelText),
        h('button', { class: danger ? 'btn btn-danger' : 'btn btn-primary', type: 'button', onclick: () => close(true) }, confirmText),
      ),
    );
  }).then((v) => v === true);
}

/** Diálogo con formulario. fields: [{name,label,type:'text'|'textarea'|'select',options,value,required,help}] */
export function formDialog({ title, intro, fields, submitText = 'Guardar' }) {
  return openDialog((dlg, close) => {
    const form = h('form', { method: 'dialog', class: 'form' });
    if (intro) form.append(h('p', { class: 'muted' }, intro));
    const inputs = {};
    for (const f of fields) {
      const id = `f-${f.name}-${Math.random().toString(36).slice(2, 7)}`;
      let input;
      if (f.type === 'textarea') {
        input = h('textarea', { id, rows: f.rows || 10, required: f.required, spellcheck: 'false' });
        input.value = f.value || '';
      } else if (f.type === 'select') {
        input = h('select', { id }, f.options.map(([v, l]) => h('option', { value: v }, l)));
        if (f.value) input.value = f.value;
      } else {
        input = h('input', { id, type: 'text', required: f.required, value: f.value || '' });
      }
      inputs[f.name] = input;
      form.append(h('div', { class: 'field' },
        h('label', { for: id }, f.label),
        input,
        f.help ? h('p', { class: 'help' }, f.help) : null,
      ));
    }
    form.append(h('div', { class: 'dialog-actions' },
      h('button', { class: 'btn', type: 'button', onclick: () => close(null) }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', type: 'submit' }, submitText),
    ));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const values = {};
      for (const [k, el] of Object.entries(inputs)) values[k] = el.value;
      close(values);
    });
    dlg.append(h('h2', null, title), form);
  });
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function downloadText(filename, text, type = 'text/x-python') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Alternativa para navegadores que no permiten el portapapeles moderno.
    const ta = h('textarea', { style: 'position:fixed;opacity:0' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
