# 913 加载器安全审计与修复说明

审计日期：2026-11-22

范围：`index.html`、`404.html`、`sw.js`、`update-auth.js`、`_headers`、`game-version.json`、`gen-game-version.mjs`、`.github/workflows/*.yml`，并对 `game.html` 做了外部请求、密钥、危险 API 与 DOM 注入点扫描。

## 结论摘要

仓库内未发现明文 API Key、访问令牌、私钥或账号口令。`game.html` 未引用外部网络资源，未发现 `eval()`、`new Function()`、`document.write()` 等动态代码执行；`innerHTML` 主要用于清空容器或写入静态弹窗骨架。游戏文件哈希保持不变：

`95dee6751dbdc375d693cd1f649834c6bcf8263492d5f1398584e97cf7597e03`

v12 修复了 2 个会在真实部署中造成损坏的问题、3 个安全加固项和 1 个供应链加固项；v13 按需求移除更新密码门禁；v14 增加“自动同步两个 HTML 哈希”的第二种更新模式。

## v13 变更：移除更新密码门禁

原 `update-auth.js` 使用 PBKDF2-SHA256、密码弹窗和 `window.UpdateAuth.ask()`，验证通过后才允许下载新版本。

现版本已删除：

- `SALT_B64`、`EXPECT_B64`、`verify()` 与 PBKDF2 逻辑；
- 密码输入层、`ask()` 和 `window.UpdateAuth` 全局对象；
- “请输入更新密码”“密码错误”等提示。

更新按钮现在直接调用 `runUpdate()`：从仓库 `main` 下载 `game.html`，用 `game-version.json` 的 SHA-256 校验，写入 IndexedDB 和 `loader_ref_override`，然后重载。`update-auth.js` 这个文件名仅为兼容现有页面和 SW 引用而保留，内部已无密码门禁。

影响：任何能打开页面的人都可以触发更新。SHA-256 校验只能保证下载内容与清单一致，不是身份认证。

## v14 变更：自动同步两个 HTML 的哈希（第二种）

本包改用“全量自动同步”模式：`index.html` / `404.html` 的 `game-repo` 指向 `pjq46/laughing-octo-fiesta@main`，`game-sha256` 指向当前 `game.html`。

新增 `sync-game-meta.mjs`：计算 `game.html` 的 SHA-256 和大小，写 `game-version.json`，并同步改写两个 HTML 的 `game-repo` / `game-sha256`。`game-version.yml` 在 `game.html` 推送后自动运行并提交；`static.yml` 在部署前也运行一次，保证构建产物中的哈希与游戏文件一致。

该模式让所有新访客直接加载新版，不依赖访客点击“更新”。工作流拥有 `contents: write` 权限，仓库写权限即发布权限，需要保护分支和 Actions 权限。工作流当前未提交、未线上运行；脚本已本地测试。

## 保留的修复

### 1. 高：Service Worker 会清空整个源的所有缓存

原 `sw.js` 在 `activate` 阶段执行：

```js
keys.filter(key => key !== VERSION)
```

`CacheStorage` 按“源”共享，不按 `scope` 隔离。axxiu 的多个项目都在 `https://www.axxiu.cn` 下，这个加载器升级时会删除同域其他项目的全部缓存。

现修复：`CACHE_PREFIX = 'game-loader-sw-'`，只删除本加载器自己的旧版本缓存，其他项目的缓存名保持不变。

### 2. 中：IndexedDB 清理会误删同仓库其他游戏的缓存

加载器的 `cleanOldPages()` 原前缀为 `page|<origin>|<repo>@`，更新脚本的 `cacheGame()` 同样过宽。同一仓库的多个游戏会互相清缓存。

现修复：

- 加载器清理前缀为 `page|<origin>|<repo>@<ref>|<file>|`；
- 更新脚本清理前缀为 `page|<origin>|<repo>@main|<file>|`。

### 3. 中：缺少 CSP 与安全响应头

原 `_headers` 只有 `nosniff`、`no-referrer` 和 `X-Frame-Options`；GitHub Pages 与 axxiu 不读取 `_headers`，页面没有 CSP。

现修复：

