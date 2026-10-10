// 60-second cut, no voice-over: the story is told by on-screen text and the score.
// Scene boundaries sit on 2-second bars (120 BPM) so cuts land on downbeats.
'use strict';

// ===================================================================
// HOOK 0 – 3.85
// ===================================================================
function sceneHook(t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const rise = eOutExpo(prog(t, 0.0, 1.1));
  const sh = prog(t, 3.45, 3.85); const she = eInExpo(sh);
  const glowA = (0.4 + 0.6 * rise) * (1 - she);
  const g = ctx.createRadialGradient(CX, 1220, 50, CX, 1220, 760); g.addColorStop(0, oa(0.55 * glowA)); g.addColorStop(0.5, oa(0.16 * glowA)); g.addColorStop(1, oa(0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  board({ hy: 1380, f: 900, camH: 380, cell: 120, zNear: 160, zFar: 2600, cols: 14, fillA: '#fff', alpha: 0.10 * rise * (1 - she), scroll: t * 30, clipTop: 1380 });
  board({ hy: 1380, f: 900, camH: 380, cell: 120, zNear: 160, zFar: 2600, cols: 14, line: oa(0.6), lw: 2, alpha: 0.5 * rise * (1 - she), scroll: t * 30, clipTop: 1380 });
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(CX, 1150); ctx.rotate(t * 0.08);
  for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI * 2 / 14); ctx.fillStyle = oa(0.05 * rise * (1 - she)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -1300); ctx.lineTo(40, -1300); ctx.fill(); }
  ctx.restore();
  const baseY = lerp(1950, 1640, rise);
  let s = 1.12 * (1 + 0.03 * prog(t, 0.5, 3.4)), qy = baseY;
  if (sh > 0) { s = lerp(s, 0.004, she); qy = lerp(baseY, 920, she); }
  drawPiece(ctx, 'queen', CX, qy, s, { fill: 'black', rimL: 1, rimR: 0.55, glow: 0.35 });
  if (sh > 0.85) { ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(CX, 920, 8, 0, 6.283); ctx.fill(); }
  const out = 3.35;
  kText(t, 0.25, '1500 РОКІВ', CX, 450, { size: fitSize('1500 РОКІВ', 960, 150), style: 'slam', from: 2.2, dur: 0.45, out, outMove: 80 });
  plashka(t, 0.95, 'ІСТОРІЇ ШАХІВ', CX, 610, { size: fitSize('ІСТОРІЇ ШАХІВ', 880, 86), dur: 0.45, out, rot: -2 });
  kText(t, 1.6, 'ЗА 60 СЕКУНД', CX, 760, { size: 76, style: 'up', dur: 0.5, out, outMove: 60 });
  embers(t, 0.6 * (1 - she), 0.9);
}

// ===================================================================
// INDIA 3.85 – 12.07
// ===================================================================
function sceneIndia(t) {
  const lt = t - 3.85;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const intro = eOutExpo(prog(t, 3.87, 4.7));
  const z = 1 + 0.12 * prog(t, 3.85, 12.1);
  const camX = Math.sin(lt * 0.4) * 10;
  const HY = 1250;
  const layer = (depth, fn, rise = 260) => { ctx.save(); const zz = 1 + (z - 1) * depth; ctx.translate(CX + camX * depth, 960 + (1 - intro) * rise * depth); ctx.scale(zz, zz); ctx.translate(-CX, -960); fn(); ctx.restore(); };
  layer(0.2, () => {
    const g = ctx.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, oa(0)); g.addColorStop(0.45, oa(0.12)); g.addColorStop(0.85, oa(0.5)); g.addColorStop(1, oa(0.75));
    ctx.fillStyle = g; ctx.fillRect(-200, -300, W + 400, HY + 300);
  }, 0);
  const sp = eOutExpo(prog(t, 3.85, 4.5));
  const sr = lerp(8, SUN.r, sp);
  layer(0.25, () => {
    sunGlow(SUN.x, SUN.y, sr, 0.5 + 0.5 * sp);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(SUN.x, SUN.y); ctx.rotate(lt * 0.05);
    for (let i = 0; i < 18; i++) { ctx.rotate(Math.PI * 2 / 18); ctx.fillStyle = oa(0.05 * sp); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -1400); ctx.lineTo(30, -1400); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(SUN.x, SUN.y, sr, 0, 6.283); ctx.fill();
    const hg = ctx.createRadialGradient(SUN.x - sr * 0.25, SUN.y - sr * 0.3, 0, SUN.x, SUN.y, sr); hg.addColorStop(0, wa(0.32)); hg.addColorStop(0.6, wa(0.05)); hg.addColorStop(1, wa(0));
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(SUN.x, SUN.y, sr, 0, 6.283); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(SUN.x, SUN.y, sr, 0, 6.283); ctx.clip(); ctx.fillStyle = ba(0.55);
    for (let i = 0; i < 5; i++) { const yy = SUN.y + sr * 0.45 + i * 30 + ((lt * 12) % 30); ctx.fillRect(SUN.x - sr, yy, sr * 2, 4 + i * 2.5); }
    ctx.restore();
  }, 0);
  layer(0.4, () => { ctx.fillStyle = '#000'; for (let i = 0; i < 5; i++) { const bx = 1180 - ((lt * 70 + i * 120) % 1500), by = 560 + i * 40 + Math.sin(lt + i) * 18; bird(bx, by, 0.8 + (i % 2) * 0.3, lt * 9 + i * 2); } });
  layer(0.35, () => {
    ridge(HY - 70, 170, 2, 0.004, 'rgba(0,0,0,0.38)');
    stupa(180, HY - 150, 0.7, 'rgba(0,0,0,0.5)'); stupa(900, HY - 160, 0.55, 'rgba(0,0,0,0.5)');
    ridge(HY - 10, 110, 5, 0.006, 'rgba(0,0,0,0.62)');
  });
  layer(0.6, () => { ctx.save(); ctx.translate(CX, HY + 4); ctx.scale(0.86, 0.86); temple(lt); ctx.restore(); });
  layer(0.8, () => {
    ctx.fillStyle = '#000'; ctx.fillRect(-300, HY, W + 600, H);
    board({ hy: HY, f: 900, camH: 200, cell: 80, zNear: 140, zFar: 2400, cols: 26, fillA: ORANGE, alpha: 0.10, scroll: lt * 40, clipTop: HY });
    board({ hy: HY, f: 900, camH: 200, cell: 80, zNear: 140, zFar: 2400, cols: 26, line: ORANGE, lw: 2.5, alpha: 0.85, scroll: lt * 40, clipTop: HY });
    const hz = ctx.createLinearGradient(0, HY - 40, 0, HY + 60); hz.addColorStop(0, oa(0)); hz.addColorStop(0.5, oa(0.45)); hz.addColorStop(1, oa(0)); ctx.fillStyle = hz; ctx.fillRect(-300, HY - 40, W + 600, 100);
  });
  layer(1.0, () => {
    palm(70, HY + 40, 560, lt, 0.12, 0); palm(200, HY + 30, 380, lt, -0.08, 1.3);
    palm(1010, HY + 40, 600, lt, -0.14, 2.1); palm(880, HY + 25, 340, lt, 0.1, 3.7);
    elephant(lerp(1020, 690, prog(t, 3.85, 12.1)), HY + 38, 0.62, lt);
  });
  dust(lt, oa(0.9), 60, 21);
  embers(t, 0.35, 0.7);
  const tg = ctx.createLinearGradient(0, 0, 0, 640); tg.addColorStop(0, ba(0.7)); tg.addColorStop(1, ba(0)); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 640);
  const bg = ctx.createLinearGradient(0, 1260, 0, 1700); bg.addColorStop(0, ba(0)); bg.addColorStop(0.4, ba(0.6 * prog(t, 6.8, 7.2))); bg.addColorStop(1, ba(0.6 * prog(t, 6.8, 7.2))); ctx.fillStyle = bg; ctx.fillRect(0, 1260, W, 440);
  const out = 11.6;
  plashka(t, 4.15, 'VI СТОЛІТТЯ', CX, 270, { size: 38, fam: 'Montserrat', weight: 800, ls: 6, out });
  kText(t, 4.25, 'ІНДІЯ', CX, 410, { size: 170, style: 'letters', stagger: 0.06, dur: 0.6, out });
  kText(t, 5.1, 'тут народилися шахи', CX, 525, { size: 44, weight: 500, fam: 'Montserrat', style: 'fade', dur: 0.5, out, alpha: 0.9 });
  kText(t, 7.0, 'ЧАТУРАНГА', CX, 1345, { size: fitSize('ЧАТУРАНГА', 960, 116), style: 'letters', color: ORANGE, stagger: 0.04, dur: 0.5, out });
  kText(t, 7.5, '«чотири роди війська»', CX, 1432, { size: 42, weight: 500, fam: 'Montserrat', style: 'fade', dur: 0.4, out, alpha: 0.9 });
  const chips = ['ПІХОТА', 'КІННОТА', 'СЛОНИ', 'КОЛІСНИЦІ'];
  ctx.save(); setText(ctx, 27, 800, 'Montserrat', 2);
  const ws = chips.map(c => ctx.measureText(c).width + 40); const tot = ws.reduce((a, b) => a + b, 0) + 14 * 3; let x = CX - tot / 2;
  ctx.restore();
  chips.forEach((c, i) => {
    const t0 = 8.0 + i * 0.25; const p = eOutBack(prog(t, t0, t0 + 0.35)); const o = 1 - prog(t, out, out + 0.3);
    if (p > 0 && o > 0) {
      ctx.save(); ctx.globalAlpha = clamp(p) * o; const w = ws[i];
      ctx.translate(x + w / 2, 1510); ctx.scale(p, p);
      ctx.fillStyle = ba(0.6); ctx.strokeStyle = ORANGE; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-w / 2, -28, w, 56, 28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; setText(ctx, 27, 800, 'Montserrat', 2); ctx.textAlign = 'center'; ctx.fillText(c, 0, 2); ctx.restore();
    }
    x += ws[i] + 14;
  });
  kText(t, 9.6, 'з цих загонів і виросли шахові фігури', CX, 1600, { size: 34, weight: 500, fam: 'Montserrat', style: 'fade', dur: 0.4, out, alpha: 0.75 });
}

