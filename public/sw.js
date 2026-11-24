// Service worker para la versión publicada en GitHub Pages.
//
// GitHub Pages no permite configurar cabeceras HTTP, pero la aplicación necesita
// las mismas que envía server.mjs:
// - COOP/COEP («aislamiento entre orígenes»): sin ellas no hay SharedArrayBuffer,
//   e input() y el botón «Detener» no funcionan dentro del Web Worker de Python.
// - Content-Security-Policy con connect-src 'self': ni la página ni el código
//   Python pueden hacer peticiones a otros servidores.
// Este service worker añade esas cabeceras a cada respuesta del propio sitio.
// No guarda nada en caché ni toca peticiones a otros dominios.
// Solo se registra cuando la página no está ya aislada (ver js/coi.js), así que
// con el servidor local (npm start) no se usa.

const HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': [
    "default-src 'self'",
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

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (new URL(req.url).origin !== self.location.origin) return;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
  event.respondWith(
    fetch(req).then((res) => {
      // Respuestas opacas o redirecciones manuales: se devuelven tal cual.
      if (res.status === 0) return res;
      const headers = new Headers(res.headers);
      for (const [name, value] of Object.entries(HEADERS)) headers.set(name, value);
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }),
  );
});
