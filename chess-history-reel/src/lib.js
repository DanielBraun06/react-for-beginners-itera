// ProstoChess — "Історія шахів" Reel. Deterministic canvas renderer: window.renderFrame(t) draws frame at time t (s).
// Palette strictly: #FF5204, #000000, #FFFFFF (+ their opacities).
'use strict';
const W = 1080, H = 1920, CX = 540;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const ORANGE = '#FF5204';
const oa = a => `rgba(255,82,4,${a})`;
const wa = a => `rgba(255,255,255,${a})`;
const ba = a => `rgba(0,0,0,${a})`;
const TL = window.TIMELINE || { vo: {} };

// ---------- math / easing ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eOutExpo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const eInExpo = x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10);
const eInOutExpo = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
const eOutCubic = x => 1 - Math.pow(1 - x, 3);
const eInCubic = x => x * x * x;
const eInOutCubic = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eOutBack = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const eOutQuint = x => 1 - Math.pow(1 - x, 5);
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
// smooth pseudo-noise
function vnoise(x, seed = 0) { const i = Math.floor(x), f = x - i; const h = n => { const s = Math.sin((n + seed * 131.7) * 127.1) * 43758.5453; return s - Math.floor(s); }; const u = f * f * (3 - 2 * f); return lerp(h(i), h(i + 1), u); }

// ---------- assets ----------
const avatar = new Image();
avatar.src = '../assets/avatar.png';

// ---------- chess pieces (cached silhouettes) ----------
const PW = 400, PH = 660, PBX = 200, PBY = 640; // piece canvas, base anchor
function pieceShape(c, type) {
  c.save(); c.translate(PBX, PBY);
  const F = () => c.fill();
  const rr = (x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); F(); };
  const el = (x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); F(); };
  // base (shared)
  rr(-150, -42, 300, 42, 12); rr(-126, -72, 252, 36, 14); rr(-106, -92, 212, 26, 12);
  if (type === 'pawn') {
    c.beginPath(); c.moveTo(-92, -86); c.bezierCurveTo(-66, -140, -40, -190, -36, -250); c.lineTo(36, -250); c.bezierCurveTo(40, -190, 66, -140, 92, -86); c.closePath(); F();
    el(0, -258, 72, 17); rr(-32, -292, 64, 40, 8); el(0, -345, 68, 68);
  } else if (type === 'queen' || type === 'king') {
    c.beginPath(); c.moveTo(-100, -86); c.bezierCurveTo(-70, -180, -42, -300, -40, -395); c.lineTo(40, -395); c.bezierCurveTo(42, -300, 70, -180, 100, -86); c.closePath(); F();
    el(0, -400, 80, 17); el(0, -426, 62, 12);
    if (type === 'queen') {
      c.beginPath(); c.moveTo(-52, -432); c.lineTo(-104, -548); c.lineTo(-62, -506); c.lineTo(-36, -566); c.lineTo(-12, -508); c.lineTo(0, -520); c.lineTo(12, -508); c.lineTo(36, -566); c.lineTo(62, -506); c.lineTo(104, -548); c.lineTo(52, -432); c.closePath(); F();
      el(-104, -556, 16, 16); el(-36, -574, 15, 15); el(36, -574, 15, 15); el(104, -556, 16, 16);
      c.beginPath(); c.ellipse(0, -508, 50, 34, 0, Math.PI, 0); F();
      el(0, -556, 12, 12); el(0, -588, 22, 22);
    } else {
      c.beginPath(); c.moveTo(-58, -430); c.bezierCurveTo(-98, -470, -88, -522, -62, -534); c.lineTo(62, -534); c.bezierCurveTo(88, -522, 98, -470, 58, -430); c.closePath(); F();
      el(0, -536, 66, 12); rr(-13, -640, 26, 104, 4); rr(-42, -612, 84, 24, 4);
    }
  } else if (type === 'rook') {
    c.beginPath(); c.moveTo(-96, -86); c.bezierCurveTo(-78, -150, -70, -250, -72, -335); c.lineTo(72, -335); c.bezierCurveTo(70, -250, 78, -150, 96, -86); c.closePath(); F();
    rr(-94, -370, 188, 36, 6); rr(-104, -462, 208, 96, 6);
    c.globalCompositeOperation = 'destination-out';
    c.fillRect(-48, -470, 30, 44); c.fillRect(18, -470, 30, 44);
    c.globalCompositeOperation = 'source-over';
  } else if (type === 'bishop') {
    c.beginPath(); c.moveTo(-92, -86); c.bezierCurveTo(-66, -150, -40, -240, -36, -330); c.lineTo(36, -330); c.bezierCurveTo(40, -240, 66, -150, 92, -86); c.closePath(); F();
    el(0, -338, 72, 16); el(0, -362, 52, 10);
    c.beginPath(); c.moveTo(0, -545); c.bezierCurveTo(58, -505, 78, -430, 42, -372); c.lineTo(-42, -372); c.bezierCurveTo(-78, -430, -58, -505, 0, -545); c.closePath(); F();
    el(0, -566, 20, 20);
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 13; c.lineCap = 'round'; c.beginPath(); c.moveTo(12, -440); c.lineTo(44, -500); c.stroke();
    c.globalCompositeOperation = 'source-over';
  } else if (type === 'knight') {
    c.beginPath(); c.moveTo(-96, -86);
    c.bezierCurveTo(-92, -170, -112, -262, -82, -350);
    c.bezierCurveTo(-60, -420, -18, -478, 18, -498);
    c.lineTo(30, -548); c.lineTo(54, -490);
    c.bezierCurveTo(92, -468, 126, -420, 142, -372);
    c.bezierCurveTo(154, -344, 142, -316, 116, -316);
    c.bezierCurveTo(92, -316, 70, -328, 46, -342);
    c.bezierCurveTo(26, -318, 28, -276, 54, -238);
    c.bezierCurveTo(86, -188, 102, -130, 96, -86);
    c.closePath(); F();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.ellipse(72, -430, 11, 7, -0.3, 0, Math.PI * 2); c.fill();
    c.lineWidth = 6; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-70 + i * 16, -380 - i * 28); c.lineTo(-40 + i * 16, -390 - i * 28); c.stroke(); }
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  // grooves for definition
  c.save(); c.translate(PBX, PBY); c.globalCompositeOperation = 'destination-out'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(-140, -40); c.lineTo(140, -40); c.stroke();
  c.beginPath(); c.moveTo(-118, -70); c.lineTo(118, -70); c.stroke();
  c.restore();
}
const PIECE = {};
function buildPieces() {
  for (const type of ['pawn', 'queen', 'king', 'rook', 'bishop', 'knight']) {
    const [m, mc] = mk(PW, PH); mc.fillStyle = '#fff'; pieceShape(mc, type);
    const tint = (col) => { const [c, x] = mk(PW, PH); x.drawImage(m, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, PW, PH); return c; };
    const rim = (dx, dy, col) => { const [c, x] = mk(PW, PH); x.drawImage(m, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, PW, PH); x.globalCompositeOperation = 'destination-out'; x.drawImage(m, dx, dy); return c; };
    const G = 120; const [g, gx] = mk(PW + G * 2, PH + G * 2); gx.filter = 'blur(38px)'; gx.drawImage(tint(ORANGE), G, G);
    PIECE[type] = { black: tint('#000'), white: tint('#fff'), orange: tint(ORANGE), rimL: rim(12, 9, ORANGE), rimR: rim(-12, 9, ORANGE), rimW: rim(7, 7, '#fff'), glow: g, G };
  }
}
// draw piece with base center at (x,y), scale s (queen ≈ 600*s px tall)
function drawPiece(c, type, x, y, s, o = {}) {
  const P = PIECE[type]; const a = o.alpha ?? 1; if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s); c.translate(-PBX, -PBY);
  if (o.glow) { c.globalAlpha = a * o.glow; c.globalCompositeOperation = 'lighter'; c.drawImage(P.glow, -P.G, -P.G); c.globalCompositeOperation = 'source-over'; c.globalAlpha = a; }
  c.drawImage(o.fill === 'white' ? P.white : o.fill === 'orange' ? P.orange : P.black, 0, 0);
  if (o.rimL) { c.globalAlpha = a * o.rimL; c.drawImage(P.rimL, 0, 0); }
  if (o.rimR) { c.globalAlpha = a * o.rimR; c.drawImage(P.rimR, 0, 0); }
  if (o.rimW) { c.globalAlpha = a * o.rimW; c.drawImage(P.rimW, 0, 0); }
  c.restore();
}

