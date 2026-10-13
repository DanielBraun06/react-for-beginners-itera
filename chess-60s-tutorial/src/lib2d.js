// ProstoChess — "Навчу грати в шахи за 60 секунд" Reel (2D overlay layer). Deterministic canvas renderer: window.renderFrame(t) draws frame at time t (s).
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