// ===================================================================
// PERSIA 12.07 – 22.0
// ===================================================================
function scenePersia(t) {
  const lt = t - 12.0;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const HY = 1330;
  const zin = eInExpo(prog(t, 21.45, 21.95));
  const z = (1 + 0.07 * prog(t, 12, 21.4)) * (1 + zin * 14);
  const intro = eOutExpo(prog(t, 12.0, 12.9));
  const focusY = HY - 0.76 * 190;
  const layer = (depth, fn) => { ctx.save(); const zz = 1 + (z - 1) * depth; const fy = lerp(960, focusY, zin); ctx.translate(CX, fy + (1 - intro) * 120 * depth); ctx.scale(zz * lerp(1.08, 1, intro), zz * lerp(1.08, 1, intro)); ctx.translate(-CX, -fy); fn(); ctx.restore(); };
  layer(0.1, () => {
    const g = ctx.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, oa(0)); g.addColorStop(0.6, oa(0.06)); g.addColorStop(0.9, oa(0.3)); g.addColorStop(1, oa(0.55)); ctx.fillStyle = g; ctx.fillRect(-200, -300, W + 400, HY + 300);
    const r = mulberry(5); for (let i = 0; i < 140; i++) { const x = r() * W, y = r() * HY * 0.8, s = r() * 2 + 0.6, ph = r() * 6; ctx.fillStyle = wa(0.25 + 0.6 * Math.abs(Math.sin(lt * 1.5 + ph))); ctx.fillRect(x, y, s, s); }
    ctx.save(); ctx.translate(CX, 860); ctx.rotate(lt * 0.06);
    for (let k = 0; k < 3; k++) star8(0, 0, 360 + k * 130, 2.5, oa(0.16 - k * 0.04));
    ctx.restore();
    sunGlow(CX, HY - 380, 260, 0.75);
  });
  layer(0.2, () => moonCrescent(880, 640, 58, -2.4));
  layer(0.3, () => { ridge(HY - 20, 90, 8, 0.003, 'rgba(0,0,0,0.5)'); });
  layer(0.6, () => { ctx.save(); ctx.translate(CX, HY); ctx.scale(0.76, 0.76); persianBuilding(lt); ctx.restore(); });
  layer(0.8, () => {
    ctx.fillStyle = '#000'; ctx.fillRect(-300, HY, W + 600, H);
    board({ hy: HY, f: 900, camH: 240, cell: 95, zNear: 130, zFar: 2400, cols: 22, fillA: '#fff', alpha: 0.09, scroll: lt * 25, clipTop: HY });
    board({ hy: HY, f: 900, camH: 240, cell: 95, zNear: 130, zFar: 2400, cols: 22, line: oa(0.7), lw: 1.5, alpha: 0.35, scroll: lt * 25, clipTop: HY });
    const hz = ctx.createLinearGradient(0, HY - 30, 0, HY + 50); hz.addColorStop(0, oa(0)); hz.addColorStop(0.5, oa(0.4)); hz.addColorStop(1, oa(0)); ctx.fillStyle = hz; ctx.fillRect(-300, HY - 30, W + 600, 80);
  });
  layer(1.0, () => {
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-100, HY + 90); ctx.bezierCurveTo(200, HY - 20, 380, HY - 10, 620, HY + 60); ctx.bezierCurveTo(800, HY + 110, 980, HY + 30, 1200, HY + 50); ctx.lineTo(1200, HY + 200); ctx.lineTo(-100, HY + 200); ctx.fill();
    const cx0 = lerp(40, 460, prog(t, 12, 22));
    for (let i = 0; i < 4; i++) { const x = cx0 - i * 95; const y = HY + 30 - Math.max(0, 20 - Math.abs(x - 300) * 0.05); camel(x, y + 18, 0.36, lt, i * 1.3); }
  });
  dust(lt, wa(0.5), 70, 33, 1);
  embers(t, 0.25, 0.6);
  const tg = ctx.createLinearGradient(0, 0, 0, 560); tg.addColorStop(0, ba(0.75)); tg.addColorStop(1, ba(0)); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 560);

  plashka(t, 12.2, 'VII СТОЛІТТЯ', CX, 270, { size: 38, fam: 'Montserrat', weight: 800, ls: 6, out: 15.7 });
  kText(t, 12.3, 'ПЕРСІЯ', CX, 400, { size: 160, style: 'letters', stagger: 0.06, dur: 0.6, out: 15.7 });
  kText(t, 13.5, 'ШАТРАНДЖ', CX, 1450, { size: fitSize('ШАТРАНДЖ', 940, 120), style: 'slam', from: 1.5, color: ORANGE, dur: 0.45, out: 15.7 });
  kText(t, 13.9, 'так перси назвали гру', CX, 1545, { size: 42, weight: 500, fam: 'Montserrat', style: 'fade', alpha: 0.9, out: 15.7 });

  const dk = prog(t, 15.8, 16.0) * (1 - prog(t, 18.2, 18.4));
  const dk2 = prog(t, 18.25, 18.5) * (1 - prog(t, 21.2, 21.42));
  ctx.fillStyle = ba(0.62 * dk + 0.78 * dk2); ctx.fillRect(0, 0, W, H);
  kText(t, 15.95, 'перси подарували нам слова', CX, 600, { size: 42, weight: 500, fam: 'Montserrat', style: 'fade', dur: 0.3, out: 18.2, outDur: 0.2, alpha: 0.9 });
  kText(t, 16.0, 'ШАХ', CX, 790, { size: 270, style: 'slam', from: 2.6, dur: 0.4, out: 18.2, outDur: 0.2 });
  kText(t, 16.5, 'МАТ', CX, 1060, { size: 270, style: 'slam', from: 2.6, color: ORANGE, dur: 0.4, out: 18.2, outDur: 0.2 });
  kText(t, 16.95, '«король переможений»', CX, 1240, { size: 46, weight: 700, fam: 'Montserrat', style: 'fade', dur: 0.3, out: 18.2, outDur: 0.2 });
  if (dk2 > 0) ferzDemo(t, dk2);
}
function ferzDemo(t, a) {
  const S = 210, bx = CX - S * 1.5, by = 975 - S * 1.5;
  const pin = eOutBack(prog(t, 18.25, 18.7), 1.2);
  const out = 21.2;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(CX, 975); ctx.scale(lerp(0.85, 1, pin), lerp(0.85, 1, pin)); ctx.translate(-CX, -975);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { ctx.fillStyle = (r + c) % 2 === 0 ? wa(0.16) : ba(0.9); ctx.fillRect(bx + c * S, by + r * S, S, S); }
  const diag = [[0, 0], [2, 0], [2, 2], [0, 2]];
  diag.forEach(([c, r], i) => {
    const t0 = 19.3 + i * 0.2; const p = eOutBack(prog(t, t0, t0 + 0.3)); if (p <= 0) return;
    const pulse = 0.75 + 0.25 * Math.sin((t - t0) * 8);
    ctx.save(); ctx.translate(bx + c * S + S / 2, by + r * S + S / 2); ctx.scale(p, p);
    ctx.fillStyle = oa(0.85 * pulse); ctx.fillRect(-S / 2 + 6, -S / 2 + 6, S - 12, S - 12);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 6.283); ctx.fill(); ctx.restore();
    const ap = eOutExpo(prog(t, t0, t0 + 0.35)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const sx = CX, sy = 975, ex = bx + c * S + S / 2, ey = by + r * S + S / 2;
    ctx.beginPath(); ctx.moveTo(lerp(sx, ex, 0.3), lerp(sy, ey, 0.3)); ctx.lineTo(lerp(sx, ex, lerp(0.3, 0.72, ap)), lerp(sy, ey, lerp(0.3, 0.72, ap))); ctx.stroke();
  });
  ctx.strokeStyle = wa(0.5); ctx.lineWidth = 3; ctx.strokeRect(bx, by, S * 3, S * 3);
  const drop = eOutBack(prog(t, 18.5, 18.85), 1.6);
  const hop = eInOutCubic(prog(t, 20.55, 20.9));
  const px = lerp(CX, bx + 2 * S + S / 2, hop), py = lerp(975, by + S / 2, hop) + 80 - Math.sin(hop * Math.PI) * 90 - (1 - drop) * 300;
  if (drop > 0) drawPiece(ctx, 'queen', px, py, 0.32, { fill: 'white', rimL: 0.9, glow: 0.4, alpha: clamp(drop * 3) });
  ctx.restore();
  kText(t, 18.35, 'ФЕРЗЬ', CX, 520, { size: 130, style: 'up', dur: 0.5, out, outDur: 0.2, alpha: a });
  kText(t, 18.55, 'тоді — радник шаха', CX, 620, { size: 40, weight: 500, fam: 'Montserrat', style: 'fade', alpha: 0.9 * a, out, outDur: 0.2 });
  kText(t, 19.1, 'ХОДИВ ЛИШЕ НА', CX, 1395, { size: 56, style: 'up', dur: 0.45, out, outDur: 0.2, alpha: a });
  plashka(t, 20.0, '1 КЛІТИНКУ', CX, 1495, { size: 70, dur: 0.4, out, outDur: 0.2, rot: -2 });
}