// ---------- grain / vignette ----------
const GRAIN = [];
function buildGrain() {
  const r = mulberry(7);
  for (let k = 0; k < 6; k++) {
    const [c, x] = mk(540, 960); const id = x.createImageData(540, 960);
    for (let i = 0; i < id.data.length; i += 4) { const v = r() < 0.5 ? 0 : 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = Math.floor(r() * 26); }
    x.putImageData(id, 0, 0); GRAIN.push(c);
  }
}
function grain(t) { const f = Math.floor(t * 15) % GRAIN.length; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.38; ctx.drawImage(GRAIN[f], 0, 0, W, H); ctx.restore(); }
function vignette(strength = 0.75) {
  const g = ctx.createRadialGradient(CX, 960, 380, CX, 960, 1250);
  g.addColorStop(0, ba(0)); g.addColorStop(1, ba(strength));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------- text ----------
function font(size, weight = 900, fam = 'Unbounded') { return `${weight} ${size}px "${fam}"`; }
function setText(c, size, weight, fam, ls = 0) { c.font = font(size, weight, fam); c.letterSpacing = `${ls}px`; c.textBaseline = 'middle'; }
function fitSize(str, maxW, size, weight = 900, fam = 'Unbounded', ls = 0) {
  setText(ctx, size, weight, fam, ls); const w = ctx.measureText(str).width; return w > maxW ? size * maxW / w : size;
}
// single-line text with entrance animations; returns width
function kText(t, t0, str, x, y, o = {}) {
  const size = o.size || 100, weight = o.weight ?? 900, fam = o.fam || 'Unbounded', ls = o.ls || 0;
  const dur = o.dur || 0.5; const p = prog(t, t0, t0 + dur);
  const out = o.out != null ? prog(t, o.out, o.out + (o.outDur || 0.3)) : 0;
  if (p <= 0 || out >= 1) return 0;
  ctx.save();
  setText(ctx, size, weight, fam, ls); ctx.textAlign = 'center';
  const tw = ctx.measureText(str).width;
  let alpha = (o.alpha ?? 1) * (1 - eInCubic(out));
  const style = o.style || 'up';
  const outDy = -eInCubic(out) * (o.outMove ?? 40);
  ctx.fillStyle = o.color || '#fff';
  if (style === 'slam') {
    const e = eOutExpo(p); const sc = lerp(o.from || 1.8, 1, e);
    ctx.globalAlpha = alpha * clamp(p * 5);
    ctx.translate(x, y + outDy); ctx.scale(sc, sc);
    if (p < 0.35) ctx.filter = `blur(${(1 - p / 0.35) * 14}px)`;
    ctx.fillText(str, 0, 0);
  } else if (style === 'up') {
    const e = eOutExpo(p);
    ctx.beginPath(); ctx.rect(x - tw / 2 - 40, y - size * 0.72, tw + 80, size * 1.44); ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.fillText(str, x, y + (1 - e) * size * 1.3 + outDy);
  } else if (style === 'letters') {
    // per-letter stagger with rise + fade
    const chars = [...str]; let cx = x - tw / 2; const st = o.stagger || 0.045;
    ctx.textAlign = 'left';
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]; const cw = ctx.measureText(ch).width;
      const q = eOutExpo(prog(t, t0 + i * st, t0 + i * st + dur));
      if (q > 0) {
        ctx.save(); ctx.globalAlpha = alpha * clamp(q * 1.6);
        ctx.translate(cx + cw / 2, y + (1 - q) * size * 0.6 + outDy); ctx.scale(lerp(0.6, 1, q), lerp(0.6, 1, q));
        ctx.fillText(ch, -cw / 2, 0); ctx.restore();
      }
      cx += cw;
    }
  } else if (style === 'fade') {
    ctx.globalAlpha = alpha * eOutCubic(p);
    ctx.fillText(str, x, y + (1 - eOutCubic(p)) * 20 + outDy);
  } else if (style === 'type') {
    const chars = [...str]; const n = Math.floor(p * chars.length + 0.0001);
    ctx.textAlign = 'left'; ctx.globalAlpha = alpha;
    const shown = chars.slice(0, n).join('');
    ctx.fillText(shown, x - tw / 2, y + outDy);
    if (p < 1 || (t * 2.5 % 1) < 0.5) { const sw = ctx.measureText(shown).width; ctx.fillStyle = ORANGE; ctx.fillRect(x - tw / 2 + sw + 6, y - size * 0.45, 5, size * 0.9); }
  }
  ctx.restore();
  return tw;
}
// orange highlight bar with dark text: bar grows from left, text revealed inside
function plashka(t, t0, str, x, y, o = {}) {
  const size = o.size || 80, fam = o.fam || 'Unbounded', weight = o.weight ?? 900, ls = o.ls || 0;
  const padX = o.padX ?? size * 0.32, padY = o.padY ?? size * 0.2;
  const p = prog(t, t0, t0 + (o.dur || 0.45));
  const out = o.out != null ? prog(t, o.out, o.out + (o.outDur || 0.3)) : 0;
  if (p <= 0 || out >= 1) return;
  ctx.save(); setText(ctx, size, weight, fam, ls); ctx.textAlign = 'center';
  const tw = ctx.measureText(str).width; const bw = tw + padX * 2, bh = size + padY * 2;
  const e = eOutExpo(p);
  const dy = -eInCubic(out) * 40; ctx.globalAlpha = (o.alpha ?? 1) * (1 - eInCubic(out));
  const bx = x - bw / 2, by = y - bh / 2 + dy;
  const rot = (o.rot || 0) * (Math.PI / 180);
  ctx.translate(x, y + dy); ctx.rotate(rot * e); ctx.translate(-x, -(y + dy));
  ctx.fillStyle = o.bg || ORANGE;
  const grow = bw * e; ctx.beginPath(); ctx.rect(bx, by, grow, bh); ctx.fill();
  ctx.beginPath(); ctx.rect(bx, by, grow, bh); ctx.clip();
  ctx.fillStyle = o.color || '#000';
  const q = eOutExpo(prog(t, t0 + 0.08, t0 + 0.6));
  ctx.fillText(str, x + (1 - q) * 60, y + dy + size * 0.04);
  ctx.restore();
}

