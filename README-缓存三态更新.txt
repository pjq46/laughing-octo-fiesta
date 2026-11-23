913 缓存三态安全修复包（v16）
==============================

本包在第二种“自动同步两个 HTML”基础上，增加缓存三态判断和安全修复：
1. 缓存哈希 = HTML 里的 game-sha256：直接运行缓存，不提示、不下载。
2. 缓存哈希 = 上一版哈希：先运行缓存，同时提示“发现游戏新版本”，可点“更新”，也可点“忽略”继续运行。
3. 两者都不匹配：先运行缓存，后台下载 HTML 指定的新版；下载校验通过后替换缓存并加载新版；下载失败则继续用旧缓存。

v16 修复的关键问题
------------------
- 原缓存键包含“当前目标哈希”，HTML 换版后只会去查新哈希的键，真实浏览器读不到上一版缓存，三态里的“提示更新”可能永远不触发。v16 改为稳定键：
  page|origin|仓库@版本|文件
  哈希放在记录字段 digest 里，不再放在键里。
- 仍兼容旧版带哈希的键：新键找不到时，会按当前哈希、上一版哈希、其他候选依次回退读取旧记录。
- 读取缓存时重新计算 HTML 的 SHA-256，并与记录里的 digest 比较；不一致视为缓存被篡改或损坏，不渲染，直接重新下载。
- 删除了“digest 相同就跳过写缓存”的旧优化。否则缓存内容被篡改、但 digest 被伪造成当前哈希时，下载后不会覆盖坏缓存。
- 校验 game-repo、game-file、game-sha256、分支和构建脚本参数，拒绝包含 `..`、反斜杠、引号或非法字符的路径，避免路径穿越和缓存键注入。
- sw.js 升到 game-loader-sw-v16，update-auth.js 查询串升到 v15。

包含文件
--------
index.html
404.html
sw.js
update-auth.js（历史文件名，已无密码门禁）
_headers
game-version.json
gen-game-version.mjs
sync-game-meta.mjs
SECURITY-AUDIT.md
README-缓存三态更新.txt
.github/workflows/game-version.yml
.github/workflows/static.yml

本包不包含 game.html；game.html 仍是原文件，SHA-256：
95dee6751dbdc375d693cd1f649834c6bcf8263492d5f1398584e97cf7597e03

缓存键说明
----------
游戏缓存（v16 稳定键）：
page|页面 origin|仓库@版本|文件

旧版兼容键：
page|页面 origin|仓库@版本|文件|哈希

记录字段：
{ key, html, url, savedAt, digest }

哈希状态：
loader_hash_state|仓库@版本|文件
值为：
{"target":"当前 HTML 目标哈希","prev":"上一版哈希","at":时间}

忽略记录：
loader_update_check|仓库@版本|文件
值为：
{"hash":"当前新版哈希","dismissed":"已选择忽略并继续运行的版本哈希"}

更新流程
--------
1. 打开页面，读取 HTML 的 game-sha256 作为 target。
2. 读取 loader_hash_state；若 target 变了，把旧 target 写入 prev。
3. 读取稳定键缓存；读不到再回退旧版带哈希键。
4. 重新计算缓存 HTML 的 SHA-256，与记录 digest 比较。
5. 按三态处理：
   - 缓存 = 当前版：直接运行；
   - 缓存 = 上一版：运行并提示；
   - 都不等：运行缓存并后台下载当前版。
6. 点“更新”：下载 game-version.json 对应的新版，SHA-256 校验通过后：
   - 写入稳定键缓存；
   - 把旧版哈希写进 loader_hash_state.prev；
   - 写 loader_ref_override；
   - 清理旧版带哈希键；
   - 重载。
7. 点“忽略”：隐藏提示并记住该版本，游戏继续运行。

安全边界
--------
- 下载和缓存读取都以 SHA-256 为完整性边界；哈希不一致不会渲染。
- 缓存三态只决定“用缓存还是下载”，不改变 SHA-256 校验。
- 前端仍无强鉴权；能改仓库或能在同源执行脚本的人仍能影响加载结果。
- 游戏 iframe 仍是同源运行，游戏本体需要访问 localStorage/IndexedDB；没有加 sandbox，避免破坏存档。
- “忽略”只记录在本地，不影响其他访客。

测试记录
--------
- 语法：index.html / 404.html 内联脚本、sw.js、update-auth.js、sync-game-meta.mjs 全部 node --check 通过。
- 缓存 = 当前 HTML：显示“本地缓存”，无提示、无网络请求。
- 缓存 = 上一版（稳定键）：显示“发现游戏新版本”，按钮为“更新 / 忽略”，旧版内容已渲染。
- 缓存 = 上一版（旧版带哈希键）：兼容读取成功，提示正常出现。
- 点“忽略”：提示隐藏，重载后同一版本不再重复提示。
- 缓存 = 未知哈希：先显示缓存，后台下载新版；稳定键缓存的 digest 更新为当前哈希。
- 缓存被篡改：记录 digest 写成当前哈希、内容换成伪造 HTML；重新计算不一致，不渲染伪造内容，重新下载并用正确内容覆盖缓存。
- 更新按钮：remoteHash === metaHash 时仍能下载，写入稳定键缓存，loader_hash_state.prev 保留旧版哈希。
- 更新完成后重载：直接命中缓存，无提示。

部署说明
--------
本包基于第二种，包含 .github 工作流。上传仓库时至少覆盖：
index.html、404.html、sw.js、update-auth.js、sync-game-meta.mjs、
SECURITY-AUDIT.md、README-缓存三态更新.txt。

部署后：
1. 先手动运行一次 “Sync game version and loader refs”；
2. 确认线上 index.html / 404.html 的 game-sha256 与 game.html 一致；
3. 强制刷新一次，让 SW 从 v15 升到 v16；
4. 验证旧缓存 visitor 能看到“发现游戏新版本 / 更新 / 忽略”。

详细审计记录见 SECURITY-AUDIT.md。
