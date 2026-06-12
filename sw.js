/* Service worker for Pip's Sunny Adventure.
   Makes the game installable and offline-capable. Network-first so online
   players always get the latest code after a deploy; falls back to the
   cached assets (and the cached index.html shell) when offline. */
"use strict";

var CACHE = "pip-v8-net";

var CORE = [
  "./",
  "index.html",
  "style.css",
  "audio.js",
  "sprites.js",
  "themes.js",
  "weather.js",
  "levels.js",
  "decor.js",
  "cosmetics.js",
  "ambient.js",
  "seasons.js",
  "learn.js",
  "achievements.js",
  "stickers.js",
  "game.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png",
  "apple-touch-icon.png"
];

// Precache the core bundle. Each asset is added on its own so a single
// missing file (e.g. an optional module that isn't shipped yet) can't abort
// the whole install.
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(
        CORE.map(function (url) {
          return cache.add(url).catch(function () {
            /* skip assets that fail to fetch; the rest still cache */
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Drop any caches from older versions, then take control of open pages.
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE) return caches.delete(key);
          return null;
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Network-first: always try the network so updates reach online players
// immediately, refreshing the cache as we go. Fall back to cache when
// offline; page navigations fall back to the cached shell.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        if (req.mode === "navigate") {
          return caches.match("index.html").then(function (shell) {
            return shell || caches.match("./");
          });
        }
        return Response.error();
      });
    })
  );
});
