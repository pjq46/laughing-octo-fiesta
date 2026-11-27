#!/usr/bin/env node
/**
 * 加载器静态校验：不依赖第三方包，Node 18+ 直接运行。
 *   node validate.mjs
 * 覆盖：页面结构、内联脚本/样式、资源引用、CSP 一致性、Service Worker 版本与核心资源、
 *       meta 完整性、JS 语法（node --check）以及若干历史死代码/危险 API 检查。
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const errors = [];
const warnings = [];

const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);
const read = (name) => readFileSync(join(ROOT, name), 'utf8');
const exists = (name) => existsSync(join(ROOT, name));

/* ---------- 1. 入口页结构 ---------- */
const pages = ['index.html', '404.html'];
for (const page of pages) {
  if (!exists(page)) { fail(`${page} 不存在`); continue; }
  const html = read(page);

  /* 单文件入口页：loader.css / loader.js / update-auth.js 必须内联进 HTML，
     不能再出现外链，也不允许页面与源文件内容漂移。 */
  if (!/<style>/.test(html)) fail(`${page} 缺少内联样式块`);
  if (/<link[^>]+href="loader\.css"/i.test(html)) fail(`${page} 不应再外链 loader.css`);
  if (/<script[^>]+src="loader\.js"/i.test(html)) fail(`${page} 不应再外链 loader.js`);
  if (/<script[^>]+src="update-auth\.js/i.test(html)) fail(`${page} 不应再外链 update-auth.js`);

  for (const asset of ['loader.css', 'loader.js', 'update-auth.js']) {
    if (!exists(asset)) fail(`${asset} 不存在（单文件页由这些源文件内联生成）`);
  }

  const css = exists('loader.css') ? read('loader.css') : '';
  if (!/\.site-link\{/.test(css)) fail('loader.css 缺少 .site-link 样式（官网入口会掉在角落）');
  if (css && !html.includes(css)) fail(`${page} 的内联样式与 loader.css 不一致`);

  const js = exists('loader.js') ? read('loader.js') : '';
  if (!/loader_update_check/.test(js)) fail('loader.js 缺少更新检测逻辑（三态提示会失效）');
  if (js && !html.includes(js)) fail(`${page} 的内联脚本与 loader.js 不一致`);

  const auth = exists('update-auth.js') ? read('update-auth.js') : '';
  if (!/loader_hash_state/.test(auth)) fail('update-auth.js 未记录 loader_hash_state');
  if (auth && !html.includes(auth)) fail(`${page} 的内联脚本与 update-auth.js 不一致`);

  const meta = (name) => {
    const m = new RegExp(`<meta name="${name}" content="([^"]*)"`, 'i').exec(html);
    return m ? m[1] : '';
  };
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:@[A-Za-z0-9._-]{1,40})?$/.test(meta('game-repo')))
    fail(`${page} game-repo 格式不合法: ${meta('game-repo')}`);
  if (!/^[0-9a-f]{64}$/i.test(meta('game-sha256'))) fail(`${page} game-sha256 不是 64 位十六进制`);
  const size = Number(meta('game-size'));
  if (!(size > 0 && size < 1e9)) fail(`${page} game-size 不合法: ${meta('game-size')}`);

  /* 左上角官网入口：地址与安全属性都在校验里钉死，避免被误改或去掉。 */
  const siteHref = 'https://www.axxiu.cn/project/l8iKyxdA/';
  const siteTag = new RegExp(`<a[^>]+href="${siteHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`).exec(html);
  if (!siteTag) fail(`${page} 缺少官网入口（${siteHref}）`);
  else {
    if (!/\btarget="_blank"/.test(siteTag[0])) fail(`${page} 官网入口未新开窗口`);
    if (!/\brel="[^"]*noopener/i.test(siteTag[0])) fail(`${page} 官网入口缺少 rel="noopener"`);
  }

  if (!/<meta http-equiv="Content-Security-Policy"/i.test(html)) fail(`${page} 缺少 CSP meta`);
  if (!/frame-src 'self' data: blob:/i.test(html)) fail(`${page} CSP 的 frame-src 不允许 srcdoc 游戏`);

  /* 加载器页面的 CSP 必须保留 'unsafe-inline'：游戏通过 iframe srcdoc 注入，
     srcdoc 文档继承父页面 CSP，游戏自带内联脚本与样式；去掉后游戏只剩无样式按钮列表。
     这条是硬性失败，避免有人把严格 CSP 当成“更安全”的默认值提交。 */
  if (!/script-src[^;]*'unsafe-inline'/.test(html))
    fail(`${page} CSP 缺少 script-src 'unsafe-inline'，srcdoc 注入的游戏会因内联脚本被拦而无法运行`);
  if (!/style-src[^;]*'unsafe-inline'/.test(html))
    fail(`${page} CSP 缺少 style-src 'unsafe-inline'，srcdoc 注入的游戏会丢失全部样式`);
  if (/script-src[^;]*'unsafe-eval'/.test(html)) fail(`${page} CSP 不应允许 'unsafe-eval'`);
}

