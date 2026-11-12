// Собирает сайт в dist/: исходники, pdf.js из node_modules, иконки и список файлов для офлайн-кэша.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.dirname(new URL(import.meta.url).pathname);
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'vendor'), { recursive: true });

const copy = (from, to) => fs.copyFileSync(from, path.join(dist, to));
for (const f of fs.readdirSync(src)) if (!['sw.js', 'index.html'].includes(f)) copy(path.join(src, f), f);
const pdf = path.join(root, 'node_modules/pdfjs-dist/legacy/build');
copy(path.join(pdf, 'pdf.min.mjs'), 'vendor/pdf.min.mjs');
copy(path.join(pdf, 'pdf.worker.min.mjs'), 'vendor/pdf.worker.min.mjs');
const icons = path.join(root, 'icons');
for (const f of fs.existsSync(icons) ? fs.readdirSync(icons) : []) copy(path.join(icons, f), f);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

const files = [];
const walk = (dir) => { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) walk(p); else if (!f.startsWith('.')) files.push(path.relative(dist, p)); } };
walk(dist);
const hash = crypto.createHash('sha256');
for (const f of files.sort()) hash.update(f).update(fs.readFileSync(path.join(dist, f)));
const version = 'forma-' + hash.digest('hex').slice(0, 10);

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8').replaceAll('__VERSION__', version);
// Политика безопасности: скрипты только свои (встроенные разрешены по хешу), сеть только к своему сайту и DeepSeek.
// Если на страницу как-то попадёт чужой код, он не сможет загрузиться или отправить ключ и данные на сторонний сервер.
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${crypto.createHash('sha256').update(m[1]).digest('base64')}'`);
const csp = ["default-src 'self'", `script-src 'self' ${inline.join(' ')}`, "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  "connect-src 'self' https://api.deepseek.com", "worker-src 'self' blob:", "object-src 'none'", "base-uri 'self'", "form-action 'none'"].join('; ');
html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
fs.writeFileSync(path.join(dist, 'index.html'), html);
const list = ['./', './index.html', ...files.filter((f) => !f.endsWith('.mp4')).map((f) => './' + f)]; // видео грузятся по запросу, не в кэш установки
fs.writeFileSync(path.join(dist, 'sw.js'), fs.readFileSync(path.join(src, 'sw.js'), 'utf8').replace('__VERSION__', version).replace('__FILES__', JSON.stringify(list)));
console.log(`dist/ готов: ${files.length + 2} файлов, версия ${version}`);
