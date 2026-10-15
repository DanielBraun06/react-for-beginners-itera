// Part 2 «Ці 3 ходи новачки вважають читерством»: castling, en passant, promotion (+ the 9-queens fact).
// Same contract as script.js: stateAt, TEXTS, CUES, B1, FX.
import { createEngine, prog } from './engine.js';

export const DUR = 60;
const E = createEngine();
const { cue, pc, hl, beam, shockAt } = E;
export const CUES = E.CUES;

// ================================================================= SCENARIO
// --- HOOK 0–4 + CASTLING 4–20: white king, rooks and a few pawns are on the board from frame 0
pc('wk', 'king', true, 'e1', { out: 19.9, outKind: 'sink', moves: [[6.4, 'g1', 0.55, 'slide'], [9.6, 'e1', 0.4, 'slide'], [11.3, 'c1', 0.55, 'slide']] });
pc('wrh', 'rook', true, 'h1', { out: 19.92, outKind: 'sink', moves: [[7.4, 'f1', 0.6, 'jump', 1.4], [9.6, 'h1', 0.4, 'jump', 0.8]] });
pc('wra', 'rook', true, 'a1', { out: 19.94, outKind: 'sink', moves: [[12.0, 'd1', 0.6, 'jump', 1.4]] });
['a2', 'b2', 'c2', 'f2', 'g2', 'h2'].forEach((s, i) => pc('wp' + i, 'pawn', true, s, { out: 19.96 + i * 0.01, outKind: 'sink' }));
hl('fill', ['f1', 'g1'], 5.6, 7.1, { st: 0.12 });
hl('fill', ['f1', 'g1'], 8.0, 9.3, { st: 0, max: 0.6, silent: true });
cue(9.55, 'rewind');
hl('fill', ['d1', 'c1', 'b1'], 10.8, 12.0, { st: 0.1 });
hl('fill', ['c1', 'd1'], 12.6, 13.1, { st: 0, max: 0.6, silent: true });
// --- EN PASSANT 20.5–35
pc('ep_w', 'pawn', true, 'e5', { in: 20.55, out: 34.6, outKind: 'sink', moves: [[25.45, 'd6', 0.45, 'lift']] });
pc('ep_b', 'pawn', false, 'd7', { in: 20.65, moves: [[22.1, 'd5', 0.5, 'lift']], cap: 25.9, capDir: [-1, -0.35] });
pc('ep_ghost', 'pawn', false, 'd6', { in: 24.6, enter: 'pop', out: 25.88, outKind: 'pop', alpha: 0.38, silent: true });
hl('fill', ['d7', 'd6', 'd5'], 22.1, 23.4, { st: 0.12, max: 0.45, silent: true });
hl('ring', ['d5', 'e5'], 22.9, 23.95, { st: 0.1, pulse: 9 });
hl('ring', ['d6'], 24.6, 25.9, { pulse: 10 });
beam('e5', 'd6', 25.0, 25.9, { grow: 0.2 });
hl('fill', ['d6'], 25.9, 27.3, { st: 0, max: 0.6, silent: true });
// --- PROMOTION 35–42.5
pc('pr_p', 'pawn', true, 'e6', { in: 35.1, out: 38.15, outKind: 'pop', moves: [[36.7, 'e7', 0.4, 'lift'], [37.45, 'e8', 0.45, 'lift']] });
hl('fill', ['a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'].map((sq, i) => ({ sq, d: Math.abs(i - 4) })), 36.2, 37.9, { st: 0.06, max: 0.5 });
shockAt('e8', 37.9, { R: 6 }); cue(37.9, 'promote');
pc('pr_n', 'knight', true, 'e8', { in: 38.15, enter: 'pop', out: 38.6, outKind: 'pop' });
pc('pr_b', 'bishop', true, 'e8', { in: 38.6, enter: 'pop', out: 39.05, outKind: 'pop' });
pc('pr_r', 'rook', true, 'e8', { in: 39.05, enter: 'pop', out: 39.5, outKind: 'pop' });
pc('pr_q', 'queen', true, 'e8', { in: 39.5, enter: 'pop', out: 51.75, glow: [[39.5, 41.2, 0.7, 8]] });
cue(39.5, 'queenHit');
hl('ring', ['e8'], 37.9, 41.2, { pulse: 9, silent: true });
// --- 9 QUEENS 42.5–52
['a8', 'b8', 'c8', 'd8', 'f8', 'g8', 'h8'].forEach((s, i) => pc('q' + i, 'queen', true, s, { in: 43.65 + i * 0.09, out: 51.75 + i * 0.012, outKind: 'fly', ...(s === 'c8' ? { out: 48.2, outKind: 'pop' } : {}) }));
pc('q_d1', 'queen', true, 'd1', { in: 44.35, out: 51.84 });
pc('n_c8', 'knight', true, 'c8', { in: 48.2, enter: 'pop', out: 51.86 });   // under-promotion example
hl('ring', ['a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', 'd1'], 44.9, 47.7, { st: 0.07 });
hl('ring', ['c8'], 48.2, 51.5, { pulse: 9, silent: true });
cue(51.75, 'clearAll');

