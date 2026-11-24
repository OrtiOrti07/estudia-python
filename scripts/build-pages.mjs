// Prepara la versión estática para GitHub Pages en la carpeta _site/.
// Copia public/ y las mismas bibliotecas que server.mjs sirve en /vendor/.
// Uso (tras npm install):  node scripts/build-pages.mjs
// Lo ejecuta automáticamente .github/workflows/pages.yml en cada push a main.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, '_site');
const NM = path.join(ROOT, 'node_modules');

// [origen relativo a la raíz, destino relativo a _site]
const COPIES = [
  ['public', '.'],
  ['node_modules/pyodide', 'vendor/pyodide'],
  ['node_modules/pdfjs-dist/build', 'vendor/pdfjs/build'],
  ['node_modules/pdfjs-dist/cmaps', 'vendor/pdfjs/cmaps'],
  ['node_modules/pdfjs-dist/standard_fonts', 'vendor/pdfjs/standard_fonts'],
  ['node_modules/mammoth/mammoth.browser.min.js', 'vendor/mammoth/mammoth.browser.min.js'],
];

// Nunca se publican: documentos de prueba y mapas de código fuente.
const skip = (src) => src.includes(`${path.sep}__test__`) || src.endsWith('.map');

if (!fs.existsSync(path.join(NM, 'pyodide', 'pyodide.mjs'))) {
  console.error('Faltan las bibliotecas. Ejecuta primero:  npm install');
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
for (const [from, to] of COPIES) {
  fs.cpSync(path.join(ROOT, from), path.join(OUT, to), {
    recursive: true,
    filter: (src) => !skip(src),
  });
}
// Evita que GitHub Pages procese el sitio con Jekyll.
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

let files = 0, bytes = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else { files++; bytes += fs.statSync(p).size; }
  }
})(OUT);
console.log(`Sitio preparado en _site/: ${files} archivos, ${(bytes / 1e6).toFixed(1)} MB`);
