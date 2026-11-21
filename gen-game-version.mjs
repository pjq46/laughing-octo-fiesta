import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const file = process.argv[2] || 'game.html';
const bytes = await readFile(file);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const manifest = {
  file,
  sha256,
  size: bytes.length,
  updated: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
};
await writeFile('game-version.json', JSON.stringify(manifest) + '\n');
console.log(`game-version.json updated: ${sha256} (${bytes.length} bytes)`);
