/* 更新密码校验：密码只以 PBKDF2-SHA256 加盐哈希保存，不存明文。
   验证通过后才允许加载器执行“更新”动作。 */
(function () {
  'use strict';

  var ITERATIONS = 210000;
  var SALT_B64 = '0AN7oqzlsHBAf2CfK6dp2A==';
  var EXPECT_B64 = 'riArXcWTft1/39+/PAuVUO4XReTnZQ/o8Qq2zkayYOA=';
  var pendingResolve = null;
  var checking = false;
  var ui = null;

  function b64ToBytes(b64) {
    var raw = atob(b64);
    var bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  function bytesToB64(bytes) {
    var raw = '';
    for (var i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
    return btoa(raw);
  }

  function safeEqual(a, b) {
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function verify(password) {
    if (!password) return Promise.resolve(false);
    if (!window.crypto || !window.crypto.subtle) return Promise.resolve(false);
    var encoder = new TextEncoder();
    return window.crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    ).then(function (key) {
      return window.crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt: b64ToBytes(SALT_B64),
        iterations: ITERATIONS,
        hash: 'SHA-256'
      }, key, 256);
    }).then(function (bits) {
      return safeEqual(bytesToB64(new Uint8Array(bits)), EXPECT_B64);
    }).catch(function () {
      return false;
    });
  }


  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function meta(name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? (el.getAttribute('content') || '') : '';
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
        return response.arrayBuffer();
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

  function pickRemoteHash(json, file) {
    var entries = (json && json.files) || [];
    for (var i = 0; i < entries.length; i++) {
      if (String(entries[i].name || '') === '/' + file) return decodeHash(entries[i].hash);
    }
    return '';
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
        return response.json();
      }).then(function (json) {
        if (timer) clearTimeout(timer);
        resolve(json && json.file === file ? decodeHash(json.sha256) : '');
      }).catch(function () {
        if (timer) clearTimeout(timer);
        resolve('');
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

      if (!repoMeta || !file) {
        fail('更新失败：缺少仓库配置');
        return;
      }

      var at = repoMeta.lastIndexOf('@');
      var repoPath = at < 0 ? repoMeta : repoMeta.slice(0, at);
      var metaRef = at < 0 ? 'main' : (repoMeta.slice(at + 1) || 'main');
      var baseRef = /^[0-9a-f]{7,40}$/i.test(metaRef) ? metaRef : (metaRef || 'main');
      var updateKey = 'loader_update_check|' + repoMeta + '|' + file;
      var metaHash = String(meta('game-sha256') || '').toLowerCase();
      var encodedRepo = encodePath(repoPath);
      var encodedFile = encodePath(file);
      var urls = [
        'https://gcore.jsdelivr.net/gh/' + encodedRepo + '@main/' + encodedFile,
        'https://fastly.jsdelivr.net/gh/' + encodedRepo + '@main/' + encodedFile,
        'https://cdn.jsdelivr.net/gh/' + encodedRepo + '@main/' + encodedFile,
        'https://raw.githubusercontent.com/' + encodedRepo + '/main/' + encodedFile
      ];

      /* 不以本地缓存里的旧哈希作为目标值：先向 jsDelivr 元数据确认当前 main 的真实哈希。
         这样即使页面上的“发现新版本”提示来自过期缓存，也不会拿旧哈希去校验新文件。 */
      if (updateText) updateText.textContent = '正在确认新版本…';
      fetchRemoteHash(file, 15000).then(function (remoteHash) {
        if (!/^[0-9a-f]{64}$/.test(remoteHash)) {
          fail('更新失败：无法获取新版本校验值，请稍后再试');
          return;
        }
        if (remoteHash === metaHash) {
          var bar = document.getElementById('updBar');
          writeJSON(updateKey, { at: Date.now(), hash: remoteHash, dismissed: remoteHash });
          if (bar) bar.hidden = true;
          fail('当前已是最新版本，无需更新');
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
          download(urls[index++], 75000).then(function (buffer) {
            return digest(buffer).then(function (hash) {
              if (hash !== expected) throw new Error('SHA-256 不一致');
              writeJSON('loader_ref_override|' + repoMeta + '|' + file, {
                base: baseRef, commit: 'main', sha: expected, at: Date.now()
              });
              writeJSON(updateKey, { at: Date.now(), hash: expected, dismissed: '' });
              if (updateText) updateText.textContent = '更新完成，正在重新加载…';
              location.reload();
            });
          }).catch(function () {
            tryNext();
          });
        }

        tryNext();
      });
    });
  }

  function ensureUI() {
    if (ui) return ui;

    var style = document.createElement('style');
    style.textContent = [
      '.pb-auth-mask{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:calc(18px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom));background:rgba(2,5,12,.78);backdrop-filter:blur(6px);}',
      '.pb-auth-mask[hidden]{display:none!important;}',
      '.pb-auth-card{width:min(92vw,420px);box-sizing:border-box;padding:22px 20px;border:1px solid #33466e;border-radius:16px;background:linear-gradient(180deg,#111b30,#0b1222);box-shadow:0 20px 70px rgba(0,0,0,.55);color:#e8eefc;font-family:inherit;}',
      '.pb-auth-title{font-size:18px;font-weight:700;letter-spacing:.04em;margin-bottom:9px;}',
      '.pb-auth-desc{font-size:13px;line-height:1.7;color:#9fb0ce;margin-bottom:14px;}',
      '.pb-auth-input{width:100%;box-sizing:border-box;height:44px;padding:0 13px;border-radius:9px;border:1px solid #3b4f76;background:#080f1d;color:#eef3ff;font-size:16px;outline:none;}',
      '.pb-auth-input:focus{border-color:#7ca2ff;box-shadow:0 0 0 3px rgba(88,135,255,.18);}',
      '.pb-auth-err{min-height:20px;padding-top:7px;font-size:12px;color:#ff8e9d;}',
      '.pb-auth-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:7px;}',
      '.pb-auth-btn{appearance:none;border:0;border-radius:9px;padding:10px 15px;font-family:inherit;font-size:13px;cursor:pointer;}',
      '.pb-auth-btn.ghost{background:transparent;border:1px solid #34476c;color:#aab9d6;}',
      '.pb-auth-btn.primary{background:#7c9dff;color:#071021;font-weight:700;}',
      '.pb-auth-btn:disabled{opacity:.55;cursor:default;}'
    ].join('');
    document.head.appendChild(style);

    var mask = document.createElement('div');
    mask.className = 'pb-auth-mask';
    mask.hidden = true;
    mask.innerHTML = [
      '<div class="pb-auth-card" role="dialog" aria-modal="true" aria-labelledby="pbAuthTitle">',
      '<div class="pb-auth-title" id="pbAuthTitle">发现游戏新版本</div>',
      '<div class="pb-auth-desc">是否更新？请输入更新密码，验证通过后才会下载并替换游戏。</div>',
      '<input class="pb-auth-input" id="pbAuthInput" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="请输入更新密码">',
      '<div class="pb-auth-err" id="pbAuthErr" role="status"></div>',
      '<div class="pb-auth-actions">',
      '<button class="pb-auth-btn ghost" id="pbAuthCancel" type="button">取消</button>',
      '<button class="pb-auth-btn primary" id="pbAuthOk" type="button">验证并更新</button>',
      '</div></div>'
    ].join('');
    document.body.appendChild(mask);

    var input = mask.querySelector('#pbAuthInput');
    var err = mask.querySelector('#pbAuthErr');
    var okBtn = mask.querySelector('#pbAuthOk');
    var cancelBtn = mask.querySelector('#pbAuthCancel');

    function close(result) {
      mask.hidden = true;
      input.value = '';
      err.textContent = '';
      okBtn.disabled = false;
      cancelBtn.disabled = false;
      checking = false;
      var done = pendingResolve;
      pendingResolve = null;
      if (done) done(result);
    }

    function submit() {
      if (checking) return;
      var password = input.value;
      if (!password) {
        err.textContent = '请输入更新密码';
        input.focus();
        return;
      }
      checking = true;
      okBtn.disabled = true;
      cancelBtn.disabled = true;
      err.textContent = '正在校验…';
      verify(password).then(function (ok) {
        checking = false;
        okBtn.disabled = false;
        cancelBtn.disabled = false;
        if (ok) {
          close(true);
        } else {
          err.textContent = '密码错误，未执行更新';
          input.select();
        }
      });
    }

    okBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', function () { close(false); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      }
    });
    mask.addEventListener('click', function (event) {
      if (event.target === mask) close(false);
    });

    ui = { mask: mask, input: input, err: err, okBtn: okBtn, cancelBtn: cancelBtn };
    return ui;
  }

  function ask() {
    if (pendingResolve) return Promise.resolve(false);
    var view = ensureUI();
    view.input.value = '';
    view.err.textContent = '';
    view.okBtn.disabled = false;
    view.cancelBtn.disabled = false;
    view.mask.hidden = false;
    return new Promise(function (resolve) {
      pendingResolve = resolve;
      setTimeout(function () { view.input.focus(); }, 60);
    });
  }

  function installGate() {
    var updateButton = document.getElementById('updYes');
    if (!updateButton) return;

    /* update-auth.js 加载成功后才放行“更新”按钮；若脚本缺失，按钮保持禁用。 */
    updateButton.disabled = false;
    var running = false;
    updateButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (running) return;
      var updateText = document.getElementById('updText');
      var ignoreButton = document.getElementById('updNo');
      if (updateText) updateText.textContent = '检测到新版本，请输入密码后更新';
      ask().then(function (ok) {
        if (!ok) {
          if (updateText) updateText.textContent = '已取消更新';
          return;
        }
        running = true;
        updateButton.disabled = true;
        if (ignoreButton) ignoreButton.disabled = true;
        runUpdate().then(function (success) {
          running = false;
          if (success && updateButton) updateButton.disabled = false;
        });
      });
    }, true);
  }

  window.UpdateAuth = { ask: ask, verify: verify };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGate);
  } else {
    installGate();
  }
})();
