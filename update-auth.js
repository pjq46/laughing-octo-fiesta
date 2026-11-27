/* 更新脚本：检测新版本、下载、SHA-256 校验并切换版本，不再需要密码。
   同时维护 loader_hash_state：记录当前 HTML 目标和上一版哈希，供缓存三态判断。
   文件名保留 update-auth.js，以兼容现有页面和 Service Worker 的引用。 */
(function () {
  'use strict';

  var MAX_GAME_BYTES = 33554432;
  var MAX_MANIFEST_BYTES = 65536;
  var FILE = (meta('game-file') || 'game.html').replace(/^\/+/, '');

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  function readJSON(key) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) { return null; }
  }

  function meta(name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? (el.getAttribute('content') || '') : '';
  }

  function validFile(value) {
    var text = String(value || '');
    return text.length <= 200
      && /^[A-Za-z0-9._\-\/]+$/.test(text)
      && text.split('/').every(function (part) { return part && part !== '.' && part !== '..'; });
  }

  function validRepo(value) {
    var text = String(value || '');
    return text.length <= 200
      && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:@[A-Za-z0-9._-]{1,40})?$/.test(text);
  }

  function encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function toHex(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
    return out;
  }

  function digest(buffer) {
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.reject(new Error('浏览器不支持 SHA-256'));
    }
    return window.crypto.subtle.digest('SHA-256', buffer).then(function (bits) {
      return toHex(new Uint8Array(bits));
    });
  }

  function download(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = null;
      var options = { cache: 'no-store' };
      if (controller) {
        options.signal = controller.signal;
        timer = setTimeout(function () { controller.abort(); }, timeoutMs);
      }
      fetch(url, options).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var length = Number(response.headers.get('Content-Length') || 0);
        if (length > MAX_GAME_BYTES) throw new Error('文件过大');
        if (response.body && response.body.getReader) {
          var reader = response.body.getReader();
          var chunks = [];
          var total = 0;
          function readNext() {
            return reader.read().then(function (part) {
              if (part.done) {
                var output = new Uint8Array(total);
                var offset = 0;
                for (var i = 0; i < chunks.length; i++) {
                  output.set(chunks[i], offset);
                  offset += chunks[i].length;
                }
                return output.buffer;
              }
              total += part.value.length;
              if (total > MAX_GAME_BYTES) {
                return reader.cancel().then(function () {
                  throw new Error('文件过大');
                });
              }
              chunks.push(part.value);
              return readNext();
            });
          }
          return readNext();
        }
        return response.arrayBuffer().then(function (buffer) {
          if (buffer.byteLength > MAX_GAME_BYTES) throw new Error('文件过大');
          return buffer;
        });
      }).then(function (buffer) {
        if (timer) clearTimeout(timer);
        resolve(buffer);
      }).catch(function (error) {
        if (timer) clearTimeout(timer);
        reject(error);
      });
    });
  }

  function decodeHash(value) {
    var text = String(value || '');
    if (/^[0-9a-f]{64}$/i.test(text)) return text.toLowerCase();
    try {
      var b64 = text.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var raw = atob(b64);
      if (raw.length !== 32) return '';
      var out = '';
      for (var i = 0; i < raw.length; i++) out += ('0' + raw.charCodeAt(i).toString(16)).slice(-2);
      return out;
    } catch (e) { return ''; }
  }

  /* 读取同目录的 game-version.json。该文件由 Pages 部署工作流根据 game.html 重新生成，
     提供当前 main 的真实 SHA-256，避免 jsDelivr 元数据与实际文件不一致。 */
  function fetchRemoteHash(file, timeoutMs) {
    return new Promise(function (resolve) {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = null;
      var options = { cache: 'no-store' };
      if (controller) {
        options.signal = controller.signal;
        timer = setTimeout(function () { controller.abort(); }, timeoutMs);
      }
      var url = new URL('game-version.json', location.href).href + '?ts=' + Date.now();
      fetch(url, options).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var length = Number(response.headers.get('Content-Length') || 0);
        if (length > MAX_MANIFEST_BYTES) throw new Error('版本清单过大');
        return response.text();
      }).then(function (text) {
        if (text.length > MAX_MANIFEST_BYTES) throw new Error('版本清单过大');
        var json = JSON.parse(text);
        if (timer) clearTimeout(timer);
        resolve(json && json.file === file ? decodeHash(json.sha256) : '');
      }).catch(function () {
        if (timer) clearTimeout(timer);
        resolve('');
      });
    });
  }

  function openGameCache() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      var request = indexedDB.open('game_loader_cache_v1', 1);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains('pages')) db.createObjectStore('pages', { keyPath: 'key' });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('IndexedDB open failed')); };
    });
  }

  /* 更新时先写入新缓存，再切换版本指针；这样重新加载后无需重复下载，
     即使更新后马上断网也能进入。顺带删除同一游戏的历史缓存，避免占满配额。 */
  function cacheGame(record, prefix) {
    return openGameCache().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction('pages', 'readwrite');
          var store = tx.objectStore('pages');
          store.put(record);
          var keys = store.getAllKeys();
          keys.onsuccess = function () {
            (keys.result || []).forEach(function (key) {
              var text = String(key);
              if ((text === prefix || text.indexOf(prefix + '|') === 0) && text !== record.key) store.delete(text);
            });
          };
          tx.oncomplete = function () { db.close(); resolve(true); };
          tx.onerror = function () { db.close(); reject(tx.error || new Error('IndexedDB write failed')); };
          tx.onabort = function () { db.close(); reject(tx.error || new Error('IndexedDB write aborted')); };
        } catch (e) {
          db.close();
          reject(e);
        }
      });
    });
  }

  function runUpdate() {
    return new Promise(function (resolve) {
      var updateButton = document.getElementById('updYes');
      var ignoreButton = document.getElementById('updNo');
      var updateText = document.getElementById('updText');
      var repoMeta = meta('game-repo');
      var file = (meta('game-file') || 'game.html').replace(/^\/+/, '');

      function fail(message) {
        if (updateText) updateText.textContent = message;
        if (updateButton) updateButton.disabled = false;
        if (ignoreButton) ignoreButton.disabled = false;
        resolve(false);
      }

      if (!repoMeta || !file || !validRepo(repoMeta) || !validFile(file)) {
        fail('更新失败：仓库或文件名不合法');
        return;
      }

      var at = repoMeta.lastIndexOf('@');
      var repoPath = at < 0 ? repoMeta : repoMeta.slice(0, at);
      var metaRef = at < 0 ? 'main' : (repoMeta.slice(at + 1) || 'main');
      if (metaRef && metaRef !== 'main' && !/^[0-9a-f]{7,40}$/i.test(metaRef)) {
        fail('更新失败：分支配置不合法');
        return;
      }
      var baseRef = /^[0-9a-f]{7,40}$/i.test(metaRef) ? metaRef : 'main';
      var updateKey = 'loader_update_check|' + encodedRepo + '|' + file;
      var metaHash = String(meta('game-sha256') || '').toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(metaHash)) {
        fail('更新失败：页面哈希无效');
        return;
      }
      var encodedRepo = encodePath(repoPath);
  /* 用页面里的 ref（部署时是提交号）取文件，避免 jsDelivr @main 的 12 小时旧缓存。 */
  var encodedRef = encodeURIComponent(baseRef);
      var encodedFile = encodePath(file);
      var urls = [
        'https://gcore.jsdelivr.net/gh/' + encodedRepo + '@' + encodedRef + '/' + encodedFile,
        'https://fastly.jsdelivr.net/gh/' + encodedRepo + '@' + encodedRef + '/' + encodedFile,
        'https://cdn.jsdelivr.net/gh/' + encodedRepo + '@' + encodedRef + '/' + encodedFile,
        'https://raw.githubusercontent.com/' + encodedRepo + '/' + encodedRef + '/' + encodedFile
      ];

      /* 不以本地缓存里的旧哈希作为目标值：先向 game-version.json 确认当前 main 的真实哈希。
         这样即使页面上的“发现新版本”提示来自过期缓存，也不会拿旧哈希去校验新文件。 */
      if (updateText) updateText.textContent = '正在确认新版本…';
      fetchRemoteHash(file, 15000).then(function (remoteHash) {
        if (!/^[0-9a-f]{64}$/.test(remoteHash)) {
          fail('更新失败：无法获取新版本校验值，请稍后再试');
          return;
        }
        var expected = remoteHash;
        var index = 0;

        function tryNext() {
          if (index >= urls.length) {
            fail('更新失败：下载失败或校验不一致，请检查网络后重试');
            return;
          }
          if (updateText) updateText.textContent = '正在下载新版本…（' + (index + 1) + '/' + urls.length + '）';
          var currentUrl = urls[index++];
          download(currentUrl, 75000).then(function (buffer) {
            return digest(buffer).then(function (hash) {
              if (hash !== expected) throw new Error('SHA-256 不一致');
              var key = 'page|' + location.origin + '|' + encodedRepo + '|' + file;
              var prefix = key;
              return new Blob([buffer]).text().then(function (html) {
                return cacheGame({
                  key: key,
                  html: html,
                  url: currentUrl,
                  savedAt: Date.now(),
                  digest: expected
                }, prefix).catch(function () { return false; }).then(function () {
                  /* 更新成功后写入当前浏览器的本地覆盖；第二种模式同时由工作流同步 index/404 的哈希。 */
                  var hashStateKey = 'loader_hash_state|' + encodedRepo + '|' + file;
                  var hashState = readJSON(hashStateKey) || {};
                  var oldHash = /^[0-9a-f]{64}$/i.test(hashState.prev || '') && hashState.prev !== expected
                    ? hashState.prev
                    : (/^[0-9a-f]{64}$/i.test(metaHash) && metaHash !== expected ? metaHash : '');
                  writeJSON(hashStateKey, { target: expected, prev: oldHash, at: Date.now() });
                  if (!writeJSON('loader_ref_override|' + repoMeta + '|' + file, {
                    base: baseRef, commit: 'main', sha: expected, at: Date.now()
                  })) {
                    fail('更新失败：无法保存版本信息，请清理浏览器存储后重试');
                    return;
                  }
                  writeJSON(updateKey, { at: Date.now(), hash: expected, dismissed: '' });
                  if (updateText) updateText.textContent = '更新完成，正在重新加载…';
                  location.reload();
                });
              });
            });
          }).catch(function () {
            tryNext();
          });
        }

        tryNext();
      });
    });
  }

  /* 更新按钮：直接执行，不再弹密码框。脚本缺失时按钮保持 disabled，避免误触。 */
  function installUpdate() {
    var updateButton = document.getElementById('updYes');
    if (!updateButton) return;
    updateButton.disabled = false;
    var running = false;
    updateButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (running) return;
      running = true;
      updateButton.disabled = true;
      var ignoreButton = document.getElementById('updNo');
      var updateText = document.getElementById('updText');
      if (ignoreButton) ignoreButton.disabled = true;
      if (updateText) updateText.textContent = '正在准备更新…';
      runUpdate().then(function (success) {
        running = false;
        updateButton.disabled = false;
        if (ignoreButton) ignoreButton.disabled = false;
        if (!success && updateText && updateText.textContent === '正在准备更新…') {
          updateText.textContent = '更新未完成';
        }
      });
    }, true);
  }

  /* 供加载器里的“检查更新”按钮复用：同一套清单读取、下载、校验与重载逻辑。 */
  window.__loaderUpdate = {
    remoteHash: function () { return fetchRemoteHash(FILE, 15000); },
    run: runUpdate,
    current: function () { return decodeHash(meta('game-sha256')); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installUpdate);
  } else {
    installUpdate();
  }
})();
