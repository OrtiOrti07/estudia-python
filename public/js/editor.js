// Editor de código sencillo para principiantes.
// Es un <textarea> (accesible, con deshacer/rehacer nativo) con:
// - numeración de líneas,
// - coloreado de sintaxis (una capa <pre> detrás del texto),
// - sangría automática y Tab = 4 espacios,
// - marcado de la línea donde se produjo un error.
// No usamos una biblioteca de editor para evitar un paso de compilación.

import { h } from './ui.js';

const KEYWORDS = new Set(('False None True and as assert async await break class continue def del elif else except ' +
  'finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case').split(' '));
const BUILTINS = new Set(('print input int float str bool len range list dict set tuple type abs min max sum round ' +
  'sorted reversed enumerate zip open isinstance chr ord any all map filter format').split(' '));

const TOKEN_RE = /(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|[rRfFbBuU]{0,2}"(?:\\.|[^"\\\n])*"?|[rRfFbBuU]{0,2}'(?:\\.|[^'\\\n])*'?)|\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b([A-Za-z_]\w*)\b/g;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightPython(code) {
  let out = '';
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(code))) {
    out += esc(code.slice(last, m.index));
    const [tok, comment, str, num, word] = m;
    if (comment) out += `<span class="tk-com">${esc(tok)}</span>`;
    else if (str) out += `<span class="tk-str">${esc(tok)}</span>`;
    else if (num) out += `<span class="tk-num">${esc(tok)}</span>`;
    else if (word && KEYWORDS.has(word)) out += `<span class="tk-kw">${esc(tok)}</span>`;
    else if (word && BUILTINS.has(word)) out += `<span class="tk-bi">${esc(tok)}</span>`;
    else out += esc(tok);
    last = TOKEN_RE.lastIndex;
    if (m[0].length === 0) TOKEN_RE.lastIndex++;
  }
  out += esc(code.slice(last));
  return out;
}

export class CodeEditor {
  constructor({ onChange, onRun, label = 'Editor de código Python' } = {}) {
    this.onChange = onChange;
    this.onRun = onRun;
    this.escapePressed = false;

    this.gutterInner = h('div', { class: 'gutter-inner' });
    this.highlightCode = h('code');
    this.highlightPre = h('pre', { class: 'editor-highlight', 'aria-hidden': 'true' }, this.highlightCode);
    this.errLine = h('div', { class: 'editor-errline', hidden: true });
    this.textarea = h('textarea', {
      class: 'editor-input',
      spellcheck: 'false',
      wrap: 'off',
      autocapitalize: 'off',
      autocomplete: 'off',
      autocorrect: 'off',
      'aria-label': label,
      'aria-describedby': 'editor-help',
    });
    this.el = h('div', { class: 'editor' },
      h('div', { class: 'editor-gutter', 'aria-hidden': 'true' }, this.gutterInner),
      h('div', { class: 'editor-main' }, this.highlightPre, this.errLine, this.textarea),
    );

    this.textarea.addEventListener('input', () => {
      this.clearError();
      this.refresh();
      if (this.onChange) this.onChange(this.value);
    });
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    this.textarea.addEventListener('keydown', (e) => this.onKey(e));
    new ResizeObserver(() => this.syncScroll()).observe(this.textarea);
  }

  get value() { return this.textarea.value; }
  set value(v) {
    this.textarea.value = v;
    this.clearError();
    this.refresh();
  }

  focus() { this.textarea.focus(); }

  refresh() {
    const text = this.textarea.value;
    // El \n final evita que la última línea vacía quede desalineada.
    this.highlightCode.innerHTML = highlightPython(text) + '\n';
    const lines = text.split('\n').length;
    if (lines !== this.lineCount) {
      this.lineCount = lines;
      let s = '';
      for (let i = 1; i <= lines; i++) s += i + '\n';
      this.gutterInner.textContent = s;
    }
    this.syncScroll();
  }

  syncScroll() {
    const { scrollTop, scrollLeft } = this.textarea;
    this.highlightPre.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    this.gutterInner.style.transform = `translateY(${-scrollTop}px)`;
    if (this.errorLine) this.positionErrLine();
  }