// ---------- particles ----------
const EMB = (() => { const r = mulberry(11); const a = []; for (let i = 0; i < 90; i++) a.push({ x: r() * W, y: r() * H, sp: 40 + r() * 140, sz: 1.5 + r() * 4.5, ph: r() * 6.28, fr: 0.5 + r() * 1.5, amp: 10 + r() * 50, big: r() < 0.12, fl: r() * 10 }); return a; })();
function embers(t, dens = 1, alpha = 1, burst = null) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const n = Math.floor(EMB.length * dens);
  for (let i = 0; i < n; i++) {
    const e = EMB[i];
    let y = ((e.y - e.sp * t) % (H + 200) + H + 200) % (H + 200) - 100;
    let x = e.x + Math.sin(t * e.fr + e.ph) * e.amp;
    let sz = e.sz;
    if (burst) { const k = eOutExpo(prog(t, burst.t, burst.t + 1.2)); if (k > 0) { const ang = e.ph; const d = k * (300 + e.sp * 4); x = lerp(x, burst.x + Math.cos(ang) * d, (1 - prog(t, burst.t + 0.4, burst.t + 2)) * 0.9); y = lerp(y, burst.y + Math.sin(ang) * d, (1 - prog(t, burst.t + 0.4, burst.t + 2)) * 0.9); } }
    const fl = 0.55 + 0.45 * Math.sin(t * 9 + e.fl);
    if (e.big) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 7); g.addColorStop(0, oa(0.35 * alpha * fl)); g.addColorStop(1, oa(0));
      ctx.fillStyle = g; ctx.fillRect(x - sz * 7, y - sz * 7, sz * 14, sz * 14);
    } else {
      ctx.fillStyle = oa(0.9 * alpha * fl); ctx.beginPath(); ctx.arc(x, y, sz * 0.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = oa(0.18 * alpha * fl); ctx.beginPath(); ctx.arc(x, y, sz * 2.2, 0, 6.283); ctx.fill();
    }
  }
  ctx.restore();
}
function dust(t, col, dens, seed, dir = 0) {
  const r = mulberry(seed); ctx.save(); ctx.fillStyle = col;
  for (let i = 0; i < dens; i++) {
    const x0 = r() * W, y0 = r() * H, sp = 10 + r() * 40, s = 0.8 + r() * 2.2, ph = r() * 6.28;
    const x = ((x0 + (dir ? sp * 6 : 0) * t + Math.sin(t * 0.7 + ph) * 30) % W + W) % W;
    const y = ((y0 - (dir ? 0 : sp) * t + Math.cos(t * 0.5 + ph) * 20) % H + H) % H;
    ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + ph));
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

