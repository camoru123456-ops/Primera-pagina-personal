/* ============================================================
   Service Worker — Offline-First
   Estrategias:
   - Archivos propios: "stale-while-revalidate" (responde desde la
     caché al instante y actualiza en segundo plano).
   - jQuery por CDN: "cache-first" (una vez guardado, no vuelve a la red).
   - Navegación sin conexión: cae a la página guardada.
   Para publicar cambios: sube la versión de CACHE_NAME.
   ============================================================ */
const CACHE_NAME = "mi-pagina-v1";

const URL_JQUERY = "https://code.jquery.com/jquery-3.7.1.min.js";

/* Imprescindibles: si alguno falla, la instalación se cancela */
const ARCHIVOS_BASE = [
    "./",
    "./index.html",
    "./index2.html",
    "./styles_2.css",
    "./script.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png"
];

/* Opcionales: si falta alguno (o no hay red), se ignora sin romper la instalación */
const ARCHIVOS_OPCIONALES = [
    "./devilmay.jpg",
    "./ciber.jpg",
    "./lenguaje.jpg",
    "./resident.jpg",
    "./half.jpg",
    "./Rise.jpg",
    "./issac.jpg",
    "./Payday2.jpg",
    "./Payday3.jpg"
];

/* ---------- INSTALACIÓN: precarga ---------- */
self.addEventListener("install", function (evento) {
    evento.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            // jQuery se pide en modo "cors" para que la copia guardada sea reutilizable
            // por la etiqueta <script crossorigin="anonymous"> (con integrity).
            const peticionJquery = new Request(URL_JQUERY, { mode: "cors" });

            const opcionales = ARCHIVOS_OPCIONALES.concat([peticionJquery]).map(function (item) {
                return cache.add(item).catch(function () { /* se ignora */ });
            });

            return cache.addAll(ARCHIVOS_BASE).then(function () {
                return Promise.all(opcionales);
            });
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

/* ---------- ACTIVACIÓN: limpia cachés antiguas ---------- */
self.addEventListener("activate", function (evento) {
    evento.waitUntil(
        caches.keys().then(function (nombres) {
            return Promise.all(
                nombres
                    .filter(function (nombre) { return nombre !== CACHE_NAME; })
                    .map(function (nombre) { return caches.delete(nombre); })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

/* ---------- FETCH: interceptación de solicitudes ---------- */
self.addEventListener("fetch", function (evento) {
    const peticion = evento.request;

    if (peticion.method !== "GET") return;

    const url = new URL(peticion.url);
    const esPropio = url.origin === self.location.origin;
    const esJquery = peticion.url === URL_JQUERY;

    if (!esPropio && !esJquery) return;      // otros orígenes: la red decide

    if (esJquery) {
        evento.respondWith(cachePrimero(peticion));
        return;
    }

    if (peticion.mode === "navigate") {
        evento.respondWith(navegacion(peticion));
        return;
    }

    evento.respondWith(revalidar(peticion));
});

/* Cache-first: usa la copia guardada; si no existe, va a la red y la guarda */
function cachePrimero(peticion) {
    return caches.match(peticion).then(function (guardada) {
        if (guardada) return guardada;
        return fetch(peticion).then(function (respuesta) {
            if (respuesta && respuesta.ok) {
                const copia = respuesta.clone();
                caches.open(CACHE_NAME).then(function (cache) { cache.put(peticion, copia); });
            }
            return respuesta;
        });
    });
}

/* Stale-while-revalidate para archivos propios */
function revalidar(peticion) {
    return caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(peticion, { ignoreSearch: true }).then(function (guardada) {
            const red = fetch(peticion).then(function (respuesta) {
                if (respuesta && respuesta.ok) cache.put(peticion, respuesta.clone());
                return respuesta;
            }).catch(function () { return guardada || Response.error(); });

            return guardada || red;
        });
    });
}

/* Navegación (páginas HTML): copia guardada al instante y se actualiza en segundo plano;
   si la página no está guardada y no hay red, se muestra index.html */
function navegacion(peticion) {
    return caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(peticion, { ignoreSearch: true }).then(function (guardada) {
            const red = fetch(peticion).then(function (respuesta) {
                if (respuesta && respuesta.ok) cache.put(peticion, respuesta.clone());
                return respuesta;
            });

            if (guardada) {
                red.catch(function () { /* sin red: se queda la copia guardada */ });
                return guardada;
            }
            return red.catch(function () { return cache.match("./index.html"); });
        });
    });
}

/* Permite que la página pida activar una versión nueva del Service Worker */
self.addEventListener("message", function (evento) {
    if (evento.data && evento.data.tipo === "ACTIVAR_NUEVA_VERSION") self.skipWaiting();
});
