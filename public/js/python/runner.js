// Controla el Worker de Python desde la página.
// Ofrece una API sencilla: runEditor, runRepl, runTests, runSnippet, sendInput, stop.

const STOP_GRACE_MS = 1500; // si Python no se detiene en este tiempo, se reinicia el worker

export class PythonRunner {
  constructor() {
    this.listeners = { output: [], input: [], status: [] };
    this.state = 'loading';
    this.version = '';
    this.loadError = '';
    this.pending = null; // { id, resolve, kind }
    this.nextId = 1;
    this.waitingInput = false;
    this.stopRequested = false;
    this.isolated = typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated === true;
    this.start();
  }

  on(event, fn) { this.listeners[event].push(fn); }
  emit(event, ...args) { for (const fn of this.listeners[event]) fn(...args); }

  setState(state) {
    this.state = state;
    this.emit('status', state);
  }

  start() {
    this.setState('loading');
    this.worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    const init = { type: 'init' };
    if (this.isolated) {
      this.ctrlBuffer = new SharedArrayBuffer(8);
      this.dataBuffer = new SharedArrayBuffer(64 * 1024);
      this.interruptBuffer = new SharedArrayBuffer(1);
      this.ctrl = new Int32Array(this.ctrlBuffer);
      this.data = new Uint8Array(this.dataBuffer);
      this.interrupt = new Uint8Array(this.interruptBuffer);
      Object.assign(init, {
        ctrlBuffer: this.ctrlBuffer,
        dataBuffer: this.dataBuffer,
        interruptBuffer: this.interruptBuffer,
      });
    }
    this.worker.onmessage = (ev) => this.handle(ev.data);
    this.worker.onerror = (ev) => {
      this.loadError = ev.message || 'No se pudo iniciar Python.';
      this.setState('error');
    };
    this.worker.postMessage(init);
  }

  handle(msg) {
    switch (msg.type) {
      case 'ready':
        this.version = msg.version;
        this.setState('ready');
        break;
      case 'load-error':
        this.loadError = msg.message;
        this.setState('error');
        break;
      case 'out':
        if (this.pending && this.pending.silent) break;
        this.emit('output', msg.kind, msg.text);
        break;
      case 'input-request':
        this.waitingInput = true;
        this.setState('waiting-input');
        this.emit('input', msg.prompt);
        break;
      case 'done': {
        const p = this.pending;
        if (!p || p.id !== msg.id) break;
        this.finish(msg.result || {});
        break;
      }
    }
  }

  finish(result) {
    const p = this.pending;
    this.pending = null;
    this.waitingInput = false;
    clearTimeout(this.timeoutTimer);
    clearTimeout(this.killTimer);
    if (p.timedOut) result.timedOut = true;
    else if (this.stopRequested) result.stopped = true;
    this.stopRequested = false;
    if (this.state !== 'error' && this.state !== 'loading') this.setState('ready');
    p.resolve(result);
  }

  get busy() { return !!this.pending; }

  run(type, payload, { silent = false, timeoutMs = 0 } = {}) {
    if (this.state === 'loading') return Promise.resolve({ ok: false, notReady: true });
    if (this.state === 'error') return Promise.resolve({ ok: false, notReady: true });
    if (this.pending) return Promise.resolve({ ok: false, busy: true });
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending = { id, resolve, silent, type };
      this.stopRequested = false;
      if (this.interrupt) this.interrupt[0] = 0;
      this.setState('running');
      this.worker.postMessage({ type, id, ...payload });
      if (timeoutMs) {
        this.timeoutTimer = setTimeout(() => {
          if (this.pending && this.pending.id === id) {
            this.pending.timedOut = true;
            this.stop();
          }
        }, timeoutMs);
      }
    });
  }

  runEditor(code) { return this.run('run-editor', { code }); }
  runRepl(code) { return this.run('run-repl', { code }); }
  runTests(code, tests) { return this.run('run-tests', { code, tests }, { silent: true, timeoutMs: 5000 }); }
  runSnippet(code) { return this.run('run-snippet', { code }, { silent: true, timeoutMs: 5000 }); }

  sendInput(text) {
    if (!this.waitingInput || !this.ctrl) return false;
    const bytes = new TextEncoder().encode(text);
    const len = Math.min(bytes.length, this.data.length);
    this.data.set(bytes.subarray(0, len));
    Atomics.store(this.ctrl, 1, len);
    Atomics.store(this.ctrl, 0, 1);
    Atomics.notify(this.ctrl, 0);
    this.waitingInput = false;
    this.setState('running');
    return true;
  }

  /** Detiene la ejecución actual. Si Python no responde, reinicia el worker. */
  stop() {
    if (!this.pending) return;
    this.stopRequested = true;
    if (this.waitingInput && this.ctrl) {
      // Está esperando input(): le avisamos para que termine.
      Atomics.store(this.ctrl, 0, 2);
      Atomics.notify(this.ctrl, 0);
    } else if (this.interrupt) {
      this.interrupt[0] = 2; // SIGINT -> KeyboardInterrupt dentro de Python
    }
    clearTimeout(this.killTimer);
    this.killTimer = setTimeout(() => {
      if (this.pending) this.hardRestart();
    }, this.interrupt ? STOP_GRACE_MS : 0);
  }

  /** Termina el worker a la fuerza y arranca uno nuevo (se pierden las variables). */
  hardRestart() {
    const p = this.pending;
    this.worker.terminate();
    this.pending = null;
    this.waitingInput = false;
    clearTimeout(this.timeoutTimer);
    this.start();
    if (p) p.resolve({ ok: false, stopped: true, restarted: true, timedOut: !!p.timedOut });
    this.stopRequested = false;
  }
}
