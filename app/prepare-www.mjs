// Pakai: node app/prepare-www.mjs <folder-tujuan> <versi>
// Menyalin web app ke folder tujuan & menyuntik pengecek update (hanya di build app).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [dest, version] = process.argv.slice(2);
if (!dest || !version) throw new Error('usage: prepare-www.mjs <dest> <version>');

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const f of ['index.html', 'clan-history.js', 'season.json']) {
  if (existsSync(join(root, f))) cpSync(join(root, f), join(dest, f));
}
cpSync(join(root, 'assets'), join(dest, 'assets'), { recursive: true });
cpSync(join(root, 'app/shared/app-update.js'), join(dest, 'app-update.js'));

const p = join(dest, 'index.html');
let html = readFileSync(p, 'utf8');
const i = html.lastIndexOf('</body>');
if (i < 0) throw new Error('</body> tidak ditemukan di index.html');
const tag = `<script>window.__APP_VERSION__=${JSON.stringify(version)};</script><script src="app-update.js"></script>\n`;
html = html.slice(0, i) + tag + html.slice(i);
writeFileSync(p, html);
console.log(`www siap di ${dest} (v${version})`);
