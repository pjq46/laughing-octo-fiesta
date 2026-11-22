913 游戏加载器更新包（v13，无密码门禁）
========================================

本包只包含加载器、更新脚本、缓存策略、安全响应头、版本清单和说明文档，不包含 game.html，也不包含 .github 目录。
game.html 仍是原文件，SHA-256：
95dee6751dbdc375d693cd1f649834c6bcf8263492d5f1398584e97cf7597e03

包含文件
--------
index.html
404.html
sw.js
update-auth.js（历史文件名，已移除密码门禁）
_headers
game-version.json
gen-game-version.mjs
SECURITY-AUDIT.md
README-安全审计修复.txt

本次变更
--------
1. 移除更新密码门禁：删除 PBKDF2 校验、密码弹窗和 window.UpdateAuth 全局对象。
2. 更新按钮改为直接执行：检测到新版本后，点击“更新”立即从 GitHub main 下载、校验 SHA-256、写入本地缓存并重载，不再需要输入密码。
3. 更新脚本版本从 v11 提升到 v12；SW 版本从 game-loader-sw-v12 提升到 game-loader-sw-v13。
4. 保留 v12 的安全与可靠性修复：SW 只清理自身前缀缓存、IndexedDB 按仓库/分支/文件隔离、CSP 与安全响应头、Actions 固定 commit SHA。
5. 压缩包不再包含 .github 目录；GitHub Actions 配置仍保留在仓库中，部署时不需要随包覆盖。

部署方法
--------
GitHub 仓库：
- 把包内根目录文件覆盖到仓库根目录；
- .github/workflows 不在包内，仓库现有两个 workflow 保持不动；
- 等待 GitHub Pages workflow 成功。若遇到 “No artifacts named github-pages” 的临时失败，请使用 “Re-run all jobs” 完整重跑，不要只重跑失败的 deploy job。

Cloudflare Pages：
- 把包内根目录文件覆盖到项目根目录；
- 构建命令保持 node gen-game-version.mjs，输出目录 /；
- _headers 只有 Cloudflare Pages 会读取，GitHub Pages 与 axxiu 不读取。

axxiu：
- 把包内根目录文件上传到项目目录，保持 index.html、404.html、sw.js、update-auth.js 同级；
- 上传后强制刷新一次，让旧 SW 更新到 v13；
- 如果 axxiu 也需要离线运行新版游戏，必须同时上传新的 game.html 和 game-version.json；只上传加载器不会替换 axxiu 上的旧游戏文件。

更新新游戏
----------
- 只替换 game.html 后，game-version.json 由工作流重新生成，页面会出现“发现游戏新版本”；点击“更新”即直接下载新版，不再弹密码框。
- 如果希望所有访客直接拿新版，还要把 index.html / 404.html 的 game-repo 改为 @main，并把 game-sha256 改成新文件哈希，然后提升 SW 版本。

验证结果
--------
- node --check：sw.js、update-auth.js、gen-game-version.mjs 全部通过。
- 本地模拟新版本：页面显示“发现游戏新版本”，点击“更新”后直接进入“正在下载新版本…”，没有密码弹窗。
- 本地检查：window.UpdateAuth 为 undefined，页面中不存在 .pb-auth-mask 密码层。
- 下载校验失败时只提示“更新失败：下载失败或校验不一致”，不会要求输入密码。
- 本地根目录与子目录的 SW scope、断网重载、缓存隔离、IndexedDB 隔离均通过。
- Cloudflare 线上响应头：CSP、HSTS、Permissions-Policy、COOP、CORP、nosniff 均已返回。

安全边界说明
------------
移除密码门禁后，任何能打开页面的人都可以点击“更新”。更新过程仍会从固定仓库 main 下载 game.html，并用 game-version.json 的 SHA-256 校验文件，能防止下载被截断或替换成不匹配的文件；但它不是身份认证，不能阻止拥有站点写权限或能修改本地页面/存储的人。
如果需要强更新权限，应改用服务端鉴权，或对 game.html 使用离线私钥签名、页面只内置公钥验签。当前静态部署无法只靠前端脚本实现强鉴权。

游戏 iframe 与加载器同源，因为游戏存档直接使用 localStorage；game.html 由 SHA-256 固定校验，属于与加载器同级的受信代码。若未来要隔离游戏脚本，需要把存档改为 postMessage 桥接后再加 sandbox。

详细审计记录见 SECURITY-AUDIT.md。
