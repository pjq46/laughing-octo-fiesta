
!(function () {
  var e = function (e) {
      var t = document.querySelector('meta[name="' + e + '"]');
      return t ? t.getAttribute("content") : "";
    },
    t = new URLSearchParams(location.search);
  ((document.getElementById("logo").textContent = document.title || "加载中"),
    (document.getElementById("sub").textContent =
      t.get("subtitle") || e("game-subtitle") || ""));
  var n = (e("game-file") || "game.html").replace(/^\/+/, ""),
    r = e("game-repo") || "",
    a = (e("game-sha256") || "").trim().toLowerCase(),
    o = /^[0-9a-f]{64}$/.test(a) ? a : "",
    i = !!a && !o || !/^[A-Za-z0-9._\-\/]+$/.test(n) || n.length > 200 || n.split("/").some(function (e) { return !e || "." === e || ".." === e; }) || (!!r && (r.length > 200 || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:@[A-Za-z0-9._-]{1,40})?$/.test(r))),
    gameSize = (function () { var v = Number(e("game-size")); return v > 0 && v < 1e9 ? v : 0; })(),
    s = "",
    c = "",
    l = "",
    u = "",
    f = "",
    h = "";
  if (r) {
    var d = r.indexOf("@"),
      v = (d < 0 ? r : r.slice(0, d)).split("/");
    ((u = v[0] || ""), (f = v[1] || ""), (h = d < 0 ? "" : r.slice(d + 1)));
  }
  /\.github\.io$/i.test(location.hostname)
    ? ((s = location.hostname.split(".")[0]),
      (c = location.pathname.split("/").filter(Boolean)[0] || s + ".github.io"),
      (l = u === s && f === c ? h : "main"))
    : u && f && ((s = u), (c = f), (l = h));
  var g,
    m = (l = l || "main"),
    p = "loader_ref_override|" + r + "|" + n,
    w = !1;
  function y(e) {
    try {
      return JSON.parse(localStorage.getItem(e) || "null");
    } catch (e) {
      return null;
    }
  }
  function b(e, t) {
    try {
      localStorage.setItem(e, JSON.stringify(t));
    } catch (e) {}
  }
  function k(e) {
    return e.split("/").map(encodeURIComponent).join("/");
  }
  (g = y(p)) &&
    /^(?:[0-9a-f]{40}|main)$/i.test(g.commit || "") &&
    /^[0-9a-f]{64}$/.test(g.sha || "") &&
    g.base === m &&
    /^[0-9a-f]{7,40}$/i.test(m) &&
    ((l = g.commit), (o = g.sha), (w = !0), (i = !1));
  var HsKey = "loader_hash_state|" + r + "|" + n;
  function HsRead() {
    var h = y(HsKey) || {},
      t = /^[0-9a-f]{64}$/i.test(h.target || "")
        ? String(h.target).toLowerCase()
        : "",
      p = /^[0-9a-f]{64}$/i.test(h.prev || "")
        ? String(h.prev).toLowerCase()
        : "";
    return { target: t, prev: p, at: Number(h.at) || 0 };
  }
  function HsSync() {
    var h = HsRead();
    if (!o) return h;
    if (!h.target) ((h.target = o), (h.prev = ""), (h.at = Date.now()), b(HsKey, h));
    else if (h.target !== o)
      ((h.prev = h.target), (h.target = o), (h.at = Date.now()), b(HsKey, h));
    return h;
  }
  var Hs = HsSync();
  var x = s && c ? encodeURIComponent(s) + "/" + encodeURIComponent(c) : "",
    A = encodeURIComponent(l),
    B = /^[0-9a-f]{7,40}$/i.test(l),
    T = new URL(".", location.href).pathname;
  var C = [];
  if (x) {
    var S = x + "@" + A + "/" + k(n),
      D = B ? "default" : "no-cache";
    C = [
      {
        name: "jsDelivr·Gcore",
        url: "https://gcore.jsdelivr.net/gh/" + S,
        cache: D,
      },
      {
        name: "jsDelivr·Fastly",
        url: "https://fastly.jsdelivr.net/gh/" + S,
        cache: D,
      },
      {
        name: "jsDelivr·主站",
        url: "https://cdn.jsdelivr.net/gh/" + S,
        cache: D,
      },
      {
        name: "GitHub Raw",
        url: "https://raw.githubusercontent.com/" + x + "/" + A + "/" + k(n),
        cache: D,
      },
    ];
  }
  var M = { name: "本站直连", url: T + k(n), local: !0, cache: "no-cache" },
    j = t.get("src"),
    E = "local" === j || "same" === j;
  E ? (C = [M]) : C.push(M);
  var _ = [
    1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993,
    2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987,
    1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774,
    264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
    2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711,
    113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
    1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411,
    3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344,
    430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
    1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424,
    2428436474, 2756734187, 3204031479, 3329325298,
  ];
  function L(e, t) {
    return (e >>> t) | (e << (32 - t));
  }
  function I() {
    ((this.h = [
      1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924,
      528734635, 1541459225,
    ]),
      (this.buf = new Uint8Array(64)),
      (this.n = 0),
      (this.len = 0),
      (this.w = new Uint32Array(64)));
  }
  ((I.prototype._block = function (e, t) {
    var n,
      r,
      a,
      o = this.w,
      i = this.h;
    for (n = 0; n < 16; n++)
      o[n] =
        (e[t + 4 * n] << 24) |
        (e[t + 4 * n + 1] << 16) |
        (e[t + 4 * n + 2] << 8) |
        e[t + 4 * n + 3];
    for (n = 16; n < 64; n++)
      ((r = o[n - 15]),
        (a = o[n - 2]),
        (o[n] =
          (o[n - 16] +
            (L(r, 7) ^ L(r, 18) ^ (r >>> 3)) +
            o[n - 7] +
            (L(a, 17) ^ L(a, 19) ^ (a >>> 10))) |
          0));
    var s,
      c,
      l = i[0],
      u = i[1],
      f = i[2],
      h = i[3],
      d = i[4],
      v = i[5],
      g = i[6],
      m = i[7];
    for (n = 0; n < 64; n++)
      ((s =
        (m +
          (L(d, 6) ^ L(d, 11) ^ L(d, 25)) +
          ((d & v) ^ (~d & g)) +
          _[n] +
          o[n]) |
        0),
        (c =
          ((L(l, 2) ^ L(l, 13) ^ L(l, 22)) + ((l & u) ^ (l & f) ^ (u & f))) |
          0),
        (m = g),
        (g = v),
        (v = d),
        (d = (h + s) | 0),
        (h = f),
        (f = u),
        (u = l),
        (l = (s + c) | 0));
    ((i[0] = (i[0] + l) | 0),
      (i[1] = (i[1] + u) | 0),
      (i[2] = (i[2] + f) | 0),
      (i[3] = (i[3] + h) | 0),
      (i[4] = (i[4] + d) | 0),
      (i[5] = (i[5] + v) | 0),
      (i[6] = (i[6] + g) | 0),
      (i[7] = (i[7] + m) | 0));
  }),
    (I.prototype.update = function (e) {
      this.len += e.length;
      var t = 0;
      if (this.n) {
        var n = Math.min(64 - this.n, e.length);
        (this.buf.set(e.subarray(0, n), this.n),
          (this.n += n),
          (t = n),
          64 === this.n && (this._block(this.buf, 0), (this.n = 0)));
      }
      for (; t + 64 <= e.length; t += 64) this._block(e, t);
      return (
        t < e.length &&
          (this.buf.set(e.subarray(t), 0), (this.n = e.length - t)),
        this
      );
    }),
    (I.prototype.hex = function () {
      var e = 8 * this.len,
        t = new Uint8Array((this.n < 56 ? 64 : 128) - this.n);
      t[0] = 128;
      var n = new DataView(t.buffer);
      (n.setUint32(t.length - 8, Math.floor(e / 4294967296)),
        n.setUint32(t.length - 4, e >>> 0),
        this.update(t));
      for (var r = "", a = 0; a < 8; a++)
        r += ("00000000" + (this.h[a] >>> 0).toString(16)).slice(-8);
      return r;
    }));
  var z = "loader_size_remote|" + x + "@" + l + "|" + n,
    R = "loader_size_local|" + location.origin + T + "|" + n,
    U = null,
    H = 0;
  function F(e) {
    return e && e.local ? R : z;
  }
  function O(e) {
    try {
      var t = localStorage.getItem(e) || "";
      if (!t) return { size: 0, checkedAt: 0 };
      if (/^\d+$/.test(t)) return { size: parseInt(t, 10) || 0, checkedAt: 0 };
      var n = JSON.parse(t);
      return {
        size: Number(n && n.size) || 0,
        checkedAt: Number(n && n.checkedAt) || 0,
      };
    } catch (e) {
      return { size: 0, checkedAt: 0 };
    }
  }
  function P(e, t) {
    e > 1024 && b(t, { size: e, checkedAt: Date.now() });
  }
  function N(e) {
    return !(!e || !e.size) && (!!B || Date.now() - e.checkedAt < 216e5);
  }
  var $ = 0,
    MAX_GAME_BYTES = 33554432;
  var q = "pages",
    Y = "page|" + location.origin + "|" + x + "@" + l + "|" + n,
    J = null;
  function G() {
    return (
      J ||
      (J = new Promise(function (e, t) {
        var n;
        try {
          n = window.indexedDB;
        } catch (e) {}
        if (n) {
          var r = n.open("game_loader_cache_v1", 1);
          ((r.onupgradeneeded = function () {
            var e = r.result;
            e.objectStoreNames.contains(q) ||
              e.createObjectStore(q, { keyPath: "key" });
          }),
            (r.onsuccess = function () {
              e(r.result);
            }),
            (r.onerror = function () {
              t(r.error || new Error("IndexedDB open failed"));
            }));
        } else t(new Error("IndexedDB unavailable"));
      }).catch(function (e) {
        throw ((J = null), e);
      }))
    );
  }
  function K() {
    return G().then(function (db) {
      return new Promise(function (resolve, reject) {
        var store = db.transaction(q, "readonly").objectStore(q);
        var request = store.get(Y);
        request.onsuccess = function () {
          if (request.result) { resolve(request.result); return; }
          var prefix = "page|" + location.origin + "|" + x + "@" + l + "|" + n + "|";
          var keys = store.getAllKeys();
          keys.onsuccess = function () {
            var seen = [], candidates = [];
            function add(key) {
              var text = String(key || "");
              if (text && seen.indexOf(text) < 0) { seen.push(text); candidates.push(text); }
            }
            if (o) add(prefix + o);
            if (Hs.prev) add(prefix + Hs.prev);
            (keys.result || []).forEach(function (key) {
              if (String(key).indexOf(prefix) === 0) add(key);
            });
            var index = 0;
            function next() {
              if (index >= candidates.length) { resolve(null); return; }
              var get = store.get(candidates[index++]);
              get.onsuccess = function () { if (get.result) resolve(get.result); else next(); };
              get.onerror = next;
            }
            next();
          };
          keys.onerror = function () { reject(keys.error || new Error("IndexedDB keys failed")); };
        };
        request.onerror = function () { reject(request.error || new Error("IndexedDB read failed")); };
      });
    });
  }
  /* 缓存清理：只保留三份内容——当前记录 Y、当前目标哈希的旧键、上一版哈希的旧键。
     其余同前缀的旧键全部删除；事务失败不再静默吞掉，写进诊断对象。 */
  function cleanOldPages() {
    var base = "page|" + location.origin + "|" + x + "@" + l + "|" + n,
      prefix = base + "|",
      keep = [Y];
    if (o) keep.push(prefix + o);
    if (Hs && Hs.prev) keep.push(prefix + Hs.prev);
    G()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(q, "readwrite"),
            store = tx.objectStore(q),
            keys = store.getAllKeys(),
            removed = 0;
          keys.onerror = function () {
            reject(keys.error || new Error("IndexedDB keys failed"));
          };
          keys.onsuccess = function () {
            (keys.result || []).forEach(function (key) {
              var text = String(key);
              if (0 !== text.indexOf(prefix) || keep.indexOf(text) >= 0) return;
              try {
                store.delete(text);
                removed++;
              } catch (e) {}
            });
          };
          tx.oncomplete = function () {
            (pe.cacheRemoved = (pe.cacheRemoved || 0) + removed), resolve(removed);
          };
          tx.onerror = function () {
            reject(tx.error || new Error("IndexedDB cleanup failed"));
          };
          tx.onabort = function () {
            reject(tx.error || new Error("IndexedDB cleanup aborted"));
          };
        });
      })
      .then(function () {
        /* 配额检查：只记录用量，接近上限时给诊断留信息，不做破坏性删除。 */
        try {
          if (navigator.storage && navigator.storage.estimate)
            return navigator.storage.estimate().then(function (q) {
              var usage = Number(q && q.usage) || 0,
                quota = Number(q && q.quota) || 0;
              pe.cacheQuota = {
                usage: usage,
                quota: quota,
                ratio: quota ? usage / quota : 0,
              };
            });
        } catch (e) {}
      })
      .catch(function (e) {
        pe.cacheCleanupError = String((e && e.message) || e);
      });
  }
  var W = {};
  ([
    "fill",
    "pct",
    "size",
    "speed",
    "tip",
    "err",
    "retry",
    "stage",
    "saveBtn",
    "diagBtn",
    "saveHandle",
    "savePanel",
    "saveList",
    "saveMsg",
    "saveExport",
    "saveImport",
    "saveFile",
    "saveRestore",
    "saveClose",
    "updBar",
    "updText",
    "updYes",
    "updNo",
  ].forEach(function (e) {
    W[e] = document.getElementById(e);
  }),
    (W.bar = document.querySelector(".bar")));
  var V = 0,
    Q = 0,
    X = 0,
    Z = 0,
    ee = !1,
    te = !1,
    ne = null,
    re = 0,
    ae = 0,
    oe = 0,
    ie = !1,
    se = window.requestAnimationFrame
      ? function (e) {
          return window.requestAnimationFrame(e);
        }
      : function (e) {
          return setTimeout(e, 16);
        },
    ce = window.cancelAnimationFrame
      ? function (e) {
          return window.cancelAnimationFrame(e);
        }
      : function (e) {
          clearTimeout(e);
        };
  function le(e) {
    return (e / 1048576).toFixed(1);
  }
  function ue(e, t) {
    e && e.textContent !== t && (e.textContent = t);
  }
  function fe(e, t) {
    null === t
      ? W.bar.hasAttribute(e) && W.bar.removeAttribute(e)
      : W.bar.getAttribute(e) !== t && W.bar.setAttribute(e, t);
  }
  function he() {
    (null !== ne && (ce(ne), (ne = null)), (te = !1));
  }
  function de() {
    (oe++,
      he(),
      (re = 0),
      (ae = 0),
      (V = 0),
      (Q = 0),
      (X = 0),
      (Z = 0),
      (ie = !1),
      W.bar.classList.remove("indet"),
      (W.fill.style.width = "0%"),
      ue(W.pct, "0%"),
      ue(W.size, "0.0 / – MB"),
      ue(W.speed, "–"),
      fe("aria-valuenow", "0"),
      fe("aria-valuetext", "0%"));
  }
  function ve(e, t, n) {
    if (((re = e), (ae = n), !te)) {
      te = !0;
      var r = oe;
      ne = se(function () {
        ((ne = null),
          te &&
            r === oe &&
            ((te = !1),
            (function () {
              if (ee) return;
              var e = re,
                t = ae;
              ((X = e), (Z = t));
              var n = $;
              n && e > 1.02 * n && ((n = 0), ($ = 0));
              if (n) {
                ie && (W.bar.classList.remove("indet"), (ie = !1));
                var r = Math.max(0, Math.min(99, Math.round((e / n) * 100)));
                (W.fill.style.width !== r + "%" &&
                  (W.fill.style.width = r + "%"),
                  ue(W.pct, r + "%"),
                  ue(W.size, le(e) + " / " + le(n) + " MB"),
                  fe("aria-valuenow", String(r)),
                  fe("aria-valuetext", r + "%"));
              } else
                (ie || (W.bar.classList.add("indet"), (ie = !0)),
                  W.fill.style.width && (W.fill.style.width = ""),
                  ue(W.pct, "--"),
                  ue(W.size, le(e) + " MB"),
                  fe("aria-valuenow", null),
                  fe("aria-valuetext", "已下载 " + le(e) + " MB，总大小未知"));
              if (!t) return;
              var a = Date.now(),
                o = (a - (V || t)) / 1e3;
              if (o > 0.6) {
                var i = (e - Q) / o;
                (i > 0 &&
                  ue(
                    W.speed,
                    i > 1048576
                      ? (i / 1048576).toFixed(1) + " MB/s"
                      : Math.round(i / 1024) + " KB/s",
                  ),
                  (V = a),
                  (Q = e));
              }
            })()));
      });
    }
  }
  function ge(e) {
    var t = new Date(e);
    function n(e) {
      return e < 10 ? "0" + e : "" + e;
    }
    return (
      t.getFullYear() +
      "/" +
      n(t.getMonth() + 1) +
      "/" +
      n(t.getDate()) +
      " " +
      n(t.getHours()) +
      ":" +
      n(t.getMinutes())
    );
  }
  function me(e, t, n, r, a) {
    var o = (function (e, t) {
      var n,
        r = new URL(t.url, location.href).href,
        a =
          /<base\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/i.exec(
            e,
          );
      try {
        var o = a ? (null != a[1] ? a[1] : null != a[2] ? a[2] : a[3]) : null;
        n = null === o ? new URL(".", r).href : new URL(o, r).href;
      } catch (e) {
        n = new URL(".", r).href;
      }
      var i =
          '<base href="' +
          n.replace(/&/g, "&amp;").replace(/"/g, "&quot;") +
          '">',
        s = /<head\b[^>]*>/i.exec(e);
      if (s) {
        var c = s.index + s[0].length;
        return e.slice(0, c) + i + e.slice(c);
      }
      if ((s = /<html\b[^>]*>/i.exec(e))) {
        var l = s.index + s[0].length;
        return e.slice(0, l) + "<head>" + i + "</head>" + e.slice(l);
      }
      if ((s = /<!DOCTYPE[^>]*>/i.exec(e))) {
        var u = s.index + s[0].length;
        return e.slice(0, u) + i + e.slice(u);
      }
      return i + e;
    })(e, t);
    ((ee = !0),
      (U = null),
      he(),
      (ie = !1),
      W.bar.classList.remove("indet"),
      (W.fill.style.width = "100%"),
      ue(W.pct, "100%"),
      ue(W.tip, r ? "本地缓存 · " + (a ? ge(a) : "未知时间") : "正在进入…"));
    var i = e.length;
    try {
      i = new Blob([e]).size;
    } catch (e) {}
    (ue(W.size, le(i) + " MB"),
      fe("aria-valuenow", "100"),
      fe("aria-valuetext", "下载完成"),
      (pe.cacheHit = !!r),
      (pe.cacheSavedAt = a || 0),
      (W.stage.srcdoc = o),
      (W.stage.style.display = "block"),
      W.saveHandle && (W.saveHandle.style.display = "block"),
      r ||
        (function (e, t, n) {
          if (e && !(e.length > MAX_GAME_BYTES)) {
            var r = "loader_cache_sig|" + Y;
            var a = n || t.url + "|" + e.length + "|" + Date.now();
            G()
              .then(function (o) {
                return new Promise(function (i, s) {
                  var c = o.transaction(q, "readwrite");
                  (c
                    .objectStore(q)
                    .put({
                      key: Y,
                      html: e,
                      url: t.url,
                      savedAt: Date.now(),
                      digest: n || "",
                    }),
                    (c.oncomplete = function () {
                      try {
                        localStorage.setItem(r, a);
                      } catch (e) {}
                      cleanOldPages();
                      i();
                    }),
                    (c.onerror = function () {
                      s(c.error || new Error("IndexedDB write failed"));
                    }));
                });
              })
              .catch(function (e) {
                pe.cacheWriteError = String((e && e.message) || e);
              });
          }
        })(e, t, n),
      (function () {
        if (je) return;
        je = !0;
        try {
          "serviceWorker" in navigator &&
          ("https:" === location.protocol ||
            /^(localhost|127\.0\.0\.1)$/.test(location.hostname))
            ? navigator.serviceWorker
                .register(T + "sw.js", { scope: T })
                .then(function (e) {
                  ((pe.sw = "已注册"),
                    e && e.update && e.update().catch(function () {}));
                })
                .catch(function () {
                  pe.sw = "注册失败（sw.js 未部署或不支持）";
                })
            : (pe.sw = "环境不支持");
        } catch (e) {
          pe.sw = "注册异常";
        }
      })());
  }
  var pe = {
    startedAt: Date.now(),
    config: {
      repo: r,
      file: n,
      ref: l,
      sha: o ? o.slice(0, 12) : "",
      override: w,
      size: gameSize,
    },
    attempts: [],
    errors: [],
    cacheHit: !1,
    cacheSavedAt: 0,
    cacheRemoved: 0,
    cacheQuota: null,
    cacheCleanupError: "",
    hashState: { target: o, prev: Hs.prev },
    sw: "未注册",
  };
  function we(e) {
    ((U = null),
      he(),
      (ie = !1),
      W.bar.classList.remove("indet"),
      fe("aria-valuetext", "下载失败"));
    var t = "boolean" == typeof navigator.onLine && !navigator.onLine,
      n = (e || []).map(function (e) {
        return (
          e.name +
          "(" +
          (("timeout" === (n = ((t = e) && t.message) || "fail") ||
          /abort/i.test(n)
            ? "连接超时"
            : /SHA-256/.test(n)
              ? "完整性校验失败"
              : /HTTP 404/.test(n)
                ? "文件不存在(404)"
                : /HTTP \d+/.test(n)
                  ? n
                  : /fetch|network|load failed/i.test(n)
                    ? "网络错误"
                    : n) +
            ")")
        );
        var t, n;
      });
    pe.errors = n;
    var r = t
      ? "设备当前离线，且没有可用的本地缓存。恢复网络后会自动重试。"
      : "已尝试全部线路" +
        (n.length ? "：" + n.join(" / ") : "") +
        "。请确认仓库公开、分支与文件名正确。";
    ((W.err.style.display = "block"),
      (W.err.textContent = r),
      (W.retry.style.display = "inline-block"),
      W.diagBtn && (W.diagBtn.style.display = "inline-block"),
      ue(W.tip, t ? "等待网络恢复…" : "全部线路均不可用"));
  }
  function ye(e, t) {
    try {
      var n = new Blob([JSON.stringify(e, null, 2)], {
          type: "application/json",
        }),
        r = document.createElement("a");
      ((r.href = URL.createObjectURL(n)),
        (r.download = t),
        document.body.appendChild(r),
        r.click(),
        setTimeout(function () {
          (URL.revokeObjectURL(r.href), r.remove());
        }, 1e3));
    } catch (e) {}
  }
  (W.diagBtn &&
    (W.diagBtn.onclick = function () {
      ((pe.exportedAt = Date.now()),
        (pe.online = navigator.onLine),
        (pe.ua = navigator.userAgent),
        ye(pe, "loader-diag-" + Date.now() + ".json"));
    }),
    window.addEventListener("online", function () {
      ee || "block" !== W.err.style.display || ze();
    }),
    window.addEventListener("offline", function () {
      ee || ue(W.tip, "设备已离线，正在尝试本地缓存…");
    }));
  var be = "loader_save_backup";
  function ke() {
    var e = [];
    try {
      for (var t = 0; t < localStorage.length; t++) {
        var n = localStorage.key(t);
        n && 0 === n.indexOf("vn_") && e.push(n);
      }
    } catch (e) {}
    return e.sort();
  }
  function xe() {
    var e = ke();
    ((W.saveList.textContent = ""),
      e.length
        ? e.forEach(function (e) {
            var t = document.createElement("div");
            t.className = "save-row";
            var n,
              r = "";
            try {
              r = localStorage.getItem(e) || "";
            } catch (e) {}
            ((t.textContent =
              (function (e) {
                if (0 === e.indexOf("vn_settings_"))
                  return "设置 · " + e.slice(12);
                if (0 === e.indexOf("vn_autosave_"))
                  return "自动存档 · " + e.slice(12);
                var t = e.match(/^vn_save_(.+)_(q|\d+)$/);
                return t
                  ? ("q" === t[2] ? "快速存档" : "存档 " + t[2]) + " · " + t[1]
                  : e;
              })(e) +
              "（" +
              (((n = r.length) < 1024
                ? n + " B"
                : (n / 1024).toFixed(1) + " KB") +
                "）")),
              W.saveList.appendChild(t));
          })
        : (W.saveList.textContent = "暂无存档"));
  }
  function Ae() {
    (xe(), ue(W.saveMsg, ""), (W.savePanel.hidden = !1));
  }
  function Be() {
    W.savePanel.hidden = !0;
  }
  (W.saveBtn && (W.saveBtn.onclick = Ae),
    W.saveHandle && (W.saveHandle.onclick = Ae),
    W.saveClose && (W.saveClose.onclick = Be),
    W.saveExport &&
      (W.saveExport.onclick = function () {
        var e = ke();
        if (e.length) {
          var t = {};
          e.forEach(function (e) {
            try {
              t[e] = localStorage.getItem(e) || "";
            } catch (e) {}
          });
          var n = new Date(),
            r =
              n.getFullYear() +
              a(n.getMonth() + 1) +
              a(n.getDate()) +
              "-" +
              a(n.getHours()) +
              a(n.getMinutes()) +
              a(n.getSeconds());
          (ye(
            {
              app: "game-save-backup",
              version: 1,
              exportedAt: Date.now(),
              origin: location.origin,
              keys: t,
            },
            "vn-saves-" + r + ".json",
          ),
            ue(W.saveMsg, "已导出 " + e.length + " 项"));
        } else ue(W.saveMsg, "暂无存档可导出");
        function a(e) {
          return e < 10 ? "0" + e : "" + e;
        }
      }),
    W.saveImport &&
      (W.saveImport.onclick = function () {
        ((W.saveFile.value = ""), W.saveFile.click());
      }),
    W.saveFile &&
      (W.saveFile.onchange = function () {
        var e = W.saveFile.files && W.saveFile.files[0];
        if (e)
          if (e.size > 5242880) ue(W.saveMsg, "文件过大（限 5MB）");
          else {
            var t = new FileReader();
            ((t.onload = function () {
              var e = null;
              try {
                e = JSON.parse(String(t.result));
              } catch (e) {}
              if (
                (function (e) {
                  if (
                    !e ||
                    "game-save-backup" !== e.app ||
                    1 !== e.version ||
                    !e.keys ||
                    "object" != typeof e.keys
                  )
                    return !1;
                  var t = Object.keys(e.keys);
                  if (!t.length || t.length > 200) return !1;
                  for (var n = 0; n < t.length; n++) {
                    if (!/^vn_[\w\u4e00-\u9fff-]+$/.test(t[n])) return !1;
                    if (
                      "string" != typeof e.keys[t[n]] ||
                      e.keys[t[n]].length > 2097152
                    )
                      return !1;
                  }
                  return !0;
                })(e)
              ) {
                !(function () {
                  var e = ke();
                  if (e.length) {
                    var t = {};
                    (e.forEach(function (e) {
                      try {
                        t[e] = localStorage.getItem(e) || "";
                      } catch (e) {}
                    }),
                      b(be, { at: Date.now(), keys: t }));
                  }
                })();
                var n = Object.keys(e.keys),
                  r = 0;
                try {
                  n.forEach(function (t) {
                    (localStorage.setItem(t, e.keys[t]), r++);
                  });
                } catch (e) {
                  return void ue(W.saveMsg, "写入失败：存储空间不足");
                }
                (ue(W.saveMsg, "已导入 " + r + " 项，原存档已自动备份"),
                  xe(),
                  setTimeout(function () {
                    (Be(), ze());
                  }, 900));
              } else ue(W.saveMsg, "文件格式不正确，未导入");
            }),
              (t.onerror = function () {
                ue(W.saveMsg, "读取文件失败");
              }),
              t.readAsText(e));
          }
      }),
    W.saveRestore &&
      (W.saveRestore.onclick = function () {
        var e = y(be);
        if (e && e.keys && Object.keys(e.keys).length) {
          var t = 0;
          try {
            Object.keys(e.keys).forEach(function (n) {
              /^vn_[\w\u4e00-\u9fff-]+$/.test(n) &&
                "string" == typeof e.keys[n] &&
                (localStorage.setItem(n, e.keys[n]), t++);
            });
          } catch (e) {
            return void ue(W.saveMsg, "恢复失败：存储空间不足");
          }
          (ue(W.saveMsg, "已恢复 " + t + " 项（备份于 " + ge(e.at) + "）"),
            xe(),
            setTimeout(function () {
              (Be(), ze());
            }, 900));
        } else ue(W.saveMsg, "没有可用备份");
      }));
  var Te = "loader_update_check|" + r + "|" + n;
  function Me(e) {
    W.updBar &&
      (ue(W.updText, "发现游戏新版本"),
      (W.updBar.hidden = !1),
      (W.updYes.onclick = null),
      (W.updNo.onclick = function () {
        var t = y(Te) || { at: Date.now(), hash: e };
        ((t.hash = e), (t.dismissed = e), b(Te, t), (W.updBar.hidden = !0));
      }));
  }
  var je = !1;
  /* 首连对冲等待：第一条线路 7 秒内没建立连接才开第二条（原先 5 秒偏激进）。 */
  var Ee = 7e3;
  /* 传输停滞对冲：已连上但 6 秒没有新字节时，再补一条线路。 */
  var STALL_MS = 6e3;
  function _e(e) {
    return new Promise(function (t, n) {
      var r = (function () {
          if (C.length <= 1) return C.slice();
          var e,
            t = [C[0]],
            n = null;
          for (e = 0; e < C.length; e++) C[e].local && (n = C[e]);
          for (n && !C[0].local && t.push(n), e = 1; e < C.length; e++)
            C[e].local || t.push(C[e]);
          return t;
        })(),
        a = 0,
        i = 0,
        s = !1,
        c = [],
        l = [],
        u = null;
      function f(e) {
        null !== e.hedgeTimer &&
          (clearTimeout(e.hedgeTimer), (e.hedgeTimer = null));
      }
      function h() {
        for (var e = 0; e < c.length; e++) f(c[e]);
      }
      function d(e) {
        ((U = e.m),
          de(),
          ($ = gameSize || O(F(e.m)).size),
          ue(W.tip, (e.m.local ? "" : "加速线路 ") + e.m.name + " …"),
          ue(W.size, $ ? "0.0 / " + le($) + " MB" : "0.0 MB"),
          e.rec > 0 && ve(e.rec, 0, e.start));
      }
      function v(e) {
        (f(e),
          s ||
            !e.show ||
            e.connected ||
            i >= 2 ||
            a >= r.length ||
            (e.hedgeTimer = setTimeout(function () {
              ((e.hedgeTimer = null),
                s ||
                  !e.show ||
                  e.connected ||
                  i >= 2 ||
                  a >= r.length ||
                  g(!1));
            }, Ee)));
      }
      function g(m) {
        if (s || a >= r.length) return null;
        var p = r[a++],
          w =
            "undefined" != typeof AbortController
              ? new AbortController()
              : null,
          y = {
            m: p,
            controller: w,
            connected: !1,
            show: !1,
            rec: 0,
            start: 0,
            hedgeTimer: null,
            stallTimer: null,
            lastAt: 0,
          };
        /* 停滞对冲：定时器只挂一个，每次触发检查“距上次收到数据多久”。
           仍在推进就继续等，真的停住才补线路，避免重复下载。 */
        function armStall() {
          if (s || y.stallTimer || i >= 2 || a >= r.length) return;
          y.stallTimer = setTimeout(function () {
            ((y.stallTimer = null),
              s || i >= 2 || a >= r.length || touch());
          }, 1500);
        }
        function touch() {
          if (s || i >= 2 || a >= r.length) return;
          if (Date.now() - (y.lastAt || 0) < STALL_MS) return void armStall();
          g(!1);
        }
        function clearStall() {
          null !== y.stallTimer && (clearTimeout(y.stallTimer), (y.stallTimer = null));
        }
        return (
          c.push(y),
          i++,
          pe.attempts.push({ name: p.name, at: Date.now() }),
          (!m && u) || ((u = y), (y.show = !0), d(y), v(y)),
          (function (e, t, n) {
            if (((n = n || {}), "function" != typeof fetch))
              return Promise.reject(new Error("当前浏览器不支持 fetch"));
            var r =
                n.controller ||
                ("undefined" != typeof AbortController
                  ? new AbortController()
                  : null),
              a = { cache: e.cache || "no-cache" };
            r && (a.signal = r.signal);
            var i = 15e3,
              s = null;
            function c(e) {
              r &&
                (clearTimeout(s),
                (s = setTimeout(function () {
                  r.abort("timeout");
                }, e)));
            }
            function l() {
              (clearTimeout(s), (s = null));
            }
            function u(e, t) {
              if (t.size > MAX_GAME_BYTES) throw new Error("文件过大");
              var n = e.hex();
              if (o && n !== o) throw new Error("SHA-256 校验失败");
              return t.text().then(function (e) {
                return { html: e, digest: n };
              });
            }
            return (
              c(15e3),
              fetch(e.url, a)
                .then(function (r) {
                  if (!r.ok) throw new Error("HTTP " + r.status);
                  var contentLength = Number(
                    r.headers.get("Content-Length") || 0,
                  );
                  if (contentLength > MAX_GAME_BYTES)
                    throw new Error("文件过大");
                  n.onConnect && n.onConnect();
                  var a = Date.now(),
                    o = new I();
                  if (!r.body || !r.body.getReader)
                    return (
                      c(i),
                      "function" == typeof r.arrayBuffer
                        ? r.arrayBuffer().then(function (n) {
                            l();
                            var r = new Uint8Array(n),
                              i = new Blob([r]);
                            return (
                              o.update(r),
                              P(i.size, F(e)),
                              t(i.size, $, a),
                              u(o, i)
                            );
                          })
                        : r.text().then(function (n) {
                            l();
                            var r = new TextEncoder().encode(n),
                              i = new Blob([r]);
                            return (
                              o.update(r),
                              P(i.size, F(e)),
                              t(i.size, $, a),
                              u(o, i)
                            );
                          })
                    );
                  c(i);
                  var s = r.body.getReader(),
                    f = [],
                    h = 0;
                  return (function n() {
                    return s.read().then(function (r) {
                      if (r.done) return (l(), P(h, F(e)), u(o, new Blob(f)));
                      (c(i), (h += r.value.length));
                      if (h > MAX_GAME_BYTES) {
                        try {
                          s.cancel();
                        } catch (e) {}
                        throw new Error("文件过大");
                      }
                      return (
                        f.push(r.value),
                        o.update(r.value),
                        t(h, $, a),
                        n()
                      );
                    });
                  })();
                })
                .then(
                  function (e) {
                    return (l(), e);
                  },
                  function (e) {
                    throw (l(), e);
                  },
                )
            );
          })(
            p,
            function (e, t, n) {
              ((y.rec = e), (y.start = n), (y.lastAt = Date.now()), armStall(), y.show && ve(e, 0, n));
            },
            {
              controller: w,
              onConnect: function () {
                ((y.connected = !0), f(y));
              },
            },
          ).then(
            function (r) {
              clearStall();
              e === H
                ? s ||
                  ((s = !0),
                  h(),
                  (function (e) {
                    for (var t = 0; t < c.length; t++)
                      if (c[t] !== e)
                        try {
                          c[t].controller.abort("winner");
                        } catch (e) {}
                  })(y),
                  t({ html: r.html, digest: r.digest, m: y.m }))
                : s || ((s = !0), n(new Error("stale run")));
            },
            function (e) {
              (clearStall(), f(y), i--);
              var t = c.indexOf(y);
              (t >= 0 && c.splice(t, 1),
                s ||
                  (l.push({
                    name: y.m.name,
                    message: (e && e.message) || "fail",
                  }),
                  (y.show = !1),
                  u === y && (u = null),
                  !u && c.length && (((u = c[0]).show = !0), d(u)),
                  u
                    ? a < r.length && i < 2 && (u.connected ? v(u) : g(!1))
                    : a < r.length
                      ? g(!0)
                      : 0 === i && (s || ((s = !0), h(), n(l)))));
            },
          ),
          y
        );
      }
      r.length ? g(!0) : n(l);
    });
  }
  var Le = !1;
  function Ie(e) {
    var t = O(z);
    (E ||
      !!gameSize ||
      (t.size && N(t)) ||
      (function (e) {
        var t = O(z);
        if (N(t) || E || !x || "function" != typeof fetch)
          return Promise.resolve(t.size);
        var r =
            "https://data.jsdelivr.com/v1/package/gh/" + x + "@" + A + "/flat",
          a = "/" + n,
          o =
            "undefined" != typeof AbortController
              ? new AbortController()
              : null,
          i = { cache: "no-store" },
          s = null;
        (o &&
          ((i.signal = o.signal),
          (s = setTimeout(function () {
            o.abort("timeout");
          }, 5e3))),
          fetch(r, i)
            .then(function (t) {
              return t.ok
                ? t.json().then(function (t) {
                    var n = ((t && t.files) || []).filter(function (e) {
                        return String(e.name || "") === a;
                      })[0],
                      r = (n && Number(n.size)) || 0;
                    return (
                      r > 1024 &&
                        (P(r, z),
                        e === H &&
                          U &&
                          !U.local &&
                          (($ = r), X && Z && ve(X, 0, Z))),
                      r
                    );
                  })
                : 0;
            })
            .then(
              function (e) {
                return (null !== s && clearTimeout(s), e);
              },
              function () {
                return (null !== s && clearTimeout(s), 0);
              },
            ));
      })(e),
      _e(e)
        .then(function (t) {
          e === H && me(t.html, t.m, t.digest, !1, 0);
        })
        .catch(function (t) {
          e === H &&
            (ue(W.tip, "网络线路不可用，正在检查本地缓存…"),
            K().then(
              function (n) {
                if (e === H) {
                  if (n && n.html) {
                    if (W.stage.srcdoc) {
                      ue(W.tip, "新版本下载失败，继续使用本地版本");
                      return;
                    }
                    try {
                      return void me(
                        n.html,
                        { url: n.url || M.url },
                        n.digest || "",
                        !0,
                        n.savedAt,
                      );
                    } catch (e) {}
                  }
                  we(t);
                }
              },
              function () {
                e === H && we(t);
              },
            ));
        }));
  }
  function toHex(bytes) {
    for (var out = "", i = 0; i < bytes.length; i++) out += ("0" + bytes[i].toString(16)).slice(-2);
    return out;
  }
  function sha256Text(text) {
    var bytes;
    try { bytes = new TextEncoder().encode(text); } catch (e) { return Promise.reject(e); }
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      try {
        return window.crypto.subtle.digest("SHA-256", bytes).then(function (bits) {
          return toHex(new Uint8Array(bits));
        }).catch(function () { return new I().update(bytes).hex(); });
      } catch (e) {}
    }
    return Promise.resolve(new I().update(bytes).hex());
  }
  function verifyCache(record) {
    var stored = String((record && record.digest) || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(stored)) return Promise.resolve(null);
    return sha256Text(String((record && record.html) || "")).then(function (actual) {
      return actual === stored ? record : null;
    }).catch(function () { return null; });
  }
  function ze() {
    var e = ++H;
    ((ee = !1),
      (U = null),
      (W.err.style.display = "none"),
      (W.err.textContent = ""),
      (W.retry.style.display = "none"),
      W.diagBtn && (W.diagBtn.style.display = "none"),
      (W.stage.style.display = "none"),
      W.saveHandle && (W.saveHandle.style.display = "none"));
    try {
      W.stage.removeAttribute("srcdoc");
    } catch (e) {}
    (de(),
      ue(W.tip, "正在连接加速线路…"),
      (function () {
        if (!Le) {
          Le = !0;
          try {
            navigator.storage &&
              "function" == typeof navigator.storage.persist &&
              navigator.storage.persist().catch(function () {});
          } catch (e) {}
        }
      })(),
      i
        ? we([{ name: "配置", message: "加载器配置不合法（仓库、文件名或哈希）" }])
        : o
          ? (ue(W.tip, "正在校验本地缓存…"),
            K().then(
              function (t) {
                if (e !== H) return;
                if (t && t.html) {
                  verifyCache(t).then(function (v) {
                    if (e !== H) return;
                    if (!v) { Ie(e); return; }
                    var c = String(v.digest || "").toLowerCase();
                    if (c === o) {
                      me(v.html, { url: v.url || M.url }, v.digest, !0, v.savedAt);
                      return;
                    }
                    if (Hs.prev && c === Hs.prev) {
                      me(v.html, { url: v.url || M.url }, v.digest, !0, v.savedAt);
                      var d = y(Te) || {};
                      if (d.dismissed !== o) Me(o);
                      return;
                    }
                    me(v.html, { url: v.url || M.url }, v.digest, !0, v.savedAt);
                    Ie(e);
                  });
                  return;
                }
                Ie(e);
              },
              function () {
                e === H && Ie(e);
              },
            ))
          : Ie(e));
  }
  ((W.retry.onclick = ze), ze());
})();
