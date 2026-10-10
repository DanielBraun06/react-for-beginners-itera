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
function sceneHook(t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const rise = eOutExpo(prog(t, 0.0, 1.1));
  // shrink gag 3.0–3.4 (queen collapses into a dot that becomes India's sun)
  const sh = prog(t, 3.02, 3.42); const she = eInExpo(sh);
  // backlight
  const glowA = (0.4 + 0.6 * rise) * (1 - she);
  const g = ctx.createRadialGradient(CX, 1220, 50, CX, 1220, 760); g.addColorStop(0, oa(0.55 * glowA)); g.addColorStop(0.5, oa(0.16 * glowA)); g.addColorStop(1, oa(0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // board floor
  board({ hy: 1380, f: 900, camH: 380, cell: 120, zNear: 160, zFar: 2600, cols: 14, fillA: '#fff', alpha: 0.10 * rise * (1 - she), scroll: t * 30, clipTop: 1380 });
  board({ hy: 1380, f: 900, camH: 380, cell: 120, zNear: 160, zFar: 2600, cols: 14, line: oa(0.6), lw: 2, alpha: 0.5 * rise * (1 - she), scroll: t * 30, clipTop: 1380 });
  // rays behind
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(CX, 1150); ctx.rotate(t * 0.08);
  for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI * 2 / 14); ctx.fillStyle = oa(0.05 * rise * (1 - she)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -1300); ctx.lineTo(40, -1300); ctx.fill(); }
  ctx.restore();
  // queen
  const baseY = lerp(1950, 1640, rise);
  let s = 1.12, qx = CX, qy = baseY;
  // breathing push
  s *= 1 + 0.03 * prog(t, 0.5, 3.0);
  if (sh > 0) { s = lerp(s, 0.004, she); qx = CX; qy = lerp(baseY, 920 + 300 * 0.004, she); }
  // tiny wobble when "weak"
  const wob = Math.sin(t * 30) * 0.02 * prog(t, 2.4, 2.9) * (1 - sh);
  ctx.save(); ctx.translate(qx, qy); ctx.rotate(wob); drawPiece(ctx, 'queen', 0, 0, s, { fill: 'black', rimL: 1, rimR: 0.55, glow: 0.35 }); ctx.restore();
  // dot → handled by transition when sh>0.9
  if (sh > 0.85) { ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(CX, 920, 8, 0, 6.283); ctx.fill(); }
  // text
  const out = 2.98;
  plashka(t, 0.12, 'ІСТОРІЯ ШАХІВ', CX, 300, { size: 34, fam: 'Montserrat', weight: 800, ls: 6, out, dur: 0.5 });
  kText(t, 0.30, 'ФЕРЗЬ', CX, 470, { size: 210, style: 'slam', from: 2.2, dur: 0.45, out, outMove: 80 });
  kText(t, 0.78, 'КОЛИСЬ БУВ', CX, 640, { size: 74, style: 'up', dur: 0.5, out, outMove: 60 });
  plashka(t, 1.45, 'НАЙСЛАБШОЮ', CX, 770, { size: fitSize('НАЙСЛАБШОЮ', 900, 100), dur: 0.45, out, rot: -2 });
  kText(t, 2.05, 'ФІГУРОЮ', CX, 905, { size: 92, style: 'up', dur: 0.5, out, outMove: 60 });
  embers(t, 0.6 * (1 - she), 0.9);
}

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
function sceneIndia(t) {
  const lt = t - 3.4;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const intro = eOutExpo(prog(t, 3.42, 4.2));
  const z = 1 + 0.10 * prog(t, 3.4, 9.8);
  const camX = Math.sin(lt * 0.4) * 10;
  const HY = 1250;
  const layer = (depth, fn, rise = 260) => { ctx.save(); const zz = 1 + (z - 1) * depth; ctx.translate(CX + camX * depth, 960 + (1 - intro) * rise * depth); ctx.scale(zz, zz); ctx.translate(-CX, -960); fn(); ctx.restore(); };
  // sky
  layer(0.2, () => {
    const g = ctx.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, oa(0)); g.addColorStop(0.45, oa(0.12)); g.addColorStop(0.85, oa(0.5)); g.addColorStop(1, oa(0.75));
    ctx.fillStyle = g; ctx.fillRect(-200, -300, W + 400, HY + 300);
  }, 0);
  // sun (born from the queen-dot)
  const sp = eOutExpo(prog(t, 3.40, 4.05));
  const sr = lerp(8, SUN.r, sp);
  layer(0.25, () => {
    sunGlow(SUN.x, SUN.y, sr, 0.5 + 0.5 * sp);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(SUN.x, SUN.y); ctx.rotate(lt * 0.05);
    for (let i = 0; i < 18; i++) { ctx.rotate(Math.PI * 2 / 18); ctx.fillStyle = oa(0.05 * sp); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -1400); ctx.lineTo(30, -1400); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(SUN.x, SUN.y, sr, 0, 6.283); ctx.fill();
    const hg = ctx.createRadialGradient(SUN.x - sr * 0.25, SUN.y - sr * 0.3, 0, SUN.x, SUN.y, sr); hg.addColorStop(0, wa(0.32)); hg.addColorStop(0.6, wa(0.05)); hg.addColorStop(1, wa(0));
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(SUN.x, SUN.y, sr, 0, 6.283); ctx.fill();
    // horizontal heat stripes on sun bottom
    ctx.save(); ctx.beginPath(); ctx.arc(SUN.x, SUN.y, sr, 0, 6.283); ctx.clip(); ctx.fillStyle = ba(0.55);
    for (let i = 0; i < 5; i++) { const yy = SUN.y + sr * 0.45 + i * 30 + ((lt * 12) % 30); ctx.fillRect(SUN.x - sr, yy, sr * 2, 4 + i * 2.5); }
    ctx.restore();
  }, 0);
  // birds
  layer(0.4, () => { ctx.fillStyle = '#000'; for (let i = 0; i < 5; i++) { const bx = 1180 - ((lt * 70 + i * 120) % 1500), by = 560 + i * 40 + Math.sin(lt + i) * 18; bird(bx, by, 0.8 + (i % 2) * 0.3, lt * 9 + i * 2); } });
  // far mountains & stupas
  layer(0.35, () => {
    ridge(HY - 70, 170, 2, 0.004, 'rgba(0,0,0,0.38)');
    stupa(180, HY - 150, 0.7, 'rgba(0,0,0,0.5)'); stupa(900, HY - 160, 0.55, 'rgba(0,0,0,0.5)');
    ridge(HY - 10, 110, 5, 0.006, 'rgba(0,0,0,0.62)');
  });
  // temple
  layer(0.6, () => { ctx.save(); ctx.translate(CX, HY + 4); ctx.scale(0.86, 0.86); temple(lt); ctx.restore(); });
  // ground + board grid
  layer(0.8, () => {
    ctx.fillStyle = '#000'; ctx.fillRect(-300, HY, W + 600, H);
    board({ hy: HY, f: 900, camH: 200, cell: 80, zNear: 140, zFar: 2400, cols: 26, fillA: ORANGE, alpha: 0.10, scroll: lt * 40, clipTop: HY });
    board({ hy: HY, f: 900, camH: 200, cell: 80, zNear: 140, zFar: 2400, cols: 26, line: ORANGE, lw: 2.5, alpha: 0.85, scroll: lt * 40, clipTop: HY });
    const hz = ctx.createLinearGradient(0, HY - 40, 0, HY + 60); hz.addColorStop(0, oa(0)); hz.addColorStop(0.5, oa(0.45)); hz.addColorStop(1, oa(0)); ctx.fillStyle = hz; ctx.fillRect(-300, HY - 40, W + 600, 100);
  });
  // palms + elephant
  layer(1.0, () => {
    palm(70, HY + 40, 560, lt, 0.12, 0); palm(200, HY + 30, 380, lt, -0.08, 1.3);
    palm(1010, HY + 40, 600, lt, -0.14, 2.1); palm(880, HY + 25, 340, lt, 0.1, 3.7);
    elephant(lerp(1000, 735, prog(t, 3.4, 9.8)), HY + 38, 0.62, lt);
  });
  dust(lt, oa(0.9), 60, 21);
  embers(t, 0.35, 0.7);
  // heat haze band
  // top darkening for text
  const tg = ctx.createLinearGradient(0, 0, 0, 640); tg.addColorStop(0, ba(0.7)); tg.addColorStop(1, ba(0)); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 640);
  // texts
  const out = 9.35;
  plashka(t, 3.72, 'VI СТОЛІТТЯ', CX, 270, { size: 38, fam: 'Montserrat', weight: 800, ls: 6, out });
  kText(t, 3.85, 'ІНДІЯ', CX, 410, { size: 170, style: 'letters', stagger: 0.06, dur: 0.6, out });
  kText(t, 5.55, 'батьківщина шахів', CX, 520, { size: 40, weight: 500, fam: 'Montserrat', style: 'fade', dur: 0.5, out, alpha: 0.85 });
  kText(t, 8.30, 'ЧАТУРАНГА', CX, 1345, { size: fitSize('ЧАТУРАНГА', 960, 116), style: 'letters', color: ORANGE, stagger: 0.04, dur: 0.5, out });
  kText(t, 8.70, '4 роди війська', CX, 1430, { size: 38, weight: 500, fam: 'Montserrat', style: 'fade', dur: 0.4, out, alpha: 0.85 });
  const chips = ['ПІХОТА', 'КІННОТА', 'СЛОНИ', 'КОЛІСНИЦІ'];
  ctx.save(); setText(ctx, 26, 800, 'Montserrat', 2);
  const ws = chips.map(c => ctx.measureText(c).width + 40); const tot = ws.reduce((a, b) => a + b, 0) + 14 * 3; let x = CX - tot / 2;
  ctx.restore();
  chips.forEach((c, i) => {
    const t0 = 8.85 + i * 0.13; const p = eOutBack(prog(t, t0, t0 + 0.35)); const o = 1 - prog(t, out, out + 0.3);
    if (p > 0 && o > 0) {
      ctx.save(); ctx.globalAlpha = clamp(p) * o; const w = ws[i];
      ctx.translate(x + w / 2, 1505); ctx.scale(p, p);
      ctx.strokeStyle = ORANGE; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-w / 2, -27, w, 54, 27); ctx.stroke();
      ctx.fillStyle = '#fff'; setText(ctx, 26, 800, 'Montserrat', 2); ctx.textAlign = 'center'; ctx.fillText(c, 0, 2); ctx.restore();
    }
    x += ws[i] + 14;
  });
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
function scenePersia(t) {
  const lt = t - 9.6;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const HY = 1330;
  // camera: slow push; final zoom into the iwan
  const zin = eInExpo(prog(t, 16.98, 17.45));
  const z = (1 + 0.07 * prog(t, 9.6, 17)) * (1 + zin * 14);
  const intro = eOutExpo(prog(t, 9.6, 10.5));
  const focusY = HY - 0.76 * 190; // arch center (scene units)
  const layer = (depth, fn) => { ctx.save(); const zz = 1 + (z - 1) * depth; const fy = lerp(960, focusY, zin); ctx.translate(CX, fy + (1 - intro) * 120 * depth); ctx.scale(zz * lerp(1.08, 1, intro), zz * lerp(1.08, 1, intro)); ctx.translate(-CX, -fy); fn(); ctx.restore(); };
  layer(0.1, () => {
    const g = ctx.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, oa(0)); g.addColorStop(0.6, oa(0.06)); g.addColorStop(0.9, oa(0.3)); g.addColorStop(1, oa(0.55)); ctx.fillStyle = g; ctx.fillRect(-200, -300, W + 400, HY + 300);
    // stars
    const r = mulberry(5); for (let i = 0; i < 140; i++) { const x = r() * W, y = r() * HY * 0.8, s = r() * 2 + 0.6, ph = r() * 6; ctx.fillStyle = wa(0.25 + 0.6 * Math.abs(Math.sin(lt * 1.5 + ph))); ctx.fillRect(x, y, s, s); }
    // giant rotating girih star
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
  // dunes + caravan (foreground)
  layer(1.0, () => {
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-100, HY + 90); ctx.bezierCurveTo(200, HY - 20, 380, HY - 10, 620, HY + 60); ctx.bezierCurveTo(800, HY + 110, 980, HY + 30, 1200, HY + 50); ctx.lineTo(1200, HY + 200); ctx.lineTo(-100, HY + 200); ctx.fill();
    const cx0 = lerp(60, 380, prog(t, 9.6, 17.4));
    for (let i = 0; i < 4; i++) { const x = cx0 - i * 95; const y = HY + 30 - Math.max(0, 20 - Math.abs(x - 300) * 0.05); camel(x, y + 18, 0.36, lt, i * 1.3); }
  });
  dust(lt, wa(0.5), 70, 33, 1);
  embers(t, 0.25, 0.6);
  const tg = ctx.createLinearGradient(0, 0, 0, 560); tg.addColorStop(0, ba(0.75)); tg.addColorStop(1, ba(0)); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 560);

  // --- text beats ---
  plashka(t, 9.85, 'VII СТОЛІТТЯ', CX, 270, { size: 38, fam: 'Montserrat', weight: 800, ls: 6, out: 13.0 });
  kText(t, 9.95, 'ПЕРСІЯ', CX, 400, { size: 160, style: 'letters', stagger: 0.06, dur: 0.6, out: 13.0 });
  kText(t, 10.85, 'ШАТРАНДЖ', CX, 1450, { size: fitSize('ШАТРАНДЖ', 940, 120), style: 'slam', from: 1.5, color: ORANGE, dur: 0.45, out: 13.0 });
  kText(t, 11.25, 'так перси назвали гру', CX, 1540, { size: 38, weight: 500, fam: 'Montserrat', style: 'fade', alpha: 0.85, out: 13.0 });

  // ШАХ / МАТ beat
  const dk = prog(t, 13.0, 13.2) * (1 - prog(t, 14.25, 14.45));
  const dk2 = prog(t, 14.3, 14.55) * (1 - prog(t, 16.75, 16.97));
  ctx.fillStyle = ba(0.62 * dk + 0.78 * dk2); ctx.fillRect(0, 0, W, H);
  kText(t, 13.15, 'ШАХ', CX, 780, { size: 270, style: 'slam', from: 2.6, dur: 0.4, out: 14.25, outDur: 0.2 });
  kText(t, 13.72, 'МАТ', CX, 1050, { size: 270, style: 'slam', from: 2.6, color: ORANGE, dur: 0.4, out: 14.25, outDur: 0.2 });
  kText(t, 13.95, 'перською — «король переможений»', CX, 1225, { size: 38, weight: 500, fam: 'Montserrat', style: 'fade', dur: 0.3, out: 14.25, outDur: 0.2, alpha: 0.9 });

  // ferz demo
  if (dk2 > 0) ferzDemo(t, dk2);
}
function ferzDemo(t, a) {
  const S = 210, bx = CX - S * 1.5, by = 975 - S * 1.5;
  const pin = eOutBack(prog(t, 14.3, 14.75), 1.2);
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(CX, 975); ctx.scale(lerp(0.85, 1, pin), lerp(0.85, 1, pin)); ctx.translate(-CX, -975);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const light = (r + c) % 2 === 0;
    ctx.fillStyle = light ? wa(0.16) : ba(0.9); ctx.fillRect(bx + c * S, by + r * S, S, S);
  }
  // highlights on diagonals
  const diag = [[0, 0], [2, 0], [2, 2], [0, 2]];
  diag.forEach(([c, r], i) => {
    const t0 = 15.25 + i * 0.17; const p = eOutBack(prog(t, t0, t0 + 0.3)); if (p <= 0) return;
    const pulse = 0.75 + 0.25 * Math.sin((t - t0) * 8);
    ctx.save(); ctx.translate(bx + c * S + S / 2, by + r * S + S / 2); ctx.scale(p, p);
    ctx.fillStyle = oa(0.85 * pulse); ctx.fillRect(-S / 2 + 6, -S / 2 + 6, S - 12, S - 12);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 6.283); ctx.fill(); ctx.restore();
    // arrow line from center
    const ap = eOutExpo(prog(t, t0, t0 + 0.35)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const sx = CX, sy = 975, ex = bx + c * S + S / 2, ey = by + r * S + S / 2;
    ctx.beginPath(); ctx.moveTo(lerp(sx, ex, 0.3), lerp(sy, ey, 0.3)); ctx.lineTo(lerp(sx, ex, lerp(0.3, 0.72, ap)), lerp(sy, ey, lerp(0.3, 0.72, ap))); ctx.stroke();
  });
  ctx.strokeStyle = wa(0.5); ctx.lineWidth = 3; ctx.strokeRect(bx, by, S * 3, S * 3);
  // the ferz: drops in, then hops one square
  const drop = eOutBack(prog(t, 14.55, 14.9), 1.6);
  const hop = eInOutCubic(prog(t, 16.15, 16.5));
  const px = lerp(CX, bx + 2 * S + S / 2, hop), py = lerp(975, by + S / 2, hop) + 80 - Math.sin(hop * Math.PI) * 90 - (1 - drop) * 300;
  if (drop > 0) drawPiece(ctx, 'queen', px, py, 0.32, { fill: 'white', rimL: 0.9, glow: 0.4, alpha: clamp(drop * 3) });
  ctx.restore();
  // texts
  kText(t, 14.42, 'ФЕРЗЬ', CX, 520, { size: 130, style: 'up', dur: 0.5, out: 16.75, outDur: 0.2, alpha: a });
  kText(t, 14.62, 'тоді — радник шаха', CX, 618, { size: 36, weight: 500, fam: 'Montserrat', style: 'fade', alpha: 0.85 * a, out: 16.75, outDur: 0.2 });
  kText(t, 15.15, 'ХОДИВ ЛИШЕ НА', CX, 1395, { size: 56, style: 'up', dur: 0.45, out: 16.75, outDur: 0.2, alpha: a });
  plashka(t, 15.95, '1 КЛІТИНКУ', CX, 1495, { size: 70, dur: 0.4, out: 16.75, outDur: 0.2, rot: -2 });
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
function sceneEurope(t) {
  const lt = t - 17.42;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const HY = 1300;
  const intro = eOutExpo(prog(t, 17.42, 18.4));
  const climax = eInOutCubic(prog(t, 21.95, 22.6));
  const z = (1 + 0.06 * prog(t, 17.4, 22)) * lerp(1, 1.12, climax);
  const layer = (depth, fn) => { ctx.save(); const zz = (1 + (z - 1) * depth) * lerp(1.25, 1, intro); ctx.translate(CX, 960 + climax * 160 * depth); ctx.scale(zz, zz); ctx.translate(-CX, -960); fn(); ctx.restore(); };
  // sky + moon
  layer(0.15, () => {
    const g = ctx.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, wa(0)); g.addColorStop(0.7, wa(0.04)); g.addColorStop(1, oa(0.25)); ctx.fillStyle = g; ctx.fillRect(-200, -300, W + 400, HY + 300);
    const mx = CX, my = 820, mr = 270;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 2.6); gl.addColorStop(0, wa(0.18)); gl.addColorStop(1, wa(0)); ctx.fillStyle = gl; ctx.fillRect(mx - mr * 2.6, my - mr * 2.6, mr * 5.2, mr * 5.2); ctx.restore();
    ctx.fillStyle = wa(0.93); ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
    const r = mulberry(4); ctx.fillStyle = ba(0.07); for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = r() * mr * 0.8, cr = 10 + r() * 45; ctx.beginPath(); ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, cr, 0, 6.283); ctx.fill(); }
    const sh = ctx.createRadialGradient(mx - 80, my - 80, mr * 0.2, mx, my, mr); sh.addColorStop(0, ba(0)); sh.addColorStop(1, ba(0.18)); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
  });
  // clouds
  layer(0.25, () => {
    const r = mulberry(9);
    for (let i = 0; i < 9; i++) { const y = 460 + r() * 700, w = 300 + r() * 400, sp = 12 + r() * 25, x = ((r() * 1600 + lt * sp) % 1800) - 400; const dark = i % 3 !== 0;
      ctx.fillStyle = dark ? ba(0.55) : wa(0.05); for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(x + k * w / 6, y + Math.sin(k * 1.7) * 14, w / 5, 26 + (k % 3) * 9, 0, 0, 6.283); ctx.fill(); } }
  });
  // birds
  layer(0.4, () => { ctx.fillStyle = '#000'; for (let i = 0; i < 6; i++) { const bx = -150 + ((lt * 90 + i * 70) % 1400), by = 700 + i * 35 + Math.sin(lt * 1.3 + i) * 20; bird(bx, by, 1.1 - i * 0.08, lt * 10 + i * 1.4); } });
  layer(0.35, () => { ridge(HY - 60, 150, 13, 0.005, 'rgba(0,0,0,0.6)'); });
  layer(0.6, () => { ctx.save(); ctx.translate(CX, HY - 40); ctx.scale(0.95, 0.95); castle(lt); ctx.restore(); });
  // fog
  layer(0.7, () => { for (let i = 0; i < 4; i++) { const y = HY - 120 + i * 40; const x = ((lt * (20 + i * 8) + i * 300) % 1400) - 300; const g = ctx.createRadialGradient(x, y, 0, x, y, 420); g.addColorStop(0, wa(0.07)); g.addColorStop(1, wa(0)); ctx.fillStyle = g; ctx.fillRect(x - 420, y - 120, 840, 240); } });
  layer(0.85, () => {
    ctx.fillStyle = '#000'; ctx.fillRect(-300, HY, W + 600, H);
    board({ hy: HY, f: 900, camH: 260, cell: 100, zNear: 130, zFar: 2600, cols: 22, fillA: '#fff', alpha: 0.11 + 0.15 * climax, scroll: lt * 20, clipTop: HY });
  });
  // lightning
  const fl = Math.max(Math.exp(-(t - 17.42) * 9) * (t >= 17.42 ? 1 : 0), t >= 17.62 ? Math.exp(-(t - 17.62) * 12) * 0.7 : 0);
  if (fl > 0.02) {
    ctx.save(); ctx.globalAlpha = fl; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.shadowColor = '#fff'; ctx.shadowBlur = 30;
    ctx.translate(200, 300); ctx.beginPath(); BOLT.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke(); ctx.restore();
    ctx.fillStyle = wa(fl * 0.75); ctx.fillRect(0, 0, W, H);
  }
  dust(lt, wa(0.4), 40, 44);
  const tg = ctx.createLinearGradient(0, 0, 0, 600); tg.addColorStop(0, ba(0.8)); tg.addColorStop(1, ba(0)); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 600);

  // climax darkening
  ctx.fillStyle = ba(0.6 * climax); ctx.fillRect(0, 0, W, H);
  // texts — arrival
  plashka(t, 17.55, 'X СТОЛІТТЯ', CX, 270, { size: 38, fam: 'Montserrat', weight: 800, ls: 6, out: 20.15 });
  kText(t, 17.65, 'ЄВРОПА', CX, 400, { size: 160, style: 'letters', stagger: 0.06, dur: 0.6, out: 20.15 });
  kText(t, 17.95, 'через Іспанію', CX, 505, { size: 40, weight: 500, fam: 'Montserrat', style: 'fade', alpha: 0.85, out: 20.15 });
  // XV
  const xv = prog(t, 20.3, 20.75); const xvOut = prog(t, 21.9, 22.15);
  if (xv > 0 && xvOut < 1) {
    ctx.save(); ctx.globalAlpha = 1 - xvOut; setText(ctx, 300, 900, 'Unbounded'); ctx.textAlign = 'center';
    const sc = lerp(1.4, 1, eOutExpo(xv)); ctx.translate(CX, 350 - xvOut * 40); ctx.scale(sc, sc);
    ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText('XV', 0, 0);
    const fw = eInOutCubic(prog(t, 20.55, 21.2)); ctx.save(); ctx.beginPath(); ctx.rect(-300, -200, 600 * fw, 400); ctx.clip(); ctx.fillStyle = ORANGE; ctx.fillText('XV', 0, 0); ctx.restore();
    ctx.restore();
  }
  kText(t, 20.6, 'СТОЛІТТЯ', CX, 505, { size: 44, weight: 800, fam: 'Montserrat', ls: 14, style: 'up', out: 21.9, outDur: 0.25 });
  // climax: the queen rises with rays
  if (climax > 0) {
    const qx = CX, qy = 1520;
    const rise = eOutExpo(prog(t, 22.0, 22.9));
    const burst = eOutExpo(prog(t, 22.83, 23.6));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(qx, qy - 330, 20, qx, qy - 330, 900); g.addColorStop(0, oa(0.75 * climax)); g.addColorStop(0.4, oa(0.2 * climax)); g.addColorStop(1, oa(0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // queen move rays (8 directions) on screen
    if (burst > 0) {
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + Math.PI / 8 * 0; const L = 1500 * burst; const wid = 10 + 26 * (1 - burst) ;
        ctx.save(); ctx.translate(qx, qy - 320); ctx.rotate(a);
        const lg = ctx.createLinearGradient(0, 0, L, 0); lg.addColorStop(0, oa(0.95)); lg.addColorStop(0.7, oa(0.4)); lg.addColorStop(1, oa(0));
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, -wid); ctx.lineTo(L, -2); ctx.lineTo(L, 2); ctx.lineTo(0, wid); ctx.fill();
        ctx.fillStyle = wa(0.6); ctx.fillRect(0, -1.5, L * 0.85, 3);
        ctx.restore();
      }
      const sw = prog(t, 22.83, 23.5); ctx.strokeStyle = wa(0.6 * (1 - sw)); ctx.lineWidth = 6 * (1 - sw) + 1; ctx.beginPath(); ctx.arc(qx, qy - 320, 50 + sw * 900, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
    const hover = Math.sin((t - 22.9) * 2.2) * 8 * prog(t, 22.9, 23.4);
    drawPiece(ctx, 'queen', qx, lerp(qy + 700, qy, rise) + hover, 1.0, { fill: 'white', rimL: 1, rimR: 0.6, glow: 0.9 * climax + 0.5 * burst, alpha: clamp(rise * 2) });
  }
  kText(t, 22.30, 'ФЕРЗЬ СТАВ', CX, 360, { size: 80, style: 'up', dur: 0.5, out: 24.95, outDur: 0.2 });
  plashka(t, 22.83, 'НАЙСИЛЬНІШОЮ', CX, 490, { size: fitSize('НАЙСИЛЬНІШОЮ', 920, 96), dur: 0.42, rot: -2, out: 24.95, outDur: 0.2 });
  kText(t, 23.85, 'ФІГУРОЮ', CX, 625, { size: 88, style: 'up', dur: 0.5, out: 24.95, outDur: 0.2 });
  embers(t, climax ? 0.9 : 0.25, 0.9, climax ? { t: 22.83, x: CX, y: 1200 } : null);
}

// ===================================================================
// SCENE 5 — CTA (25.1 – 30)
// ===================================================================
function sceneCTA(t) {
  const lt = t - 25.1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const pulse = 0.85 + 0.15 * Math.sin(lt * 3);
  const g = ctx.createRadialGradient(CX, 820, 60, CX, 820, 900); g.addColorStop(0, oa(0.5 * pulse)); g.addColorStop(0.45, oa(0.12)); g.addColorStop(1, oa(0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(CX, 820); ctx.rotate(lt * 0.1);
  for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI * 2 / 16); ctx.fillStyle = oa(0.045); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -1300); ctx.lineTo(40, -1300); ctx.fill(); }
  ctx.restore();
  board({ hy: 1500, f: 900, camH: 300, cell: 110, zNear: 150, zFar: 2400, cols: 16, fillA: '#fff', alpha: 0.08, scroll: lt * 30, clipTop: 1500 });
  board({ hy: 1500, f: 900, camH: 300, cell: 110, zNear: 150, zFar: 2400, cols: 16, line: oa(0.6), lw: 2, alpha: 0.35, scroll: lt * 30, clipTop: 1500 });
  embers(t, 0.7, 0.9, { t: 28.95, x: 540, y: 1330 });
  // headline
  kText(t, 25.25, 'БІЛЬШЕ ІСТОРІЙ', CX, 285, { size: fitSize('БІЛЬШЕ ІСТОРІЙ', 940, 82), style: 'up', dur: 0.5 });
  plashka(t, 25.55, 'ПРО ШАХИ', CX, 400, { size: 74, dur: 0.45, rot: -2 });
  // avatar
  const ap = eOutBack(prog(t, 25.45, 26.0), 1.4);
  if (ap > 0 && avatar.complete) {
    const R = 215, ax = CX, ay = 760;
    ctx.save(); ctx.translate(ax, ay); ctx.scale(ap, ap);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const ag = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.7); ag.addColorStop(0, oa(0.5 * pulse)); ag.addColorStop(1, oa(0)); ctx.fillStyle = ag; ctx.fillRect(-R * 1.7, -R * 1.7, R * 3.4, R * 3.4); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.clip(); ctx.drawImage(avatar, -R, -R, R * 2, R * 2); ctx.restore();
    const ring = eInOutCubic(prog(t, 25.6, 26.3));
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R + 14, -Math.PI / 2, -Math.PI / 2 + ring * Math.PI * 2); ctx.stroke();
    ctx.rotate(lt * 0.35); ctx.setLineDash([3, 16]); ctx.strokeStyle = wa(0.5); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R + 40, 0, 6.283); ctx.stroke();
    ctx.restore();
  }
  kText(t, 26.35, '@daniil_chess', CX, 1060, { size: 64, weight: 800, fam: 'Montserrat', style: 'type', dur: 0.75 });
  kText(t, 27.25, '[ закохую людей в шахи ]', CX, 1140, { size: 38, weight: 500, fam: 'Montserrat', style: 'fade', alpha: 0.8, dur: 0.5 });
  // button
  const bp = eOutBack(prog(t, 28.25, 28.7), 2.0);
  if (bp > 0) {
    const tap = prog(t, 28.9, 29.15); const press = Math.sin(tap * Math.PI) * 0.07;
    const bw = 700, bh = 140, by = 1330;
    ctx.save(); ctx.translate(CX, by); ctx.scale(bp * (1 - press), bp * (1 - press));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = ORANGE; ctx.shadowBlur = 60 * pulse; ctx.fillStyle = oa(0.6); ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
    // shine sweep
    const sh = prog(t, 29.25, 29.75); if (sh > 0 && sh < 1) { ctx.save(); ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.clip(); const sx = lerp(-bw, bw, eInOutCubic(sh)); const sg = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0); sg.addColorStop(0, wa(0)); sg.addColorStop(0.5, wa(0.55)); sg.addColorStop(1, wa(0)); ctx.fillStyle = sg; ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.restore(); }
    setText(ctx, 50, 900, 'Unbounded', 1); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('ПІДПИСАТИСЯ', 0, 3);
    ctx.restore();
    // tap ripple + finger dot
    if (t > 28.75) {
      const fx = CX + 255, fy = by + 30; const tp = prog(t, 28.75, 28.95);
      const fxx = lerp(fx + 140, fx, eOutCubic(tp)), fyy = lerp(fy + 220, fy, eOutCubic(tp));
      const fade = 1 - prog(t, 29.3, 29.6);
      ctx.fillStyle = wa(0.35 * fade); ctx.strokeStyle = wa(0.9 * fade); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(fxx, fyy, 34 * (1 - press * 2), 0, 6.283); ctx.fill(); ctx.stroke();
      const rp = prog(t, 28.95, 29.6); if (rp > 0 && rp < 1) { ctx.strokeStyle = wa(0.8 * (1 - rp)); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(fx, fy, 30 + rp * 160, 0, 6.283); ctx.stroke(); }
    }
  }
}

