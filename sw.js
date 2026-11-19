/* 游戏加载器 Service Worker：固定 commit 资源缓存优先，导航请求离线兜底。
   部署位置：与 index.html 同目录（GitHub Pages 项目站为仓库根目录）。 */
var VERSION = 'game-loader-sw-v1';
var PINNED = /^https:\/\/(?:gcore\.jsdelivr\.net|fastly\.jsdelivr\.net|cdn\.jsdelivr\.net|raw\.githubusercontent\.com)\/.+@[0-9a-f]{40}\//i;

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  // 页面导航：网络优先，断网时回退到缓存的加载页。
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          var canonical = new URL('index.html', self.registration.scope).href;
          caches.open(VERSION).then(function (cache) {
            cache.put(req, copy);
            cache.put(canonical, res.clone());
          });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match(new URL('index.html', self.registration.scope).href);
        });
      })
    );
    return;
  }

  // 固定 commit 的 CDN / Raw 资源：内容不可变，缓存优先。
  if (PINNED.test(req.url)) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res.ok) {
            var copy = res.clone();
            caches.open(VERSION).then(function (cache) { cache.put(req, copy); });
          }
          return res;
        });
      })
    );
  }
});