// ===================================================================
// ROUTE MAP 22.0 – 28.0
// ===================================================================
const ROUTE = [
  { x: 770, y: 2620, name: 'ІНДІЯ', sub: 'VI ст. · чатуранга', t: 22.35, side: -1 },
  { x: 350, y: 2080, name: 'ПЕРСІЯ', sub: 'VII ст. · шатрандж', t: 23.05, side: 1 },
  { x: 740, y: 1540, name: 'БАГДАД', sub: 'IX ст. · перші майстри і книги', t: 23.75, side: -1 },
  { x: 330, y: 1000, name: 'КОРДОВА', sub: 'X ст. · мусульманська Іспанія', t: 24.45, side: 1 },
  { x: 700, y: 460, name: 'ЄВРОПА', sub: 'XI ст. · гра королів', t: 25.15, side: -1 },
];
const ROUTE_PTS = (() => {
  const P = ROUTE.map(n => [n.x, n.y]); const out = []; const segIdx = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 60; k++) {
      const u = k / 60, u2 = u * u, u3 = u2 * u;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); segIdx.push(i + u);
    }
  }
  out.push(P[P.length - 1]); segIdx.push(P.length - 1);
  return { pts: out, seg: segIdx };
})();
function routePen(t) { // returns fractional segment position 0..4
  if (t <= ROUTE[0].t) return 0;
  for (let i = 0; i < ROUTE.length - 1; i++) if (t < ROUTE[i + 1].t) return i + eInOutCubic(prog(t, ROUTE[i].t, ROUTE[i + 1].t));
  return ROUTE.length - 1;
}
function sceneRoute(t) {
  const lt = t - 22;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const pen = routePen(t);
  const nPts = ROUTE_PTS.pts.length; const idx = Math.min(nPts - 1, Math.floor(pen / (ROUTE.length - 1) * (nPts - 1)));
  const head = ROUTE_PTS.pts[idx];
  const zo = eInOutCubic(prog(t, 25.25, 25.95));
  const zoom = lerp(1.0, 0.6, zo);
  const followY = clamp(head[1], 900, 2300);
  const camY = lerp(followY, 1540, zo);
  const camX = lerp(540, 540, zo);
  const fact = prog(t, 25.85, 26.15) * (1 - prog(t, 27.7, 27.95));
  const S = (x, y) => [(x - camX) * zoom + 540, (y - camY) * zoom + 960];
  // background: radial glow + dot matrix
  const g = ctx.createRadialGradient(540, 960, 100, 540, 960, 1200); g.addColorStop(0, oa(0.14)); g.addColorStop(1, oa(0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = wa(0.17);
  const sp = 40 * zoom, offY = ((-camY * zoom) % sp + sp) % sp;
  for (let y = offY; y < H; y += sp) for (let x = (540 % sp); x < W; x += sp) { const n = vnoise(x * 0.004 + 3, 1) * vnoise((y + camY * zoom) * 0.003, 2); if (n > 0.18) ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
  // compass circles
  ctx.save(); ctx.strokeStyle = wa(0.06); ctx.lineWidth = 2; const [ccx, ccy] = S(540, 1540);
  for (let r = 1; r <= 4; r++) { ctx.beginPath(); ctx.arc(ccx, ccy, r * 300 * zoom, 0, 6.283); ctx.stroke(); }
  ctx.translate(ccx, ccy); ctx.rotate(lt * 0.05); star8(0, 0, 1000 * zoom, 2, oa(0.08)); ctx.restore();
  // future path (preview)
  ctx.save(); ctx.setLineDash([4, 16]); ctx.strokeStyle = wa(0.22); ctx.lineWidth = 3; ctx.beginPath();
  ROUTE_PTS.pts.forEach((p, i) => { const q = S(...p); i ? ctx.lineTo(...q) : ctx.moveTo(...q); }); ctx.stroke(); ctx.restore();
  // drawn path
  if (t > ROUTE[0].t) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = ORANGE; ctx.shadowBlur = 25; ctx.strokeStyle = ORANGE; ctx.lineWidth = 9; ctx.beginPath();
    for (let i = 0; i <= idx; i++) { const q = S(...ROUTE_PTS.pts[i]); i ? ctx.lineTo(...q) : ctx.moveTo(...q); } ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = wa(0.85); ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  }
  // nodes
  ROUTE.forEach((n, i) => {
    const p = prog(t, n.t - 0.05, n.t + 0.35); if (p <= 0) return;
    const [x, y] = S(n.x, n.y); const e = eOutBack(p, 2);
    const ring = prog(t, n.t, n.t + 0.9);
    if (ring < 1) { ctx.strokeStyle = oa(0.9 * (1 - ring)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, (20 + ring * 110) * zoom, 0, 6.283); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(x, y, 0, x, y, 70 * zoom); gg.addColorStop(0, oa(0.7)); gg.addColorStop(1, oa(0)); ctx.fillStyle = gg; ctx.fillRect(x - 70 * zoom, y - 70 * zoom, 140 * zoom, 140 * zoom); ctx.restore();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(x, y, 20 * zoom * e, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 8 * zoom * e, 0, 6.283); ctx.fill();
    // label
    const lp = eOutExpo(prog(t, n.t + 0.05, n.t + 0.5));
    ctx.save(); ctx.globalAlpha = lp * (1 - 0.7 * fact); ctx.textAlign = n.side < 0 ? 'right' : 'left';
    const lx = x + n.side * (48 * zoom + (1 - lp) * 40);
    setText(ctx, 64 * zoom, 900, 'Unbounded'); ctx.fillStyle = '#fff'; ctx.fillText(n.name, lx, y - 14 * zoom);
    setText(ctx, 32 * zoom, 700, 'Montserrat'); ctx.fillStyle = ORANGE; ctx.fillText(n.sub, lx, y + 46 * zoom);
    ctx.restore();
  });
  // pen head
  if (t > ROUTE[0].t - 0.1 && t < 25.3) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const [hx, hy] = S(...head);
    const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 60); hg.addColorStop(0, wa(0.9)); hg.addColorStop(0.3, oa(0.7)); hg.addColorStop(1, oa(0)); ctx.fillStyle = hg; ctx.fillRect(hx - 60, hy - 60, 120, 120); ctx.restore();
  }
  embers(t, 0.3, 0.6);
  // title
  const tg = ctx.createLinearGradient(0, 0, 0, 560); tg.addColorStop(0, ba(0.9)); tg.addColorStop(1, ba(0)); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 560);
  plashka(t, 22.15, 'VI – XI СТОЛІТТЯ', CX, 260, { size: 36, fam: 'Montserrat', weight: 800, ls: 6, out: 25.2 });
  kText(t, 22.2, 'ШЛЯХ ШАХІВ', CX, 380, { size: fitSize('ШЛЯХ ШАХІВ', 940, 120), style: 'letters', stagger: 0.05, dur: 0.6, out: 25.2 });
  // fun fact card
  if (fact > 0) {
    ctx.fillStyle = ba(0.72 * fact); ctx.fillRect(0, 0, W, H);
    plashka(t, 25.95, 'ЦІКАВИЙ ФАКТ', CX, 700, { size: 34, fam: 'Montserrat', weight: 800, ls: 6, out: 27.7, outDur: 0.2 });
    kText(t, 26.1, 'НАШ ШАХОВИЙ СЛОН', CX, 830, { size: fitSize('НАШ ШАХОВИЙ СЛОН', 960, 72), style: 'up', dur: 0.45, out: 27.7, outDur: 0.2 });
    plashka(t, 26.45, 'ПРИВІТ З ІНДІЇ', CX, 960, { size: fitSize('ПРИВІТ З ІНДІЇ', 860, 84), dur: 0.4, rot: -2, out: 27.7, outDur: 0.2 });
    kText(t, 26.85, '«філ» по-перськи й по-арабськи — це слон', CX, 1090, { size: 36, weight: 500, fam: 'Montserrat', style: 'fade', alpha: 0.9, out: 27.7, outDur: 0.2 });
    const bp = eOutBack(prog(t, 26.3, 26.75), 1.6);
    if (bp > 0) drawPiece(ctx, 'bishop', CX, 1520, 0.48 * bp, { fill: 'white', rimL: 0.9, glow: 0.6, alpha: clamp(bp) * (1 - prog(t, 27.7, 27.9)) });
  }
}

