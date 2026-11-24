// Importación de documentos. TODO se procesa en el navegador:
// - PDF con pdf.js (texto por página -> citas con número de página).
// - DOCX con mammoth (conserva títulos -> citas por sección).
// - TXT, Markdown y .py se leen como texto (citas por sección y número de línea).
// Ningún documento se envía a ningún servidor.

const MAX_BYTES = 40 * 1024 * 1024;
const CHUNK = 1200; // tamaño aproximado de cada fragmento citado

export const ACCEPT = '.pdf,.docx,.txt,.md,.markdown,.py,.text';

export class ImportError extends Error {
  constructor(message, { canPaste = true } = {}) {
    super(message);
    this.canPaste = canPaste;
  }
}

function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function extOf(name) {
  const m = /\.([^.]+)$/.exec(name.toLowerCase());
  return m ? m[1] : '';
}

/** Importa un archivo y devuelve el material listo para guardar (o lanza ImportError). */
export async function importFile(file, { kind = 'apuntes', replaceId = null } = {}) {
  if (file.size > MAX_BYTES) {
    throw new ImportError(`El archivo pesa ${(file.size / 1048576).toFixed(1)} MB y el máximo es 40 MB. Prueba a dividirlo o a pegar solo el texto que necesites.`);
  }
  const ext = extOf(file.name);
  let parsed;
  switch (ext) {
    case 'pdf': parsed = await parsePdf(file); break;
    case 'docx': parsed = await parseDocx(file); break;
    case 'txt': case 'text': parsed = parseText(await readTextFile(file), 'txt'); break;
    case 'md': case 'markdown': parsed = parseText(await readTextFile(file), 'md'); break;
    case 'py': parsed = parseText(await readTextFile(file), 'py'); break;
    case 'doc':
      throw new ImportError('Los archivos .doc (Word antiguo) no se pueden leer aquí. Ábrelo en Word y guárdalo como .docx o PDF, o copia y pega el texto.');
    case 'odt': case 'rtf': case 'pages':
      throw new ImportError(`El formato .${ext} no está soportado. Guárdalo como .docx, PDF o .txt, o copia y pega el texto.`);
    case 'pptx': case 'ppt':
      throw new ImportError('Las presentaciones no se pueden leer directamente. Expórtala a PDF (Archivo › Exportar › PDF) o copia y pega el texto.');
    default:
      throw new ImportError(`No sé leer archivos «.${ext || 'sin extensión'}». Formatos admitidos: PDF, DOCX, TXT, Markdown (.md) y Python (.py). También puedes pegar el texto.`);
  }
  return finalize({ ...parsed, name: file.name.replace(/\.[^.]+$/, ''), fileName: file.name, size: file.size, kind }, replaceId);
}

/** Crea un material a partir de texto pegado por el usuario. */
export function importPasted(title, text, kind = 'apuntes', replaceId = null) {
  const parsed = parseText(text, 'pasted');
  return finalize({ ...parsed, name: title || 'Texto pegado', fileName: null, size: text.length, kind }, replaceId);
}

function finalize(m, replaceId) {
  const id = replaceId || newId('m');
  const text = m.fragments.map((f) => f.text).join('\n\n');
  if (!text.trim()) {
    throw new ImportError('No he encontrado texto en este documento. Si es un PDF escaneado (fotos de páginas), no puedo leerlo porque no hay reconocimiento de texto (OCR). Puedes copiar y pegar el texto.');
  }
  m.fragments.forEach((f, i) => { f.id = `${id}:${i}`; });
  const { extraWarnings, ...rest } = m;
  return { id, importedAt: Date.now(), ...rest, warnings: extraWarnings || [], charCount: text.length };
}

// ---------- Texto plano ----------
async function readTextFile(file) {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    // Muchos archivos creados en Windows en español usan esta codificación.
    return new TextDecoder('windows-1252').decode(buf);
  }
}

const TXT_HEADING = /^\s*((tema|unidad|cap[ií]tulo|lecci[oó]n|bloque|apartado)\s+\d+[^\n]{0,70}|\d+(\.\d+)*\.?\s+[A-ZÁÉÍÓÚÑ][^\n]{2,60})\s*$/i;

