// Espacio de código: editor + consola de Python (inspirada en la consola de Thonny).
// - «Ejecutar» ejecuta el editor en un intérprete limpio; después, la consola
//   (>>>) puede usar las variables y funciones del programa, como en Thonny.
// - input() se responde escribiendo en la misma consola.

import { h, put, clear, toast, confirmDialog, downloadText, copyText, debounce } from '../ui.js';
import { CodeEditor } from '../editor.js';
import { explainError } from '../python/errors.js';
import { getProgress, saveProgress, exerciseState } from '../store.js';
import { exHash, navigate } from '../state.js';

const MAX_CONSOLE_CHARS = 200000;
const WIDE = window.matchMedia('(min-width: 1100px)');

export class Workspace {
  constructor(root, runner) {
    this.root = root;
    this.runner = runner;
    this.context = { type: 'scratch' };
    this.replBuffer = [];
    this.history = [];
    this.historyPos = 0;
    this.scratchDirty = false;
    this.build();
    this.bindRunner();
    this.restoreContext();
  }

  // ---------------- Construcción ----------------
  build() {
    this.editor = new CodeEditor({
      onRun: () => this.run(),
      onChange: debounce((v) => this.persist(v), 300),
    });
    this.btnRun = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => this.run(), title: 'Ejecutar el programa (F5)' },
      h('span', { 'aria-hidden': 'true', class: 'ico' }, '▶'), ' Ejecutar');
    this.btnStop = h('button', { class: 'btn btn-danger-soft', type: 'button', onclick: () => this.stop(), disabled: true, title: 'Detener la ejecución' },
      h('span', { 'aria-hidden': 'true', class: 'ico' }, '■'), ' Detener');
    const btnClear = h('button', { class: 'btn', type: 'button', onclick: () => this.clearConsole() }, 'Limpiar consola');
    this.fileInput = h('input', { type: 'file', accept: '.py,.txt', hidden: true, onchange: (e) => this.openFile(e) });

    const more = h('details', { class: 'menu' },
      h('summary', { class: 'btn' }, 'Archivo'),
      h('div', { class: 'menu-list' },
        h('button', { type: 'button', onclick: (e) => { this.copy(); closeMenu(e); } }, 'Copiar código'),
        h('button', { type: 'button', onclick: (e) => { this.save(); closeMenu(e); } }, 'Guardar como .py'),
        h('button', { type: 'button', onclick: (e) => { this.fileInput.click(); closeMenu(e); } }, 'Abrir archivo .py'),
      ),
    );

    this.contextBar = h('div', { class: 'ws-context' });
    this.statusEl = h('span', { class: 'console-status', role: 'status' });
    this.out = h('div', { class: 'console-out', role: 'log', 'aria-label': 'Salida de la consola', tabindex: '0' });
    this.promptEl = h('span', { class: 'console-prompt', 'aria-hidden': 'true' }, '>>>');
    this.input = h('input', {
      class: 'console-input', type: 'text', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off',
      'aria-label': 'Escribe una instrucción de Python y pulsa Intro',
      onkeydown: (e) => this.onConsoleKey(e),
    });
    const form = h('form', { class: 'console-in', onsubmit: (e) => { e.preventDefault(); this.submitConsole(); } },
      this.promptEl, this.input);

    put(this.root, 
      h('div', { class: 'ws-head' },
        this.contextBar,
        h('div', { class: 'ws-toolbar', role: 'toolbar', 'aria-label': 'Acciones del código' },
          this.btnRun, this.btnStop, btnClear, more, this.fileInput),
      ),
      h('div', { class: 'ws-editor' }, this.editor.el),
      h('p', { id: 'editor-help', class: 'editor-help' },
        'F5 o Ctrl+Intro: ejecutar · Tab: sangría · Ctrl+/: comentar · Esc y después Tab: salir del editor'),
      h('section', { class: 'console', 'aria-label': 'Consola de Python' },
        h('div', { class: 'console-head' }, h('h2', null, 'Consola'), this.statusEl),
        this.out,
        form,
      ),
    );
    this.writeInfo('Consola de Python. Escribe instrucciones después de >>> o ejecuta el programa del editor.\n');
  }

  bindRunner() {
    const r = this.runner;
    r.on('output', (kind, text) => this.write(text, kind === 'err' || kind === 'info' ? kind : 'out'));
    r.on('input', (prompt) => {
      this.promptEl.textContent = '⌨';
      this.input.placeholder = 'Escribe tu respuesta y pulsa Intro';
      this.input.setAttribute('aria-label', `El programa espera un dato${prompt ? ': ' + prompt : ''}. Escríbelo y pulsa Intro`);
      this.input.disabled = false;
      this.root.classList.add('waiting-input');
      this.input.focus({ preventScroll: true });
      this.scrollConsole();
    });
    r.on('status', (s) => this.updateStatus(s));
    this.updateStatus(r.state);
  }

  updateStatus(s) {
    const labels = {
      loading: 'Cargando Python…',
      ready: `Python ${this.runner.version || ''} listo`,
      running: 'Ejecutando…',
      'waiting-input': 'Esperando tu respuesta…',
      error: 'Python no se pudo cargar',
    };
    this.statusEl.textContent = labels[s] || '';
    this.statusEl.dataset.state = s;
    const top = document.getElementById('py-status');
    if (top) { top.textContent = labels[s] || ''; top.dataset.state = s; }
    const busy = s === 'running' || s === 'waiting-input';
    this.btnRun.disabled = busy || s === 'loading' || s === 'error';
    this.btnStop.disabled = !busy;
    if (s !== 'waiting-input') {
      this.root.classList.remove('waiting-input');
      this.promptEl.textContent = this.replBuffer.length ? '...' : '>>>';
      this.input.placeholder = s === 'running' ? 'Ejecutando…' : '';
      this.input.setAttribute('aria-label', 'Escribe una instrucción de Python y pulsa Intro');
      this.input.disabled = s === 'running' || s === 'loading';
    }
    if (s === 'error') {
      this.writeInfo(`No se pudo cargar Python: ${this.runner.loadError}\n¿Has abierto la aplicación con «npm start»? Recarga la página para reintentarlo.\n`, 'err');
    }
    if (s === 'ready' && !this.announcedReady) {
      this.announcedReady = true;
      this.writeInfo(`Python ${this.runner.version} listo (se ejecuta dentro de tu navegador, sin acceso a tus archivos).\n`);
      if (!this.runner.isolated) {
        this.writeInfo('Aviso: el navegador no permite memoria compartida en esta página, así que input() y «Detener» funcionan de forma limitada. Abre la app con «npm start».\n', 'err');
      }
    }
  }

  // ---------------- Contexto: borrador o ejercicio ----------------
  restoreContext() {
    const p = getProgress();
    const ctx = p.context || { type: 'scratch' };
    if (ctx.type === 'exercise') {
      // El ejercicio puede no existir aún (materiales cargándose): se resuelve en refreshContext().
      this.context = ctx;
      const st = exerciseState(ctx.id);
      this.editor.value = st.attempt ?? '';
    } else {
      this.context = { type: 'scratch' };
      this.editor.value = p.scratch || '';
    }
    this.renderContext();
  }

  /** Vuelve a pintar la barra de contexto (p. ej. cuando cambian los materiales). */
  refreshContext() {
    if (this.context.type === 'exercise' && !this.findExercise(this.context.id)) {
      this.context = { type: 'scratch' };
      this.editor.value = getProgress().scratch || '';
      getProgress().context = this.context;
      saveProgress();
    }
    this.renderContext();
  }

  findExercise(id) {
    return this.exerciseLookup ? this.exerciseLookup(id) : null;
  }

  renderContext() {
    clear(this.contextBar);
    if (this.context.type === 'exercise') {
      const ex = this.findExercise(this.context.id);
      const title = ex ? ex.title : 'Ejercicio';
      put(this.contextBar, 
        h('span', { class: 'ctx-label' }, h('span', { class: 'muted' }, 'Ejercicio: '), h('strong', null, title)),
        h('span', { class: 'ctx-actions' },
          h('a', { class: 'link', href: exHash(this.context.id) }, 'Ver enunciado'),
          h('button', { class: 'link', type: 'button', onclick: () => this.useScratch() }, 'Volver al borrador'),
        ),
      );
    } else {
      put(this.contextBar, h('span', { class: 'ctx-label' }, h('strong', null, 'Borrador'),
        h('span', { class: 'muted' }, ' · se guarda solo en este navegador')));
    }
  }

  persist(value) {
    const p = getProgress();
    if (this.context.type === 'exercise') {
      exerciseState(this.context.id).attempt = value;
    } else {
      p.scratch = value;
      this.scratchDirty = true;
    }
    saveProgress();
  }

  useScratch() {
    this.persist(this.editor.value);
    this.context = { type: 'scratch' };
    getProgress().context = this.context;
    saveProgress();
    this.editor.value = getProgress().scratch || '';
    this.renderContext();
  }

  /** Abre un ejercicio en el editor (con tu intento guardado o el código inicial). */
  openExercise(ex) {
    if (this.context.type !== 'exercise' || this.context.id !== ex.id) this.persist(this.editor.value);
    this.context = { type: 'exercise', id: ex.id };
    getProgress().context = this.context;
    const st = exerciseState(ex.id);
    if (st.attempt == null) st.attempt = ex.starter || '';
    saveProgress();
    this.editor.value = st.attempt;
    this.renderContext();
    this.reveal();
  }

  /** Carga un código en el borrador (p. ej. «Probar en el editor»). */
  async loadCode(code, label) {
    if (this.context.type === 'exercise') {
      this.persist(this.editor.value);
      this.context = { type: 'scratch' };
      getProgress().context = this.context;
    }
    const current = (getProgress().scratch || '').trim();
    if (this.scratchDirty && current && current !== code.trim()) {
      const ok = await confirmDialog({
        title: '¿Sustituir el borrador?',
        message: 'El borrador tiene código que has escrito tú. Si continúas, se sustituirá por el ejemplo. (Puedes guardarlo antes con Archivo › Guardar como .py.)',
        confirmText: 'Sustituir',
      });
      if (!ok) { this.renderContext(); this.reveal(); return; }
    }
    getProgress().scratch = code;
    saveProgress();
    this.scratchDirty = false;
    this.editor.value = code;
    this.renderContext();
    if (label) this.writeInfo(`Cargado en el editor: ${label}\n`);
    this.reveal();
  }

  /** Muestra el panel de código (en móvil, cambia a la vista «Código»). */
  reveal() {
    if (WIDE.matches) {
      document.body.classList.remove('ws-hidden');
      const t = document.getElementById('toggle-ws');
      if (t) t.setAttribute('aria-pressed', 'true');
    } else if (!location.hash.startsWith('#/codigo')) {
      navigate('#/codigo');
    }
    setTimeout(() => this.editor.focus(), 50);
  }

  // ---------------- Ejecución ----------------
  async run() {
    if (this.runner.busy) { toast('Ya hay un programa en marcha. Pulsa «Detener» si quieres pararlo.', 'error'); return; }
    if (this.runner.state === 'loading') { this.writeInfo('Python todavía se está cargando; espera un momento…\n'); return; }
    this.editor.clearError();
    this.replBuffer = [];
    const name = this.context.type === 'exercise' ? (this.findExercise(this.context.id)?.title || 'ejercicio') : 'borrador';
    this.writeInfo(`\n▶ Ejecutando ${name}\n`, 'run');
    const res = await this.runner.runEditor(this.editor.value);
    this.handleResult(res);
  }

  stop() {
    if (!this.runner.busy) return;
    this.runner.stop();
  }

  handleResult(res) {
    if (res.notReady) { this.writeInfo('Python no está listo todavía.\n'); return; }
    if (res.busy) { this.writeInfo('Ya hay algo ejecutándose.\n'); return; }
    if (res.stopped || res.timedOut) {
      const prev = this.out.textContent;
      this.writeInfo(`${prev && !prev.endsWith('\n') ? '\n' : ''}■ Ejecución detenida.\n`, 'err');
      if (res.restarted) this.writeInfo('Python se ha reiniciado: las variables anteriores se han borrado.\n');
      return;
    }
    if (res.internal) { this.writeInfo(`Error interno de la aplicación: ${res.internal}\n`, 'err'); return; }
    if (res.error) this.showError(res.error);
  }

  showError(err) {
    this.write(err.traceback, 'err');
    const ex = explainError(err);
    const card = h('div', { class: 'err-card', role: 'note' },
      h('p', { class: 'err-title' }, h('span', { 'aria-hidden': 'true' }, '💡 '), ex.title,
        err.line ? ` (línea ${err.line}${err.source === '<consola>' ? ' de la consola' : ''})` : ''),
      h('p', null, ex.text),
      ex.detail ? h('p', null, ex.detail) : null,
      ex.tips.length ? h('ul', null, ex.tips.map((t) => h('li', null, t))) : null,
    );
    if (err.source === '<editor>' && err.line) {
      this.editor.markError(err.line);
      put(card, h('button', { class: 'btn btn-small', type: 'button', onclick: () => this.editor.goToLine(err.line) }, `Ir a la línea ${err.line}`));
    }
    this.out.appendChild(card);
    this.chars = (this.chars || 0) + card.textContent.length;
    this.lastSpan = null;
    this.scrollConsole();
  }

  // ---------------- Consola ----------------
  // Se añaden nodos de texto (no se concatena) y se lleva la cuenta de caracteres,
  // para que una salida enorme no bloquee la página.
  write(text, kind = 'out') {
    if (!text) return;
    if (!(this.lastSpan && this.lastSpan.dataset.kind === kind && this.lastSpan.parentNode === this.out)) {
      this.lastSpan = h('span', { class: `c-${kind}`, dataset: { kind } });
      this.out.appendChild(this.lastSpan);
    }
    this.lastSpan.appendChild(document.createTextNode(text));
    this.chars = (this.chars || 0) + text.length;
    this.trimConsole();
    this.scrollConsole();
  }

  writeInfo(text, kind = 'info') {
    this.write(text, kind);
  }

  trimConsole() {
    while (this.chars > MAX_CONSOLE_CHARS && this.out.firstChild) {
      const first = this.out.firstChild;
      if (first.nodeName === 'SPAN' && first.childNodes.length > 1) {
        this.chars -= first.firstChild.textContent.length;
        first.removeChild(first.firstChild);
      } else {
        this.chars -= first.textContent.length;
        this.out.removeChild(first);
        if (first === this.lastSpan) this.lastSpan = null;
      }
    }
  }

  scrollConsole() {
    if (this.scrollPending) return;
    this.scrollPending = true;
    requestAnimationFrame(() => {
      this.scrollPending = false;
      this.out.scrollTop = this.out.scrollHeight;
    });
  }

  clearConsole() {
    clear(this.out);
    this.chars = 0;
    this.lastSpan = null;
    this.editor.clearError();
  }

  async submitConsole() {
    const text = this.input.value;
    if (this.runner.waitingInput) {
      this.input.value = '';
      this.write(text + '\n', 'input');
      this.runner.sendInput(text);
      return;
    }
    if (this.runner.busy || this.runner.state !== 'ready') return;
    this.input.value = '';
    const prompt = this.replBuffer.length ? '... ' : '>>> ';
    this.write(prompt + text + '\n', 'echo');
    if (!this.replBuffer.length && !text.trim()) return;
    if (text.trim()) { this.history.push(text); }
    this.historyPos = this.history.length;
    this.replBuffer.push(text);
    const res = await this.runner.runRepl(this.replBuffer.join('\n'));
    if (res.more) {
      this.promptEl.textContent = '...';
      const indent = text.match(/^ */)[0] + (/:\s*$/.test(text) ? '    ' : '');
      this.input.value = indent;
    } else {
      this.replBuffer = [];
      this.promptEl.textContent = '>>>';
      this.handleResult(res);
    }
    this.input.focus();
  }

  onConsoleKey(e) {
    if (this.runner.waitingInput) return;
    if (e.key === 'ArrowUp' && this.history.length) {
      e.preventDefault();
      this.historyPos = Math.max(0, this.historyPos - 1);
      this.input.value = this.history[this.historyPos];
    } else if (e.key === 'ArrowDown' && this.history.length) {
      e.preventDefault();
      this.historyPos = Math.min(this.history.length, this.historyPos + 1);
      this.input.value = this.history[this.historyPos] || '';
    } else if (e.key === 'Tab' && this.replBuffer.length) {
      e.preventDefault();
      this.input.setRangeText('    ', this.input.selectionStart, this.input.selectionEnd, 'end');
    }
  }

  // ---------------- Archivo ----------------
  fileName() {
    if (this.context.type === 'exercise') {
      const ex = this.findExercise(this.context.id);
      const base = (ex ? ex.title : 'ejercicio').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
      return `${base || 'ejercicio'}.py`;
    }
    return 'borrador.py';
  }

  async copy() {
    const ok = await copyText(this.editor.value);
    toast(ok ? 'Código copiado al portapapeles.' : 'No se pudo copiar. Selecciona el código y pulsa Ctrl+C.', ok ? 'ok' : 'error');
  }

  save() {
    downloadText(this.fileName(), this.editor.value);
    toast(`Descargando «${this.fileName()}» en tu carpeta de descargas.`);
  }

  async openFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) { toast('El archivo es demasiado grande para el editor (máx. 1 MB).', 'error'); return; }
    const text = await file.text();
    if (this.editor.value.trim()) {
      const ok = await confirmDialog({
        title: 'Abrir archivo',
        message: `Se sustituirá el código del editor por el de «${file.name}». ¿Continuar?`,
        confirmText: 'Abrir',
      });
      if (!ok) return;
    }
    this.editor.value = text;
    this.persist(text);
    toast(`Abierto «${file.name}».`);
  }

  // ---------------- Pruebas de ejercicios ----------------
  codeForExercise(ex) {
    if (this.context.type === 'exercise' && this.context.id === ex.id) return this.editor.value;
    const st = exerciseState(ex.id);
    return st.attempt ?? ex.starter ?? '';
  }
}

function closeMenu(e) {
  const d = e.target.closest('details');
  if (d) d.open = false;
}