// ===================================================================
// EUROPE 28.0 – 38.0
// ===================================================================
function sceneEurope(t) {
  const lt = t - 28.0;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const HY = 1300;
  const intro = eOutExpo(prog(t, 28.0, 29.0));
  const climax = eInOutCubic(prog(t, 32.9, 33.6));
  const z = (1 + 0.06 * prog(t, 28, 33)) * lerp(1, 1.12, climax);
  const layer = (depth, fn) => { ctx.save(); const zz = (1 + (z - 1) * depth) * lerp(1.25, 1, intro); ctx.translate(CX, 960 + climax * 160 * depth); ctx.scale(zz, zz); ctx.translate(-CX, -960); fn(); ctx.restore(); };
  layer(0.15, () => {
    const g = ctx.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, wa(0)); g.addColorStop(0.7, wa(0.04)); g.addColorStop(1, oa(0.25)); ctx.fillStyle = g; ctx.fillRect(-200, -300, W + 400, HY + 300);
    const mx = CX, my = 820, mr = 270;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 2.6); gl.addColorStop(0, wa(0.18)); gl.addColorStop(1, wa(0)); ctx.fillStyle = gl; ctx.fillRect(mx - mr * 2.6, my - mr * 2.6, mr * 5.2, mr * 5.2); ctx.restore();
    ctx.fillStyle = wa(0.93); ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
    const r = mulberry(4); ctx.fillStyle = ba(0.07); for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = r() * mr * 0.8, cr = 10 + r() * 45; ctx.beginPath(); ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, cr, 0, 6.283); ctx.fill(); }
    const sh = ctx.createRadialGradient(mx - 80, my - 80, mr * 0.2, mx, my, mr); sh.addColorStop(0, ba(0)); sh.addColorStop(1, ba(0.18)); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
  });
  layer(0.25, () => {
    const r = mulberry(9);
    for (let i = 0; i < 9; i++) { const y = 460 + r() * 700, w = 300 + r() * 400, sp = 12 + r() * 25, x = ((r() * 1600 + lt * sp) % 1800) - 400; const dark = i % 3 !== 0;
      ctx.fillStyle = dark ? ba(0.55) : wa(0.05); for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(x + k * w / 6, y + Math.sin(k * 1.7) * 14, w / 5, 26 + (k % 3) * 9, 0, 0, 6.283); ctx.fill(); } }
  });
  layer(0.4, () => { ctx.fillStyle = '#000'; for (let i = 0; i < 6; i++) { const bx = -150 + ((lt * 90 + i * 70) % 1400), by = 700 + i * 35 + Math.sin(lt * 1.3 + i) * 20; bird(bx, by, 1.1 - i * 0.08, lt * 10 + i * 1.4); } });
  layer(0.35, () => { ridge(HY - 60, 150, 13, 0.005, 'rgba(0,0,0,0.6)'); });
  layer(0.6, () => { ctx.save(); ctx.translate(CX, HY - 40); ctx.scale(0.95, 0.95); castle(lt); ctx.restore(); });
  layer(0.7, () => { for (let i = 0; i < 4; i++) { const y = HY - 120 + i * 40; const x = ((lt * (20 + i * 8) + i * 300) % 1400) - 300; const g = ctx.createRadialGradient(x, y, 0, x, y, 420); g.addColorStop(0, wa(0.07)); g.addColorStop(1, wa(0)); ctx.fillStyle = g; ctx.fillRect(x - 420, y - 120, 840, 240); } });
  layer(0.85, () => {
    ctx.fillStyle = '#000'; ctx.fillRect(-300, HY, W + 600, H);
    board({ hy: HY, f: 900, camH: 260, cell: 100, zNear: 130, zFar: 2600, cols: 22, fillA: '#fff', alpha: 0.11 + 0.15 * climax, scroll: lt * 20, clipTop: HY });
  });
  const fl = Math.max(t >= 28.0 ? Math.exp(-(t - 28.0) * 9) : 0, t >= 28.2 ? Math.exp(-(t - 28.2) * 12) * 0.7 : 0);
  if (fl > 0.02) {
    ctx.save(); ctx.globalAlpha = fl; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.shadowColor = '#fff'; ctx.shadowBlur = 30;
    ctx.translate(200, 300); ctx.beginPath(); BOLT.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke(); ctx.restore();
    ctx.fillStyle = wa(fl * 0.75); ctx.fillRect(0, 0, W, H);
  }
  dust(lt, wa(0.4), 40, 44);
  const tg = ctx.createLinearGradient(0, 0, 0, 600); tg.addColorStop(0, ba(0.8)); tg.addColorStop(1, ba(0)); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 600);
  ctx.fillStyle = ba(0.6 * climax); ctx.fillRect(0, 0, W, H);
  plashka(t, 28.15, 'X – XV СТОЛІТТЯ', CX, 270, { size: 38, fam: 'Montserrat', weight: 800, ls: 6, out: 30.85 });
  kText(t, 28.25, 'ЄВРОПА', CX, 400, { size: 160, style: 'letters', stagger: 0.06, dur: 0.6, out: 30.85 });
  kText(t, 28.8, 'гра королів і лицарів', CX, 510, { size: 44, weight: 500, fam: 'Montserrat', style: 'fade', alpha: 0.9, out: 30.85 });
  const xv = prog(t, 31.0, 31.45); const xvOut = prog(t, 32.75, 33.0);
  if (xv > 0 && xvOut < 1) {
    ctx.save(); ctx.globalAlpha = 1 - xvOut; setText(ctx, 300, 900, 'Unbounded'); ctx.textAlign = 'center';
    const sc = lerp(1.4, 1, eOutExpo(xv)); ctx.translate(CX, 350 - xvOut * 40); ctx.scale(sc, sc);
    ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText('XV', 0, 0);
    const fw = eInOutCubic(prog(t, 31.25, 31.9)); ctx.save(); ctx.beginPath(); ctx.rect(-300, -200, 600 * fw, 400); ctx.clip(); ctx.fillStyle = ORANGE; ctx.fillText('XV', 0, 0); ctx.restore();
    ctx.restore();
  }
  kText(t, 31.3, 'СТОЛІТТЯ · ІСПАНІЯ', CX, 505, { size: 40, weight: 800, fam: 'Montserrat', ls: 10, style: 'up', out: 32.75, outDur: 0.25 });
  plashka(t, 31.7, 'правила раптово змінюються', CX, 585, { size: 36, weight: 600, fam: 'Montserrat', bg: '#000', color: '#fff', dur: 0.4, out: 32.75, outDur: 0.25 });
  if (climax > 0) {
    const qx = CX, qy = 1520;
    const rise = eOutExpo(prog(t, 32.95, 33.8));
    const burst = eOutExpo(prog(t, 33.6, 34.4));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(qx, qy - 330, 20, qx, qy - 330, 900); g.addColorStop(0, oa(0.75 * climax)); g.addColorStop(0.4, oa(0.2 * climax)); g.addColorStop(1, oa(0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (burst > 0) {
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4; const L = 1500 * burst; const wid = 10 + 26 * (1 - burst);
        ctx.save(); ctx.translate(qx, qy - 320); ctx.rotate(a);
        const lg = ctx.createLinearGradient(0, 0, L, 0); lg.addColorStop(0, oa(0.95)); lg.addColorStop(0.7, oa(0.4)); lg.addColorStop(1, oa(0));
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, -wid); ctx.lineTo(L, -2); ctx.lineTo(L, 2); ctx.lineTo(0, wid); ctx.fill();
        ctx.fillStyle = wa(0.6); ctx.fillRect(0, -1.5, L * 0.85, 3); ctx.restore();
      }
      const sw = prog(t, 33.6, 34.3); ctx.strokeStyle = wa(0.6 * (1 - sw)); ctx.lineWidth = 6 * (1 - sw) + 1; ctx.beginPath(); ctx.arc(qx, qy - 320, 50 + sw * 900, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
    const hover = Math.sin((t - 33.8) * 2.2) * 8 * prog(t, 33.8, 34.3);
    drawPiece(ctx, 'queen', qx, lerp(qy + 700, qy, rise) + hover, 1.0, { fill: 'white', rimL: 1, rimR: 0.6, glow: 0.9 * climax + 0.5 * burst, alpha: clamp(rise * 2) });
  }
  const o2 = 37.55;
  kText(t, 33.1, 'ФЕРЗЬ СТАВ', CX, 360, { size: 80, style: 'up', dur: 0.5, out: o2, outDur: 0.2 });
  plashka(t, 33.6, 'НАЙСИЛЬНІШОЮ', CX, 490, { size: fitSize('НАЙСИЛЬНІШОЮ', 920, 96), dur: 0.42, rot: -2, out: o2, outDur: 0.2 });
  kText(t, 34.2, 'ФІГУРОЮ', CX, 625, { size: 88, style: 'up', dur: 0.5, out: o2, outDur: 0.2 });
  kText(t, 35.1, 'з 1 клітинки — на всю дошку', CX, 730, { size: 42, weight: 700, fam: 'Montserrat', style: 'fade', out: o2, outDur: 0.2 });
  embers(t, climax ? 0.9 : 0.25, 0.9, climax ? { t: 33.6, x: CX, y: 1200 } : null);
}

// ===================================================================
// MODERN ERA 38.0 – 46.0 (tournaments, world champions, FIDE)
// ===================================================================
const YEARS = [{ t: 38.15, from: '1475', to: '1851' }, { t: 40.75, from: '1851', to: '1886' }, { t: 43.35, from: '1886', to: '1924' }];
function odometer(t, x, y, size) {
  let cur = YEARS[0].from, k = -1;
  for (let i = 0; i < YEARS.length; i++) if (t >= YEARS[i].t) k = i;
  setText(ctx, size, 900, 'Unbounded'); ctx.textAlign = 'center';
  const dw = ctx.measureText('0').width * 1.02; const n = 4; const x0 = x - dw * n / 2 + dw / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(x - dw * n / 2 - 20, y - size * 0.62, dw * n + 40, size * 1.24); ctx.clip();
  for (let d = 0; d < n; d++) {
    const Y = k < 0 ? YEARS[0] : YEARS[k];
    const a = Y.from[d], b = Y.to[d];
    const p = k < 0 ? 0 : eInOutCubic(prog(t, Y.t + d * 0.07, Y.t + d * 0.07 + 0.5));
    const cx = x0 + d * dw;
    if (a === b || p >= 1) { ctx.fillStyle = d >= 2 && p > 0 && a !== b ? ORANGE : '#fff'; ctx.fillText(p >= 1 ? b : a, cx, y); continue; }
    // roll through intermediate digits
    const da = +a, dbb = +b; const steps = ((dbb - da + 10) % 10) || 10; const pos = p * steps;
    for (let s = Math.floor(pos); s <= Math.floor(pos) + 1; s++) {
      const dig = (da + s) % 10; const off = (s - pos) * size * 1.1;
      ctx.fillStyle = '#fff'; ctx.fillText(String(dig), cx, y + off);
    }
  }
  ctx.restore();
}
function chessClock(t, cx, cy) {
  const k = YEARS.filter(Y => t >= Y.t).length; const pressLeft = k % 2 === 1;
  ctx.save(); ctx.translate(cx, cy);
  // glow
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, 0, 100, 0, 0, 520); g.addColorStop(0, oa(0.35)); g.addColorStop(1, oa(0)); ctx.fillStyle = g; ctx.fillRect(-520, -520, 1040, 1040); ctx.restore();
  // buttons
  for (const s of [-1, 1]) {
    const pressed = (s < 0) === pressLeft; const lastT = k > 0 ? YEARS[k - 1].t : -9; const anim = pressed ? eOutBack(prog(t, lastT, lastT + 0.15)) : 1 - eOutCubic(prog(t, lastT, lastT + 0.15));
    const dy = (pressed ? 1 : 0) * 14 * clamp(anim) * (k ? 1 : 0);
    ctx.fillStyle = '#000'; ctx.strokeStyle = ORANGE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(s * 160 - 50, -200 + dy, 100, 46, 10); ctx.fill(); ctx.stroke();
  }
  // body
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-330, 160); ctx.lineTo(330, 160); ctx.lineTo(290, -160); ctx.lineTo(-290, -160); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = ORANGE; ctx.lineWidth = 4; ctx.stroke();
  const bg = ctx.createLinearGradient(0, -160, 0, 160); bg.addColorStop(0, wa(0.08)); bg.addColorStop(1, wa(0)); ctx.fillStyle = bg; ctx.fill();
  // faces
  for (const s of [-1, 1]) {
    const fx = s * 155, R = 112;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fx, 0, R, 0, 6.283); ctx.fill();
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = '#000'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.lineWidth = i % 3 ? 3 : 6; ctx.beginPath(); ctx.moveTo(fx + Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78); ctx.lineTo(fx + Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); ctx.stroke(); }
    const running = (s < 0) !== pressLeft || k === 0;
    const spd = running ? 2.4 : 0.15; const base = s < 0 ? 0.3 : 1.7;
    const am = base + (t - 38) * spd; const ah = base * 0.3 + (t - 38) * spd / 12;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx + Math.sin(ah * 6.283) * R * 0.45, -Math.cos(ah * 6.283) * R * 0.45); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx + Math.sin(am * 6.283) * R * 0.72, -Math.cos(am * 6.283) * R * 0.72); ctx.stroke();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(fx, 0, 9, 0, 6.283); ctx.fill();
    // flag
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.moveTo(fx + 2, -R * 0.6); ctx.lineTo(fx + 26, -R * 0.68); ctx.lineTo(fx + 2, -R * 0.78); ctx.fill();
  }
  ctx.restore();
}
function sceneModern(t) {
  const lt = t - 38;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const intro = eOutExpo(prog(t, 38.0, 38.8));
  // spotlight
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const sg = ctx.createLinearGradient(0, 0, 0, 1500); sg.addColorStop(0, wa(0.16 * intro)); sg.addColorStop(1, wa(0.02 * intro));
  ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(400, -50); ctx.lineTo(680, -50); ctx.lineTo(1050, 1500); ctx.lineTo(30, 1500); ctx.fill();
  ctx.restore();
  board({ hy: 1400, f: 900, camH: 320, cell: 110, zNear: 140, zFar: 2600, cols: 18, fillA: '#fff', alpha: 0.12 * intro, scroll: lt * 25, clipTop: 1400 });
  board({ hy: 1400, f: 900, camH: 320, cell: 110, zNear: 140, zFar: 2600, cols: 18, line: oa(0.6), lw: 2, alpha: 0.4 * intro, scroll: lt * 25, clipTop: 1400 });
  dust(lt, wa(0.55), 80, 51);
  // two kings flank the clock
  drawPiece(ctx, 'king', 150, 1560, 0.5, { fill: 'white', rimL: 0.7, alpha: intro * 0.9 });
  drawPiece(ctx, 'king', 930, 1560, 0.5, { fill: 'black', rimR: 1, alpha: intro });
  ctx.save(); ctx.translate(CX, lerp(1500, 1180, intro)); ctx.scale(lerp(0.8, 1, intro), lerp(0.8, 1, intro)); chessClock(t, 0, 0); ctx.restore();
  embers(t, 0.25, 0.6);
  const tg = ctx.createLinearGradient(0, 0, 0, 820); tg.addColorStop(0, ba(0.85)); tg.addColorStop(1, ba(0)); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 820);
  // year
  const ya = prog(t, 38.05, 38.4) * (1 - prog(t, 45.55, 45.8));
  ctx.save(); ctx.globalAlpha = ya; odometer(t, CX, 400, 210); ctx.restore();
  const beats = [
    { t: 38.4, a: 'ЛОНДОН', b: 'перший міжнародний турнір' },
    { t: 41.0, a: 'ПЕРШИЙ ЧЕМПІОН СВІТУ', b: 'Вільгельм Стейніц' },
    { t: 43.6, a: 'ЗАСНОВАНО ФІДЕ', b: 'Міжнародна шахова федерація' },
  ];
  beats.forEach((B, i) => {
    const out = i < beats.length - 1 ? beats[i + 1].t - 0.35 : 45.55;
    plashka(t, B.t, B.a, CX, 585, { size: fitSize(B.a, 900, 62), dur: 0.42, rot: -1.5, out, outDur: 0.2 });
    kText(t, B.t + 0.3, B.b, CX, 690, { size: 44, weight: 600, fam: 'Montserrat', style: 'fade', dur: 0.35, out, outDur: 0.2 });
  });
}

