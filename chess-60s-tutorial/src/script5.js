// Part 5 «Топ-3 дебюти за білих»: London (№3), Queen's Gambit (№2), Italian (№1).
// 35 s, fast pace, no timer and no CTA: the last rewind flies the camera back to the hook pose so the video loops.
import { createEngine, prog, F } from './engine.js';

export const DUR = 35;
const E = createEngine();
const { cue, pc, hl, beam } = E;
export const CUES = E.CUES;

// ================================================================= SCENARIO
// Board simulator: openings are written as plain moves; each piece gets its own move list,
// and a rewind sends every displaced piece back home in one slide.
const back = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
const HOME = {}, at = {}, MOVES = {};
for (let f = 0; f < 8; f++) for (const [id, type, sq] of [['wp' + f, 'pawn', F[f] + 2], ['wb' + f, back[f], F[f] + 1], ['bp' + f, 'pawn', F[f] + 7], ['bb' + f, back[f], F[f] + 8]]) {
  HOME[id] = { type, sq, white: id[0] === 'w' }; at[sq] = id; MOVES[id] = [];
}
function mv(t, from, to, kind) {
  const id = at[from]; if (!id) throw new Error(`no piece on ${from}`);
  if (at[to]) throw new Error(`${to} is occupied`);
  const type = HOME[id].type;
  kind = kind || (type === 'knight' ? 'jump' : 'lift');
  MOVES[id].push([t, to, 0.42, kind, kind === 'jump' ? 1.3 : undefined]);
  delete at[from]; at[to] = id;
}
function line(t0, step, moves) { moves.forEach((m, i) => { const [from, to, kind] = m.split(/[- ]/); mv(t0 + i * step, from, to, kind); }); }
function rewind(t) {
  cue(t, 'rewind');
  for (const sq of Object.keys(at)) { const id = at[sq]; if (sq !== HOME[id].sq) MOVES[id].push([t, HOME[id].sq, 0.45, 'slide']); }
  for (const k of Object.keys(at)) delete at[k];
  for (const id in HOME) at[HOME[id].sq] = id;
}
// №3 London System
line(3.5, 0.6, ['d2-d4', 'd7-d5', 'c1-f4', 'g8-f6', 'e2-e3', 'e7-e6', 'g1-f3', 'c7-c5', 'c2-c3']);
hl('fill', ['c3', 'd4', 'e3'], 8.9, 12.3, { st: 0.15, max: 0.6 });
hl('ring', ['f4'], 9.5, 12.3, { pulse: 8 });
rewind(12.45);
// №2 Queen's Gambit (declined)
line(13.5, 0.55, ['d2-d4', 'd7-d5', 'c2-c4']);
beam('c4', 'd5', 15.1, 17.5, { grow: 0.2 });
hl('ring', ['d5'], 15.1, 17.5, { pulse: 9, silent: true });
line(17.7, 0.55, ['e7-e6', 'b1-c3', 'g8-f6', 'c1-g5']);
beam('g5', 'd8', 19.8, 22.2, { grow: 0.25 });
hl('ring', ['f6'], 19.9, 22.2, { pulse: 9, silent: true });
rewind(22.45);
// №1 Italian
line(23.5, 0.55, ['e2-e4', 'e7-e5', 'g1-f3', 'b8-c6', 'f1-c4']);
beam('c4', 'f7', 26.3, 28.9, { grow: 0.25 });
hl('ring', ['f7'], 26.4, 28.9, { pulse: 9, silent: true });
line(27.3, 0.55, ['f8-c5', 'e1-g1-slide']);
mv(28.5, 'h1', 'f1', 'jump');
hl('fill', ['f2', 'g2', 'h2'], 29.1, 32.5, { st: 0.12, max: 0.5 });
rewind(32.9);
for (const id in HOME) { const h = HOME[id]; pc(id, h.type, h.white, h.sq, { moves: MOVES[id] }); }

// ================================================================= camera
const OP = { el: 58, d: 20.5, tgt: [0, 0, 0.5], fov: 40 };
const HOOK = { az: -22, el: 22, d: 13.5, tgt: [0, 0.3, 1.2], fov: 40 };
const CAM = [
  { t: 0, ...HOOK },
  { t: 2.85, ...HOOK, az: -12, d: 12.8, e: 'lin' },
  { t: 3.45, ...OP, az: -14, e: 'expo' },
  { t: 12.45, ...OP, az: -4, d: 19.5, e: 'lin' },
  { t: 13.0, ...OP, az: 14, e: 'expo' },
  { t: 22.45, ...OP, az: 4, d: 19.5, e: 'lin' },
  { t: 23.0, ...OP, az: -12, e: 'expo' },
  { t: 32.9, ...OP, az: -2, d: 19.5, e: 'lin' },
  { t: 35.0, ...HOOK, e: 'expo' },               // back to frame 0 → seamless loop
];
E.camCues(CAM);