// ---------- perspective board ----------
function board(o) {
  const hy = o.hy, f = o.f || 900, camH = o.camH || 300, cell = o.cell || 100, zN = o.zNear || 120, zF = o.zFar || 3000;
  const cols = o.cols || 16, scroll = o.scroll || 0, cx = o.cx ?? CX;
  const P = (X, Z) => [cx + X * f / Z, hy + camH * f / Z];
  ctx.save();
  if (o.clipTop != null) { ctx.beginPath(); ctx.rect(0, o.clipTop, W, H); ctx.clip(); }
  const off = ((scroll % (2 * cell)) + 2 * cell) % (2 * cell);
  const rows = Math.ceil((zF - zN) / cell) + 2;
  if (o.fillA) {
    for (let r = 0; r < rows; r++) {
      let z0 = zN + r * cell - off, z1 = z0 + cell; if (z1 <= zN) continue; z0 = Math.max(z0, zN); if (z0 > zF) break;
      const fade = o.fade === false ? 1 : 1 - clamp((z0 - zN) / (zF - zN));
      for (let cI = -cols / 2; cI < cols / 2; cI++) {
        if ((r + cI) % 2 !== 0) continue;
        const a = P(cI * cell, z0), b = P((cI + 1) * cell, z0), c2 = P((cI + 1) * cell, z1), d = P(cI * cell, z1);
        ctx.globalAlpha = (o.alpha ?? 1) * fade * fade; ctx.fillStyle = o.fillA;
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c2); ctx.lineTo(...d); ctx.closePath(); ctx.fill();
      }
    }
  }
  if (o.line) {
    ctx.strokeStyle = o.line; ctx.lineWidth = o.lw || 2;
    for (let cI = -cols / 2; cI <= cols / 2; cI++) {
      const a = P(cI * cell, zN), b = P(cI * cell, zF);
      const g = ctx.createLinearGradient(0, a[1], 0, b[1]); g.addColorStop(0, o.line); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = g; ctx.globalAlpha = o.alpha ?? 1; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    }
    for (let r = 0; r < rows; r++) {
      const z = zN + r * cell - off; if (z < zN || z > zF) continue;
      const fade = 1 - clamp((z - zN) / (zF - zN));
      ctx.strokeStyle = o.line; ctx.globalAlpha = (o.alpha ?? 1) * fade * fade;
      const a = P(-cols / 2 * cell, z), b = P(cols / 2 * cell, z); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------- shared silhouettes ----------
function bird(x, y, s, ph) {
  const f = Math.sin(ph) * 0.9;
  ctx.beginPath(); ctx.moveTo(x - 22 * s, y - 10 * s * f);
  ctx.quadraticCurveTo(x - 10 * s, y - 4 * s * f - 3 * s, x, y + 2 * s);
  ctx.quadraticCurveTo(x + 10 * s, y - 4 * s * f - 3 * s, x + 22 * s, y - 10 * s * f);
  ctx.quadraticCurveTo(x + 10 * s, y - 2 * s * f + 2 * s, x, y + 6 * s);
  ctx.quadraticCurveTo(x - 10 * s, y - 2 * s * f + 2 * s, x - 22 * s, y - 10 * s * f); ctx.fill();
}
function ridge(y0, amp, seed, freq, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-50, H);
  for (let x = -50; x <= W + 50; x += 12) { const n = vnoise(x * freq, seed) * 0.6 + vnoise(x * freq * 2.7, seed + 3) * 0.3 + vnoise(x * freq * 7, seed + 9) * 0.1; ctx.lineTo(x, y0 - n * amp); }
  ctx.lineTo(W + 50, H); ctx.closePath(); ctx.fill();
}
function sunGlow(x, y, r, a = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3.2); g.addColorStop(0, oa(0.55 * a)); g.addColorStop(0.35, oa(0.18 * a)); g.addColorStop(1, oa(0));
  ctx.fillStyle = g; ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  ctx.restore();
}

// ===================================================================
// SCENE 1 — HOOK (0 – 3.6)
// ===================================================================


