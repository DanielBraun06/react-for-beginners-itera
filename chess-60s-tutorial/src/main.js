// Compositor: 3D layer from world.js + 2D typography/FX from lib2d.js. window.renderFrame(t) is deterministic.
import { update, project, glowCanvas } from './world.js';
import { stateAt, TEXTS, CUES, B1 } from './script.js';

const [gb1, gbx1] = mk(W / 4, H / 4), [gb2, gbx2] = mk(W / 8, H / 8);
function addGlow(k) {
  gbx1.clearRect(0, 0, W / 4, H / 4); gbx1.filter = 'blur(5px)'; gbx1.drawImage(glowCanvas, 0, 0); gbx1.filter = 'none';
  gbx2.clearRect(0, 0, W / 8, H / 8); gbx2.filter = 'blur(9px)'; gbx2.drawImage(glowCanvas, 0, 0, W / 8, H / 8); gbx2.filter = 'none';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.85 * k; ctx.drawImage(gb1, 0, 0, W, H);
  ctx.globalAlpha = 0.7 * k; ctx.drawImage(gb2, 0, 0, W, H);
  ctx.restore();
}
const avatar = new Image(); avatar.src = '../assets/avatar.png';
const col = c => c === 'orange' ? ORANGE : (c || '#fff');

// camera-whip windows → directional blur amount
const WHIPS = [[3.25, 4.1], [9.55, 10.85], [13.45, 14.25], [18.5, 18.88], [22.0, 22.38], [25.5, 25.88], [29.0, 29.38], [32.5, 32.88], [37.0, 37.45], [43.4, 43.95], [51.9, 53.4]];
function whipBlur(t) { let b = 0; for (const [a, z] of WHIPS) { const u = prog(t, a, z); if (u > 0 && u < 1) b = Math.max(b, Math.pow(Math.sin(Math.PI * u), 2)); } return b; }

const IMPACTS = [];
for (const c of CUES) {
  if (c.type === 'slam') IMPACTS.push([c.t, c.big ? 20 : 9]);
  else if (c.type === 'mate') IMPACTS.push([c.t, 30]);
  else if (c.type === 'land' && c.hard) IMPACTS.push([c.t, 16]);
  else if (c.type === 'topple') IMPACTS.push([c.t + 0.62, 10]);
}
function shake(t) {
  let dx = 0, dy = 0;
  for (const [ti, a] of IMPACTS) { const d = t - ti; if (d >= 0 && d < 0.6) { const k = a * Math.exp(-d * 9); dx += Math.sin(d * 90 + ti) * k; dy += Math.cos(d * 77 + ti * 2) * k; } }
  return [dx, dy];
}

