// Part 6 «2 дебюти за чорних»: Pirc–Ufimtsev vs 1.e4 and King's Indian vs 1.d4 — one setup for both.
// 35 s loop like part 5 (no timer, no CTA); the board is seen from Black's side.
import { createEngine, prog, F } from './engine.js';

export const DUR = 35;
const E = createEngine();
const { cue, pc, hl, beam } = E;
export const CUES = E.CUES;

// ================================================================= board simulator (as in part 5)
const back = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
const HOME = {}, at = {}, MOVES = {};
for (let f = 0; f < 8; f++) for (const [id, type, sq] of [['wp' + f, 'pawn', F[f] + 2], ['wb' + f, back[f], F[f] + 1], ['bp' + f, 'pawn', F[f] + 7], ['bb' + f, back[f], F[f] + 8]]) {
  HOME[id] = { type, sq, white: id[0] === 'w' }; at[sq] = id; MOVES[id] = [];
}
function mv(t, from, to, kind) {
  const id = at[from]; if (!id) throw new Error(`no piece on ${from}`);
  if (at[to]) throw new Error(`${to} is occupied`);
  kind = kind || (HOME[id].type === 'knight' ? 'jump' : 'lift');
  MOVES[id].push([t, to, 0.42, kind, kind === 'jump' ? 1.3 : undefined]);
  delete at[from]; at[to] = id;
}
function line(t0, step, moves) { moves.forEach((m, i) => { const [from, to, kind] = m.split(/[- ]/); mv(t0 + i * step, from, to, kind); }); }
function castleBlack(t) { mv(t, 'e8', 'g8', 'slide'); mv(t + 0.4, 'h8', 'f8', 'jump'); }
function rewind(t) {
  cue(t, 'rewind');
  for (const sq of Object.keys(at)) { const id = at[sq]; if (sq !== HOME[id].sq) MOVES[id].push([t, HOME[id].sq, 0.45, 'slide']); }
  for (const k of Object.keys(at)) delete at[k];
  for (const id in HOME) at[HOME[id].sq] = id;
}

// ================================================================= SCENARIO
// vs 1.e4: Pirc–Ufimtsev  1.e4 d6 2.d4 Nf6 3.Nc3 g6 4.Nf3 Bg7 5.Be2 O-O
line(3.5, 0.55, ['e2-e4', 'd7-d6', 'd2-d4', 'g8-f6', 'b1-c3', 'g7-g6', 'g1-f3', 'f8-g7', 'f1-e2']);
castleBlack(3.5 + 9 * 0.55);
hl('ring', ['g7'], 7.5, 12.3, { pulse: 8 });
hl('fill', ['d4', 'e4'], 9.7, 12.3, { st: 0.12, max: 0.55 });
rewind(12.45);
// vs 1.d4: King's Indian  1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5
line(13.5, 0.5, ['d2-d4', 'g8-f6', 'c2-c4', 'g7-g6', 'b1-c3', 'f8-g7', 'e2-e4', 'd7-d6', 'g1-f3']);
castleBlack(13.5 + 9 * 0.5);
mv(19.3, 'f1', 'e2');
mv(19.85, 'e7', 'e5');
hl('fill', ['c4', 'd4', 'e4'], 16.9, 19.7, { st: 0.12, max: 0.5 });
beam('e5', 'd4', 20.35, 23.2, { grow: 0.2 });
hl('ring', ['d4'], 20.35, 23.2, { pulse: 10, silent: true });
rewind(23.45);
// one setup for both: Black alone builds Nf6, g6, Bg7, d6, O-O
line(24.2, 0.42, ['g8-f6', 'g7-g6', 'f8-g7', 'd7-d6']);
castleBlack(25.9);
hl('fill', ['f6', 'g6', 'g7', 'd6', 'g8', 'f8'], 26.7, 32.5, { st: 0.1, max: 0.6, pulse: 4 });
rewind(32.9);
for (const id in HOME) { const h = HOME[id]; pc(id, h.type, h.white, h.sq, { moves: MOVES[id] }); }

// ================================================================= camera (Black's side: az ≈ 180)
const OP = { el: 58, d: 20.5, tgt: [0, 0, -0.5], fov: 40 };
const HOOK = { az: 202, el: 22, d: 13.5, tgt: [0, 0.3, -1.2], fov: 40 };
const CAM = [
  { t: 0, ...HOOK },
  { t: 2.85, ...HOOK, az: 192, d: 12.8, e: 'lin' },
  { t: 3.45, ...OP, az: 194, e: 'expo' },
  { t: 12.45, ...OP, az: 184, d: 19.5, e: 'lin' },
  { t: 13.0, ...OP, az: 166, e: 'expo' },
  { t: 23.45, ...OP, az: 176, d: 19.5, e: 'lin' },
  { t: 24.0, az: 196, el: 44, d: 13, tgt: [1.0, 0.3, -2.2], fov: 40, e: 'expo' },
  { t: 32.9, az: 172, el: 46, d: 12.5, tgt: [1.0, 0.3, -2.2], fov: 40, e: 'lin' },
  { t: 35.0, ...HOOK, e: 'expo' },               // back to frame 0 → seamless loop
];
E.camCues(CAM);

