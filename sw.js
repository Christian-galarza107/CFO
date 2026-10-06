/*
 * Service worker de CFO Personal (D-34).
 *  - CLÁSICO (no módulo): máxima compatibilidad entre navegadores.
 *  - Cachea SOLO el "app shell" (código, estilos, fuentes, íconos) con un nombre de caché versionado.
 *  - NUNCA cachea datos: los datos financieros viven en IndexedDB y no pasan por acá. Todo lo que no
 *    está en la lista se pide a la red y NO se guarda.
 *  - NO llama a skipWaiting() por su cuenta: una versión nueva espera a que el usuario confirme
 *    ("Hay una nueva versión disponible" → Actualizar), para no cambiar el código bajo sus pies.
 * La lista de archivos y SHELL_HASH los genera `npm run stamp`; un test verifica que estén al día.
 */
'use strict';

const APP_VER = '0.4.0';
/* STAMP:BEGIN (generado por tools/stamp.mjs: no editar a mano) */
const SHELL_HASH = 'b59cfefc02a2869e';
const PRECACHE = [
  './',
  './app.css',
  './app.js',
  './assets/fonts/manrope-latin-ext-wght-normal.woff2',
  './assets/fonts/manrope-latin-wght-normal.woff2',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/icon.svg',
  './boot.js',
  './index.html',
  './manifest.webmanifest',
];
/* STAMP:END */

const CACHE_PREFIX = 'cfo-shell-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VER}-${SHELL_HASH}`;

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  // `reload` salta la caché HTTP del navegador: se guarda lo que hay en el servidor AHORA.
  await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
}

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanup());
});

async function cleanup() {
  for (const key of await caches.keys()) {
    if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
  }
  await self.clients.claim();
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return; // nunca se intercepta nada de terceros
  event.respondWith(respond(request));
});

async function respond(request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  if (request.mode === 'navigate') {
    const shell = await cache.match('./index.html');
    if (shell) return shell;
  }
  return fetch(request); // sin guardar
}
