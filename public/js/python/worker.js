// Web Worker que ejecuta Python con Pyodide (Python compilado a WebAssembly).
//
// Por qué un Worker:
// - El código del usuario corre fuera de la página principal: si hace un bucle
//   infinito, la interfaz sigue respondiendo y podemos detenerlo.
// - Pyodide vive dentro del «sandbox» del navegador: no puede leer tus archivos
//   del disco, ni ejecutar comandos del sistema. Su sistema de archivos es
//   virtual y está en memoria. Además, la política CSP del servidor impide que
//   haga peticiones de red a otros sitios.
//
// Comunicación con la página (mensajes):
//   página -> worker: init, run-editor, run-repl, run-tests, run-snippet
//   worker -> página: ready, load-error, out, input-request, done

import { loadPyodide } from '../../vendor/pyodide/pyodide.mjs';

let pyodide = null;
let ctrl = null;      // Int32Array compartido: [estado, longitud] para input()
let inputData = null; // Uint8Array compartido con el texto escrito por el usuario
let currentRunId = null;
let interruptArr = null;
const NO_SAB = '@@sin-memoria-compartida@@';

// ---------- Salida con búfer (evita enviar miles de mensajes) ----------
// Un bucle infinito con print() puede generar millones de líneas: se envía como
// mucho una tanda cada 50 ms y, por ejecución, un máximo de MAX_RUN_OUTPUT caracteres.
const MAX_RUN_OUTPUT = 400000;
const FLUSH_MS = 50;
let outBuf = '';
let outKind = 'out';
let lastFlush = 0;
let sentThisRun = 0;
let truncated = false;

function flushOut() {
  if (outBuf) {
    postMessage({ type: 'out', id: currentRunId, kind: outKind, text: outBuf });
    sentThisRun += outBuf.length;
    outBuf = '';
  }
  lastFlush = performance.now();
}

function write(kind, text) {
  if (truncated) return;
  if (kind !== outKind) {
    flushOut();
    outKind = kind;
  }
  outBuf += text;
  if (sentThisRun + outBuf.length > MAX_RUN_OUTPUT) {
    outBuf = outBuf.slice(0, Math.max(0, MAX_RUN_OUTPUT - sentThisRun));
    flushOut();
    truncated = true;
    postMessage({ type: 'out', id: currentRunId, kind: 'info',
      text: '\n[La salida es demasiado larga: no se muestra el resto. Si es un bucle infinito, pulsa «Detener».]\n' });
    return;
  }
  if (performance.now() - lastFlush > FLUSH_MS) flushOut();
}

function resetOutput() {
  outBuf = '';
  outKind = 'out';
  sentThisRun = 0;
  truncated = false;
  lastFlush = performance.now();
}

// ---------- input(): espera bloqueante con Atomics ----------
// Devuelve el texto escrito o null si el usuario pulsó «Detener».
function readLine(prompt) {
  flushOut();
  if (!ctrl) return NO_SAB; // sin memoria compartida: input() no disponible
  Atomics.store(ctrl, 0, 0);
  postMessage({ type: 'input-request', id: currentRunId, prompt });
  for (;;) {
    Atomics.wait(ctrl, 0, 0, 250);
    const state = Atomics.load(ctrl, 0);
    if (state === 1) {
      const len = Atomics.load(ctrl, 1);
      const text = new TextDecoder().decode(inputData.slice(0, len));
      Atomics.store(ctrl, 0, 0);
      return text;
    }
    if (state === 2) {
      Atomics.store(ctrl, 0, 0);
      return null;
    }
  }
}