function isTxtHeading(line, prev, next) {
  const t = line.trim();
  if (!t || t.length > 80 || /[.;,]$/.test(t)) return false;
  if (prev && prev.trim()) return false; // un título suele ir precedido de una línea vacía
  if (TXT_HEADING.test(t)) return true;
  const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  return letters.length >= 4 && letters === letters.toUpperCase() && (!next || !next.trim() || next.trim().length > 0);
}

/**
 * Divide un texto en fragmentos citables: por secciones (títulos) y, dentro de
 * ellas, por grupos de párrafos de ~1200 caracteres. Guarda las líneas de origen.
 */
export function parseText(raw, format) {
  const text = raw.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const headings = [];
  const fragments = [];
  let section = [];
  let buf = [];
  let bufStart = 0;
  let inFence = false;
  let part = 0;

  const sectionName = () => section.filter(Boolean).join(' › ');
  const emit = (endLine) => {
    const body = buf.join('\n').replace(/^\n+|\n+$/g, '');
    if (body.trim()) {
      fragments.push({ section: sectionName(), lineStart: bufStart + 1, lineEnd: endLine, text: body, part: part++ });
    }
    buf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    let heading = null;
    if (!inFence) {
      const md = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (md && format !== 'py') heading = { level: md[1].length, title: md[2] };
      else if ((format === 'txt' || format === 'pasted') && isTxtHeading(line, lines[i - 1], lines[i + 1])) {
        heading = { level: /^\s*\d+\.\d/.test(line) ? 2 : 1, title: line.trim() };
      }
    }
    if (heading) {
      emit(i);
      section = section.slice(0, heading.level - 1);
      while (section.length < heading.level - 1) section.push('');
      section.push(heading.title);
      headings.push({ title: heading.title, level: heading.level, line: i + 1, path: sectionName() });
      part = 0;
      bufStart = i;
      buf.push(line);
      continue;
    }
    if (!buf.length) bufStart = i;
    buf.push(line);
    const size = buf.reduce((n, l) => n + l.length + 1, 0);
    if (!inFence && !line.trim() && size > CHUNK) emit(i + 1);
  }
  emit(lines.length);
  for (const f of fragments) f.label = labelFor(format, f);
  return { format, fragments, headings };
}

function labelFor(format, f) {
  const lines = f.lineStart === f.lineEnd ? `línea ${f.lineStart}` : `líneas ${f.lineStart}–${f.lineEnd}`;
  if (format === 'docx') return f.section ? `sección «${f.section}»` : 'inicio del documento';
  if (f.section) return `sección «${f.section}», ${lines}`;
  return lines;
}

// ---------- DOCX ----------
let mammothPromise = null;
function loadMammoth() {
  if (window.mammoth) return Promise.resolve(window.mammoth);
  if (!mammothPromise) {
    mammothPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/vendor/mammoth/mammoth.browser.min.js';
      s.onload = () => resolve(window.mammoth);
      s.onerror = () => reject(new Error('No se pudo cargar el lector de DOCX'));
      document.head.appendChild(s);
    });
  }
  return mammothPromise;
}

async function parseDocx(file) {
  const mammoth = await loadMammoth();
  let result;
  try {
    result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  } catch (err) {
    throw new ImportError('No he podido leer este DOCX (puede estar dañado o protegido). Prueba a guardarlo de nuevo desde Word o copia y pega el texto.');
  }
  // DOMParser no ejecuta scripts ni carga imágenes: solo lo usamos para leer la estructura.
  const doc = new DOMParser().parseFromString(result.value, 'text/html');
  const out = [];
  const walk = (node) => {
    for (const el of node.children) {
      const tag = el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) out.push('', '#'.repeat(Number(tag[1])) + ' ' + el.textContent.trim(), '');
      else if (tag === 'p') out.push(el.textContent, '');
      else if (tag === 'ul' || tag === 'ol') {
        let n = 1;
        for (const li of el.children) out.push((tag === 'ol' ? `${n++}. ` : '- ') + li.textContent.trim());
        out.push('');
      } else if (tag === 'table') {
        for (const tr of el.querySelectorAll('tr')) {
          out.push([...tr.children].map((c) => c.textContent.trim()).join(' | '));
        }
        out.push('');
      } else if (tag === 'pre') out.push('```', el.textContent, '```', '');
      else walk(el);
    }
  };
  walk(doc.body);
  const parsed = parseText(out.join('\n').replace(/\n{3,}/g, '\n\n'), 'docx');
  for (const f of parsed.fragments) f.label = labelFor('docx', f);
  return parsed;
}