// ===================================================================
// Transitions & master
// ===================================================================
function barWipe(t, t0) {
  // three diagonal bars sweeping L→R; scene switches when black bar covers
  const cols = [ORANGE, '#fff', '#000'];
  cols.forEach((c, i) => {
    const p = eInOutCubic(prog(t, t0 + i * 0.06, t0 + i * 0.06 + 0.42)); if (p <= 0 || p >= 1) return;
    ctx.save(); ctx.translate(CX, 960); ctx.rotate(-0.33);
    const bw = 1700; const x = lerp(-2400, 2400, p);
    ctx.fillStyle = c; ctx.fillRect(x - bw / 2, -1600, bw, 3200); ctx.restore();
  });
}
const IMPACTS = [[0.30, 14], [1.45, 8], [3.42, 10], [10.85, 6], [13.15, 16], [13.72, 16], [17.42, 22], [20.3, 10], [22.83, 18], [25.12, 10], [28.25, 6]];
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
  if (t < 3.42) sceneHook(t);
  else if (t < 9.64) sceneIndia(t);
  else if (t < 17.42) scenePersia(t);
  else if (t < 25.12) sceneEurope(t);
  else sceneCTA(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  vignette(0.55);
  // T2 bar wipe India → Persia
  if (t > 9.38 && t < 10.0) barWipe(t, 9.40);
  // T3 tail: black hold after zoom into arch
  if (t > 17.3 && t < 17.42) { ctx.fillStyle = ba(prog(t, 17.3, 17.4)); ctx.fillRect(0, 0, W, H); }
  // T4 white flash into CTA
  const wf = prog(t, 24.95, 25.12) * (1 - eOutCubic(prog(t, 25.12, 25.55)));
  if (wf > 0) { ctx.fillStyle = wa(wf); ctx.fillRect(0, 0, W, H); }
  // opening flash
  const of = 1 - prog(t, 0, 0.35); if (of > 0) { ctx.fillStyle = ba(of); ctx.fillRect(0, 0, W, H); }
  grain(t);
  ctx.restore();
}
window.renderFrame = renderFrame;
window.ready = (async () => {
  const SAMPLE = 'АБВІЇЄабвіїє XVI @_abc —«»[]1';
  await Promise.all([
    ...['900', '700', '400'].map(w => document.fonts.load(`${w} 100px "Unbounded"`, SAMPLE)),
    ...['500', '700', '800', '900'].map(w => document.fonts.load(`${w} 100px "Montserrat"`, SAMPLE)),
    new Promise(r => { if (avatar.complete) r(); else avatar.onload = r; }),
  ]);
  buildPieces(); buildGrain();
  return true;
})();
