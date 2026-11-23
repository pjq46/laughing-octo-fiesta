913 自动同步更新包（v14，第二种）
==================================

本包实现“第二种”：game.html 更新后，由 GitHub Actions 自动计算新 SHA-256，改写 index.html / 404.html 里的 game-repo 和 game-sha256，并提交、重新部署。所有新访客打开就是新版，不需要再点“更新”。

与第一种的区别：
- 第一种：只把新版本记在点过“更新”的访客浏览器里，两个 HTML 不动。
- 第二种：构建阶段直接改两个 HTML，所有新访客都拿到新哈希。

本包不包含 game.html；game.html 当前仍是原文件，SHA-256：
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
sync-game-meta.mjs
SECURITY-AUDIT.md
README-第二种自动同步.txt
.github/workflows/game-version.yml
.github/workflows/static.yml

本包改动
--------
1. index.html / 404.html 的 game-repo 改为 pjq46/laughing-octo-fiesta@main，game-sha256 为当前文件哈希。
2. 新增 sync-game-meta.mjs：计算 game.html 的 SHA-256 和大小，写 game-version.json，并同步改写 index.html / 404.html 的 game-repo、game-sha256。
3. game-version.yml 改为监听 game.html 推送：自动运行 sync-game-meta.mjs，提交 game-version.json、两个 HTML，并在哈希变化时把 SW 版本加一。
4. static.yml 在打包上传前也运行 sync-game-meta.mjs，保证部署产物里的两个 HTML 与 game.html 一致，不会出现“新游戏 + 旧哈希”的窗口。
5. gen-game-version.mjs 改为兼容包装，Cloudflare Pages 构建命令仍可保持 node gen-game-version.mjs。
6. sw.js 升到 game-loader-sw-v14，update-auth.js 查询串升到 v13。

重要：第二种必须使用 .github
---------------------------
自动改两个 HTML 依赖 .github/workflows/game-version.yml。只上传根目录文件、不上传 .github，工作流不会运行，后续换 game.html 仍会出现“新游戏 + 旧哈希”，新访客无法直接进入。
本包按第二种需要包含 .github；仓库本身没有提交，仅本地打包。

部署方法
--------
GitHub 仓库：
1. 把包内根目录文件覆盖到仓库根目录；
2. 把 .github/workflows/game-version.yml 和 static.yml 覆盖到仓库 .github/workflows/；
3. 确认仓库 Settings -> Actions -> General 允许 GitHub Actions 读写仓库内容；
4. 在 Actions 里手动运行一次 “Sync game version and loader refs”，或直接替换 game.html 触发；
5. 等待 Pages 部署完成。

Cloudflare Pages：
1. 把包内根目录文件覆盖到项目根目录；
2. 构建命令保持 node gen-game-version.mjs，输出目录 /；
3. gen-game-version.mjs 会调用 sync-game-meta.mjs，在构建产物里同步两个 HTML 的哈希；
4. Cloudflare 不使用 .github，但需要最新提交里已经有同步后的 index.html / 404.html。

axxiu：
1. 上传前先在本地项目根目录运行 node sync-game-meta.mjs（需要同目录有 game.html）；
2. 再上传 index.html、404.html、sw.js、update-auth.js、game-version.json 和新的 game.html；
3. axxiu 没有 GitHub Actions，不能只换 game.html 就自动改两个 HTML。

以后更新游戏
------------
1. 替换仓库根目录的 game.html；
2. game-version.yml 自动运行，计算新 SHA，改写 index.html / 404.html，提交并触发 Pages 部署；
3. 新访客首次打开直接用新哈希加载新版；
4. 已打开过旧页面的访客，SW 版本会随哈希变化加一，下一次刷新后切到新页面。

如果工作流没有自动运行：
- 打开 Actions -> Sync game version and loader refs -> Run workflow；
- 或本地运行 node sync-game-meta.mjs，然后提交 game-version.json、index.html、404.html、sw.js。

验证结果
--------
- node --check：sw.js、update-auth.js、sync-game-meta.mjs、gen-game-version.mjs 全部通过。
- 用 39 字节测试 game.html 运行 sync-game-meta.mjs：index/404 的 game-repo、game-sha256 与 manifest 全部一致。
- 第二次运行哈希未变：updated 时间保持不变，不产生无意义提交。
- 哈希变化且 BUMP_SW=1：SW 版本从 v14 自动升到 v15。
- 用当前 16,917,721 字节 game.html 运行：两个 HTML 的 game-sha256 均为 95dee6751dbdc375d693cd1f649834c6bcf8263492d5f1398584e97cf7597e03。
- GitHub Actions 本身未提交、未线上运行；工作流语法和脚本已在本地校验通过。

安全边界
--------
- 浏览器不能直接改服务器文件；第二种是构建阶段自动改，不是访客点击“更新”后改服务器。
- game.html 仍用 SHA-256 校验，能防止下载被截断或替换成不匹配文件；但 SHA-256 不是发布者身份签名。
- 工作流拥有 contents: write 权限，能改仓库文件；仓库写权限本身就是发布权限，需保护分支和 Actions 权限。
- update-auth.js 已无密码门禁，密码不是强鉴权；需要强权限时应使用服务端鉴权或离线私钥签名。
- 第一种的 loader_ref_override 逻辑仍保留，已更新过的旧页面浏览器仍可用本地覆盖；第二种让新访客直接走新哈希。

详细审计记录见 SECURITY-AUDIT.md。