// ================================================================= lighting
function lightAt(t) {
  const hook = Math.max(1 - prog(t, 2.6, 3.3), prog(t, 33.2, 35));
  return { rim: 1 + 0.6 * hook, key: 1 - 0.3 * hook, floor: 1, bloom: 1, focus: null };
}
export const stateAt = E.makeStateAt(CAM, lightAt);

// ================================================================= on-screen text
export const B1 = 1395, B2 = 1462, B3 = 1529;
const NUM_Y = 232, NAME_Y = 365;
export const TEXTS = [
  // HOOK
  { k: 'k', t: 0.15, out: 2.8, str: 'ГРАЄШ БІЛИМИ?', y: 345, size: 120, style: 'slam', from: 2.4 },
  { k: 'pl', t: 0.6, out: 2.8, str: 'ВИВЧИ ЦІ 3 ДЕБЮТИ', y: 495, size: 80, rot: -2 },
  // №3 LONDON
  { k: 'pl', t: 3.05, out: 12.35, str: '№3', y: NUM_Y, size: 56 },
  { k: 'k', t: 3.15, out: 12.35, str: 'ЛОНДОНСЬКА', y: NAME_Y, size: 112, style: 'slam' },
  { k: 'b', t: 3.6, out: 12.35, str: 'одна схема проти будь-якого захисту', y: B1 },
  { k: 'b', t: 8.9, out: 12.35, str: 'пішаки трикутником, слон перед ними', y: B2, accent: true },
  { k: 'b', t: 10.0, out: 12.35, str: 'мінімум теорії, максимум гри', y: B3 },
  // №2 QUEEN'S GAMBIT
  { k: 'pl', t: 13.05, out: 22.35, str: '№2', y: NUM_Y, size: 56 },
  { k: 'k', t: 13.15, out: 22.35, str: 'ФЕРЗЕВИЙ ГАМБІТ', y: NAME_Y, size: 104, style: 'slam' },
  { k: 'b', t: 14.7, out: 17.55, str: 'жертвуєш пішака на c4,', y: B1 },
  { k: 'b', t: 15.4, out: 17.55, str: 'щоб забрати в чорних центр', y: B2, accent: true },
  { k: 'b', t: 16.2, out: 17.55, str: 'а якщо візьмуть, пішака зазвичай повернеш', y: B3 },
  { k: 'b', t: 17.9, out: 22.35, str: 'далі кінь на c3 і слон на g5', y: B1 },
  { k: 'b', t: 19.9, out: 22.35, str: 'кінь f6 зв’язаний, тиск по центру', y: B2, accent: true },
  // №1 ITALIAN
  { k: 'pl', t: 23.05, out: 32.6, str: '№1', y: NUM_Y, size: 56 },
  { k: 'k', t: 23.15, out: 32.6, str: 'ІТАЛІЙСЬКА', y: NAME_Y, size: 112, style: 'slam' },
  { k: 'b', t: 23.6, out: 32.6, str: 'найкращий старт для новачка', y: B1 },
  { k: 'b', t: 26.3, out: 32.6, str: 'слон одразу цілиться в слабке поле f7', y: B2, accent: true },
  { k: 'b', t: 28.1, out: 32.6, str: 'і рокіровка вже на 4-му ході', y: B3 },
  { k: 'pl', t: 29.7, out: 32.6, str: 'ПОЧНИ З НЕЇ', y: 500, size: 64, rot: -2 },
];

// 2D effects consumed by main.js
export const FX = {
  whips: [[2.85, 3.45], [12.45, 13.0], [22.45, 23.0], [32.95, 34.9]],
  flashes: [[0.15, 0.3, 'o'], [3.15, 0.2, 'o'], [13.15, 0.2, 'o'], [23.15, 0.25, 'o']],
  hotEmbers: [[-1, 3], [33, 36]],
  lists: [], dims: [],
  timer: false, cta: false, fadeIn: false,
};
E.finish(TEXTS, FX.lists, { cta: false, timer: false });
