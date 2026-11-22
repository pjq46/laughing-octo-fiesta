# 913 加载器安全审计与修复说明

审计日期：2026-11-22
范围：`index.html`、`404.html`、`sw.js`、`update-auth.js`、`_headers`、`game-version.json`、`gen-game-version.mjs`、`.github/workflows/*.yml`，并对 `game.html` 做了外部请求、密钥、危险 API 与 DOM 注入点扫描。

## 结论摘要

仓库内未发现明文 API Key、访问令牌、私钥或账号口令。`game.html` 未引用外部网络资源，未发现 `eval()`、`new Function()`、`document.write()` 等动态代码执行；`innerHTML` 主要用于清空容器或写入静态弹窗骨架。游戏文件哈希保持不变：

`95dee6751dbdc375d693cd1f649834c6bcf8263492d5f1398584e97cf7597e03`

本轮修复了 2 个会在真实部署中造成损坏的问题、3 个安全加固项和 1 个供应链加固项。

## 已修复问题

### 1. 高：Service Worker 会清空整个源的所有缓存

原 `sw.js` 在 `activate` 阶段执行：

```js
keys.filter(key => key !== VERSION)
```

`CacheStorage` 是按“源”共享的，不按 `scope` 隔离。axxiu 的多个项目都在 `https://www.axxiu.cn` 下，这个加载器安装/升级时会删除同域其他项目的全部缓存，造成其他项目离线资源丢失。

修复：新增 `CACHE_PREFIX = 'game-loader-sw-'`，只删除本加载器自己的旧版本缓存。其他项目的任意缓存名保持不变。

### 2. 中：IndexedDB 清理会误删同仓库其他游戏的缓存

加载器的 `cleanOldPages()` 使用前缀 `page|<origin>|<repo>@`，会删除同一仓库下所有游戏文件的缓存；更新脚本的 `cacheGame()` 也使用同样过宽的前缀。若同一个源托管同一仓库的多个游戏，会互相清缓存。

修复：

- 加载器清理前缀收紧为 `page|<origin>|<repo>@<ref>|<file>|`；
- 更新脚本清理前缀收紧为 `page|<origin>|<repo>@main|<file>|`。

### 3. 中：更新密码校验函数暴露给页面内任意脚本

原代码将 `verify(password)` 挂到 `window.UpdateAuth`，同源脚本可以直接调用它做密码猜测，形成页面内的校验预言机。

修复：只暴露 `ask()`；`verify` 不再出现在全局对象上，`window.UpdateAuth` 被冻结。密码本身和 PBKDF2 哈希未改变。

### 4. 中：缺少 CSP 与安全响应头

原 `_headers` 只有 `nosniff`、`no-referrer` 和 `X-Frame-Options`。GitHub Pages 与 axxiu 又不读取 `_headers`，页面没有任何 CSP。

修复：

- `index.html` / `404.html` 增加 CSP `meta`，限制脚本、样式、连接、frame、object、base-uri 与表单目标；
- Cloudflare Pages `_headers` 增加 CSP、HSTS、Permissions-Policy、COOP、CORP、frame-ancestors；
- 保留 `nosniff`、`no-referrer`、`SAMEORIGIN`。

CSP 已允许加载器所需的自有资源、`data:` 字体、`blob:`/`data:` 媒体、jsDelivr 与 GitHub Raw 下载线路；不会阻断游戏内嵌资源。

### 5. 低：更新脚本缓存版本滞后

`update-auth.js?v=10` 与 SW 的 `AUTH_URL` 仍指向旧版本号。修复为 `v=11`，SW 版本提升到 `game-loader-sw-v12`，确保新脚本和旧缓存不会混用。

### 6. 低：GitHub Actions 使用可移动标签

`actions/checkout@v4`、`configure-pages@v5`、`upload-pages-artifact@v3`、`deploy-pages@v5` 原按标签引用。标签可被上游移动，存在供应链风险。

修复：全部固定到具体 commit SHA；部署 job 的 checkout 关闭持久化凭据（`persist-credentials: false`），并给两个 workflow 增加超时与版本清单并发锁。

### 7. 生产环境兼容修正（非漏洞）

首次上线 CSP 后，生产控制台发现两处兼容报错，已一并修复：

- `base-uri 'self'` 会拦截加载器为游戏注入的 CDN `<base>`。已将 `base-uri` 放宽到加载器实际使用的四个源：gcore/fastly/cdn.jsDelivr 与 raw.githubusercontent.com。
- CSP 会拦截 Cloudflare 自动注入的 Web Analytics 脚本。已在 `script-src` 与 `connect-src` 放行 `static.cloudflareinsights.com` 和 `cloudflareinsights.com`，同时移除浏览器不识别的 `bluetooth` 权限项。

## 仍需注意的信任模型

### 前端更新密码不是服务端权限

`update-auth.js` 里的 PBKDF2 哈希是公开在浏览器执行的。它能阻止“误点更新”和普通访客随手替换游戏，但**不能**阻止：

- 拥有站点写权限的人修改页面或脚本；
- 能修改浏览器本地 JavaScript / IndexedDB / localStorage 的用户；
- 拿到哈希后离线暴力破解弱密码。

如果更新权限需要真正的安全边界，应改为服务端鉴权，或对 `game.html` 使用离线私钥签名、页面只内置公钥验签。当前静态部署没有服务端，无法只靠前端脚本实现强鉴权。

### 游戏 iframe 与加载器同源

游戏通过 `srcdoc` 载入，且需要直接使用 `localStorage` 存档，因此没有加 `sandbox` 的 opaque origin 隔离。游戏内容由 `game-sha256` 固定校验，属于与加载器同等信任级别的代码；如果仓库被攻陷，攻击者本来也能同时修改加载器和游戏。若未来要隔离游戏代码，需要把存档读写改为 `postMessage` 桥接，再给 iframe 加严格 sandbox。

### 安全响应头的覆盖范围

- Cloudflare Pages：`_headers` 全部生效。
- GitHub Pages：只生效页面内的 CSP `meta` 与 `referrer`，无法设置 HSTS、COOP、CORP、Permissions-Policy。
- axxiu：只生效页面内的 CSP `meta` 与 `referrer`，无法设置自定义响应头。

## 验证记录

- 最终仓库提交：`7cb92be`；GitHub Pages workflow #38 成功（20 秒）。
- `node --check`：`sw.js`、`update-auth.js`、`gen-game-version.mjs` 通过。
- 本地根目录 `http://127.0.0.1:8909/`：CSP 不阻断，SW scope `/`，断网重载显示“本地缓存 · 16.1 MB”。
- 本地子目录 `http://127.0.0.1:8910/project/l8iKyxdA/`：SW scope `/project/l8iKyxdA/`，断网重载正常。
- 本地 CDN 线路：`<base>` 指向 gcore.jsDelivr，CSP 允许，游戏正常载入。
- 缓存隔离测试：预置 `other-app-cache` 与 `game-loader-sw-v11`，新 SW 激活后 `other-app-cache` 保留，`game-loader-sw-v11` 删除，`game-loader-sw-v12` 生成。
- IndexedDB 隔离测试：预置同仓库 `other.html` 缓存键，加载器写入 `game.html` 缓存后该键仍保留。
- 密码弹窗：`UpdateAuth` 仅有 `ask`，`verify` 为 `undefined`；弹窗可打开并取消。
- Cloudflare 线上响应头：CSP、HSTS、Permissions-Policy、COOP、CORP、nosniff 均已返回；断网重载正常。
- `game.html` 哈希未变，未上传/修改游戏本体。