// ================================================================= camera
const CAM = [
  { t: 0, az: 22, el: 9, d: 5.2, tgt: [1.6, 0.9, 3.5], fov: 40 },
  { t: 3.25, az: 42, el: 13, d: 4.8, tgt: [1.6, 0.85, 3.5], fov: 40, e: 'lin' },
  { t: 4.1, az: 6, el: 56, d: 21.5, tgt: [0, 0, 1.4], fov: 40, e: 'expo' },
  { t: 13.1, az: -4, el: 58, d: 21, tgt: [0, 0, 1.4], fov: 40, e: 'lin' },
  { t: 19.95, az: -8, el: 62, d: 22, tgt: [0, 0, 1.2], fov: 40, e: 'lin' },
  { t: 20.6, az: -14, el: 52, d: 13.5, tgt: [0, 0, -1.2], fov: 40, e: 'expo' },
  { t: 34.55, az: 6, el: 55, d: 13, tgt: [0, 0, -1.2], fov: 40, e: 'lin' },
  { t: 35.3, az: 24, el: 42, d: 10.5, tgt: [0.5, 0.6, -2.2], fov: 40, e: 'expo' },
  { t: 42.3, az: 36, el: 38, d: 9.5, tgt: [0.5, 0.7, -2.6], fov: 40, e: 'lin' },
  { t: 43.3, az: 160, el: 26, d: 13, tgt: [0, 0.9, -2.2], fov: 40, e: 'expo' },
  { t: 51.9, az: 198, el: 24, d: 12, tgt: [0, 0.9, -2.4], fov: 40, e: 'lin' },
  { t: 53.4, az: 240, el: 80, d: 25, tgt: [0, 0, 0], fov: 40, e: 'expo' },
  { t: 60.0, az: 265, el: 82, d: 24, tgt: [0, 0, 0], fov: 40, e: 'lin' },
];
E.camCues(CAM);

// ================================================================= lighting per section
function lightAt(t) {
  const hook = 1 - prog(t, 3.3, 4.1);
  const fact = prog(t, 43.3, 44) * (1 - prog(t, 51.8, 52.5));
  const cta = prog(t, 52, 53.5);
  const fl = t0 => (t >= t0 ? Math.exp(-(t - t0) * 6) : 0);
  const flash = Math.max(fl(37.9), 0.7 * fl(39.5));
  let focus = null;
  if (t > 37.8 && t < 42.6) focus = { x: 0.5, y: 1.8, z: -3.0, i: (25 + 120 * flash) * (1 - prog(t, 42.0, 42.6)) };
  return {
    rim: 1 + 0.6 * hook + 0.4 * fact,
    key: 1 - 0.45 * hook - 0.55 * cta,
    floor: 1 - 0.5 * cta, bloom: 1 + 0.8 * flash, focus,
  };
}
export const stateAt = E.makeStateAt(CAM, lightAt);

