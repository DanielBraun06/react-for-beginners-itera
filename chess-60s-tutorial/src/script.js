// Part 1 «Навчу грати в шахи за 60 секунд»: board, goal, the six pieces, check, mate.
// stateAt(t) → 3D state for world.update(); TEXTS → 2D overlay; CUES → sound design (exported to cues.json).
import { createEngine, prog, rays, ORTH, DIAG, F } from './engine.js';

export const DUR = 60;
const E = createEngine();
const { cue, pc, hl, beam, shockAt } = E;
export const CUES = E.CUES;

// ================================================================= SCENARIO
// --- HOOK 0–4 + SETUP 4–10 + GOAL 10–14: full starting position
{
  const back = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  const OUT = 13.62; let k = 0;
  const sq = (f, r) => F[f] + r;
  for (let f = 0; f < 8; f++) pc('wp' + f, 'pawn', true, sq(f, 2), { in: 4.02 + f * 0.055, out: OUT + (k++) * 0.006, moves: f === 4 ? [[7.75, 'e4', 0.42, 'lift']] : [] });
  for (let f = 0; f < 8; f++) { if (f === 6) continue; pc('wb' + f, back[f], true, sq(f, 1), { in: 4.5 + f * 0.06, out: OUT + (k++) * 0.006 }); }
  pc('wn6', 'knight', true, 'g1', { out: OUT + (k++) * 0.006 });            // hero knight from the hook
  for (let f = 0; f < 8; f++) pc('bp' + f, 'pawn', false, sq(7 - f, 7), { in: 5.0 + f * 0.055, out: OUT + (k++) * 0.006, moves: 7 - f === 4 ? [[8.55, 'e5', 0.42, 'lift']] : [] });
  for (let f = 0; f < 8; f++) pc('bb' + f, back[7 - f], false, sq(7 - f, 8), { in: 5.48 + f * 0.06, out: OUT + (k++) * 0.006, glow: back[7 - f] === 'king' ? [[11.6, 13.5, 0.55, 7]] : [] });
  cue(OUT, 'clearAll');
  hl('fill', ['e2', 'e4'], 7.75, 8.6, { st: 0, max: 0.55, silent: true });
  hl('fill', ['e7', 'e5'], 8.55, 9.5, { st: 0, max: 0.55, silent: true });
  hl('ring', ['e8'], 11.6, 13.45, { pulse: 7, silent: true });
}
// --- LESSONS
const LESSON = [14.0, 18.5, 22.0, 25.5, 29.0, 32.5, 37.0];
// pawn
pc('L_p', 'pawn', true, 'e2', { in: 14.08, out: 18.25, outKind: 'sink', moves: [[15.3, 'e4', 0.45, 'lift'], [17.0, 'd5', 0.42, 'lift']] });
pc('L_bp', 'pawn', false, 'd5', { in: 16.25, cap: 17.36, capDir: [-0.6, -1] });
hl('dot', ['e3', 'e4'], 14.6, 15.3, { st: 0.12 });
hl('fill', ['e2', 'e4'], 15.3, 16.2, { st: 0, max: 0.5, silent: true });
hl('ring', ['d5'], 16.6, 17.4, { pulse: 10 });
hl('fill', ['d5'], 17.4, 18.1, { st: 0, max: 0.6, silent: true });
// rook
pc('L_r', 'rook', true, 'd4', { in: 18.58, out: 21.75, outKind: 'sink', moves: [[20.15, 'h4', 0.55, 'slide']] });
hl('fill', rays('d4', ORTH), 19.05, 20.1, { st: 0.05 });
hl('fill', ['h4'], 20.7, 21.6, { st: 0, max: 0.6, silent: true });
// bishop
pc('L_b', 'bishop', true, 'd4', { in: 22.08, out: 25.25, outKind: 'sink', moves: [[23.85, 'g7', 0.55, 'lift']] });
hl('fill', rays('d4', DIAG), 22.55, 23.8, { st: 0.05 });
hl('fill', ['g7'], 24.4, 25.1, { st: 0, max: 0.6, silent: true });
// queen
pc('L_q', 'queen', true, 'd4', { in: 25.58, out: 28.75, outKind: 'sink', moves: [[27.55, 'h8', 0.55, 'lift']] });
hl('fill', rays('d4', ORTH), 26.0, 27.5, { st: 0.04 });
hl('fill', rays('d4', DIAG), 26.45, 27.5, { st: 0.04 });
hl('fill', ['h8'], 28.1, 28.7, { st: 0, max: 0.6, silent: true });
// king
pc('L_k', 'king', true, 'e4', { in: 29.08, out: 32.25, outKind: 'sink', moves: [[30.75, 'e5', 0.42, 'lift']] });
hl('fill', ['d5', 'e5', 'f5', 'f4', 'f3', 'e3', 'd3', 'd4'], 29.55, 30.7, { st: 0.04 });
hl('fill', ['e5'], 31.2, 32.1, { st: 0, max: 0.6, silent: true });
// knight
pc('L_n', 'knight', true, 'd4', { in: 32.58, out: 36.75, outKind: 'sink', moves: [[34.9, 'e6', 0.62, 'jump', 1.7]] });
['c3', 'd3', 'e3', 'c4', 'e4', 'c5', 'd5', 'e5'].forEach((s, i) => pc('L_np' + i, 'pawn', true, s, { in: 32.78 + i * 0.045, out: 36.75 + i * 0.008, outKind: 'sink', softLand: true }));
hl('dot', ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'], 33.45, 34.85, { st: 0.05 });
beam('d4', 'd6', 34.1, 34.9, { grow: 0.22 }); beam('d6', 'e6', 34.32, 34.9, { grow: 0.15, silent: true });
hl('fill', ['e6'], 35.52, 36.6, { st: 0, max: 0.6, silent: true });
// --- CHECK 37–43.5
pc('C_bk', 'king', false, 'e8', { in: 37.08, out: 43.3, outKind: 'sink', moves: [[41.55, 'd7', 0.45, 'lift']], glow: [[38.45, 41.6, 0.9, 12]] });
pc('C_wk', 'king', true, 'g1', { in: 37.18, out: 43.3, outKind: 'sink' });
pc('C_wr', 'rook', true, 'a1', { in: 37.28, out: 43.3, outKind: 'sink', moves: [[37.95, 'e1', 0.45, 'slide']] });
beam('e1', 'e8', 38.42, 41.75, { grow: 0.18 });
hl('fill', rays('e1', [[0, 1]]).slice(0, 6), 38.45, 41.75, { st: 0.025, max: 0.45, silent: true });
hl('ring', ['e8'], 38.45, 41.6, { pulse: 12, silent: true });
hl('fill', ['d7'], 42.0, 43.1, { st: 0, max: 0.6, silent: true });
// --- MATE 43.5–52
['f7', 'g7', 'h7'].forEach((s, i) => pc('M_bp' + i, 'pawn', false, s, { in: 43.6 + i * 0.05, out: 51.8 }));
pc('M_bk', 'king', false, 'g8', { in: 43.52, out: 51.8, topple: 48.45, glow: [[46.05, 48.5, 1.0, 10]] });
['f2', 'g2', 'h2'].forEach((s, i) => pc('M_wp' + i, 'pawn', true, s, { in: 43.78 + i * 0.05, out: 51.8 }));
pc('M_wk', 'king', true, 'g1', { in: 43.95, out: 51.8 });
pc('M_wr', 'rook', true, 'e1', { in: 44.05, out: 51.8, moves: [[45.72, 'e8', 0.33, 'slam']] });
beam('e8', 'h8', 46.05, 51.6, { grow: 0.2 });
shockAt('e8', 46.05, { R: 7 });
hl('x', ['f8', 'h8'], 46.55, 51.6, { st: 0.14 });
hl('ring', ['f7', 'g7', 'h7'], 47.0, 51.6, { st: 0.08 });
hl('fill', ['g8'], 46.05, 51.6, { st: 0, max: 0.7, pulse: 10, silent: true });
cue(46.05, 'mate'); cue(45.72, 'preMate');

// ================================================================= camera
const OV = { el: 60, d: 23.5, tgt: [0, 0, 0.1], fov: 40 };
const CAM = [
  { t: 0, az: -4, el: 7, d: 4.5, tgt: [2.5, 1.45, 3.5], fov: 40 },
  { t: 3.25, az: 30, el: 12, d: 4.0, tgt: [2.5, 1.35, 3.5], fov: 40, e: 'lin' },
  { t: 4.1, ...OV, az: 8, e: 'expo' },
  { t: 9.55, ...OV, az: -3, d: 22.8, e: 'lin' },
  { t: 10.85, az: 180, el: 30, d: 7.6, tgt: [0.5, 1.5, -3.3], fov: 40, e: 'expo' },
  { t: 13.45, az: 194, el: 27, d: 6.6, tgt: [0.5, 1.45, -3.4], fov: 40, e: 'lin' },
  { t: 14.25, ...OV, az: 350, e: 'expo' },
];
{
  const s = [350, 368, 352, 368, 352, 367];
  for (let i = 0; i < 6; i++) {
    const a = LESSON[i], b = LESSON[i + 1];
    const o = i === 5 ? { ...OV, d: 20, tgt: [0, 0, -0.2] } : OV;
    if (i > 0) CAM.push({ t: a + 0.38, ...o, az: s[i], e: 'expo' });
    CAM.push({ t: b - 0.02, ...o, az: s[i] + (i % 2 ? -5 : 5), e: 'lin' });
  }
}
CAM.push(
  { t: 37.45, az: 382, el: 54, d: 19, tgt: [0.3, 0, -0.4], fov: 40, e: 'expo' },
  { t: 43.4, az: 377, el: 56, d: 18.5, tgt: [0.3, 0, -0.4], fov: 40, e: 'lin' },
  { t: 43.95, az: 358, el: 52, d: 14.5, tgt: [1.1, 0, -1.3], fov: 40, e: 'expo' },
  { t: 45.89, az: 354, el: 46, d: 12.0, tgt: [1.3, 0, -1.8], fov: 40, e: 'lin' },
  { t: 45.9, az: 512, el: 19, d: 7.4, tgt: [1.6, 0.45, -3.2], fov: 40, e: 'cut' },
  { t: 51.9, az: 478, el: 25, d: 6.6, tgt: [1.7, 0.4, -3.2], fov: 40, e: 'lin' },
  { t: 53.4, az: 450, el: 80, d: 25, tgt: [0, 0, 0], fov: 40, e: 'expo' },
  { t: 60.0, az: 425, el: 82, d: 24, tgt: [0, 0, 0], fov: 40, e: 'lin' },
);
E.camCues(CAM);

// ================================================================= lighting per section
function lightAt(t) {
  const hook = 1 - prog(t, 3.3, 4.1);
  const goal = prog(t, 10.2, 10.9) * (1 - prog(t, 13.4, 14));
  const mate = prog(t, 45.9, 45.95) * (1 - prog(t, 52, 53.4));
  const cta = prog(t, 52, 53.5);
  const flash = Math.exp(-Math.max(0, t - 46.05) * 6) * (t >= 46.05 ? 1 : 0);
  let focus = null;
  if (goal > 0) focus = { x: 0.5, y: 1.6, z: -3.0, i: 18 * goal };
  if (t > 46.05 && t < 52) focus = { x: 2.3, y: 1.8, z: -3.0, i: 30 * (1 - prog(t, 49, 52)) + 120 * flash };
  return {
    rim: 1 + 0.6 * hook + 0.5 * goal + 0.8 * mate,
    key: 1 - 0.45 * hook - 0.35 * goal - 0.25 * mate - 0.55 * cta,
    floor: 1 - 0.5 * cta, bloom: 1 + 0.8 * flash, focus,
  };
}

export const stateAt = E.makeStateAt(CAM, lightAt);

// ================================================================= on-screen text
// kinds: k (kinetic line), pl (orange plate), strike (animated strike-through), label (small caps)
export const B1 = 1395, B2 = 1462, B3 = 1529;
export const TEXTS = [
  // HOOK
  { k: 'k', t: 0.3, out: 3.35, str: 'НАВЧУ ГРАТИ', y: 345, size: 128, style: 'slam', from: 2.4 },
  { k: 'k', t: 0.78, out: 3.35, str: 'В ШАХИ', y: 500, size: 150, style: 'slam', from: 2.8 },
  { k: 'pl', t: 1.35, out: 3.35, str: 'ЗА 60 СЕКУНД', y: 668, size: 74, rot: -2 },
  { k: 'label', t: 2.05, out: 3.35, str: 'ЗАСІКАЙ ЧАС', y: 790, size: 34 },
  // SETUP
  { k: 'k', t: 4.15, out: 6.85, str: 'ДОШКА 8×8', y: 330, size: 96, style: 'up' },
  { k: 'pl', t: 4.75, out: 6.85, str: '32 ФІГУРИ', y: 468, size: 66 },
  { k: 'k', t: 6.95, out: 9.55, str: 'БІЛІ ХОДЯТЬ', y: 330, size: 96, style: 'up' },
  { k: 'pl', t: 7.35, out: 9.55, str: 'ПЕРШИМИ', y: 468, size: 66 },
  { k: 'b', t: 8.0, out: 9.55, str: 'далі по черзі: хід білих, хід чорних', y: B2 },
  // GOAL
  { k: 'label', t: 10.2, out: 13.45, str: 'МЕТА ГРИ', y: 285, size: 36 },
  { k: 'k', t: 10.4, out: 13.45, str: 'НЕ З’ЇСТИ ВСІ ФІГУРИ', y: 380, size: 60, style: 'up' },
  { k: 'strike', t: 11.15, out: 13.45, str: 'НЕ З’ЇСТИ ВСІ ФІГУРИ', y: 380, size: 60 },
  { k: 'k', t: 11.6, out: 13.45, str: 'А ПОСТАВИТИ', y: 505, size: 84, style: 'up' },
  { k: 'pl', t: 11.95, out: 13.45, str: 'МАТ КОРОЛЮ', y: 640, size: 92, rot: -2 },
  // PAWN
  { k: 'k', t: 14.2, out: 18.2, str: 'ПІШАК', y: 340, size: 132, style: 'slam' },
  { k: 'b', t: 14.6, out: 18.2, str: 'ходить уперед на 1 клітинку', y: B1 },
  { k: 'b', t: 15.25, out: 18.2, str: 'з початкової позиції можна на 2', y: B2 },
  { k: 'b', t: 16.4, out: 18.2, str: 'а б’є по діагоналі', y: B3, accent: true },
  // ROOK
  { k: 'k', t: 18.65, out: 21.7, str: 'ТУРА', y: 340, size: 132, style: 'slam' },
  { k: 'b', t: 19.05, out: 21.7, str: 'ходить по прямій у будь-який бік', y: B1 },
  { k: 'b', t: 19.65, out: 21.7, str: 'на скільки завгодно клітинок', y: B2, accent: true },
  // BISHOP
  { k: 'k', t: 22.15, out: 25.2, str: 'СЛОН', y: 340, size: 132, style: 'slam' },
  { k: 'b', t: 22.55, out: 25.2, str: 'ходить тільки по діагоналі', y: B1 },
  { k: 'b', t: 23.2, out: 25.2, str: 'і ніколи не змінює колір клітинки', y: B2, accent: true },
  // QUEEN
  { k: 'k', t: 25.65, out: 28.7, str: 'ФЕРЗЬ', y: 340, size: 132, style: 'slam' },
  { k: 'b', t: 26.05, out: 28.7, str: 'ходить як тура і слон разом', y: B1 },
  { k: 'b', t: 26.8, out: 28.7, str: 'найсильніша фігура на дошці', y: B2, accent: true },
  // KING
  { k: 'k', t: 29.15, out: 32.2, str: 'КОРОЛЬ', y: 340, size: 132, style: 'slam' },
  { k: 'b', t: 29.55, out: 32.2, str: 'на 1 клітинку в будь-який бік', y: B1 },
  { k: 'b', t: 30.3, out: 32.2, str: 'його треба берегти понад усе', y: B2, accent: true },
  // KNIGHT
  { k: 'k', t: 32.65, out: 36.7, str: 'КІНЬ', y: 340, size: 132, style: 'slam' },
  { k: 'b', t: 33.1, out: 36.7, str: 'ходить буквою «Г»: 2 + 1', y: B1 },
  { k: 'b', t: 34.0, out: 36.7, str: 'і єдиний стрибає через фігури', y: B2, accent: true },
  // CHECK
  { k: 'k', t: 38.45, out: 43.2, str: 'ШАХ!', y: 350, size: 190, style: 'slam', from: 2.6, color: 'orange', glow: 1 },
  { k: 'b', t: 39.0, out: 43.2, str: 'це напад на короля', y: B1 },
  { k: 'b', t: 39.7, out: 43.2, str: 'і король мусить урятуватися:', y: B2 },
  { k: 'pl', t: 40.4, out: 43.2, str: 'ВТЕКТИ, ЗАКРИТИСЬ АБО ПОБИТИ', y: B3 + 8, size: 36 },
  // MATE
  { k: 'k', t: 44.1, out: 45.8, str: 'А ЯКЩО ВТЕКТИ', y: 330, size: 84, style: 'up' },
  { k: 'k', t: 44.45, out: 45.8, str: 'НЕМОЖЛИВО?', y: 445, size: 96, style: 'up', color: 'orange' },
  { k: 'k', t: 46.07, out: 51.7, str: 'МАТ', y: 400, size: 300, style: 'slam', from: 3.2, color: 'orange', glow: 1 },
  { k: 'b', t: 47.0, out: 51.7, str: 'шах, від якого не втекти', y: B1 },
  { k: 'pl', t: 47.9, out: 51.7, str: 'ЦЕ ПЕРЕМОГА', y: B2 + 22, size: 58 },
  // CTA
  { k: 'k', t: 52.35, out: 99, str: 'ТЕПЕР ТИ ЗНАЄШ', y: 330, size: 84, style: 'up' },
  { k: 'pl', t: 52.75, out: 99, str: 'ПРАВИЛА ШАХІВ', y: 465, size: 84, rot: -2 },
];
E.finish(TEXTS);

// 2D effects consumed by main.js
export const FX = {
  whips: [[3.25, 4.1], [9.55, 10.85], [13.45, 14.25], [18.5, 18.88], [22.0, 22.38], [25.5, 25.88], [29.0, 29.38], [32.5, 32.88], [37.0, 37.45], [43.4, 43.95], [51.9, 53.4]],
  flashes: [[45.9, 0.75, 'w'], [46.05, 0.55, 'o'], [38.45, 0.25, 'o'], [0.3, 0.3, 'o']],
  hotEmbers: [[-1, 4], [46, 52]],
  lists: [], dims: [],
};
