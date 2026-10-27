// node render.mjs stills 1.5 4.2 ...  |  node render.mjs frames <outDir> [workers]
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import http from 'http'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const pw = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
const TL = JSON.parse(fs.readFileSync(path.join(here, 'timeline.json'), 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const port = server.address().port;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function openPage() {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
  const page = await ctx.newPage();
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => { console.log('[pageerror]', e.stack); process.exit(1); });
  await page.addInitScript(`window.TIMELINE=${JSON.stringify(TL)}`);
  await page.goto(`http://127.0.0.1:${port}/src/index.html`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  return page;
}
const grab = (page, t, type = 'image/jpeg') => page.evaluate(([t, type]) => { window.renderFrame(t); return document.getElementById('out').toDataURL(type, 0.95); }, [t, type]);
const save = (f, d) => fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
const mode = process.argv[2];
if (mode === 'stills') {
  const out = path.join(root, 'output/stills'); fs.mkdirSync(out, { recursive: true });
  const page = await openPage();
  for (const ts of process.argv.slice(3)) { const t = parseFloat(ts), t0 = Date.now(); save(path.join(out, `t${t.toFixed(2)}.jpg`), await grab(page, t)); console.log('still', t, Date.now() - t0, 'ms'); }
} else if (mode === 'cover') {
  const page = await openPage();
  save(path.join(root, 'output/cover.jpg'), await page.evaluate(async () => { await window.renderCover(); return document.getElementById('out').toDataURL('image/jpeg', 0.95); }));
} else if (mode === 'frames') {
  const out = process.argv[3], nw = parseInt(process.argv[4] || '3', 10); fs.mkdirSync(out, { recursive: true });
  const N = Math.round(TL.duration * TL.fps), t0 = Date.now(); let next = 0;
  await Promise.all([...Array(nw)].map(async () => {
    const page = await openPage();
    for (;;) { const i = next++; if (i >= N) break; const f = path.join(out, `f${String(i).padStart(4, '0')}.jpg`); if (!fs.existsSync(f)) save(f, await grab(page, i / TL.fps)); if (i % 30 === 0) console.log(`frame ${i}/${N} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  }));
}
await browser.close(); server.close();
