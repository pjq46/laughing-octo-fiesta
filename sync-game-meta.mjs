import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const GAME_FILE = String(process.argv[2] || 'game.html').replace(/^\/+/, '');
if (
  GAME_FILE.length > 200
  || !/^[A-Za-z0-9._\-\/]+$/.test(GAME_FILE)
  || GAME_FILE.split('/').some((part) => !part || part === '.' || part === '..')
) {
  throw new Error('game.html 路径不合法');
}
const META_FILES = ['index.html', '404.html'];
const MANIFEST = 'game-version.json';
const REPO_REF = String(process.env.GAME_REF || 'main').replace(/[^A-Za-z0-9._-]/g, '') || 'main';

const bytes = await readFile(GAME_FILE);
const sha256 = createHash('sha256').update(bytes).digest('hex');

let previous = {};
try {
  previous = JSON.parse(await readFile(MANIFEST, 'utf8'));
} catch {}

const hashChanged = previous.sha256 !== sha256 || previous.size !== bytes.length;
const updated = hashChanged || !previous.updated
  ? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  : previous.updated;

const manifest = {
  file: GAME_FILE,
  sha256,
  size: bytes.length,
  updated,
};
await writeFile(MANIFEST, JSON.stringify(manifest) + '\n');

const indexHtml = await readFile('index.html', 'utf8');
const repoMatch = indexHtml.match(/<meta\s+name="game-repo"\s+content="([^"]+)"/);
if (!repoMatch) throw new Error('index.html 缺少 game-repo');
const repo = repoMatch[1].split('@')[0];
const repoMeta = `${repo}@${REPO_REF}`;

function setMeta(html, name, value) {
  const re = new RegExp(`(<meta\\s+name=["']${name}["']\\s+content=["'])([^"']*)(["'])`, 'i');
  if (!re.test(html)) throw new Error(`缺少 meta: ${name}`);
  return html.replace(re, `$1${value}$3`);
}

for (const file of META_FILES) {
  let html = await readFile(file, 'utf8');
  html = setMeta(html, 'game-repo', repoMeta);
  html = setMeta(html, 'game-sha256', sha256);
  await writeFile(file, html);
}

if (process.env.BUMP_SW === '1' && hashChanged) {
  const sw = await readFile('sw.js', 'utf8');
  const match = sw.match(/var VERSION = 'game-loader-sw-v(\d+)';/);
  if (match) {
    const next = `game-loader-sw-v${Number(match[1]) + 1}`;
    await writeFile('sw.js', sw.replace(match[0], `var VERSION = '${next}';`));
    console.log(`sw.js ${match[0]} -> ${next}`);
  }
}

console.log(`game-version.json: ${sha256} (${bytes.length} bytes)`);
console.log(`index.html / 404.html: ${repoMeta} @ ${sha256}`);