// ===================================================================
// SCENE 2 — INDIA (3.3 – 9.85)
// ===================================================================
const SUN = { x: CX, y: 920, r: 300 };
function shikhara(x, y, hw, h, detail) {
  const path = new Path2D();
  path.moveTo(x - hw, y); path.bezierCurveTo(x - hw * 1.06, y - h * 0.45, x - hw * 0.82, y - h * 0.86, x - hw * 0.36, y - h);
  path.lineTo(x + hw * 0.36, y - h); path.bezierCurveTo(x + hw * 0.82, y - h * 0.86, x + hw * 1.06, y - h * 0.45, x + hw, y); path.closePath();
  ctx.fill(path);
  if (detail) {
    ctx.save(); ctx.clip(path); ctx.strokeStyle = oa(detail); ctx.lineWidth = 2.2;
    for (let yy = y - 14; yy > y - h; yy -= 20) { ctx.beginPath(); ctx.moveTo(x - hw * 1.1, yy); ctx.quadraticCurveTo(x, yy + 8, x + hw * 1.1, yy); ctx.stroke(); }
    ctx.lineWidth = 3;
    for (const k of [-0.62, -0.3, 0.3, 0.62]) { ctx.beginPath(); ctx.moveTo(x + hw * k, y); ctx.quadraticCurveTo(x + hw * k * 0.95, y - h * 0.6, x + hw * k * 0.5, y - h); ctx.stroke(); }
    ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(x, y - h - hw * 0.11, hw * 0.52, hw * 0.13, 0, 0, 6.283); ctx.fill();
  ctx.fillRect(x - hw * 0.22, y - h - hw * 0.32, hw * 0.44, hw * 0.12);
  ctx.beginPath(); ctx.ellipse(x, y - h - hw * 0.44, hw * 0.15, hw * 0.16, 0, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - hw * 0.05, y - h - hw * 0.55); ctx.lineTo(x, y - h - hw * 0.85); ctx.lineTo(x + hw * 0.05, y - h - hw * 0.55); ctx.fill();
}
function temple(t) {
  // origin: ground center, unit ≈ px
  ctx.fillStyle = '#000';
  ctx.fillRect(-310, -30, 620, 30); ctx.fillRect(-280, -55, 560, 26); ctx.fillRect(-250, -76, 500, 22);
  for (const sx of [-1, 1]) {
    const x0 = sx * 170;
    ctx.fillRect(x0 - 78, -180, 156, 106);
    for (let i = 0; i < 6; i++) { const w = 176 - i * 25, y = -178 - i * 22; ctx.beginPath(); ctx.moveTo(x0 - w / 2, y); ctx.lineTo(x0 + w / 2, y); ctx.lineTo(x0 + w / 2 - 10, y - 19); ctx.lineTo(x0 - w / 2 + 10, y - 19); ctx.closePath(); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(x0, -318, 11, 13, 0, 0, 6.283); ctx.fill(); ctx.fillRect(x0 - 2, -345, 4, 24);
    // pillars glow between
    for (let k = -1; k <= 1; k += 2) { ctx.fillStyle = oa(0.28 + 0.06 * Math.sin(t * 5 + k + sx)); ctx.fillRect(x0 + k * 30 - 9, -164, 18, 76); ctx.fillStyle = '#000'; }
  }
  ctx.fillRect(-115, -235, 230, 160);
  for (const sx of [-1, 1]) shikhara(sx * 100, -235, 58, 250, 0.18);
  shikhara(0, -235, 124, 440, 0.26);
  // door glow
  const fl = 0.75 + 0.25 * Math.sin(t * 7) * Math.sin(t * 3.1);
  const dg = ctx.createRadialGradient(0, -120, 5, 0, -120, 70); dg.addColorStop(0, oa(1 * fl)); dg.addColorStop(1, oa(0.35 * fl));
  ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(-30, -78); ctx.lineTo(-30, -150); ctx.quadraticCurveTo(0, -185, 30, -150); ctx.lineTo(30, -78); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(0, -110, 0, 0, -110, 160); lg.addColorStop(0, oa(0.35 * fl)); lg.addColorStop(1, oa(0)); ctx.fillStyle = lg; ctx.fillRect(-160, -270, 320, 320); ctx.restore();
  // flag on top
  ctx.fillStyle = '#000'; ctx.fillRect(-2, -790, 4, 90);
  ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.moveTo(2, -788);
  for (let i = 0; i <= 10; i++) { const u = i / 10; ctx.lineTo(2 + u * 64, -788 + u * 14 + Math.sin(t * 7 - u * 4) * 7 * u); }
  for (let i = 10; i >= 0; i--) { const u = i / 10; ctx.lineTo(2 + u * 64, -756 - u * 4 + Math.sin(t * 7 - u * 4) * 7 * u); }
  ctx.closePath(); ctx.fill();
}
function palm(x, y, h, t, lean, ph) {
  const sway = Math.sin(t * 1.3 + ph) * 0.025;
  const tx = x + h * (lean + sway), ty = y - h;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.quadraticCurveTo(x + h * lean * 0.2 - 6, y - h * 0.5, tx - 4, ty); ctx.lineTo(tx + 4, ty); ctx.quadraticCurveTo(x + h * lean * 0.2 + 6, y - h * 0.5, x + 13, y); ctx.fill();
  const fr = [-2.9, -2.5, -2.0, -1.4, -0.9, -0.4, -0.05, -3.25];
  fr.forEach((a0, i) => {
    const a = a0 + Math.sin(t * 1.7 + i + ph) * 0.05; const L = h * (0.42 + (i % 3) * 0.05);
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L + L * 0.35;
    const mx = tx + Math.cos(a) * L * 0.5, my = ty + Math.sin(a) * L * 0.5 - L * 0.12;
    const nx = -Math.sin(a), ny = Math.cos(a);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(mx + nx * 22, my + ny * 22, ex, ey); ctx.quadraticCurveTo(mx - nx * 10, my - ny * 10, tx, ty); ctx.fill();
  });
  ctx.beginPath(); ctx.arc(tx, ty + 6, 14, 0, 6.283); ctx.fill();
}
function elephant(x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#000';
  const ph = t * 5.2; const bob = Math.sin(ph * 2) * 3;
  ctx.translate(0, bob);
  // legs
  const legs = [[-82, 0], [-42, Math.PI], [46, Math.PI], [86, 0]];
  legs.forEach(([lx, o]) => { const a = Math.sin(ph + o) * 0.22; ctx.save(); ctx.translate(lx, -120); ctx.rotate(a); ctx.beginPath(); ctx.roundRect(-21, 0, 42, 122 - bob, 10); ctx.fill(); ctx.restore(); });
  ctx.beginPath(); ctx.ellipse(0, -160, 132, 86, 0, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-122, -184, 60, 64, 0, 0, 6.283); ctx.fill();
  // trunk
  const tw = Math.sin(t * 2.2) * 14;
  ctx.beginPath(); ctx.moveTo(-170, -190); ctx.bezierCurveTo(-205, -130, -200 + tw, -60, -176 + tw, -18); ctx.lineTo(-160 + tw, -22); ctx.bezierCurveTo(-178 + tw, -70, -176, -130, -140, -160); ctx.fill();
  // ear
  ctx.strokeStyle = oa(0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(-92, -178, 38, 52, 0.15, -1.2, 2.2); ctx.stroke();
  // tusk
  ctx.strokeStyle = wa(0.85); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-160, -142); ctx.quadraticCurveTo(-196, -128, -208, -150); ctx.stroke();
  // tail
  ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(128, -176); ctx.quadraticCurveTo(146 + Math.sin(t * 3) * 6, -130, 140, -96); ctx.stroke();
  // howdah
  ctx.fillStyle = '#000'; ctx.fillRect(-60, -282, 110, 46);
  ctx.beginPath(); ctx.moveTo(-70, -282); ctx.quadraticCurveTo(-5, -360, 60, -282); ctx.fill(); ctx.fillRect(-7, -372, 4, 30);
  ctx.fillStyle = oa(0.85); ctx.fillRect(-60, -246, 110, 8);
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-58 + i * 22, -238); ctx.lineTo(-47 + i * 22, -222); ctx.lineTo(-36 + i * 22, -238); ctx.fill(); }
  ctx.restore();
}
function stupa(x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, 60 * s, 52 * s, 0, Math.PI, 0); ctx.fill();
  ctx.fillRect(x - 70 * s, y, 140 * s, 10 * s); ctx.fillRect(x - 12 * s, y - 66 * s, 24 * s, 16 * s); ctx.fillRect(x - 2 * s, y - 110 * s, 4 * s, 50 * s);
  for (let i = 0; i < 3; i++) ctx.fillRect(x - (18 - i * 5) * s, y - (78 + i * 12) * s, (36 - i * 10) * s, 4 * s);
}


