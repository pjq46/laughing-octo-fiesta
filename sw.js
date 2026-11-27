/* 游戏加载器 Service Worker：固定 commit 资源缓存优先，导航离线兜底。
   加载器本体（loader.js / loader.css）与更新脚本走网络优先，保证改动立刻生效。
   部署位置：与 index.html 同目录（GitHub Pages 项目站为仓库根目录）。 */
var VERSION = 'game-loader-sw-v21';
var CACHE_PREFIX = 'game-loader-sw-';
var SCOPE = self.registration.scope;
var INDEX_URL = new URL('index.html', SCOPE).href;
var PAGE404_URL = new URL('404.html', SCOPE).href;
var UPDATE_URL = new URL('update-auth.js?v=15', SCOPE).href;
var LOADER_JS_URL = new URL('loader.js', SCOPE).href;
var LOADER_CSS_URL = new URL('loader.css', SCOPE).href;
var CORE_ASSETS = [INDEX_URL, PAGE404_URL, UPDATE_URL, LOADER_JS_URL, LOADER_CSS_URL];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return Promise.all(CORE_ASSETS.map(function (url) {
        /* 单个资源失败不阻断安装：某个文件没部署时仍可用其余缓存离线打开。 */
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
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
        /* 只清理本加载器的旧缓存；CacheStorage 是整个源共享的，
           不能删除同域其他项目的缓存（例如 axxiu 同域多项目）。 */
        return key.indexOf(CACHE_PREFIX) === 0 && key !== VERSION;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isCacheable(request, response) {
  if (!response) return false;
  if (!response.ok) return false;                  /* 4xx / 5xx 一律不落盘 */
  if (response.status === 206) return false;       /* 分片响应不完整 */
  if (response.type === 'opaqueredirect') return false;
  if (response.type === 'opaque') return false;    /* 跨域不透明响应无法校验 */
  var url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (request.mode !== 'navigate') {
    var contentType = (response.headers.get('content-type') || '').toLowerCase();
    /* 防止把 HTML 兜底页当作 JS / CSS / JSON 缓存下来。 */
    if (contentType.indexOf('text/html') === 0) return false;
  }
  return true;
}

function cacheResponse(request, response) {
  if (!isCacheable(request, response)) return response;
  var copy = response.clone();
  caches.open(VERSION).then(function (cache) {
    return cache.put(request, copy).catch(function () {});
  }).catch(function () {});
  return response;
}

function networkFirst(request) {
  return fetch(request, { cache: 'no-cache' }).then(function (response) {
    return cacheResponse(request, response);
  }).catch(function () {
    return caches.match(request);
  });
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

  // 加载器本体与更新脚本：联网时取最新并刷新缓存，断网时回退到最近缓存。
  if (url.origin === self.location.origin
    && (url.pathname.endsWith('/loader.js')
      || url.pathname.endsWith('/loader.css')
      || url.pathname.endsWith('/update-auth.js'))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 固定 commit 的 CDN / Raw 资源：内容不可变，缓存优先。
  var pinned = /^https:\/\/(?:gcore\.jsdelivr\.net|fastly\.jsdelivr\.net|cdn\.jsdelivr\.net)\/gh\/.+@[0-9a-f]{40}\//i.test(request.url)
    || /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[0-9a-f]{40}\//i.test(request.url);
  if (pinned) {
    event.respondWith(cacheFirst(request));
  }
});