// ---------- Código Python auxiliar (no visible para el usuario) ----------
const HARNESS = String.raw`
import sys, io, builtins, traceback, linecache, codeop, json

USER_FILES = ('<editor>', '<consola>', '<prueba>')

class _Writer(io.TextIOBase):
    def __init__(self, kind):
        self._kind = kind
    def writable(self):
        return True
    def write(self, s):
        s = str(s)
        _js_write(self._kind, s)
        return len(s)
    def flush(self):
        pass

_real_out = _Writer('out')
_real_err = _Writer('err')
sys.stdout = _real_out
sys.stderr = _real_err

class _StopRequested(BaseException):
    pass

def _interactive_input(prompt=''):
    prompt = str(prompt)
    sys.stdout.write(prompt)
    line = _js_read_line(prompt)
    if line is None:
        raise KeyboardInterrupt('Ejecución detenida por el usuario')
    if line == _NO_SAB:
        raise RuntimeError(
            'input() no está disponible: abre la aplicación con «npm start» '
            '(hace falta el aislamiento del navegador para poder esperar tu respuesta).')
    return line.rstrip('\n')

builtins.input = _interactive_input

_ns = {}

def _new_namespace():
    global _ns
    _ns = {'__name__': '__main__', '__builtins__': builtins}
    return _ns

_new_namespace()

def _register_source(filename, src):
    linecache.cache[filename] = (len(src), None, src.splitlines(True), filename)

def _report(exc):
    te = traceback.TracebackException(type(exc), exc, exc.__traceback__)
    te.stack = traceback.StackSummary.from_list(
        [f for f in te.stack if f.filename in USER_FILES])
    text = ''.join(te.format())
    line = None
    source = None
    if isinstance(exc, SyntaxError) and exc.filename in USER_FILES:
        line = exc.lineno
        source = exc.filename
    for f in te.stack:
        line = f.lineno
        source = f.filename
    msg = str(exc)
    if isinstance(exc, SyntaxError):
        msg = exc.msg or ''
    return {
        'type': type(exc).__name__,
        'message': msg,
        'line': line,
        'source': source,
        'traceback': text,
    }

def run_editor(src):
    _new_namespace()
    _register_source('<editor>', src)
    try:
        code = compile(src, '<editor>', 'exec')
        exec(code, _ns)
    except SystemExit:
        return json.dumps({'ok': True, 'exit': True})
    except BaseException as e:
        return json.dumps({'ok': False, 'error': _report(e)})
    return json.dumps({'ok': True})

def run_repl(src):
    _register_source('<consola>', src)
    try:
        code = codeop.compile_command(src, '<consola>', 'single')
    except (SyntaxError, OverflowError, ValueError) as e:
        return json.dumps({'ok': False, 'error': _report(e)})
    if code is None:
        return json.dumps({'ok': True, 'more': True})
    try:
        exec(code, _ns)
    except SystemExit:
        return json.dumps({'ok': True})
    except BaseException as e:
        return json.dumps({'ok': False, 'error': _report(e)})
    return json.dumps({'ok': True})

def _norm_lines(text):
    return [l.strip() for l in text.replace('\r', '').split('\n') if l.strip()]

def run_tests(src, tests_json):
    """Ejecuta cada prueba en un espacio de nombres limpio, sin tocar la consola."""
    tests = json.loads(tests_json)
    results = []
    _register_source('<editor>', src)
    try:
        code = compile(src, '<editor>', 'exec')
    except SyntaxError as e:
        return json.dumps({'compileError': _report(e), 'results': []})
    for t in tests:
        lines = list(t.get('stdin') or [])
        captured = io.StringIO()
        def fake_input(prompt='', _lines=lines, _cap=captured):
            _cap.write(str(prompt))
            if not _lines:
                raise EOFError('El programa pidió más datos con input() de los que da esta prueba')
            v = _lines.pop(0)
            _cap.write(v + '\n')
            return v
        ns = {'__name__': '__main__', '__builtins__': builtins}
        old_out, old_input = sys.stdout, builtins.input
        sys.stdout = captured
        builtins.input = fake_input
        res = {'ok': True, 'details': []}
        try:
            exec(code, ns)
            if t.get('call'):
                value = eval(t['call'], ns)
                expected = eval(t['equals'], {})
                good = value == expected
                if isinstance(value, float) and isinstance(expected, (int, float)):
                    good = abs(value - expected) < 1e-9
                res['got'] = repr(value)
                res['want'] = repr(expected)
                if not good:
                    res['ok'] = False
        except KeyboardInterrupt:
            res = {'ok': False, 'timeout': True}
            sys.stdout, builtins.input = old_out, old_input
            res['output'] = captured.getvalue()[-2000:]
            results.append(res)
            break
        except BaseException as e:
            res = {'ok': False, 'error': _report(e)}
        finally:
            sys.stdout, builtins.input = old_out, old_input
        out = captured.getvalue()
        res['output'] = out[-2000:]
        if res.get('ok') and t.get('expect'):
            got = _norm_lines(out)
            pos = 0
            missing = []
            joined = '\n'.join(got)
            for exp in t['expect']:
                e = exp.strip()
                found = False
                while pos < len(got):
                    if e in got[pos]:
                        found = True
                        pos += 1
                        break
                    pos += 1
                if not found:
                    missing.append(exp)
            if missing:
                res['ok'] = False
                res['missing'] = missing
        results.append(res)
    return json.dumps({'results': results})

# Defensa adicional: el código del usuario (que se ejecuta como __main__) no puede
# importar los puentes con JavaScript. Así no puede tocar por accidente la página,
# el almacenamiento del navegador ni la red. La biblioteca estándar no se ve afectada.
_real_import = builtins.__import__
_BLOCKED = {'js', 'pyodide', '_pyodide', 'pyodide_js', 'micropip'}

def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    if level == 0 and name.split('.')[0] in _BLOCKED and (globals or {}).get('__name__') == '__main__':
        raise ModuleNotFoundError(
            f"No module named '{name}' (no está disponible en este entorno de estudio por seguridad)")
    return _real_import(name, globals, locals, fromlist, level)

builtins.__import__ = _safe_import

def run_snippet(src):
    """Ejecuta un fragmento y devuelve su salida (para «predice la salida»)."""
    captured = io.StringIO()
    old_out, old_input = sys.stdout, builtins.input
    def no_input(prompt=''):
        raise EOFError('Este fragmento usa input(); ábrelo en el editor para probarlo')
    sys.stdout = captured
    builtins.input = no_input
    _register_source('<prueba>', src)
    err = None
    try:
        exec(compile(src, '<prueba>', 'exec'), {'__name__': '__main__', '__builtins__': builtins})
    except BaseException as e:
        err = _report(e)
    finally:
        sys.stdout, builtins.input = old_out, old_input
    return json.dumps({'output': captured.getvalue()[-5000:], 'error': err})
`;

