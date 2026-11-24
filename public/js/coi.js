// Activa el «aislamiento entre orígenes» cuando el sitio no puede enviar las
// cabeceras necesarias (GitHub Pages). Con el servidor local ya viene activado y
// este archivo no hace nada.
//
// Si hace falta, registra sw.js (que añade las cabeceras) y recarga la página
// una vez. window.coiPending es una promesa que app.js espera antes de arrancar:
// - null si no hay que hacer nada;
// - nunca se resuelve si la página va a recargarse;
// - se resuelve en null si no se pudo (la app arranca igualmente, con input()
//   y «Detener» limitados).
(function () {
  var KEY = 'estudia-python:coi-recarga';
  function getFlag() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function setFlag() { try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* sin sessionStorage */ } }
  function clearFlag() { try { sessionStorage.removeItem(KEY); } catch (e) { /* sin sessionStorage */ } }

  window.coiPending = null;
  if (window.crossOriginIsolated) { clearFlag(); return; }
  if (!window.isSecureContext || !('serviceWorker' in navigator)) return;
  // Ya recargamos una vez y sigue sin aislamiento: no insistir (evita bucles).
  if (getFlag()) { clearFlag(); return; }

  window.coiPending = navigator.serviceWorker
    .register(new URL('../sw.js', document.currentScript.src).href)
    .then(function () { return navigator.serviceWorker.ready; })
    .then(function () {
      setFlag();
      location.reload();
      return new Promise(function () {});
    })
    .catch(function () { return null; });
})();
