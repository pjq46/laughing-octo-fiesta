913 安全审计修复包（v12）
============================

本次改动只涉及加载器、更新脚本、缓存策略和安全响应头以及 GitHub Actions 配置，未修改 game.html。
game.html 仍是原文件，SHA-256：
95dee6751dbdc375d693cd1f649834c6bcf8263492d5f1398584e97cf7597e03

包含文件
--------
index.html
404.html
sw.js
update-auth.js
_headers
game-version.json
gen-game-version.mjs
SECURITY-AUDIT.md
README-安全审计修复.txt
.github/workflows/static.yml
.github/workflows/game-version.yml

主要修复
--------
1. Service Worker 只删除自己前缀的旧缓存，不再清空整个源。axxiu 同域其他项目的缓存不会被误删。
2. IndexedDB 清理按“仓库 + 分支 + 文件”收紧，不再误删同仓库其他游戏的缓存。
3. 更新脚本不再把 verify 暴露给页面内任意脚本，只保留 ask 弹窗入口。
4. index.html / 404.html 增加 CSP 与 referrer 策略；Cloudflare _headers 增加 HSTS、Permissions-Policy、COOP、CORP。
5. 更新脚本版本从 v10 提升到 v11；SW 版本从 game-loader-sw-v11 提升到 game-loader-sw-v12。
6. GitHub Actions 固定到具体 commit SHA，部署 job 关闭持久化凭据。
7. CSP 的 base-uri 允许加载器实际使用的四个 CDN 源，避免拦截加载器注入给游戏的 <base>。
8. CSP 放行 Cloudflare Web Analytics 的脚本与上报端点，并移除浏览器不识别的 bluetooth 权限项。

部署方法
--------
GitHub 仓库：
- 把根目录文件覆盖到仓库根目录；
- 把 .github/workflows 下两个 yml 覆盖到仓库对应目录；
- 等待 GitHub Pages workflow 成功。若遇到 “No artifacts named github-pages” 的临时失败，请使用 “Re-run all jobs” 完整重跑，不要只重跑失败的 deploy job。

Cloudflare Pages：
- 把根目录文件覆盖到项目根目录；
- 构建命令保持 node gen-game-version.mjs，输出目录 /；
- _headers 只有 Cloudflare Pages 会读取，GitHub Pages 与 axxiu 不读取。

axxiu：
- 把根目录文件上传到项目目录，保持 index.html、404.html、sw.js、update-auth.js 同级；
- 上传后强制刷新一次，让旧 SW 更新到 v12；
- 不要上传 game.html，线上原游戏文件保持不变。

验证结果
--------
- 安全代码最终状态：与 7cb92be 一致。期间 bc9efd2 曾尝试放行 axxiu/百度统计，已由 d01c317 完整回滚，当前代码与 7cb92be 无差异；说明文档随后更新。
- GitHub Pages workflow #38 成功，20 秒完成部署。
- GitHub Pages 线上：index.html 为 v11 更新脚本，SW v12，CSP 生效，断网重载显示“本地缓存 · 16.1 MB”。
- Cloudflare 线上：CSP、HSTS、Permissions-Policy、COOP、CORP 响应头已生效，断网重载正常；控制台不再出现 CSP 或 Permissions-Policy 告警。
- 本地根目录：SW scope /，断网重载正常。
- 本地子目录：SW scope /project/l8iKyxdA/，断网重载正常。
- 预置 other-app-cache 与 game-loader-sw-v11，新 SW 激活后只保留 other-app-cache 与 game-loader-sw-v12，v11 删除，其他项目缓存保留。
- 预置同仓库 other.html 的 IndexedDB 键，写入 game.html 缓存后该键仍保留。
- axxiu 线上仍是旧版 v11，离线可用；上传本包后才会应用本次加固。

安全边界说明
------------
更新密码仍是前端 PBKDF2 门禁，不是服务端权限。它能减少误更新和随手替换，但不能阻止拥有站点写权限、能修改本地 JS/存储，或拿到公开哈希后离线爆破弱密码的人。
如果需要强安全边界，应改为服务端鉴权，或对 game.html 使用离线私钥签名、页面只内置公钥验签。当前静态部署无法只靠前端脚本实现强鉴权。

游戏 iframe 与加载器同源，因为游戏存档直接使用 localStorage；game.html 由 SHA-256 固定校验，属于与加载器同级的受信代码。若未来要隔离游戏脚本，需要把存档改为 postMessage 桥接后再加 sandbox。

详细审计记录见 SECURITY-AUDIT.md。