function bodyText(t, x) {
  const size = fitSize(x.str, 960, 50, 700, 'Montserrat');
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 18;
  kText(t, x.t, x.str, CX, x.y, { size, weight: 700, fam: 'Montserrat', style: 'up', dur: 0.45, out: x.out, outMove: 20, color: x.accent ? ORANGE : '#fff' });
  ctx.restore();
}
function drawTexts(t) {
  for (const x of TEXTS) {
    if (t < x.t || t > x.out + 0.4) continue;
    if (x.k === 'k') {
      const fam = 'Unbounded', size = fitSize(x.str, 960, x.size, 900, fam);
      const strike = TEXTS.find(s => s.k === 'strike' && s.str === x.str);
      const dim = strike ? 1 - 0.55 * prog(t, strike.t + 0.15, strike.t + 0.45) : 1;
      ctx.save();
      if (x.glow) { ctx.shadowColor = ORANGE; ctx.shadowBlur = 60; }
      else { ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 24; }
      kText(t, x.t, x.str, CX, x.y, { size, style: x.style, from: x.from, dur: x.style === 'slam' ? 0.42 : 0.5, out: x.out, outMove: 60, color: col(x.color), alpha: dim });
      ctx.restore();
    } else if (x.k === 'pl') {
      const size = fitSize(x.str, 900, x.size, 900, 'Unbounded');
      plashka(t, x.t, x.str, CX, x.y, { size, dur: 0.45, out: x.out, rot: x.rot || 0 });
    } else if (x.k === 'b') bodyText(t, x);
    else if (x.k === 'label') kText(t, x.t, x.str, CX, x.y, { size: x.size, weight: 800, fam: 'Montserrat', ls: 10, style: 'fade', dur: 0.4, out: x.out, color: ORANGE });
    else if (x.k === 'strike') {
      const size = fitSize(x.str, 960, x.size, 900, 'Unbounded'); setText(ctx, size, 900, 'Unbounded'); const w = ctx.measureText(x.str).width + 30;
      const p = eOutExpo(prog(t, x.t, x.t + 0.4)), out = prog(t, x.out, x.out + 0.3);
      if (p > 0 && out < 1) { ctx.save(); ctx.globalAlpha = 1 - eInCubic(out); ctx.translate(0, -eInCubic(out) * 60); ctx.fillStyle = ORANGE; ctx.translate(CX - w / 2, x.y); ctx.rotate(-0.03); ctx.fillRect(0, -6, w * p, 12); ctx.restore(); }
    }
  }
}
function topScrim(t) {
  let a = 0;
  for (const x of TEXTS) if (x.y < 800 && t > x.t - 0.3 && t < x.out + 0.4) a = Math.max(a, prog(t, x.t - 0.3, x.t) * (1 - prog(t, x.out, x.out + 0.4)));
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, 0, 0, 820);
  g.addColorStop(0, ba(0.85 * a)); g.addColorStop(0.65, ba(0.6 * a)); g.addColorStop(1, ba(0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 820);
}
function scrim(t) {
  let a = 0;
  for (const x of TEXTS) if ((x.k === 'b' || (x.k === 'pl' && x.y >= B1)) && t > x.t - 0.3 && t < x.out + 0.4) a = Math.max(a, prog(t, x.t - 0.3, x.t) * (1 - prog(t, x.out, x.out + 0.4)));
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, B1 - 170, 0, B1 + 260);
  g.addColorStop(0, ba(0)); g.addColorStop(0.35, ba(0.62 * a)); g.addColorStop(1, ba(0.8 * a));
  ctx.fillStyle = g; ctx.fillRect(0, B1 - 170, W, H);
}
function timer(t) {
  const ap = prog(t, 2.0, 2.4); if (ap <= 0) return;
  const s = Math.max(0, Math.floor(60 - t + 1e-6)), frac = (60 - t) - Math.floor(60 - t);
  const x = CX, y = 196, r = 40, sc = eOutBack(ap, 2.2) * (1 + 0.12 * Math.exp(-(1 - frac) * 14));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.fillStyle = ba(0.55); ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, 6.283); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = wa(0.16); ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = ORANGE; ctx.lineCap = 'round'; ctx.shadowColor = ORANGE; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.max(0.001, (60 - t) / 60)); ctx.stroke();
  ctx.shadowBlur = 0; setText(ctx, 30, 700, 'Unbounded'); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(String(s), 0, 2);
  ctx.restore();
}
function cta(t) {
  if (t < 52) return;
  // avatar
  const ap = eOutBack(prog(t, 54.3, 54.75), 1.8);
  const ax = CX, ay = 850, R = 165;
  if (ap > 0) {
    ctx.save(); ctx.translate(ax, ay); ctx.scale(ap, ap);
    const g = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 2.1); g.addColorStop(0, oa(0.45)); g.addColorStop(1, oa(0));
    ctx.fillStyle = g; ctx.fillRect(-R * 2.2, -R * 2.2, R * 4.4, R * 4.4);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.clip(); ctx.drawImage(avatar, -R, -R, R * 2, R * 2); ctx.restore();
    ctx.lineWidth = 8; ctx.strokeStyle = ORANGE; ctx.beginPath(); ctx.arc(0, 0, R + 10, 0, 6.283); ctx.stroke();
    ctx.rotate(t * 0.6); ctx.setLineDash([22, 18]); ctx.lineWidth = 3; ctx.strokeStyle = wa(0.55); ctx.beginPath(); ctx.arc(0, 0, R + 30, 0, 6.283); ctx.stroke();
    ctx.restore();
  }
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 20;
  kText(t, 55.0, '@daniil_chess', CX, 1110, { size: 58, weight: 700, style: 'type', dur: 0.75 });
  kText(t, 55.85, 'тут пояснюю шахи простою мовою', CX, 1188, { size: 36, weight: 600, fam: 'Montserrat', style: 'fade', alpha: 0.85, dur: 0.5 });
  ctx.restore();
  // button
  const bp = eOutBack(prog(t, 56.6, 57.05), 2.0);
  if (bp > 0) {
    const pulse = 0.6 + 0.4 * Math.sin(t * 6);
    const tap = prog(t, 57.45, 57.7); const press = Math.sin(tap * Math.PI) * 0.07;
    const bw = 720, bh = 140, by = 1345;
    ctx.save(); ctx.translate(CX, by); ctx.scale(bp * (1 - press), bp * (1 - press));
    ctx.save(); ctx.shadowColor = ORANGE; ctx.shadowBlur = 70 * pulse; ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
    for (const s0 of [57.9, 59.0]) { const sh = prog(t, s0, s0 + 0.55); if (sh > 0 && sh < 1) { ctx.save(); ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.clip(); const sx = lerp(-bw, bw, eInOutCubic(sh)); const sg = ctx.createLinearGradient(sx - 140, 0, sx + 140, 0); sg.addColorStop(0, wa(0)); sg.addColorStop(0.5, wa(0.6)); sg.addColorStop(1, wa(0)); ctx.fillStyle = sg; ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.restore(); } }
    setText(ctx, 50, 900, 'Unbounded', 1); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('ПІДПИСАТИСЯ', 0, 3);
    ctx.restore();
    if (t > 57.25) {
      const fx = CX + 255, fy = by + 30, tp = prog(t, 57.25, 57.45);
      const fxx = lerp(fx + 140, fx, eOutCubic(tp)), fyy = lerp(fy + 220, fy, eOutCubic(tp)), fade = 1 - prog(t, 57.9, 58.2);
      ctx.fillStyle = wa(0.35 * fade); ctx.strokeStyle = wa(0.9 * fade); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(fxx, fyy, 34 * (1 - press * 2), 0, 6.283); ctx.fill(); ctx.stroke();
      const rp = prog(t, 57.45, 58.1); if (rp > 0 && rp < 1) { ctx.strokeStyle = wa(0.8 * (1 - rp)); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(fx, fy, 30 + rp * 170, 0, 6.283); ctx.stroke(); }
    }
  }
}

