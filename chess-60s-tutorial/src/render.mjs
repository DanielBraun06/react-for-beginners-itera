// node render.mjs stills 1.5 4.2 ...  |  node render.mjs frames <outDir> [workers] [from] [to]  |  node render.mjs cues
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import http from 'http'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
const FPS = 30;
const PART = process.env.PART || '1';   // PART=2 node render.mjs …  renders the second episode
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;
const mode = process.argv[2];
async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/src/index.html?part=${PART}`);
  await page.waitForFunction(() => window.ready);
  await page.evaluate(() => window.ready);
  return page;
}
const grab = (page, t) => page.evaluate(t => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, t);
const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
if (mode === 'stills') {
  const out = path.join(root, PART === '1' ? 'output/stills' : `output/stills${PART}`); fs.mkdirSync(out, { recursive: true });
  const page = await openPage(browser);
  for (const ts of process.argv.slice(3)) { const t = parseFloat(ts); const t0 = Date.now(); const d = await grab(page, t); fs.writeFileSync(path.join(out, `t${t.toFixed(2)}.png`), Buffer.from(d.split(',')[1], 'base64')); console.log('still', t, Date.now() - t0, 'ms'); }
} else if (mode === 'cues') {
  const page = await openPage(browser);
  const cues = await page.evaluate(() => window.CUES);
  fs.writeFileSync(path.join(here, PART === '1' ? 'cues.json' : `cues${PART}.json`), JSON.stringify(cues, null, 0)); console.log(cues.length, 'cues');
} else if (mode === 'frames') {
  const out = process.argv[3]; const nw = parseInt(process.argv[4] || '2'); fs.mkdirSync(out, { recursive: true });
  const from = parseInt(process.argv[5] || '0'); let N = parseInt(process.argv[6] || '0'); const t0 = Date.now();
  let next = from;
  await Promise.all([...Array(nw)].map(async () => {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    const page = await openPage(ctx);
    if (!N) N = Math.round((await page.evaluate(() => window.DUR || 60)) * FPS);   // part length comes from the scenario
    while (true) { const i = next++; if (i >= N) break; const f = path.join(out, `f${String(i).padStart(4, '0')}.png`); if (fs.existsSync(f)) continue; const d = await grab(page, i / FPS); fs.writeFileSync(f + '.tmp', Buffer.from(d.split(',')[1], 'base64')); fs.renameSync(f + '.tmp', f); if (i % 30 === 0) console.log(`frame ${i}/${N} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  }));
}
await browser.close(); server.close();