async function init(msg) {
  if (msg.ctrlBuffer) {
    ctrl = new Int32Array(msg.ctrlBuffer);
    inputData = new Uint8Array(msg.dataBuffer);
  }
  try {
    pyodide = await loadPyodide({
      indexURL: new URL('../../vendor/pyodide/', import.meta.url).href,
      stdout: (t) => write('out', t + '\n'),
      stderr: (t) => write('err', t + '\n'),
    });
    if (msg.interruptBuffer) {
      interruptArr = new Uint8Array(msg.interruptBuffer);
      pyodide.setInterruptBuffer(interruptArr);
    }
    pyodide.setStdin({ stdin: () => {
      const line = readLine('');
      return line == null ? null : line + '\n';
    } });
    pyodide.globals.set('_js_write', (kind, text) => write(kind, text));
    pyodide.globals.set('_js_read_line', (prompt) => readLine(prompt));
    pyodide.globals.set('_NO_SAB', NO_SAB);
    pyodide.runPython(HARNESS);
    const version = pyodide.runPython('import sys; sys.version.split()[0]');
    postMessage({ type: 'ready', version });
  } catch (err) {
    postMessage({ type: 'load-error', message: String(err && err.message || err) });
  }
}

function callHarness(name, ...args) {
  const fn = pyodide.globals.get(name);
  try {
    return JSON.parse(fn(...args));
  } finally {
    fn.destroy();
  }
}

self.onmessage = (ev) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    init(msg);
    return;
  }
  if (!pyodide) return;
  currentRunId = msg.id;
  resetOutput();
  if (interruptArr) interruptArr[0] = 0; // descarta una parada pendiente de una ejecución anterior
  let result;
  try {
    if (msg.type === 'run-editor') result = callHarness('run_editor', msg.code);
    else if (msg.type === 'run-repl') result = callHarness('run_repl', msg.code);
    else if (msg.type === 'run-tests') result = callHarness('run_tests', msg.code, JSON.stringify(msg.tests));
    else if (msg.type === 'run-snippet') result = callHarness('run_snippet', msg.code);
  } catch (err) {
    result = { ok: false, internal: String(err && err.message || err) };
  }
  flushOut();
  postMessage({ type: 'done', id: msg.id, result });
};
