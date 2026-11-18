/* ============================================================
   Service Worker — Offline-First
   ============================================================ */
const CACHE_NAME = "mi-pagina-v2";

const URL_JQUERY = "https://code.jquery.com/jquery-3.7.1.min.js";

const ARCHIVOS_BASE = [
    "./",
    "./index.html",
    "./index2.html",
    "./styles.css",
    "./script.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png"
];

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

self.addEventListener("install", function (evento) {
    evento.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            const peticionJquery = new Request(URL_JQUERY, { mode: "cors" });

            const opcionales = ARCHIVOS_OPCIONALES.concat([peticionJquery]).map(function (item) {
                return cache.add(item).catch(function () {});
            });

            return cache.addAll(ARCHIVOS_BASE).then(function () {
                return Promise.all(opcionales);
            });
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

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

self.addEventListener("fetch", function (evento) {
    const peticion = evento.request;

    if (peticion.method !== "GET") return;

    const url = new URL(peticion.url);
    const esPropio = url.origin === self.location.origin;
    const esJquery = peticion.url === URL_JQUERY;

    if (!esPropio && !esJquery) return;

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

function navegacion(peticion) {
    return caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(peticion, { ignoreSearch: true }).then(function (guardada) {
            const red = fetch(peticion).then(function (respuesta) {
                if (respuesta && respuesta.ok) cache.put(peticion, respuesta.clone());
                return respuesta;
            });

            if (guardada) {
                red.catch(function () {});
                return guardada;
            }
            return red.catch(function () { return cache.match("./index.html"); });
        });
    });
}

self.addEventListener("message", function (evento) {
    if (evento.data && evento.data.tipo === "ACTIVAR_NUEVA_VERSION") self.skipWaiting();
});