// ===================================================================
// DIGITAL ERA 46.0 – 54.0
// ===================================================================
const RAIN = (() => { const r = mulberry(31); return [...Array(20)].map((_, i) => ({ x: 27 + i * 54, sp: 120 + r() * 260, off: r() * 2000, seed: Math.floor(r() * 1000) })); })();
const DOTS = (() => { const r = mulberry(41); const a = []; for (let y = 0; y < 17; y++) for (let x = 0; x < 15; x++) a.push({ x: 120 + x * 60 + (y % 2) * 30, y: 840 + y * 48, t: 50.6 + Math.pow(r(), 0.6) * 2.6, o: r() < 0.35 }); return a; })();
function glitchText(t, t0, str, x, y, size, color = '#fff') {
  const p = prog(t, t0, t0 + 0.4); if (p <= 0) return;
  setText(ctx, size, 900, 'Unbounded'); ctx.textAlign = 'center';
  const j = (1 - p) * 30; const r = Math.floor(t * 30);
  if (p < 1 && ctx.globalAlpha > 0.5) { ctx.fillStyle = oa(0.8); ctx.fillText(str, x - j + Math.sin(r) * 8, y); ctx.fillStyle = wa(0.5); ctx.fillText(str, x + j, y + Math.cos(r) * 6); }
  const ga = ctx.globalAlpha; ctx.fillStyle = color; ctx.globalAlpha = ga * clamp(p * 2); ctx.fillText(str, x, y); ctx.globalAlpha = ga;
}
function sceneDigital(t) {
  const lt = t - 46;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const today = prog(t, 50.3, 50.7);
  // binary rain
  ctx.save(); setText(ctx, 26, 700, 'Montserrat'); ctx.textAlign = 'center';
  RAIN.forEach(c => { const r = mulberry(c.seed); for (let k = 0; k < 40; k++) { const y = ((c.off + lt * c.sp + k * 34) % 2200) - 140; const a = 0.05 + 0.18 * (k / 40); ctx.fillStyle = k === 39 ? wa(0.5) : oa(a * (1 - 0.6 * today)); ctx.fillText(r() < 0.5 ? '0' : '1', c.x, y); } });
  ctx.restore();
  const g = ctx.createRadialGradient(CX, 1180, 60, CX, 1180, 800); g.addColorStop(0, oa(0.25)); g.addColorStop(1, oa(0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // board (Deep Blue era)
  const bA = prog(t, 46.1, 46.5) * (1 - today);
  if (bA > 0) {
    const S = 70, bx = CX - S * 4, by = 1180 - S * 4;
    ctx.save(); ctx.globalAlpha = bA;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const n = vnoise(lt * 3 + r * 7.3 + c * 3.1, r * 8 + c); const hot = n > 0.78;
      ctx.fillStyle = hot ? oa(0.75) : (r + c) % 2 ? wa(0.12) : ba(0.85); ctx.fillRect(bx + c * S, by + r * S, S - 2, S - 2);
    }
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 3; ctx.strokeRect(bx - 6, by - 6, S * 8 + 10, S * 8 + 10);
    const pcs = [['king', 6, 7, 'white'], ['queen', 3, 4, 'white'], ['rook', 0, 7, 'white'], ['knight', 5, 5, 'white'], ['king', 6, 0, 'black'], ['rook', 2, 0, 'black'], ['bishop', 4, 2, 'black'], ['pawn', 1, 3, 'black']];
    pcs.forEach(([ty, c, r, f]) => drawPiece(ctx, ty, bx + c * S + S / 2, by + r * S + S * 0.9, 0.105, { fill: f, rimL: f === 'black' ? 1 : 0.6 }));
    // scan line
    const sy = by + ((lt * 260) % (S * 8)); ctx.fillStyle = wa(0.5); ctx.fillRect(bx - 6, sy, S * 8 + 10, 2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createLinearGradient(0, sy - 60, 0, sy); lg.addColorStop(0, oa(0)); lg.addColorStop(1, oa(0.35)); ctx.fillStyle = lg; ctx.fillRect(bx - 6, sy - 60, S * 8 + 10, 60); ctx.restore();
    ctx.restore();
  }
  // "today": dots = players
  if (today > 0) {
    DOTS.forEach(d => {
      const p = eOutBack(prog(t, d.t, d.t + 0.3), 2.5); if (p <= 0) return;
      const pulse = 0.8 + 0.2 * Math.sin(t * 4 + d.x);
      ctx.fillStyle = d.o ? wa(0.9 * pulse) : oa(pulse); ctx.beginPath(); ctx.arc(d.x, d.y, 9 * p, 0, 6.283); ctx.fill();
    });
  }
  // scanlines
  ctx.fillStyle = ba(0.22); for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  const tg = ctx.createLinearGradient(0, 0, 0, 820); tg.addColorStop(0, ba(0.85)); tg.addColorStop(1, ba(0)); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 820);
  // texts
  const o1 = prog(t, 50.1, 50.3);
  ctx.save(); ctx.globalAlpha = 1 - o1; glitchText(t, 46.15, '1997', CX, 390, 210); ctx.restore();
  kText(t, 46.75, 'СУПЕРКОМП\'ЮТЕР DEEP BLUE', CX, 545, { size: fitSize('СУПЕРКОМП\'ЮТЕР DEEP BLUE', 960, 48), style: 'up', dur: 0.45, out: 50.1, outDur: 0.2 });
  plashka(t, 47.3, 'ОБІГРАВ ЧЕМПІОНА СВІТУ', CX, 645, { size: fitSize('ОБІГРАВ ЧЕМПІОНА СВІТУ', 920, 58), dur: 0.42, rot: -1.5, out: 50.1, outDur: 0.2 });
  kText(t, 47.9, 'Гаррі Каспарова', CX, 745, { size: 46, weight: 600, fam: 'Montserrat', style: 'fade', out: 50.1, outDur: 0.2 });
  ctx.save(); ctx.globalAlpha = 1 - prog(t, 53.55, 53.75); glitchText(t, 50.45, 'СЬОГОДНІ', CX, 390, fitSize('СЬОГОДНІ', 900, 150)); ctx.restore();
  plashka(t, 51.0, 'СОТНІ МІЛЬЙОНІВ', CX, 545, { size: fitSize('СОТНІ МІЛЬЙОНІВ', 920, 80), dur: 0.42, rot: -2, out: 53.55, outDur: 0.2 });
  kText(t, 51.6, 'людей по всьому світу грають у шахи', CX, 660, { size: 42, weight: 600, fam: 'Montserrat', style: 'fade', out: 53.55, outDur: 0.2 });
}
function glitch(amount, seed) {
  if (amount <= 0) return;
  const [c, x] = mk(W, H); x.drawImage(cv, 0, 0);
  const r = mulberry(seed);
  for (let i = 0; i < 14; i++) {
    const y = Math.floor(r() * H), h = Math.floor(20 + r() * 140), dx = (r() - 0.5) * 220 * amount;
    ctx.drawImage(c, 0, y, W, h, dx, y, W, h);
    if (r() < 0.35) { ctx.fillStyle = r() < 0.5 ? oa(0.5 * amount) : wa(0.35 * amount); ctx.fillRect(0, y, W, Math.max(2, h * 0.12)); }
  }
}

// ===================================================================
// CTA 54.0 – 60.0
// ===================================================================
function sceneCTA(t) {
  const lt = t - 54.0;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const pulse = 0.85 + 0.15 * Math.sin(lt * 3);
  const g = ctx.createRadialGradient(CX, 820, 60, CX, 820, 900); g.addColorStop(0, oa(0.5 * pulse)); g.addColorStop(0.45, oa(0.12)); g.addColorStop(1, oa(0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(CX, 820); ctx.rotate(lt * 0.1);
  for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI * 2 / 16); ctx.fillStyle = oa(0.045); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -1300); ctx.lineTo(40, -1300); ctx.fill(); }
  ctx.restore();
  board({ hy: 1500, f: 900, camH: 300, cell: 110, zNear: 150, zFar: 2400, cols: 16, fillA: '#fff', alpha: 0.08, scroll: lt * 30, clipTop: 1500 });
  board({ hy: 1500, f: 900, camH: 300, cell: 110, zNear: 150, zFar: 2400, cols: 16, line: oa(0.6), lw: 2, alpha: 0.35, scroll: lt * 30, clipTop: 1500 });
  embers(t, 0.7, 0.9, { t: 57.8, x: 540, y: 1330 });
  kText(t, 54.15, 'БІЛЬШЕ ІСТОРІЙ', CX, 285, { size: fitSize('БІЛЬШЕ ІСТОРІЙ', 940, 82), style: 'up', dur: 0.5 });
  plashka(t, 54.45, 'ПРО ШАХИ', CX, 400, { size: 74, dur: 0.45, rot: -2 });
  const ap = eOutBack(prog(t, 54.35, 54.9), 1.4);
  if (ap > 0 && avatar.complete) {
    const R = 215, ax = CX, ay = 760;
    ctx.save(); ctx.translate(ax, ay); ctx.scale(ap, ap);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const ag = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.7); ag.addColorStop(0, oa(0.5 * pulse)); ag.addColorStop(1, oa(0)); ctx.fillStyle = ag; ctx.fillRect(-R * 1.7, -R * 1.7, R * 3.4, R * 3.4); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.clip(); ctx.drawImage(avatar, -R, -R, R * 2, R * 2); ctx.restore();
    const ring = eInOutCubic(prog(t, 54.5, 55.2));
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R + 14, -Math.PI / 2, -Math.PI / 2 + ring * Math.PI * 2); ctx.stroke();
    ctx.rotate(lt * 0.35); ctx.setLineDash([3, 16]); ctx.strokeStyle = wa(0.5); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R + 40, 0, 6.283); ctx.stroke();
    ctx.restore();
  }
  kText(t, 55.25, '@daniil_chess', CX, 1060, { size: 64, weight: 800, fam: 'Montserrat', style: 'type', dur: 0.75 });
  kText(t, 56.1, '[ закохую людей в шахи ]', CX, 1140, { size: 38, weight: 500, fam: 'Montserrat', style: 'fade', alpha: 0.8, dur: 0.5 });
  const bp = eOutBack(prog(t, 57.0, 57.45), 2.0);
  if (bp > 0) {
    const tap = prog(t, 57.8, 58.05); const press = Math.sin(tap * Math.PI) * 0.07;
    const bw = 700, bh = 140, by = 1330;
    ctx.save(); ctx.translate(CX, by); ctx.scale(bp * (1 - press), bp * (1 - press));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = ORANGE; ctx.shadowBlur = 60 * pulse; ctx.fillStyle = oa(0.6); ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
    const sh = prog(t, 58.3, 58.8); if (sh > 0 && sh < 1) { ctx.save(); ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.clip(); const sx = lerp(-bw, bw, eInOutCubic(sh)); const sg = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0); sg.addColorStop(0, wa(0)); sg.addColorStop(0.5, wa(0.55)); sg.addColorStop(1, wa(0)); ctx.fillStyle = sg; ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.restore(); }
    setText(ctx, 50, 900, 'Unbounded', 1); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('ПІДПИСАТИСЯ', 0, 3);
    ctx.restore();
    if (t > 57.65) {
      const fx = CX + 255, fy = by + 30; const tp = prog(t, 57.65, 57.85);
      const fxx = lerp(fx + 140, fx, eOutCubic(tp)), fyy = lerp(fy + 220, fy, eOutCubic(tp));
      const fade = 1 - prog(t, 58.3, 58.6);
      ctx.fillStyle = wa(0.35 * fade); ctx.strokeStyle = wa(0.9 * fade); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(fxx, fyy, 34 * (1 - press * 2), 0, 6.283); ctx.fill(); ctx.stroke();
      const rp = prog(t, 57.85, 58.5); if (rp > 0 && rp < 1) { ctx.strokeStyle = wa(0.8 * (1 - rp)); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(fx, fy, 30 + rp * 160, 0, 6.283); ctx.stroke(); }
    }
  }
  kText(t, 58.6, 'історія шахів продовжується — з тобою', CX, 1500, { size: 34, weight: 500, fam: 'Montserrat', style: 'fade', alpha: 0.75, dur: 0.5 });
}

