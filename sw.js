/* 游戏加载器 Service Worker：固定 commit 资源缓存优先，导航离线兜底。
   同时预缓存 update-auth.js，保证更新密码校验脚本可用。
   部署位置：与 index.html 同目录（GitHub Pages 项目站为仓库根目录）。 */
var VERSION = 'game-loader-sw-v6';
var SCOPE = self.registration.scope;
var INDEX_URL = new URL('index.html', SCOPE).href;
var PAGE404_URL = new URL('404.html', SCOPE).href;
var AUTH_URL = new URL('update-auth.js', SCOPE).href;
var CORE_ASSETS = [INDEX_URL, PAGE404_URL, AUTH_URL];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return Promise.all(CORE_ASSETS.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== VERSION;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function cacheResponse(request, response) {
  if (!response || !response.ok) return response;
  var copy = response.clone();
  caches.open(VERSION).then(function (cache) {
    cache.put(request, copy);
  }).catch(function () {});
  return response;
}

function networkFirstNavigation(request) {
  return fetch(request).then(function (response) {
    return cacheResponse(request, response);
  }).catch(function () {
    return caches.match(request).then(function (hit) {
      return hit || caches.match(INDEX_URL);
    });
  });
}

function cacheFirst(request) {
  return caches.match(request).then(function (hit) {
    if (hit) return hit;
    return fetch(request).then(function (response) {
      return cacheResponse(request, response);
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  // 页面导航：网络优先，断网时回退到缓存的加载页。
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  var url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.endsWith('/update-auth.js')) {
    // 密码校验脚本：缓存优先，保证页面加载后更新按钮能正常启用。
    event.respondWith(cacheFirst(request));
    return;
  }

  // 固定 commit 的 CDN / Raw 资源：内容不可变，缓存优先。
  var pinned = /^https:\/\/(?:gcore\.jsdelivr\.net|fastly\.jsdelivr\.net|cdn\.jsdelivr\.net)\/gh\/.+@[0-9a-f]{40}\//i.test(request.url)
    || /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[0-9a-f]{40}\//i.test(request.url);
  if (pinned) {
    event.respondWith(cacheFirst(request));
  }
});
