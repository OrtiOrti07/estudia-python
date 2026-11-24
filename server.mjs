// Servidor estático mínimo para «Estudia Python».
//
// Decisiones importantes:
// - Escucha SOLO en 127.0.0.1: la aplicación no es accesible desde otros equipos.
// - Envía las cabeceras COOP/COEP («aislamiento entre orígenes»). Sin ellas el
//   navegador no permite SharedArrayBuffer, que usamos para que input() y el
//   botón «Detener» funcionen dentro del Web Worker de Python.
// - Envía una Content-Security-Policy con connect-src 'self': ni la página ni el
//   código Python del usuario pueden hacer peticiones a otros servidores.
// - Las bibliotecas (Pyodide, pdf.js, mammoth) se sirven desde node_modules,
//   así que todo funciona sin CDN ni conexión a Internet tras `npm install`.
// - No tiene dependencias: solo módulos de Node.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 8000;

// Prefijo URL -> carpeta en disco. Solo se sirve lo que está en esta lista.
const MOUNTS = [
  ['/vendor/pyodide/', path.join(ROOT, 'node_modules', 'pyodide')],
  ['/vendor/pdfjs/', path.join(ROOT, 'node_modules', 'pdfjs-dist')],
  ['/vendor/mammoth/', path.join(ROOT, 'node_modules', 'mammoth')],
  ['/', PUBLIC_DIR],
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.bcmap': 'application/octet-stream',
  '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf',
};

const SECURITY_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': [
    "default-src 'self'",
    // Pyodide necesita compilar WebAssembly y usa eval internamente.
    "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
};

function resolveFile(urlPath) {
  for (const [prefix, dir] of MOUNTS) {
    if (!urlPath.startsWith(prefix)) continue;
    const rel = urlPath.slice(prefix.length) || 'index.html';
    const full = path.normalize(path.join(dir, rel));
    // Evita salir de la carpeta permitida (p. ej. con "../").
    if (full !== dir && !full.startsWith(dir + path.sep)) return null;
    return full;
  }
  return null;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, SECURITY_HEADERS).end();
    return;
  }
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, `http://${HOST}`).pathname);
  } catch {
    res.writeHead(400, SECURITY_HEADERS).end();
    return;
  }
  const file = resolveFile(urlPath);
  if (!file) {
    res.writeHead(404, SECURITY_HEADERS).end('No encontrado');
    return;
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No encontrado');
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const isVendor = urlPath.startsWith('/vendor/');
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': type,
      'Content-Length': stat.size,
      // Código propio sin caché (para ver cambios al recargar); bibliotecas con caché.
      'Cache-Control': isVendor ? 'public, max-age=86400' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

if (!fs.existsSync(path.join(ROOT, 'node_modules', 'pyodide', 'pyodide.mjs'))) {
  console.error('\nFaltan las bibliotecas. Ejecuta primero:  npm install\n');
  process.exit(1);
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nEl puerto ${PORT} está ocupado. ¿Ya tienes la aplicación abierta en otra ventana?`);
    console.error(`Puedes usar otro puerto, por ejemplo en PowerShell:  $env:PORT=8001; npm start\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('\n  Estudia Python está en marcha.');
  console.log(`  Abre en el navegador:  http://127.0.0.1:${PORT}\n`);
  console.log('  (Pulsa Ctrl+C en esta ventana para cerrarla.)\n');
});