// ===================================================================
// SCENE 3 — PERSIA (9.6 – 17.45)
// ===================================================================
function pointedArch(w, h, spring) { const p = new Path2D(); p.moveTo(-w / 2, 0); p.lineTo(-w / 2, -spring); p.bezierCurveTo(-w / 2, -spring - (h - spring) * 0.55, -w * 0.18, -h * 0.97, 0, -h); p.bezierCurveTo(w * 0.18, -h * 0.97, w / 2, -spring - (h - spring) * 0.55, w / 2, -spring); p.lineTo(w / 2, 0); p.closePath(); return p; }
function star8(x, y, r, lw, col) { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.lineWidth = lw; for (let k = 0; k < 2; k++) { ctx.save(); ctx.rotate(k * Math.PI / 4); ctx.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4); ctx.restore(); } ctx.restore(); }
function persianBuilding(t) {
  ctx.fillStyle = '#000';
  // wings with lit arcades
  ctx.fillRect(-470, -330, 940, 330);
  for (let i = 0; i < 8; i++) { if (i === 3 || i === 4) continue; const ax = -420 + i * 120; ctx.save(); ctx.translate(ax, -40); const fl = 0.55 + 0.2 * Math.sin(t * 4 + i * 1.7); const g = ctx.createLinearGradient(0, -200, 0, 0); g.addColorStop(0, oa(0.2 * fl)); g.addColorStop(1, oa(0.95 * fl)); ctx.fillStyle = g; ctx.fill(pointedArch(64, 200, 130)); ctx.restore(); }
  ctx.fillStyle = '#000'; for (let x = -470; x < 470; x += 34) ctx.fillRect(x, -350, 20, 22);
  // minarets
  for (const sx of [-1, 1]) {
    const mx = sx * 360; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.moveTo(mx - 30, 0); ctx.lineTo(mx - 21, -900); ctx.lineTo(mx + 21, -900); ctx.lineTo(mx + 30, 0); ctx.fill();
    ctx.fillRect(mx - 46, -660, 92, 16); ctx.fillRect(mx - 40, -840, 80, 14);
    ctx.fillRect(mx - 22, -950, 44, 52);
    ctx.beginPath(); ctx.moveTo(mx - 28, -948); ctx.quadraticCurveTo(mx - 20, -1000, mx, -1040); ctx.quadraticCurveTo(mx + 20, -1000, mx + 28, -948); ctx.fill();
    ctx.fillRect(mx - 2, -1080, 4, 44);
    ctx.strokeStyle = oa(0.3); ctx.lineWidth = 2; for (let y = -120; y > -880; y -= 60) { ctx.beginPath(); ctx.moveTo(mx - 28, y); ctx.lineTo(mx + 28, y); ctx.stroke(); }
    const fl = 0.7 + 0.3 * Math.sin(t * 6 + sx); ctx.fillStyle = oa(0.9 * fl); ctx.fillRect(mx - 12, -940, 24, 30);
  }
  // dome
  ctx.fillStyle = '#000'; ctx.fillRect(-175, -790, 350, 170);
  const dome = new Path2D(); dome.moveTo(-190, -786); dome.bezierCurveTo(-225, -900, -135, -1030, 0, -1100); dome.bezierCurveTo(135, -1030, 225, -900, 190, -786); dome.closePath();
  ctx.fill(dome);
  ctx.save(); ctx.clip(dome); ctx.strokeStyle = oa(0.22); ctx.lineWidth = 2.5;
  for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * 45, -786); ctx.quadraticCurveTo(k * 50, -990, 0, -1100); ctx.stroke(); }
  for (let y = -820; y > -1080; y -= 46) { ctx.beginPath(); for (let x = -220; x <= 220; x += 22) ctx.lineTo(x, y + ((x / 22) % 2 ? -10 : 0)); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = '#000'; ctx.fillRect(-3, -1170, 6, 78); ctx.beginPath(); ctx.arc(0, -1120, 11, 0, 6.283); ctx.fill();
  // drum windows
  for (let i = -3; i <= 3; i++) { ctx.fillStyle = oa(0.6 + 0.2 * Math.sin(t * 3 + i)); ctx.save(); ctx.translate(i * 46, -650); ctx.fill(pointedArch(20, 80, 50)); ctx.restore(); }
  // pishtaq
  ctx.fillStyle = '#000'; ctx.fillRect(-235, -660, 470, 660);
  for (let x = -235; x < 235; x += 30) ctx.fillRect(x, -680, 18, 22);
  ctx.strokeStyle = oa(0.38); ctx.lineWidth = 3; ctx.strokeRect(-212, -638, 424, 638); ctx.lineWidth = 2; ctx.strokeRect(-196, -622, 392, 622);
  // inscription band
  ctx.fillStyle = wa(0.16); for (let x = -180; x < 180; x += 14) { const hh = 6 + ((x * 7) % 11 + 11) % 11; ctx.fillRect(x, -600 + (12 - hh), 7, hh); }
  // iwan opening
  ctx.save(); ctx.translate(0, 0);
  const arch = pointedArch(290, 520, 330);
  const fl = 0.85 + 0.15 * Math.sin(t * 5.3) * Math.sin(t * 2.1);
  const ig = ctx.createRadialGradient(0, -170, 10, 0, -260, 330); ig.addColorStop(0, oa(1 * fl)); ig.addColorStop(0.55, oa(0.55 * fl)); ig.addColorStop(1, oa(0.12)); ctx.fillStyle = ig; ctx.fill(arch);
  ctx.save(); ctx.clip(arch);
  // muqarnas rows
  ctx.fillStyle = ba(0.45); for (let r = 0; r < 4; r++) { const y = -500 + r * 42; const n = 3 + r * 2; for (let i = 0; i < n; i++) { const x = -((n - 1) * 34) / 2 + i * 34; ctx.save(); ctx.translate(x, y + 40); ctx.fill(pointedArch(26, 40, 18)); ctx.restore(); } }
  // inner door
  ctx.fillStyle = ba(0.85); ctx.save(); ctx.translate(0, 0); ctx.fill(pointedArch(110, 230, 150)); ctx.restore();
  ctx.restore();
  // lanterns
  for (const [lx, ly] of [[-80, -330], [0, -380], [80, -330]]) {
    ctx.strokeStyle = ba(0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, -470); ctx.lineTo(lx, ly - 14); ctx.stroke();
    const lf = 0.75 + 0.25 * Math.sin(t * 8 + lx);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 60); g.addColorStop(0, wa(0.7 * lf)); g.addColorStop(0.3, oa(0.6 * lf)); g.addColorStop(1, oa(0)); ctx.fillStyle = g; ctx.fillRect(lx - 60, ly - 60, 120, 120); ctx.restore();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(lx, ly - 16); ctx.lineTo(lx + 9, ly); ctx.lineTo(lx, ly + 16); ctx.lineTo(lx - 9, ly); ctx.fill(); ctx.fillStyle = wa(0.9 * lf); ctx.fillRect(lx - 3, ly - 6, 6, 12);
  }
  ctx.restore();
  // spandrel stars
  star8(-160, -560, 26, 2, oa(0.55)); star8(160, -560, 26, 2, oa(0.55));
  star8(-160, -560, 12, 1.5, wa(0.3)); star8(160, -560, 12, 1.5, wa(0.3));
}
function camel(x, y, s, t, ph) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#000';
  const p = t * 4 + ph; const bob = Math.sin(p * 2) * 4; ctx.translate(0, bob);
  [[-60, 0], [-36, Math.PI], [50, Math.PI], [72, 0]].forEach(([lx, o]) => { const a = Math.sin(p + o) * 0.3; ctx.save(); ctx.translate(lx, -150); ctx.rotate(a); ctx.fillRect(-7, 0, 14, 150 - bob); ctx.restore(); });
  ctx.beginPath(); ctx.moveTo(-90, -150); ctx.bezierCurveTo(-90, -200, -60, -210, -30, -210); ctx.bezierCurveTo(-10, -290, 40, -290, 50, -210); ctx.bezierCurveTo(80, -205, 100, -190, 96, -150); ctx.quadraticCurveTo(0, -120, -90, -150); ctx.fill();
  ctx.beginPath(); ctx.moveTo(90, -190); ctx.bezierCurveTo(130, -190, 140, -240, 150, -280); ctx.lineTo(185, -282); ctx.lineTo(188, -262); ctx.lineTo(160, -258); ctx.bezierCurveTo(150, -200, 130, -160, 92, -158); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(-88, -180); ctx.quadraticCurveTo(-104, -150, -98, -120); ctx.stroke();
  ctx.restore();
}
function moonCrescent(x, y, r, rot) {
  const [c, m] = mk(r * 4, r * 4); m.translate(r * 2, r * 2); m.fillStyle = '#fff'; m.beginPath(); m.arc(0, 0, r, 0, 6.283); m.fill();
  m.globalCompositeOperation = 'destination-out'; m.beginPath(); m.arc(r * 0.42 * Math.cos(rot), r * 0.42 * Math.sin(rot), r * 0.88, 0, 6.283); m.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3); g.addColorStop(0, wa(0.16)); g.addColorStop(1, wa(0)); ctx.fillStyle = g; ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6); ctx.restore();
  ctx.drawImage(c, x - r * 2, y - r * 2);
}