  lineHeight() {
    return parseFloat(getComputedStyle(this.textarea).lineHeight) || 21;
  }

  /** Marca una línea con error y la hace visible. */
  markError(line) {
    if (!line || line < 1) return;
    this.errorLine = line;
    this.errLine.hidden = false;
    this.positionErrLine();
    const lh = this.lineHeight();
    const top = (line - 1) * lh;
    const ta = this.textarea;
    if (top < ta.scrollTop || top > ta.scrollTop + ta.clientHeight - lh * 2) {
      ta.scrollTop = Math.max(0, top - ta.clientHeight / 3);
    }
  }

  positionErrLine() {
    const pad = parseFloat(getComputedStyle(this.textarea).paddingTop) || 0;
    this.errLine.style.top = `${pad + (this.errorLine - 1) * this.lineHeight() - this.textarea.scrollTop}px`;
    this.errLine.style.height = `${this.lineHeight()}px`;
  }

  clearError() {
    this.errorLine = null;
    this.errLine.hidden = true;
  }

  /** Coloca el cursor al principio de una línea. */
  goToLine(line) {
    const lines = this.value.split('\n');
    let pos = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
    this.textarea.focus();
    this.textarea.setSelectionRange(pos, pos);
  }

  insert(text) {
    // execCommand conserva el historial de deshacer (Ctrl+Z).
    const ok = document.execCommand && document.execCommand('insertText', false, text);
    if (!ok) {
      const ta = this.textarea;
      ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  }

  selectedLineRange() {
    const ta = this.textarea;
    const v = ta.value;
    const start = v.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    let end = v.indexOf('\n', ta.selectionEnd - (ta.selectionEnd > ta.selectionStart && v[ta.selectionEnd - 1] === '\n' ? 1 : 0));
    if (end === -1) end = v.length;
    return [start, end];
  }

  transformLines(fn) {
    const ta = this.textarea;
    const [start, end] = this.selectedLineRange();
    const block = ta.value.slice(start, end);
    const changed = block.split('\n').map(fn).join('\n');
    ta.setSelectionRange(start, end);
    this.insert(changed);
    ta.setSelectionRange(start, start + changed.length);
  }

  onKey(e) {
    const ta = this.textarea;
    if (e.key === 'Escape') { this.escapePressed = true; return; }
    if (e.key === 'F5' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      if (this.onRun) this.onRun();
      return;
    }
    if (e.key === 'Tab') {
      if (this.escapePressed) { this.escapePressed = false; return; } // permite salir con el teclado
      e.preventDefault();
      const multi = ta.value.slice(ta.selectionStart, ta.selectionEnd).includes('\n');
      if (e.shiftKey) this.transformLines((l) => l.replace(/^ {1,4}/, ''));
      else if (multi) this.transformLines((l) => (l.length ? '    ' + l : l));
      else {
        const col = ta.selectionStart - (ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1);
        this.insert(' '.repeat(4 - (col % 4)));
      }
      return;
    }
    this.escapePressed = false;
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const before = ta.value.slice(0, ta.selectionStart);
      const lineStart = before.lastIndexOf('\n') + 1;
      const line = before.slice(lineStart);
      let indent = line.match(/^ */)[0];
      if (/:\s*(#.*)?$/.test(line)) indent += '    ';
      this.insert('\n' + indent);
      return;
    }
    if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd) {
      const before = ta.value.slice(0, ta.selectionStart);
      const line = before.slice(before.lastIndexOf('\n') + 1);
      if (line.length >= 4 && /^ +$/.test(line)) {
        e.preventDefault();
        const n = line.length % 4 || 4;
        ta.setSelectionRange(ta.selectionStart - n, ta.selectionStart);
        this.insert('');
      }
      return;
    }
    if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const [start, end] = this.selectedLineRange();
      const lines = ta.value.slice(start, end).split('\n');
      const allCommented = lines.filter((l) => l.trim()).every((l) => /^\s*#/.test(l));
      this.transformLines((l) => {
        if (!l.trim()) return l;
        return allCommented ? l.replace(/^(\s*)# ?/, '$1') : l.replace(/^(\s*)/, '$1# ');
      });
    }
  }
}
