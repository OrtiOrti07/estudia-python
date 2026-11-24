// Análisis LOCAL de los materiales (sin IA ni servicios externos).
//
// Qué hace y qué NO hace — importante para no atribuir al material lo que no dice:
// - Relaciona fragmentos con temas buscando palabras clave. Es una búsqueda,
//   no una comprensión del texto: puede equivocarse, y el usuario puede corregirla.
// - Los «resúmenes» son EXTRACTIVOS: frases copiadas literalmente del material.
// - Detecta ejercicios por patrones («Ejercicio 3», «Escribe un programa que…»).
// - Detecta fragmentos de código para practicar («predice la salida»): son
//   adaptaciones creadas por la app y se marcan como tales.
// - Detecta unas pocas diferencias concretas entre materiales (p. ej. sintaxis de
//   Python 2 frente a Python 3). No puede detectar cualquier contradicción.

import { TOPICS } from './content/topics.js';

export function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

const MIN_SCORE = 4;

/** Puntúa un texto para un tema. Devuelve { score, terms } */
export function scoreText(normText, topic) {
  let score = 0;
  const terms = [];
  for (const [re, weight, label] of topic.keywords) {
    re.lastIndex = 0;
    const matches = normText.match(re);
    if (matches) {
      score += weight * Math.min(matches.length, 3);
      terms.push({ label, sample: matches[0] });
    }
  }
  return { score, terms };
}

/**
 * Separa la prosa del código. Así, un ejemplo de bucle que usa print() no hace
 * que el fragmento se asocie al tema «print»: el código cuenta la mitad.
 */
export function splitProseCode(text) {
  const prose = [];
  const code = [];
  let fence = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence) { code.push(line); continue; }
    if (/^\s*#{1,6}\s+\S/.test(line) && !/[()=]/.test(line)) { prose.push(line); continue; } // título Markdown
    if (CODE_LINE.test(line) && !looksLikeProse(line)) code.push(line);
    else prose.push(line);
  }
  return { prose: prose.join('\n'), code: code.join('\n') };
}

/** Puntuación de un fragmento: prosa completa + código a mitad de peso. */
export function scoreFragment(text, topic) {
  const { prose, code } = splitProseCode(text);
  const p = scoreText(normalize(prose), topic);
  const c = code ? scoreText(normalize(code), topic) : { score: 0, terms: [] };
  const labels = new Set(p.terms.map((t) => t.label));
  // Sin ninguna pista en la prosa, el código solo cuenta si la señal es muy clara
  // (por ejemplo, un archivo .py dedicado a un tema).
  const codePart = p.score > 0 ? c.score / 2 : (c.score / 2 >= 6 ? c.score / 2 : 0);
  return { score: p.score + codePart, terms: [...p.terms, ...c.terms.filter((t) => !labels.has(t.label))] };
}

/** Tema más probable de un texto corto (p. ej. un enunciado). min: puntuación mínima. */
export function bestTopic(text, min = 3) {
  let best = null;
  for (const t of TOPICS) {
    const { score } = scoreFragment(text, t);
    if (score >= min && (!best || score > best.score)) best = { id: t.id, score };
  }
  return best ? best.id : null;
}

function bestCodeTopic(code) {
  const n = normalize(code);
  let best = null;
  for (const t of TOPICS) {
    if (t.id === 'print') continue; // casi todo el código usa print(): no es buena pista
    const { score } = scoreText(n, t);
    if (score >= 3 && (!best || score > best.score)) best = { id: t.id, score };
  }
  return best ? best.id : 'print';
}

export function citation(material, frag) {
  return `${material.name} — ${frag.label}`;
}

// ---------- Ejercicios ----------
const EX_HEAD = /^\s*(?:[#*\-•]+\s*)?(ejercicio|actividad|problema|practica|reto|tarea)s?\s*(?:n[o°º.]*\s*)?(\d+(?:\.\d+)*)?\s*([:.\-–)]?)\s*(.*)$/i;
const IMPERATIVE = /^\s*(?:\d+[.)]\s*)?(escribe|escribir|haz|hacer|realiza|realizar|crea|crear|disena|disenar|implementa|implementar|programa|elabora|desarrolla|define|modifica)\s+(un|una|el|la|los|las)\s+(programa|funcion|script|codigo|algoritmo|bucle|lista)/;
const NUMBERED = /^\s*(\d{1,2})[.)]\s+\S/;