// ================================================================= on-screen text
export const B1 = 1395, B2 = 1462, B3 = 1529;
export const TEXTS = [
  // HOOK
  { k: 'k', t: 0.3, out: 3.35, str: 'ЦІ 3 ХОДИ', y: 345, size: 140, style: 'slam', from: 2.4 },
  { k: 'k', t: 0.85, out: 3.35, str: 'НОВАЧКИ ВВАЖАЮТЬ', y: 490, size: 80, style: 'up' },
  { k: 'pl', t: 1.35, out: 3.35, str: 'ЧИТЕРСТВОМ', y: 640, size: 92, rot: -2 },
  { k: 'label', t: 2.05, out: 3.35, str: 'ЧАСТИНА 2', y: 770, size: 34 },
  // CASTLING
  { k: 'k', t: 4.15, out: 19.75, str: 'РОКІРОВКА', y: 340, size: 132, style: 'slam' },
  { k: 'b', t: 4.7, out: 9.45, str: 'єдиний хід двома фігурами одразу', y: B1 },
  { k: 'b', t: 5.9, out: 9.45, str: 'король іде на 2 клітинки до тури', y: B2 },
  { k: 'b', t: 7.0, out: 9.45, str: 'а тура перестрибує через нього', y: B3, accent: true },
  { k: 'pl', t: 8.1, out: 9.4, str: 'КОРОТКА', y: 475, size: 58 },
  { k: 'b', t: 10.2, out: 13.0, str: 'у бік ферзя все так само', y: B1 },
  { k: 'b', t: 10.75, out: 13.0, str: 'це довга рокіровка', y: B2, accent: true },
  { k: 'pl', t: 12.3, out: 13.0, str: 'ДОВГА', y: 475, size: 58 },
  // EN PASSANT
  { k: 'k', t: 20.6, out: 34.5, str: 'ВЗЯТТЯ', y: 320, size: 132, style: 'slam' },
  { k: 'pl', t: 21.05, out: 34.5, str: 'НА ПРОХОДІ', y: 462, size: 84, rot: -2 },
  { k: 'b', t: 21.7, out: 24.0, str: 'пішак суперника стрибнув на 2', y: B1 },
  { k: 'b', t: 22.8, out: 24.0, str: 'і став поруч із твоїм', y: B2 },
  { k: 'b', t: 24.2, out: 27.4, str: 'бий його так, ніби він пішов на 1', y: B1 },
  { k: 'b', t: 24.9, out: 27.4, str: 'і стань на клітинку, яку він перестрибнув', y: B2, accent: true },
  { k: 'b', t: 27.7, out: 31.0, str: 'але тільки одразу,', y: B1 },
  { k: 'b', t: 28.3, out: 31.0, str: 'наступним же ходом', y: B2, accent: true },
  { k: 'b', t: 29.0, out: 31.0, str: 'потім цей шанс згорає', y: B3 },
  { k: 'b', t: 31.3, out: 34.5, str: 'так, це офіційне правило', y: B1 },
  { k: 'b', t: 31.9, out: 34.5, str: 'а не баг гри', y: B2, accent: true },
  // PROMOTION
  { k: 'k', t: 35.2, out: 42.35, str: 'ПЕРЕТВОРЕННЯ', y: 320, size: 132, style: 'slam' },
  { k: 'pl', t: 35.65, out: 42.35, str: 'ПІШАКА', y: 462, size: 84, rot: -2 },
  { k: 'b', t: 35.9, out: 40.4, str: 'дійшов до останньої горизонталі?', y: B1 },
  { k: 'b', t: 38.1, out: 40.4, str: 'стає будь-якою фігурою', y: B2, accent: true },
  { k: 'b', t: 38.7, out: 40.4, str: 'крім короля', y: B3 },
  { k: 'b', t: 40.6, out: 42.35, str: 'і майже завжди обирають ферзя', y: B1 },
  // 9 QUEENS
  { k: 'label', t: 42.7, out: 51.65, str: 'ФАКТ', y: 270, size: 36 },
  { k: 'k', t: 42.9, out: 51.65, str: 'У ТЕОРІЇ МОЖНА МАТИ', y: 365, size: 64, style: 'up' },
  { k: 'k', t: 43.5, out: 51.65, str: '9 ФЕРЗІВ', y: 510, size: 180, style: 'slam', from: 2.8, color: 'orange', glow: 1 },
  { k: 'b', t: 45.0, out: 47.8, str: 'свій ферзь + 8 пішаків,', y: B1 },
  { k: 'b', t: 45.6, out: 47.8, str: 'які дійшли до кінця', y: B2, accent: true },
  { k: 'b', t: 48.0, out: 51.65, str: 'а іноді вигідніше взяти коня', y: B1 },
  { k: 'b', t: 48.6, out: 51.65, str: 'і це теж за правилами', y: B2, accent: true },
  // CTA
  { k: 'k', t: 52.35, out: 99, str: 'ТЕПЕР ТИ ЗНАЄШ', y: 330, size: 84, style: 'up' },
  { k: 'pl', t: 52.75, out: 99, str: 'ЦІ 3 ХОДИ', y: 465, size: 84, rot: -2 },
];

// 2D effects consumed by main.js
export const FX = {
  whips: [[3.25, 4.1], [9.55, 10.05], [19.95, 20.6], [34.55, 35.3], [42.3, 43.3], [51.9, 53.4]],
  flashes: [[0.3, 0.3, 'o'], [37.9, 0.6, 'o'], [39.5, 0.35, 'w'], [43.5, 0.3, 'o']],
  hotEmbers: [[-1, 4], [37.8, 51.8]],
  lists: [{ t: 13.25, out: 19.65, y: 640, st: 0.9, title: 'РОКІРОВКА МОЖЛИВА, ЯКЩО:', items: [
    'король і тура ще не ходили',
    'між ними немає фігур',
    'король зараз не під шахом',
    'і не проходить через биті поля',
  ] }],
  dims: [[13.1, 19.65, 0.72]],
};
E.finish(TEXTS, FX.lists);