function renderFrame(t) {
  const st = stateAt(t);
  const gl = update(st);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const [dx, dy] = shake(t), sk = (Math.abs(dx) + Math.abs(dy)) > 0.5 ? 1.03 : 1;
  const wb = whipBlur(t);
  ctx.save(); ctx.translate(CX + dx, 960 + dy); ctx.scale(sk, sk); ctx.translate(-CX, -960);
  if (wb > 0.02) ctx.filter = `blur(${(wb * 9).toFixed(2)}px)`;
  ctx.drawImage(gl, 0, 0);
  ctx.filter = 'none';
  addGlow(st.light.bloom ?? 1);
  ctx.restore();
  // section dimmer for CTA
  const dim = prog(t, 52.2, 53.6); if (dim > 0) { ctx.fillStyle = ba(0.5 * dim); ctx.fillRect(0, 0, W, H); }
  embers(t, t < 4 || (t > 46 && t < 52) ? 0.55 : 0.25, 0.7);
  scrim(t); topScrim(t);
  ctx.save(); ctx.translate(dx * 0.5, dy * 0.5);
  drawTexts(t); cta(t);
  ctx.restore();
  timer(t);
  // flashes
  const fl = (t0, k, c) => { const d = t - t0; if (d >= 0 && d < 0.5) { ctx.fillStyle = c === 'o' ? oa(k * Math.exp(-d * 9)) : wa(k * Math.exp(-d * 9)); ctx.fillRect(0, 0, W, H); } };
  fl(45.9, 0.75, 'w'); fl(46.05, 0.55, 'o'); fl(38.45, 0.25, 'o'); fl(0.3, 0.3, 'o');
  vignette(0.55);
  const fi = 1 - prog(t, 0, 0.15); if (fi > 0) { ctx.fillStyle = ba(fi); ctx.fillRect(0, 0, W, H); }
  grain(t);
  ctx.restore();
}
window.renderFrame = renderFrame;
window.CUES = CUES;
window.project = project;
window.ready = (async () => {
  const SAMPLE = 'АБВІЇЄабвіїє ×«»’@_abc1234567890!?:+';
  await Promise.all([
    ...['900', '700', '400'].map(w => document.fonts.load(`${w} 100px "Unbounded"`, SAMPLE)),
    ...['500', '600', '700', '800', '900'].map(w => document.fonts.load(`${w} 100px "Montserrat"`, SAMPLE)),
    new Promise(r => { if (avatar.complete) r(); else avatar.onload = r; }),
  ]);
  buildGrain();
  renderFrame(0);
  return true;
})();
