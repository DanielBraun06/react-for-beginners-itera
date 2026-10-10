// Usage: node render.mjs stills 1.5 4.2 ...   |   node render.mjs frames <outDir> [workers]
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url));
const TL = JSON.parse(fs.readFileSync(path.join(here, 'timeline.json'), 'utf8'));
const mode = process.argv[2];
async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.addInitScript(`window.TIMELINE=${JSON.stringify(TL)}`);
  await page.goto('file://' + path.join(here, 'index.html'));
  await page.evaluate(() => window.ready);
  return page;
}
const grab = (page, t) => page.evaluate(t => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, t);
const browser = await pw.chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] });
if (mode === 'stills') {
  const out = path.join(here, '../output/stills'); fs.mkdirSync(out, { recursive: true });
  const page = await openPage(browser);
  for (const ts of process.argv.slice(3)) { const t = parseFloat(ts); const d = await grab(page, t); fs.writeFileSync(path.join(out, `t${t.toFixed(2)}.png`), Buffer.from(d.split(',')[1], 'base64')); console.log('still', t); }
} else if (mode === 'frames') {
  const out = process.argv[3]; const nw = parseInt(process.argv[4] || '4'); fs.mkdirSync(out, { recursive: true });
  const N = Math.round(TL.duration * TL.fps); const t0 = Date.now();
  let next = 0;
  await Promise.all([...Array(nw)].map(async () => {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    const page = await openPage(ctx);
    while (true) { const i = next++; if (i >= N) break; const d = await grab(page, i / TL.fps); fs.writeFileSync(path.join(out, `f${String(i).padStart(4, '0')}.png`), Buffer.from(d.split(',')[1], 'base64')); if (i % 60 === 0) console.log(`frame ${i}/${N} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  }));
}
await browser.close();