// ===================================================================
// SCENE 4 — EUROPE (17.42 – 25.35)
// ===================================================================
const WINDOWS = (() => { const r = mulberry(19); const a = []; for (let i = 0; i < 26; i++) a.push([Math.floor(r() * 560 - 280), Math.floor(-40 - r() * 400), r() * 6, r() < 0.7]); return a; })();
function castle(t) {
  ctx.fillStyle = '#000';
  // hill
  ctx.beginPath(); ctx.moveTo(-760, 260);
  const pts = [[-620, 160], [-520, 120], [-430, 60], [-340, 10], [-300, 0], [300, 0], [350, 20], [430, 70], [520, 90], [600, 150], [760, 230]];
  pts.forEach(p => ctx.lineTo(...p)); ctx.lineTo(760, 600); ctx.lineTo(-760, 600); ctx.fill();
  // walls
  ctx.fillRect(-310, -170, 620, 172); for (let x = -310; x < 310; x += 30) ctx.fillRect(x, -192, 18, 24);
  const tower = (x, w, h, roof, flagPh) => {
    ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2, -h, w, h);
    if (roof) { ctx.beginPath(); ctx.moveTo(x - w / 2 - 14, -h); ctx.lineTo(x, -h - roof); ctx.lineTo(x + w / 2 + 14, -h); ctx.fill(); ctx.fillRect(x - 2, -h - roof - 50, 4, 52);
      ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.moveTo(x + 2, -h - roof - 50);
      for (let i = 0; i <= 10; i++) { const u = i / 10; ctx.lineTo(x + 2 + u * 54, -h - roof - 50 + u * 10 + Math.sin(t * 8 - u * 5 + flagPh) * 6 * u); }
      for (let i = 10; i >= 0; i--) { const u = i / 10; ctx.lineTo(x + 2 + u * 54, -h - roof - 24 - u * 2 + Math.sin(t * 8 - u * 5 + flagPh) * 6 * u); }
      ctx.fill();
    } else { for (let k = -w / 2; k < w / 2; k += 24) ctx.fillRect(x + k, -h - 22, 15, 24); }
  };
  tower(-310, 96, 340, 150, 0); tower(310, 96, 340, 150, 1);
  tower(-160, 74, 450, 170, 2); tower(160, 74, 450, 170, 3);
  tower(0, 190, 500, 0, 0); tower(0, 66, 640, 190, 4);
  // windows
  WINDOWS.forEach(([x, y, ph, lit]) => {
    if (!lit) return; const f = 0.6 + 0.4 * Math.sin(t * 3 + ph) * Math.sin(t * 1.7 + ph * 2);
    ctx.fillStyle = oa(0.6 + 0.4 * f); ctx.beginPath(); ctx.roundRect(x, y, 10, 18, [5, 5, 0, 0]); ctx.fill();
  });
  // gate
  const gg = ctx.createLinearGradient(0, -110, 0, 0); gg.addColorStop(0, oa(0.4)); gg.addColorStop(1, oa(0.9)); ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-36, -70); ctx.arc(0, -70, 36, Math.PI, 0); ctx.lineTo(36, 0); ctx.fill();
  ctx.strokeStyle = ba(0.8); ctx.lineWidth = 3; for (let x = -28; x <= 28; x += 14) { ctx.beginPath(); ctx.moveTo(x, -100); ctx.lineTo(x, 0); ctx.stroke(); }
}
const BOLT = (() => { const r = mulberry(77); const pts = [[0, 0]]; let x = 0, y = 0; while (y < 900) { x += (r() - 0.5) * 120; y += 40 + r() * 70; pts.push([x, y]); } return pts; })();


// ===================================================================
// SCENE 5 — CTA (25.1 – 30)
// ===================================================================


// ===================================================================
// Transitions & master
// ===================================================================



