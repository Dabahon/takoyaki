/* =========================================================
   UN PLAN
   service-worker.js

   Estrategia "network first":
   - Con conexión, siempre se descarga la última versión
     (y se guarda una copia en caché).
   - Sin conexión (p. ej. de viaje sin datos), se usa
     la última copia guardada.

   Así cualquier cambio que se suba a GitHub llega en la
   siguiente visita, sin tener que borrar nada.
   ========================================================= */

const CACHE_NAME = "un-plan-v14";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./css/styles.css",
    "./js/app.js",
    "./manifest.json",
    "./assets/icons/icono-192.png",
    "./assets/icons/favicon.svg"
    // data/sorpresa.json no se descarga por adelantado (pesa ~1 MB):
    // se guarda en caché la primera vez que se abre el regalo.
];


self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
            .then(() => self.skipWaiting())
    );

});


self.addEventListener("activate", event => {

    // Borramos cachés de versiones anteriores.
    event.waitUntil(
        caches.keys()
            .then(nombres => Promise.all(
                nombres
                    .filter(nombre => nombre !== CACHE_NAME)
                    .map(nombre => caches.delete(nombre))
            ))
            .then(() => self.clients.claim())
    );

});


self.addEventListener("fetch", event => {

    const peticion = event.request;

    // Solo gestionamos GET de nuestra propia web.
    // Fuentes de Google, mapas, etc. van directas a la red.
    if (
        peticion.method !== "GET" ||
        new URL(peticion.url).origin !== self.location.origin
    ) {
        return;
    }

    event.respondWith(
        // no-cache: pregunta siempre al servidor si hay versión nueva
        fetch(peticion, { cache: "no-cache" })
            .then(respuesta => {

                if (respuesta.ok) {
                    const copia = respuesta.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(peticion, copia));
                }

                return respuesta;
            })
            .catch(() =>
                caches.match(peticion, { ignoreSearch: true })
            )
    );

});