// ===================================================================
// master
// ===================================================================
function barWipe(t, t0) {
  [ORANGE, '#fff', '#000'].forEach((c, i) => {
    const p = eInOutCubic(prog(t, t0 + i * 0.06, t0 + i * 0.06 + 0.42)); if (p <= 0 || p >= 1) return;
    ctx.save(); ctx.translate(CX, 960); ctx.rotate(-0.33);
    const bw = 1700; const x = lerp(-2400, 2400, p);
    ctx.fillStyle = c; ctx.fillRect(x - bw / 2, -1600, bw, 3200); ctx.restore();
  });
}
const IMPACTS = [[0.25, 14], [0.95, 8], [3.85, 10], [13.5, 6], [16.0, 16], [16.5, 16], [22.35, 6], [25.95, 8], [28.0, 22], [31.0, 10], [33.6, 18], [38.15, 8], [40.75, 8], [43.35, 8], [46.15, 12], [50.45, 10], [54.0, 10], [57.0, 6]];
function shake(t) {
  let dx = 0, dy = 0;
  for (const [ti, a] of IMPACTS) { const d = t - ti; if (d >= 0 && d < 0.6) { const k = a * Math.exp(-d * 9); dx += Math.sin(d * 90 + ti) * k; dy += Math.cos(d * 77 + ti * 2) * k; } }
  return [dx, dy];
}
function renderFrame(t) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const [dx, dy] = shake(t);
  ctx.translate(dx, dy);
  if (t < 3.85) sceneHook(t);
  else if (t < 12.07) sceneIndia(t);
  else if (t < 22.0) scenePersia(t);
  else if (t < 28.0) sceneRoute(t);
  else if (t < 38.0) sceneEurope(t);
  else if (t < 46.0) sceneModern(t);
  else if (t < 54.0) sceneDigital(t);
  else sceneCTA(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  vignette(0.55);
  if (t > 11.7 && t < 12.4) barWipe(t, 11.75);                                   // India → Persia
  if (t > 21.8 && t < 22.0) { ctx.fillStyle = ba(prog(t, 21.8, 21.95)); ctx.fillRect(0, 0, W, H); }   // arch → map
  const rIn = 1 - prog(t, 22.0, 22.3); if (t >= 22 && rIn > 0) { ctx.fillStyle = ba(rIn); ctx.fillRect(0, 0, W, H); }
  if (t > 27.75 && t < 28.0) { ctx.fillStyle = ba(prog(t, 27.75, 27.95)); ctx.fillRect(0, 0, W, H); }   // map → lightning
  const wf = prog(t, 37.75, 38.0) * (1 - eOutCubic(prog(t, 38.0, 38.45))); if (wf > 0) { ctx.fillStyle = wa(wf); ctx.fillRect(0, 0, W, H); }  // Europe → modern
  if (t > 45.75 && t < 46.3) glitch(Math.sin(prog(t, 45.75, 46.3) * Math.PI), Math.floor(t * 30));            // modern → digital
  if (t > 50.3 && t < 50.55) glitch(Math.sin(prog(t, 50.3, 50.55) * Math.PI) * 0.7, Math.floor(t * 30) + 7);
  const wf2 = prog(t, 53.75, 54.0) * (1 - eOutCubic(prog(t, 54.0, 54.4))); if (wf2 > 0) { ctx.fillStyle = wa(wf2); ctx.fillRect(0, 0, W, H); }  // digital → CTA
  const of = 1 - prog(t, 0, 0.35); if (of > 0) { ctx.fillStyle = ba(of); ctx.fillRect(0, 0, W, H); }
  grain(t);
  ctx.restore();
}
window.renderFrame = renderFrame;
window.ready = (async () => {
  const SAMPLE = 'АБВІЇЄабвіїє XVI @_abc —«»[]1\'';
  await Promise.all([
    ...['900', '700', '400'].map(w => document.fonts.load(`${w} 100px "Unbounded"`, SAMPLE)),
    ...['500', '600', '700', '800', '900'].map(w => document.fonts.load(`${w} 100px "Montserrat"`, SAMPLE)),
    new Promise(r => { if (avatar.complete) r(); else avatar.onload = r; }),
  ]);
  buildPieces(); buildGrain();
  return true;
})();