/** «Ejercicio 5: Escribe una función…» -> «Ejercicio 5»; «Ejercicio 1: Contador» se conserva. */
function exerciseTitle(line) {
  const clean = line.trim().replace(/^[#*\-•\s]+/, '');
  const m = /^(\S+\s*(?:n[º°o.]*\s*)?\d+(?:\.\d+)*)\s*[:.\-–)]?\s*(.*)$/i.exec(clean)
    || /^(\S+)\s*[:.\-–)]\s*(.*)$/.exec(clean);
  if (!m) return clean.slice(0, 60);
  const rest = m[2].trim();
  return rest && rest.length <= 30 ? `${m[1]}: ${rest}` : m[1];
}

function detectExercises(material) {
  const found = [];
  let cur = null;
  let listMode = material.kind === 'ejercicios';
  let blank = 1; // el principio del documento cuenta como «después de una línea en blanco»

  const close = () => {
    if (cur) {
      const text = cur.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (text.length >= 15) {
        const labels = [...new Set(cur.frags.map((f) => f.label))];
        found.push({
          id: `${material.id}:ex:${hash(normalize(text).slice(0, 300))}`,
          origin: 'material',
          materialId: material.id,
          materialName: material.name,
          fragId: cur.frags[0].id,
          location: labels.length > 1 ? `${labels[0]} → ${labels[labels.length - 1]}` : labels[0],
          title: cur.title,
          statement: text,
        });
      }
    }
    cur = null;
  };

  for (const frag of material.fragments) {
    const lines = frag.text.split('\n');
    for (const line of lines) {
      const n = normalize(line);
      const md = /^\s*#{1,6}\s+(.*)$/.exec(line);
      if (md) {
        close();
        listMode = material.kind === 'ejercicios' || /ejercicio|actividad|practica|problemas|retos/.test(normalize(md[1]));
        const m = EX_HEAD.exec(normalize(md[1]));
        if (m && (m[2] || m[3])) cur = { title: md[1].trim(), lines: [], frags: [frag] };
        continue;
      }
      const head = EX_HEAD.exec(n);
      const isHead = head && (head[2] || (head[3] && head[3] !== '.')) && line.trim().length < 300;
      if (isHead) {
        close();
        cur = { title: exerciseTitle(line), lines: [line.trim()], frags: [frag] };
        blank = 0;
        continue;
      }
      if ((listMode && NUMBERED.test(line) && (!cur || cur.numbered)) || (IMPERATIVE.test(n) && blank > 0 && !(cur && cur.lines.length < 2))) {
        if (!cur || cur.numbered || IMPERATIVE.test(n)) {
          close();
          const num = NUMBERED.exec(line);
          cur = {
            title: num ? `Ejercicio ${num[1]}` : line.trim().slice(0, 57) + (line.trim().length > 57 ? '…' : ''),
            lines: [line.trimEnd()], frags: [frag], numbered: !!num,
          };
          blank = 0;
          continue;
        }
      }
      if (!line.trim()) {
        blank++;
        if (cur) {
          cur.lines.push('');
          if (blank >= 2 && cur.lines.join('').length > 40) close();
        }
        continue;
      }
      blank = 0;
      if (cur) {
        cur.lines.push(line.trimEnd());
        if (!cur.frags.includes(frag)) cur.frags.push(frag);
        if (cur.lines.join('\n').length > 1500) close();
      }
    }
  }
  close();
  return found;
}

