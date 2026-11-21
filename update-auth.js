/* 更新密码校验：密码只以 PBKDF2-SHA256 加盐哈希保存，不存明文。
   验证通过后才允许加载器执行“更新”动作。 */
(function () {
  'use strict';

  var ITERATIONS = 210000;
  var SALT_B64 = '0AN7oqzlsHBAf2CfK6dp2A==';
  var EXPECT_B64 = 'riArXcWTft1/39+/PAuVUO4XReTnZQ/o8Qq2zkayYOA=';
  var pendingResolve = null;
  var checking = false;
  var authorizedOnce = false;
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
    updateButton.addEventListener('click', function (event) {
      if (authorizedOnce) {
        authorizedOnce = false;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      var updateText = document.getElementById('updText');
      if (updateText) updateText.textContent = '检测到新版本，请输入密码后更新';
      ask().then(function (ok) {
        if (!ok) {
          if (updateText) updateText.textContent = '已取消更新';
          return;
        }
        authorizedOnce = true;
        updateButton.click();
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