// ---------- PDF ----------
let pdfjsPromise = null;
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('/vendor/pdfjs/build/pdf.min.mjs').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/build/pdf.worker.min.mjs';
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/**
 * Reconstruye las líneas de una página a partir de las posiciones del texto.
 * Intenta conservar la sangría (útil para el código Python de los apuntes).
 */
function pageToText(items) {
  const lines = [];
  for (const it of items) {
    if (typeof it.str !== 'string') continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - y) < size * 0.5) {
      const gap = x - last.endX;
      if (gap > size * 0.2 && !/\s$/.test(last.text) && !/^\s/.test(it.str)) last.text += ' ';
      last.text += it.str;
      last.endX = x + it.width;
    } else {
      if (!it.str.trim() && !last) continue;
      lines.push({ x, y, size, text: it.str, endX: x + it.width, charW: it.str.length ? it.width / it.str.length : size * 0.5 });
    }
  }
  const real = lines.filter((l) => l.text.trim());
  if (!real.length) return '';
  const minX = Math.min(...real.map((l) => l.x));
  let out = '';
  let prev = null;
  for (const l of real) {
    if (prev) {
      const gap = Math.abs(prev.y - l.y);
      out += gap > prev.size * 1.9 ? '\n\n' : '\n';
    }
    const indent = Math.max(0, Math.min(24, Math.round((l.x - minX) / Math.max(l.charW, 1))));
    out += ' '.repeat(indent) + l.text.trimEnd();
    prev = l;
  }
  return out;
}

async function parsePdf(file) {
  const pdfjs = await loadPdfjs();
  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      cMapUrl: '/vendor/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
    }).promise;
  } catch (err) {
    if (err && err.name === 'PasswordException') {
      throw new ImportError('Este PDF está protegido con contraseña y no se puede leer. Quita la protección o copia y pega el texto.');
    }
    throw new ImportError('No he podido abrir este PDF (puede estar dañado). Prueba a guardarlo de nuevo o copia y pega el texto.');
  }
  const fragments = [];
  const warnings = [];
  let emptyPages = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const text = pageToText(content.items);
    if (text.replace(/\s/g, '').length < 15) { emptyPages++; continue; }
    // Divide páginas largas en partes, respetando los párrafos.
    const paras = text.split(/\n{2,}/);
    let buf = '';
    let part = 1;
    const parts = [];
    for (const para of paras) {
      if (buf && buf.length + para.length > CHUNK) { parts.push(buf); buf = ''; }
      buf += (buf ? '\n\n' : '') + para;
    }
    if (buf) parts.push(buf);
    for (const t of parts) {
      fragments.push({ page: p, label: parts.length > 1 ? `pág. ${p} (parte ${part})` : `pág. ${p}`, section: '', text: t, part: part - 1 });
      part++;
    }
  }
  if (emptyPages && emptyPages === doc.numPages) {
    throw new ImportError('Este PDF no contiene texto seleccionable: probablemente son páginas escaneadas (imágenes). No puedo leerlas porque no hay reconocimiento de texto (OCR). Puedes copiar y pegar el texto si lo tienes.');
  }
  if (emptyPages) warnings.push(`${emptyPages} de ${doc.numPages} páginas no tienen texto legible (pueden ser imágenes o diagramas) y no se han incluido.`);
  warnings.push('En los PDF la sangría del código se reconstruye de forma aproximada: revísala antes de ejecutar los ejemplos.');
  return { format: 'pdf', fragments, headings: [], pages: doc.numPages, extraWarnings: warnings };
}