- `index.html` / `404.html` 增加 CSP `meta`，限制脚本、样式、连接、frame、object、base-uri 与表单目标；
- Cloudflare Pages `_headers` 增加 CSP、HSTS、Permissions-Policy、COOP、CORP、frame-ancestors；
- 保留 `nosniff`、`no-referrer`、`SAMEORIGIN`。

CSP 已允许加载器所需的自有资源、`data:` 字体、`blob:`/`data:` 媒体、jsDelivr 与 GitHub Raw 下载线路。

### 4. 低：更新脚本和 SW 版本滞后

v12 将 `update-auth.js` 提升到 `v=11`、SW 提升到 `game-loader-sw-v12`。v13 继续提升为 `update-auth.js?v=12` 和 `game-loader-sw-v13`，避免新旧脚本、旧缓存混用。

### 5. 低：GitHub Actions 使用可移动标签

`actions/checkout@v4`、`configure-pages@v5`、`upload-pages-artifact@v3`、`deploy-pages@v5` 原按标签引用，标签可被上游移动。

现修复：全部固定到具体 commit SHA；部署 job 的 checkout 关闭持久化凭据（`persist-credentials: false`），两个 workflow 增加超时，版本清单 workflow 增加并发锁。

### 6. 生产环境兼容修正（非漏洞）

- `base-uri 'self'` 会拦截加载器为游戏注入的 CDN `<base>`。已将 `base-uri` 放宽到 gcore/fastly/cdn.jsDelivr 与 raw.githubusercontent.com 四个源。
- CSP 会拦截 Cloudflare 自动注入的 Web Analytics 脚本。已在 `script-src` 与 `connect-src` 放行 `static.cloudflareinsights.com` 和 `cloudflareinsights.com`，并移除浏览器不识别的 `bluetooth` 权限项。

## 信任模型与限制

### 当前没有更新鉴权

密码门禁已移除，更新按钮对任何访客可用。`game-version.json` 和页面本身都在同一站点，拥有站点写权限的人可以同时修改页面、清单和游戏文件，因此 SHA-256 不能建立强信任边界。

如果需要强更新权限，应改用服务端鉴权，或对 `game.html` 使用离线私钥签名、页面只内置公钥验签。当前静态部署没有服务端，无法只靠前端脚本实现强鉴权。

### 游戏 iframe 与加载器同源

游戏通过 `srcdoc` 载入，并直接使用 `localStorage` 存档，因此没有加 `sandbox` 的 opaque origin 隔离。`game.html` 由 `game-sha256` 固定校验，属于与加载器同等信任级别的代码；如果仓库被攻陷，攻击者本来也能同时修改加载器和游戏。若未来要隔离游戏代码，需要把存档读写改为 `postMessage` 桥接，再给 iframe 加严格 sandbox。

### 安全响应头的覆盖范围

- Cloudflare Pages：`_headers` 全部生效。
- GitHub Pages：只生效页面内的 CSP `meta` 与 `referrer`，无法设置 HSTS、COOP、CORP、Permissions-Policy。
- axxiu：只生效页面内的 CSP `meta` 与 `referrer`，无法设置自定义响应头。

## 验证记录

- `node --check`：`sw.js`、`update-auth.js`、`gen-game-version.mjs` 通过。
- 本地模拟新版本：页面显示“发现游戏新版本”；点击“更新”直接进入“正在下载新版本…”，没有密码弹窗。
- `window.UpdateAuth` 为 `undefined`，页面中不存在 `.pb-auth-mask` 密码层。
- 下载校验失败时只显示“更新失败：下载失败或校验不一致，请检查网络后重试”，不会要求输入密码。
- 本地根目录 `http://127.0.0.1:8920/`：SW scope `/`，页面可载入；更新提示与直接更新路径已验证。
- 缓存隔离测试：预置 `other-app-cache` 与 `game-loader-sw-v12`，新 SW 激活后 `other-app-cache` 保留，旧 v12 删除，`game-loader-sw-v13` 生成。
- IndexedDB 隔离测试：同仓库其他文件的缓存键在写入 `game.html` 后保留。
- Cloudflare 线上响应头：CSP、HSTS、Permissions-Policy、COOP、CORP、nosniff 均已返回；断网重载正常。
- `game.html` 哈希未变，未上传/修改游戏本体。
