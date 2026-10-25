// Scenario engine shared by every part of the series: pieces, highlights, beams, shockwaves, camera path, cues.
// A part file calls createEngine(), describes its scene with pc()/hl()/beam()/shockAt()/cue(), then exports
// stateAt = E.makeStateAt(CAM, lightAt). All state is a pure function of t.
import { sqPos } from './world.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;
export const eOutExpo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
export const eInOutExpo = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
export const eInOutCubic = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const eOutCubic = x => 1 - Math.pow(1 - x, 3);
export const eInCubic = x => x * x * x;
export const eOutBack = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const D2R = Math.PI / 180;

export const F = 'abcdefgh';
const at = (f, r) => (f >= 0 && f < 8 && r >= 1 && r <= 8) ? F[f] + r : null;
export function rays(sq, dirs) {
  const f0 = F.indexOf(sq[0]), r0 = +sq[1], out = [];
  for (const [df, dr] of dirs) for (let k = 1; k < 8; k++) { const s = at(f0 + df * k, r0 + dr * k); if (!s) break; out.push({ sq: s, d: k }); }
  return out;
}
export const ORTH = [[0, 1], [0, -1], [1, 0], [-1, 0]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

export function createEngine() {
  const CUES = [];
  const cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });

  // ---------------------------------------------------------------- pieces
  // enter: 'drop' (falls from above, default when `in` is set) | 'pop' (scales up in place)
  // outKind: 'fly' | 'sink' | 'pop';  alpha < 1 → ghost piece
  const PIECES = [];
  const DROP = 0.32;
  function pc(id, type, white, sq, o = {}) {
    const p = { id, type, white, sq, in: o.in ?? null, enter: o.enter || 'drop', out: o.out ?? null, outKind: o.outKind || 'fly', moves: o.moves || [], cap: o.cap ?? null, capDir: o.capDir || [1, -1], topple: o.topple ?? null, glow: o.glow || [], alpha: o.alpha ?? 1 };
    PIECES.push(p);
    if (p.in != null && p.enter === 'drop') cue(p.in + DROP, 'land', { piece: type, soft: o.softLand ? 1 : 0 });
    if (p.in != null && p.enter === 'pop' && !o.silent) cue(p.in, 'morph', { piece: type });
    for (const [mt, , dur, kind] of p.moves) { cue(mt, kind === 'slide' ? 'slide' : 'lift', { dur, piece: type }); cue(mt + dur, 'land', { piece: type, hard: kind === 'slam' ? 1 : 0 }); }
    if (p.cap != null) cue(p.cap, 'capture', { piece: type });
    if (p.topple != null) cue(p.topple, 'topple');
    return p;
  }
  function poseAt(p, t) {
    if (p.in != null && t < p.in) return null;
    const outD = p.outKind === 'fly' ? 0.45 : p.outKind === 'pop' ? 0.12 : 0.25;
    if (p.out != null && t > p.out + outD) return null;
    if (p.cap != null && t > p.cap + 0.75) return null;
    let { x, z } = sqPos(p.sq), y = 0, s = 1, rx = 0, rz = 0;
    let ry = p.type === 'knight' ? (p.white ? 0.45 : Math.PI - 0.45) : 0;
    if (p.in != null && p.enter === 'drop') {
      const u = prog(t, p.in, p.in + DROP);
      y = 7 * (1 - eInCubic(u)); ry += (1 - u) * 1.8;
      const b = t - (p.in + DROP); if (b > 0 && b < 0.3) y += 0.1 * Math.abs(Math.sin(b * Math.PI / 0.15)) * Math.exp(-b * 12);
    } else if (p.in != null && p.enter === 'pop') {
      const u = prog(t, p.in, p.in + 0.24);
      s *= Math.max(0, eOutBack(u, 2.6)); ry += (1 - eOutCubic(u)) * 2.4;
    }
    for (const [mt, to, dur, kind, h] of p.moves) {
      if (t < mt) break;
      const u = prog(t, mt, mt + dur), q = sqPos(to);
      const e = kind === 'slam' ? eInCubic(u) : eInOutCubic(u);
      const nx = lerp(x, q.x, e), nz = lerp(z, q.z, e);
      if (u < 1) {
        const arcH = kind === 'jump' ? (h || 1.6) : kind === 'slide' ? 0.05 : kind === 'slam' ? 0.9 : 0.45;
        y += arcH * Math.sin(Math.PI * (kind === 'slam' ? Math.sqrt(u) : u)) * (kind === 'slam' ? (1 - u) : 1);
        const lean = Math.sin(Math.PI * u) * (kind === 'jump' ? 0.35 : 0.14);
        const dx = q.x - x, dz = q.z - z, L = Math.hypot(dx, dz) || 1;
        rx += lean * dz / L; rz -= lean * dx / L;
        if (kind === 'jump') ry += Math.sin(Math.PI * u) * 0.5;
      }
      x = nx; z = nz;
    }
    if (p.cap != null && t > p.cap) {
      const u = prog(t, p.cap, p.cap + 0.75), e = eOutCubic(u);
      x += p.capDir[0] * 3.2 * e; z += p.capDir[1] * 3.2 * e; y += 2.2 * Math.sin(Math.PI * Math.min(1, u * 1.2)) + u * 0.5;
      rx += u * 6 * p.capDir[1]; rz -= u * 6 * p.capDir[0]; s = 1 - eInCubic(u);
    }
    if (p.topple != null && t > p.topple) {
      const u = prog(t, p.topple, p.topple + 0.85);
      let a = (Math.PI / 2) * eInCubic(Math.min(1, u * 1.25));
      if (u > 0.8) a -= 0.12 * Math.sin((u - 0.8) / 0.2 * Math.PI) * (1 - u) * 5; // small bounce
      rz = a; y = 0.36 * Math.sin(a); x -= 0.15 * Math.sin(a);   // tips over toward −x, rests on its widest radius
    }
    if (p.out != null && t > p.out) {
      const u = prog(t, p.out, p.out + outD);
      if (p.outKind === 'fly') { y += 8 * eInCubic(u); ry += u * 4; s *= 1 - eInCubic(u) * 0.6; }
      else if (p.outKind === 'pop') { s *= 1 - eInCubic(u); ry += u * 1.5; }
      else { s *= 1 - eInCubic(u); y -= 0.3 * u; }
    }
    let glow = 0; for (const [g0, g1, k, pulse] of p.glow) { const a = prog(t, g0, g0 + 0.3) * (1 - prog(t, g1, g1 + 0.3)); glow = Math.max(glow, a * k * (pulse ? 0.65 + 0.35 * Math.sin(t * pulse) : 1)); }
    const q = { id: p.id, type: p.type, white: p.white, x, y, z, rx, ry, rz, s, glow };
    if (p.alpha < 1) q.alpha = p.alpha;
    return q;
  }

  // ---------------------------------------------------------------- highlights, beams, shockwaves
  const HLS = [];
  function hl(kind, sqs, t0, t1, o = {}) {
    const list = sqs.map((s, i) => typeof s === 'string' ? { sq: s, d: i } : s);
    HLS.push({ kind, list, t0, t1, st: o.st ?? 0.04, pulse: o.pulse || 0, max: o.max ?? (kind === 'fill' ? 0.85 : 1) });
    if (!o.silent) cue(t0, 'blips', { n: list.length, st: o.st ?? 0.04, kind, d: list.map(l => l.d) });
  }
  const BEAMS = [];
  function beam(from, to, t0, t1, o = {}) { BEAMS.push({ from, to, t0, t1, grow: o.grow ?? 0.25, w: o.w || 1 }); if (!o.silent) cue(t0, 'beam', { dur: o.grow ?? 0.25 }); }
  const SHOCKS = [];
  function shockAt(sq, t, o = {}) { SHOCKS.push({ sq, t, R: o.R || 5 }); }

  // ---------------------------------------------------------------- camera
  const EASE = { lin: x => x, expo: eInOutExpo, cubic: eInOutCubic };
  function camAt(CAM, t) {
    let i = 0; while (i < CAM.length - 1 && CAM[i + 1].t <= t) i++;
    const A = CAM[i], B = CAM[Math.min(i + 1, CAM.length - 1)];
    let k = 0;
    if (B !== A && B.e !== 'cut') k = (EASE[B.e] || eInOutCubic)(prog(t, A.t, B.t));
    const az = lerp(A.az, B.az, k) * D2R, el = lerp(A.el, B.el, k) * D2R, d = lerp(A.d, B.d, k), fov = lerp(A.fov, B.fov, k);
    const tg = A.tgt.map((v, j) => lerp(v, B.tgt[j], k));
    // subtle handheld drift
    const hx = Math.sin(t * 0.7) * 0.04 + Math.sin(t * 1.9) * 0.015, hy = Math.cos(t * 0.9) * 0.03;
    const pos = [tg[0] + d * Math.cos(el) * Math.sin(az) + hx * d * 0.05, tg[1] + d * Math.sin(el) + hy * d * 0.05, tg[2] + d * Math.cos(el) * Math.cos(az)];
    return { pos, tgt: tg, fov };
  }
  function camCues(CAM) {
    CAM.forEach((c, i) => { if (i && (c.e === 'expo' || c.e === 'cut') && Math.abs(c.az - CAM[i - 1].az) > 6) cue(c.e === 'cut' ? c.t : CAM[i - 1].t, 'camWhoosh', { dur: c.t - CAM[i - 1].t, cut: c.e === 'cut' ? 1 : 0 }); });
  }

  // ---------------------------------------------------------------- state
  function makeStateAt(CAM, lightAt) {
    return function stateAt(t) {
      const pieces = []; for (const p of PIECES) { const q = poseAt(p, t); if (q) pieces.push(q); }
      const hlv = [];
      for (const h of HLS) {
        if (t < h.t0 || t > h.t1 + 0.3) continue;
        for (const { sq, d } of h.list) {
          const t0 = h.t0 + d * h.st, u = prog(t, t0, t0 + 0.2);
          let a = eOutCubic(u) * (1 - prog(t, h.t1, h.t1 + 0.28)) * h.max;
          if (h.pulse) a *= 0.7 + 0.3 * Math.sin(t * h.pulse);
          const sc = h.kind === 'fill' ? lerp(0.6, 1, eOutBack(u)) : lerp(1.6, 1, eOutCubic(u));
          hlv.push({ kind: h.kind, sq, a, sc });
        }
      }
      const bv = [];
      for (const b of BEAMS) {
        if (t < b.t0 || t > b.t1 + 0.3) continue;
        const A = sqPos(b.from), B = sqPos(b.to), g = eOutExpo(prog(t, b.t0, b.t0 + b.grow));
        bv.push({ x1: A.x, z1: A.z, x2: lerp(A.x, B.x, g), z2: lerp(A.z, B.z, g), a: 1 - prog(t, b.t1, b.t1 + 0.3), w: b.w });
      }
      let shock = null;
      for (const s of SHOCKS) { const u = prog(t, s.t, s.t + 0.9); if (u > 0 && u < 1) { const p = sqPos(s.sq); shock = { x: p.x, z: p.z, r: 0.2 + s.R * eOutCubic(u), a: (1 - u) * (1 - u) }; } }
      return { cam: camAt(CAM, t), pieces, hl: hlv, beams: bv, shock, light: lightAt(t) };
    };
  }

  // ---------------------------------------------------------------- text + shared CTA/timer cues
  function textCues(TEXTS) {
    for (const x of TEXTS) {
      if (x.k === 'k') cue(x.t, x.style === 'slam' ? 'slam' : 'textUp', { big: x.size >= 180 ? 1 : 0 });
      else if (x.k === 'pl') cue(x.t, 'plate');
      else if (x.k === 'strike') cue(x.t, 'strike');
      else if (x.k === 'b') cue(x.t, 'body');
      else if (x.k === 'label') cue(x.t, 'label');
    }
  }
  function finish(TEXTS, LISTS = [], opts = {}) {
    textCues(TEXTS);
    for (const L of LISTS) { cue(L.t, 'label'); L.items.forEach((_, i) => cue(L.t + 0.45 + i * L.st, 'check')); }
    // CTA cues (drawn in main.js); looped parts set { cta: false, timer: false }
    if (opts.cta !== false) { cue(54.3, 'avatar'); cue(55.0, 'type', { n: 13, dur: 0.75 }); cue(55.85, 'body'); cue(56.6, 'button'); cue(57.45, 'tap'); }
    if (opts.timer !== false) for (let s = 59; s >= 2; s--) cue(60 - s, 'timer', { s });   // timer digit changes (60−t crosses an integer)
    CUES.sort((a, b) => a.t - b.t);
  }

  return { CUES, cue, pc, hl, beam, shockAt, camCues, makeStateAt, finish };
}