const index = exists('index.html') ? read('index.html') : '';
const page404 = exists('404.html') ? read('404.html') : '';
if (index && page404 && index !== page404) fail('index.html 与 404.html 内容不一致');

/* ---------- 2. 构建脚本可复现性 ----------
   入口页必须能只依赖仓库内文件重建：build-loader-page.py --check 会按当前
   game-version.json 生成页面并与 index.html / 404.html 逐字比对。
   若脚本仍依赖仓库里不存在的 baseline（例如 index.pre-opt.html），这里会直接失败。 */
if (!exists('build-loader-page.py')) {
  warn('build-loader-page.py 不存在，跳过可复现性校验');
} else {
  try {
    const out = execFileSync('python3', [join(ROOT, 'build-loader-page.py'), '--check'], {
      cwd: ROOT, stdio: 'pipe', timeout: 30000,
    }).toString().trim();
    if (out) console.log(`[info] ${out}`);
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message).toString().trim();
    if (e.code === 'ENOENT') warn('环境缺少 python3，跳过构建脚本可复现性校验');
    else fail(`构建脚本无法从仓库内文件重建页面：${msg.split('\n').slice(0, 3).join(' ')}`);
  }
}

/* ---------- 3. CSP 与 _headers 一致 ---------- */
if (exists('_headers')) {
  const headers = read('_headers');
  const metaCsp = (/Content-Security-Policy" content="([^"]*)"/i.exec(index) || [])[1] || '';
  const headerCsp = (/Content-Security-Policy: ([^\n]*)/i.exec(headers) || [])[1] || '';
  if (!headerCsp) fail('_headers 缺少 Content-Security-Policy');
  else if (metaCsp.trim() !== headerCsp.trim()) fail('_headers 的 CSP 与页面 meta CSP 不一致');
  if (/^\s*\/\*\s*\n\s*[*#]/m.test(headers)) fail('_headers 的 /* 区块里混入了注释行，会被当成非法头');
  for (const rule of ['loader.js', 'loader.css', 'sw.js', 'game-version.json']) {
    if (!new RegExp(`^/${rule.replace('.', '\\.')}\\s*$`, 'm').test(headers)) warn(`_headers 未给 /${rule} 指定缓存策略`);
  }
  if (!/^\/game-version\.json\s*\n\s*Cache-Control: no-store/m.test(headers)) fail('_headers 未把 game-version.json 设为 no-store');
} else {
  fail('_headers 不存在');
}

/* ---------- 3. Service Worker ---------- */
if (!exists('sw.js')) fail('sw.js 不存在');
else {
  const sw = read('sw.js');
  const version = (/var VERSION = '([^']*)'/.exec(sw) || [])[1] || '';
  if (!/^game-loader-sw-v\d+$/.test(version)) fail(`sw.js 的 VERSION 格式不合法: ${version}`);
  for (const asset of ['loader.js', 'loader.css', 'update-auth.js', 'index.html', '404.html']) {
    if (!new RegExp(asset.replace('.', '\\.')).test(sw)) fail(`sw.js 未引用 ${asset}`);
  }
  if (!/CORE_ASSETS = \[.*loader\.js.*loader\.css/i.test(sw.replace(/\n/g, ' ')))
    fail('sw.js 的 CORE_ASSETS 未包含 loader.js / loader.css');
  if (!/function isCacheable/.test(sw)) fail('sw.js 缺少 isCacheable 守卫');
  if (!/if \(!response\.ok\) return false/i.test(sw)) fail('sw.js 未拒绝缓存非 2xx 响应');
  if (!/text\/html/i.test(sw)) fail('sw.js 未拦截 text/html 兜底页落盘');
  if (/cache\.put\(request, response\)/.test(sw)) fail('sw.js 直接 put 原始响应，应该用 clone');
}

/* ---------- 4. loader.js 关键点 ---------- */
if (exists('loader.js')) {
  const js = read('loader.js');
  if (/document\.write\s*\(/.test(js)) fail('loader.js 使用了 document.write');
  if (/\beval\s*\(/.test(js)) fail('loader.js 使用了 eval');
  if (/function De\(/.test(js)) warn('loader.js 仍存在已废弃的 De()');
  if (!/var Ee = 7e3/.test(js)) warn('首连对冲不再是 7 秒');
  if (!/STALL_MS/.test(js)) warn('缺少传输停滞对冲');
  if (!/function cleanOldPages/.test(js)) fail('loader.js 缺少缓存清理');
  if (!/cacheCleanupError/.test(js)) fail('缓存清理失败仍被静默吞掉');
  if (!/navigator\.storage\.estimate/.test(js)) warn('未做配额检查');
  if (!/game-size/.test(js)) warn('未读取 game-size，总量可能退回 CDN 报告值');
  /* 缓存/版本状态命名空间不能带 ref：ref 每次部署换成提交号，会把缓存和三态判断全部打断。 */
  if (!/var xBase = s && c \? encodeURIComponent\(s\)/.test(js))
    fail('loader.js 缺少不含 ref 的 xBase 命名空间');
  if (/Y = "page\|" \+ location\.origin \+ "\|" \+ x \+ "@" \+ l/.test(js))
    fail('loader.js 的缓存键仍带 @ref，三态更新提示会被打断');
  if (!/loader_update_check\|" \+ x \+ "\|"/.test(js))
    fail('loader.js 的忽略状态键仍带 ref');
}

/* ---------- 5. JS 语法 ---------- */
const jsFiles = ['loader.js', 'sw.js', 'update-auth.js', 'sync-game-meta.mjs', 'gen-game-version.mjs', 'validate.mjs'];
for (const file of jsFiles) {
  if (!exists(file)) { warn(`${file} 不存在，跳过语法检查`); continue; }
  try {
    execFileSync(process.execPath, ['--check', join(ROOT, file)], { stdio: 'pipe' });
  } catch (e) {
    fail(`${file} 语法错误: ${(e.stderr || e.stdout || e.message).toString().split('\n').slice(0, 4).join(' ')}`);
  }
}

/* ---------- 6. 不应进入仓库的本地文件 ---------- */
for (const file of ['game.html']) {
  if (exists(file)) warn(`${file} 体积巨大，打包/上传时确认是否需要排除`);
}

/* ---------- 输出 ---------- */
for (const w of warnings) console.warn(`[warn] ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`[error] ${e}`);
  console.error(`\n校验失败：${errors.length} 个错误，${warnings.length} 个警告`);
  process.exit(1);
}
console.log(`校验通过：0 个错误，${warnings.length} 个警告`);