function lightAt(t) {
  const hook = Math.max(1 - prog(t, 2.6, 3.3), prog(t, 33.2, 35));
  return { rim: 1 + 0.6 * hook, key: 1 - 0.3 * hook, floor: 1, bloom: 1, focus: null };
}
export const stateAt = E.makeStateAt(CAM, lightAt);

// ================================================================= on-screen text
export const B1 = 1395, B2 = 1462, B3 = 1529;
const NUM_Y = 232, SUB_Y = 300, NAME_Y = 385;
export const TEXTS = [
  // HOOK
  { k: 'k', t: 0.15, out: 2.8, str: 'ГРАЄШ ЧОРНИМИ?', y: 345, size: 116, style: 'slam', from: 2.4 },
  { k: 'pl', t: 0.6, out: 2.8, str: 'ОСЬ 2 ДЕБЮТИ НА ВСЕ', y: 495, size: 78, rot: -2 },
  // PIRC
  { k: 'pl', t: 3.05, out: 12.35, str: 'ПРОТИ 1.e4', y: NUM_Y, size: 50 },
  { k: 'label', t: 3.1, out: 12.35, str: 'ЗАХИСТ', y: SUB_Y, size: 34 },
  { k: 'k', t: 3.15, out: 12.35, str: 'ПІРЦА-УФІМЦЕВА', y: NAME_Y, size: 100, style: 'slam' },
  { k: 'b', t: 3.6, out: 9.5, str: 'пішак на d6, кінь на f6', y: B1 },
  { k: 'b', t: 6.3, out: 9.5, str: 'слон ховається на g7', y: B2, accent: true },
  { k: 'b', t: 8.4, out: 9.5, str: 'і швидка рокіровка', y: B3 },
  { k: 'b', t: 9.7, out: 12.35, str: 'білі займають центр,', y: B1 },
  { k: 'b', t: 10.4, out: 12.35, str: 'а ти потім б’єш по ньому', y: B2, accent: true },
  // KING'S INDIAN
  { k: 'pl', t: 13.05, out: 23.3, str: 'ПРОТИ 1.d4', y: NUM_Y, size: 50 },
  { k: 'label', t: 13.1, out: 23.3, str: 'ЗАХИСТ', y: SUB_Y, size: 34 },
  { k: 'k', t: 13.15, out: 23.3, str: 'СТАРОІНДІЙСЬКИЙ', y: NAME_Y, size: 100, style: 'slam' },
  { k: 'b', t: 13.6, out: 19.75, str: 'та сама схема: Кf6, g6, Сg7, d6', y: B1 },
  { k: 'b', t: 16.9, out: 19.75, str: 'білі будують великий центр', y: B2 },
  { k: 'b', t: 18.0, out: 19.75, str: 'а ти спокійно рокіруєшся', y: B3, accent: true },
  { k: 'b', t: 20.0, out: 23.3, str: 'і ось удар: e5', y: B1 },
  { k: 'b', t: 20.7, out: 23.3, str: 'центр білих уже під атакою', y: B2, accent: true },
  // ONE SETUP
  { k: 'k', t: 24.1, out: 32.6, str: 'ОДНА СХЕМА', y: 345, size: 130, style: 'slam' },
  { k: 'pl', t: 24.55, out: 32.6, str: 'ПРОТИ e4 І d4', y: 495, size: 80, rot: -2 },
  { k: 'b', t: 25.0, out: 32.6, str: 'Кf6, g6, Сg7, d6 і рокіровка', y: B1 },
  { k: 'b', t: 27.0, out: 32.6, str: 'вивчив один раз, граєш завжди', y: B2, accent: true },
  { k: 'b', t: 28.4, out: 32.6, str: 'головне: не віддавай центр без бою', y: B3 },
];

export const FX = {
  whips: [[2.85, 3.45], [12.45, 13.0], [23.45, 24.0], [32.95, 34.9]],
  flashes: [[0.15, 0.3, 'o'], [3.15, 0.2, 'o'], [13.15, 0.2, 'o'], [24.1, 0.25, 'o']],
  hotEmbers: [[-1, 3], [33, 36]],
  lists: [], dims: [],
  timer: false, cta: false, fadeIn: false,
};
E.finish(TEXTS, FX.lists, { cta: false, timer: false });
