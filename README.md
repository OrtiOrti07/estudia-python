# Estudia Python

Entorno de estudio de Python en español para empezar desde cero. Usa tus propios apuntes como
material principal e incluye una ruta de temas paso a paso, ejercicios con pistas y pruebas, y un
editor con consola inspirada en Thonny.

## Cómo arrancarla

Necesitas [Node.js](https://nodejs.org) (versión 18 o superior).

**Opción fácil (Windows):** haz doble clic en `iniciar.bat`. La primera vez instala las
bibliotecas y después abre el navegador.

**Desde una terminal:**

```bash
npm install
```

```bash
npm start
```

Abre <http://127.0.0.1:8000> en Chrome, Edge o Firefox. Para cerrarla, pulsa `Ctrl+C` en la terminal.

> Abre siempre la misma dirección (`127.0.0.1:8000`). El navegador guarda tus datos por dirección,
> así que `localhost:8000` tendría un almacenamiento distinto.

## En línea (GitHub Pages)

La misma aplicación se publica automáticamente en GitHub Pages con cada `git push` a `main`
(flujo `.github/workflows/pages.yml`), así que puedes estudiar desde cualquier PC sin instalar nada:

<https://ortiorti07.github.io/estudia-python/>

- La primera vez la página se recarga sola una vez: está activando el service worker (`sw.js`) que
  añade las cabeceras de seguridad que GitHub Pages no permite configurar.
- Tus documentos y tu progreso se guardan **en el navegador de cada equipo**, igual que en local.
  No se suben a GitHub ni se comparten entre PCs: en otro equipo tendrás que volver a importarlos.
- La dirección es pública: cualquiera que la tenga puede abrir la aplicación (vacía), pero nunca
  ve tus materiales ni tu progreso.
- Para probar la versión publicada en local: `npm install`, después `node scripts/build-pages.mjs`
  y sirve la carpeta `_site/` con cualquier servidor estático.

## Qué incluye

| Sección | Qué puedes hacer |
|---|---|
| **Materiales** | Importar PDF, DOCX, TXT, Markdown y `.py` (arrastrando o con botón), o pegar texto. Ver el texto extraído, buscar en él, volver a cargar un archivo, cambiar su tipo (apuntes/ejercicios) y quitarlo. |
| **Temas** | Ruta de 9 temas (print, variables, entrada, operadores, condicionales, bucles, cadenas y listas, funciones, errores). Cada tema tiene: lo que dicen **tus materiales** (con cita), una explicación **paso a paso**, ejemplos guiados y ejercicios. La ruta se puede reordenar, ocultar temas u «Ordenar según mis materiales». También se listan las secciones de tus documentos para estudiarlas una a una. |
| **Ejercicios** | Primero los de tus materiales, luego adaptaciones y después los complementarios (3 niveles por tema). Pistas progresivas, solución oculta tras un botón, explicación paso a paso, comparación con tu intento, pruebas automáticas, pruebas añadidas por ti, notas y estado pendiente/completado. |
| **Código** | Editor con números de línea, colores y sangría automática. Consola de Python 3.14: Ejecutar (F5), Detener, Limpiar, `input()` en la propia consola, REPL `>>>` con las variables del programa (como Thonny), errores explicados en español con la línea marcada. Copiar, guardar como `.py` y abrir `.py`. |

## Cómo trata tus documentos (y qué no hace)

- **No usa inteligencia artificial ni servicios externos.** Todo el análisis es local y por reglas:
  - Relaciona fragmentos con temas **buscando palabras clave**. Muestra siempre qué palabras lo
    detectaron y puedes corregirlo («Cambiar temas», «No es de este tema»).
  - Los **resúmenes son extractivos**: frases copiadas literalmente de tus documentos, con su cita.
  - Detecta **ejercicios** por patrones («Ejercicio 3:», «Actividad 2», «Escribe un programa que…»,
    o puntos numerados si marcas el material como «Ejercicios»).
  - Detecta **código** en tus apuntes para practicarlo y genera «Predice la salida», siempre marcado
    como **Adaptación**.
  - Señala unas pocas **diferencias concretas** entre materiales (print de Python 2 frente a
    Python 3, `raw_input` frente a `input`, distinto número de espacios de sangría). No puede
    detectar cualquier contradicción: cuando un tema aparece en varios materiales, lo indica y te
    pide que los compares.
- Cada fragmento lleva su **cita**: documento + página (PDF), sección (DOCX/Markdown/TXT con
  títulos) y líneas (TXT/Markdown/.py).
- Las explicaciones propias de la app están marcadas como **Complemento**.
- La app **no inventa soluciones** para los ejercicios de tus materiales: si no hay solución
  verificable, lo dice.

## Seguridad

- Los documentos y el progreso se guardan **solo en este navegador** (IndexedDB y localStorage).
  No se envían a ningún sitio.
- El código Python se ejecuta con **Pyodide** (Python compilado a WebAssembly) dentro de un
  **Web Worker** del navegador: su sistema de archivos es virtual y no puede ver tus archivos,
  credenciales ni ejecutar comandos del sistema.
- El servidor (`server.mjs`) escucha solo en `127.0.0.1` y envía una política de seguridad (CSP)
  que impide que la página o el código Python se conecten a otros servidores. Además, el código del
  usuario no puede importar los puentes con JavaScript (`js`, `pyodide`).
- En GitHub Pages, esas mismas cabeceras (aislamiento COOP/COEP y CSP) las añade el service worker
  `sw.js` a cada respuesta del propio sitio. No guarda caché ni toca peticiones a otros dominios.

## Decisiones técnicas

- **Sin paso de compilación:** HTML, CSS y módulos JavaScript nativos. Fácil de leer y modificar.
- **Bibliotecas locales** (se sirven desde `node_modules`, sin CDN): `pyodide` (Python), `pdfjs-dist`
  (PDF) y `mammoth` (DOCX). Versiones fijadas en `package.json`.
- **Servidor propio mínimo** en lugar de abrir el HTML con doble clic: hace falta para las cabeceras
  COOP/COEP, que permiten a `input()` esperar tu respuesta y al botón «Detener» interrumpir Python.
- **Editor propio** (textarea + numeración + coloreado) en lugar de una biblioteca de editor, para no
  necesitar empaquetador.

## Estructura

```
server.mjs                 servidor local (cabeceras de seguridad, sirve public/ y bibliotecas)
iniciar.bat                arranque con doble clic en Windows
scripts/build-pages.mjs    prepara _site/ para GitHub Pages (public/ + bibliotecas)
.github/workflows/pages.yml  publica en GitHub Pages en cada push a main
public/
  index.html, css/styles.css
  sw.js                    service worker para GitHub Pages (cabeceras de seguridad)
  js/coi.js                registra sw.js si hace falta (no hace nada en local)
  js/app.js                arranque y navegación (#/materiales, #/temas, #/ejercicios, #/codigo)
  js/state.js              estado compartido (materiales, índice, ejercicios)
  js/store.js              almacenamiento local
  js/importers.js          lectura de PDF / DOCX / TXT / MD / PY y división en fragmentos citables
  js/analysis.js           temas por palabras clave, ejercicios, código, diferencias, resúmenes
  js/editor.js             editor de código
  js/ui.js                 utilidades de interfaz
  js/content/topics.js     ruta para principiantes (explicaciones, ejemplos, ejercicios, pruebas)
  js/python/worker.js      Python (Pyodide) en un Web Worker
  js/python/runner.js      control del worker (ejecutar, input, detener, pruebas)
  js/python/errors.js      explicación de errores en español
  js/views/*.js            pantallas: materiales, temas, ejercicios y espacio de código
```

Para añadir o cambiar temas y ejercicios, edita `public/js/content/topics.js` (cada ejercicio
admite pruebas por entrada/salida o por llamada a función).

## Limitaciones conocidas

- **PDF escaneados** (imágenes): no se pueden leer (no hay OCR). La app lo avisa y permite pegar el texto.
- **.doc antiguo, .odt, .pptx**: no se leen; hay que guardarlos como DOCX/PDF o pegar el texto.
- En los **PDF**, la sangría del código se reconstruye de forma aproximada y los títulos de sección
  no se conservan (las citas son por página).
- La relación de fragmentos con temas y la detección de ejercicios son **heurísticas**: pueden fallar
  y por eso se pueden corregir a mano.
- Las pruebas automáticas comprueban que ciertos textos **aparezcan** en la salida (o el valor que
  devuelve una función); no detectan todos los errores posibles.
- Solo está la **biblioteca estándar** de Python (no se instalan paquetes como numpy).
- Los datos viven en el navegador: si borras los datos del sitio, se pierden (no hay exportación
  de copia de seguridad todavía). Python tarda unos segundos en cargar la primera vez.