// ---------- Fragmentos de código ----------
const CODE_LINE = /^\s*(>>>\s?|\.\.\.\s|print\s*\(|def\s+\w+\s*\(|class\s+\w+|for\s+\w+(\s*,\s*\w+)*\s+in\s+.+:\s*$|while\s+.+:\s*$|if\s+.+:\s*$|elif\s+.+:\s*$|else\s*:\s*$|try\s*:\s*$|except\b.*:\s*$|return\b|break\s*$|continue\s*$|import\s+\w+|from\s+\w+\s+import|[A-Za-z_]\w*(\[[^\]]*\])?\s*([+\-*/%]|\/\/)?=\s*[^=\s].*$|[A-Za-z_]\w*(\.\w+)*\(.*\)\s*$|#)/;

function looksLikeProse(line) {
  const t = line.trim();
  // Frases largas con muchas palabras y sin símbolos de código: probablemente prosa.
  const words = t.split(/\s+/).length;
  return words > 12 && !/[()=:\[\]]/.test(t);
}

function detectSnippets(material) {
  const snippets = [];
  for (const frag of material.fragments) {
    const lines = frag.text.split('\n');
    let i = 0;
    while (i < lines.length) {
      // Bloques con ``` (Markdown)
      if (/^\s*(```|~~~)/.test(lines[i])) {
        const start = i + 1;
        let j = start;
        while (j < lines.length && !/^\s*(```|~~~)/.test(lines[j])) j++;
        pushSnippet(snippets, material, frag, lines.slice(start, j).join('\n'));
        i = j + 1;
        continue;
      }
      if (CODE_LINE.test(lines[i]) && !looksLikeProse(lines[i])) {
        let j = i;
        const block = [];
        while (j < lines.length) {
          const l = lines[j];
          const prevOpens = block.length && /:\s*$/.test(block[block.length - 1]);
          if ((CODE_LINE.test(l) || (prevOpens && l.trim()) || (/^\s{2,}\S/.test(l) && block.length)) && !looksLikeProse(l)) {
            block.push(l);
            j++;
          } else break;
        }
        if (block.length) pushSnippet(snippets, material, frag, block.join('\n'));
        i = Math.max(j, i + 1);
        continue;
      }
      i++;
    }
  }
  return snippets;
}

function pushSnippet(list, material, frag, raw) {
  let code = raw.replace(/\s+$/, '');
  const lines = code.split('\n');
  const isRepl = lines.some((l) => /^\s*>>>/.test(l));
  if (isRepl) {
    code = lines.filter((l) => /^\s*(>>>|\.\.\.)/.test(l)).map((l) => l.replace(/^\s*(>>>|\.\.\.) ?/, '')).join('\n');
  }
  // Quita la sangría común.
  const ls = code.split('\n');
  const minIndent = Math.min(...ls.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  if (minIndent > 0 && Number.isFinite(minIndent)) code = ls.map((l) => l.slice(minIndent)).join('\n');
  const codeLines = code.split('\n').filter((l) => l.trim() && !/^\s*#/.test(l));
  if (!codeLines.length || code.length > 3000) return;
  const strong = /print\s*\(|def |for |while |if |=/.test(code);
  if (codeLines.length < 2 && !/print\s*\(/.test(code) && !isRepl) return;
  if (!strong) return;
  // Sustituye comillas tipográficas que a menudo aparecen al copiar de Word/PDF.
  code = code.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const id = `${material.id}:sn:${hash(code)}`;
  if (list.some((s) => s.id === id)) return;
  list.push({
    id,
    materialId: material.id,
    materialName: material.name,
    fragId: frag.id,
    location: frag.label,
    code,
    isRepl,
    usesInput: /input\s*\(/.test(code),
    hasPrint: /print\s*\(/.test(code),
    fromPdf: material.format === 'pdf',
  });
}

// ---------- Diferencias entre materiales ----------
function detectFacts(material) {
  const text = material.fragments.map((f) => f.text).join('\n');
  const facts = [];
  const findFrag = (re) => material.fragments.find((f) => re.test(f.text)) || material.fragments[0];
  // print "hola"  o  print x  (sin paréntesis) -> Python 2. Evita confundirlo con prosa («print es una función»).
  const py2 = /^\s*(>>>\s*)?print\s+(["'][^\n]*["']|[A-Za-z_]\w*)\s*(,[^\n]*)?$/m;
  const py3 = /print\s*\(/;
  if (py2.test(text)) facts.push({ key: 'print', value: 'py2', frag: findFrag(py2) });
  else if (py3.test(text)) facts.push({ key: 'print', value: 'py3', frag: findFrag(py3) });
  if (/raw_input\s*\(/.test(text)) facts.push({ key: 'input', value: 'raw_input', frag: findFrag(/raw_input\s*\(/) });
  else if (/\binput\s*\(/.test(text)) facts.push({ key: 'input', value: 'input', frag: findFrag(/\binput\s*\(/) });
  const ind = /(sangr[ií]a|indentaci[oó]n|indentar|sangrar)[^.\n]{0,80}?(\d+)\s+espacios|(\d+)\s+espacios[^.\n]{0,60}(sangr|indent)/i;
  const mi = ind.exec(text);
  if (mi) facts.push({ key: 'indent', value: mi[2] || mi[3], frag: findFrag(ind), quote: mi[0] });
  return facts;
}

function buildDifferences(materials, factsByMaterial) {
  const diffs = [];
  const group = (key) => materials.flatMap((m) => factsByMaterial[m.id].filter((f) => f.key === key).map((f) => ({ ...f, material: m })));
  const prints = group('print');
  const py2 = prints.filter((f) => f.value === 'py2');
  const py3 = prints.filter((f) => f.value === 'py3');
  if (py2.length) {
    diffs.push({
      topicId: 'print',
      title: py3.length ? 'Diferencia entre tus materiales: forma de escribir print' : 'Diferencia con la versión de Python que usa la consola',
      text: py3.length
        ? 'Unos materiales escriben print sin paréntesis (print "hola", estilo Python 2, versión antigua) y otros con paréntesis (print("hola"), Python 3). La consola de esta aplicación usa Python 3: aquí necesitas los paréntesis. Consulta con tu profesor/a qué versión se usa en clase.'
        : 'Tu material escribe print sin paréntesis (print "hola"), que es la forma de Python 2. La consola de esta aplicación usa Python 3, donde se escribe print("hola"). Consulta con tu profesor/a qué versión se usa en clase.',
      sources: [...py2, ...py3].map((f) => ({ materialId: f.material.id, name: f.material.name, location: f.frag.label, fragId: f.frag.id, says: f.value === 'py2' ? 'print sin paréntesis' : 'print(...) con paréntesis' })),
    });
  }
  const inputs = group('input');
  if (inputs.some((f) => f.value === 'raw_input')) {
    const both = inputs.some((f) => f.value === 'input');
    diffs.push({
      topicId: 'input',
      title: both ? 'Diferencia entre tus materiales: raw_input frente a input' : 'Diferencia con la versión de Python que usa la consola',
      text: 'raw_input() existía en Python 2. En Python 3 (el de esta consola) se usa input(), que devuelve siempre texto. raw_input() aquí da NameError.',
      sources: inputs.map((f) => ({ materialId: f.material.id, name: f.material.name, location: f.frag.label, fragId: f.frag.id, says: f.value === 'raw_input' ? 'usa raw_input()' : 'usa input()' })),
    });
  }
  const indents = group('indent');
  const values = new Set(indents.map((f) => f.value));
  if (values.size > 1) {
    diffs.push({
      topicId: 'condicionales',
      title: 'Diferencia entre tus materiales: número de espacios de sangría',
      text: 'Tus materiales recomiendan cantidades distintas de espacios para la sangría. Python acepta cualquier cantidad siempre que sea la misma dentro de un bloque; la guía oficial de estilo (PEP 8) recomienda 4. Sigue el criterio de tu clase.',
      sources: indents.map((f) => ({ materialId: f.material.id, name: f.material.name, location: f.frag.label, fragId: f.frag.id, says: `«${f.quote.trim()}»` })),
    });
  }
  return diffs;
}

// ---------- Resumen extractivo ----------
function isHeadingLine(l) {
  const t = l.trim();
  if (!t || t.length > 80 || /[.:;,]$/.test(t)) return false;
  const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  return letters.length >= 4 && letters === letters.toUpperCase();
}

const DEFINITION = /\b(es|son|sirve|sirven|permite|permiten|se utiliza|se usa|se usan|consiste|significa|devuelve|indica)\b/;

export function extractiveSummary(entries, topic, max = 5) {
  const candidates = [];
  entries.slice(0, 12).forEach((entry, ei) => {
    // Solo prosa: sin código ni títulos, para no «resumir» ejemplos de código.
    const prose = splitProseCode(entry.frag.text).prose
      .split('\n')
      .filter((l) => !/^\s*#{1,6}\s/.test(l) && !isHeadingLine(l))
      .join('\n');
    const parts = prose.replace(/\n(?!\n)/g, ' ').split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])|\n{2,}/);
    parts.forEach((s, si) => {
      const t = s.replace(/\s+/g, ' ').trim();
      if (t.length < 40 || t.length > 320) return;
      if (/[{}]|^\s*(>>>|def |for |if |print\()/.test(t)) return;
      const n = normalize(t);
      const { score } = scoreText(n, topic);
      if (!score) return;
      const bonus = DEFINITION.test(n) ? 2 : 0;
      candidates.push({ text: t, score: score + bonus, order: ei * 1000 + si, entry });
    });
  });
  const seen = new Set();
  const picked = candidates
    .sort((a, b) => b.score - a.score)
    .filter((c) => {
      const k = normalize(c.text).slice(0, 60);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, max)
    .sort((a, b) => a.order - b.order);
  return picked.map((c) => ({ text: c.text, material: c.entry.material, frag: c.entry.frag }));
}

// ---------- Índice completo ----------
/**
 * Analiza todos los materiales.
 * overrides.fragmentTopics[fragId] = [ids] permite al usuario corregir la clasificación.
 */
export function analyze(materials, overrides = {}) {
  const byTopic = Object.fromEntries(TOPICS.map((t) => [t.id, []]));
  const firstPos = {};
  const fragTopics = {};
  const exercises = [];
  const snippets = [];
  const factsByMaterial = {};
  const sections = [];

  materials.forEach((m, mi) => {
    m.fragments.forEach((frag, fi) => {
      const auto = [];
      const scores = {};
      for (const t of TOPICS) {
        const s = scoreFragment(frag.text, t);
        scores[t.id] = s;
        if (s.score >= MIN_SCORE) auto.push(t.id);
      }
      const manual = overrides.fragmentTopics && overrides.fragmentTopics[frag.id];
      const assigned = manual || auto;
      const best = [...assigned].sort((a, b) => (scores[b]?.score || 0) - (scores[a]?.score || 0))[0] || null;
      fragTopics[frag.id] = { assigned, manual: !!manual, auto, best };
      for (const tid of assigned) {
        const s = scores[tid];
        byTopic[tid].push({ material: m, frag, score: manual ? Math.max(s.score, 100) : s.score, terms: s.terms, manual: !!manual });
        const pos = mi * 100000 + fi;
        if (firstPos[tid] == null || pos < firstPos[tid]) firstPos[tid] = pos;
      }
    });
    for (const ex of detectExercises(m)) {
      const auto = bestTopic(ex.statement, 2); // los enunciados son cortos: basta una pista clara
      const manual = overrides.exerciseTopic && overrides.exerciseTopic[ex.id];
      exercises.push({ ...ex, autoTopicId: auto, topicId: manual === undefined ? auto : manual });
    }
    for (const sn of detectSnippets(m)) {
      // El código se asocia al tema del texto que lo rodea; si no hay, se mira el propio código.
      const ctx = fragTopics[sn.fragId] && fragTopics[sn.fragId].best;
      snippets.push({ ...sn, topicId: ctx || bestCodeTopic(sn.code) });
    }
    factsByMaterial[m.id] = detectFacts(m);
    for (const hd of m.headings || []) {
      const frags = m.fragments.filter((f) => f.section === hd.path || f.section.startsWith(hd.path + ' › '));
      if (frags.length) sections.push({ material: m, heading: hd, frags, key: `${m.id}:${hd.line}` });
    }
  });

  for (const list of Object.values(byTopic)) list.sort((a, b) => b.score - a.score);

  return {
    byTopic,
    firstPos,
    fragTopics,
    exercises,
    snippets,
    sections,
    differences: buildDifferences(materials, factsByMaterial),
  };
}
