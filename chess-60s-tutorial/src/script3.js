// Part 3 «Пат і нічия»: stalemate vs mate (one square apart), then the four other ways a game is drawn.
// Same contract as script.js: stateAt, TEXTS, CUES, B1, FX.
import { createEngine, prog } from './engine.js';

export const DUR = 60;
const E = createEngine();
const { cue, pc, hl, beam, shockAt } = E;
export const CUES = E.CUES;

// ================================================================= SCENARIO
// --- HOOK 0–4 + STALEMATE 4–19.5: White Kf7, Qe4 vs Black Kh8
pc('s_wk', 'king', true, 'f7', { out: 19.5, outKind: 'sink' });
pc('s_wq', 'queen', true, 'e4', { out: 19.52, outKind: 'sink', moves: [[5.2, 'g6', 0.5, 'lift'], [10.9, 'e4', 0.4, 'slide'], [12.37, 'h4', 0.33, 'slam']] });
pc('s_bk', 'king', false, 'h8', { out: 19.54, outKind: 'sink', topple: 14.4, glow: [[7.4, 10.6, 0.45, 6], [12.7, 14.5, 0.9, 10]] });
hl('x', ['g8', 'g7', 'h7'], 6.3, 10.6, { st: 0.25 });
hl('ring', ['h8'], 7.4, 10.6, { pulse: 6, silent: true });
cue(10.85, 'rewind');
beam('h4', 'h8', 12.7, 16.0, { grow: 0.18 });
shockAt('h8', 12.7, { R: 5 }); cue(12.7, 'queenHit');
hl('x', ['g8', 'g7', 'h7'], 12.95, 16.0, { st: 0.12 });
hl('fill', ['h8'], 12.7, 16.0, { st: 0, max: 0.7, pulse: 10, silent: true });
// --- DRAW №1 repetition 19.5–27
pc('r_wk', 'king', true, 'e1', { in: 19.85, out: 26.9, outKind: 'sink' });
pc('r_bk', 'king', false, 'e8', { in: 19.95, out: 26.92, outKind: 'sink' });
pc('r_wn', 'knight', true, 'g1', { in: 20.05, out: 26.94, outKind: 'sink', moves: [[20.9, 'f3', 0.4, 'jump', 1.0], [22.1, 'g1', 0.4, 'jump', 1.0], [23.3, 'f3', 0.4, 'jump', 1.0], [24.5, 'g1', 0.4, 'jump', 1.0]] });
pc('r_bn', 'knight', false, 'g8', { in: 20.15, out: 26.96, outKind: 'sink', moves: [[21.5, 'f6', 0.4, 'jump', 1.0], [22.7, 'g8', 0.4, 'jump', 1.0], [23.9, 'f6', 0.4, 'jump', 1.0], [25.1, 'g8', 0.4, 'jump', 1.0]] });
hl('ring', ['g1', 'g8'], 23.1, 23.6, { st: 0.05, silent: true });
hl('ring', ['g1', 'g8'], 25.5, 26.7, { st: 0.05, pulse: 9 });
// --- DRAW №2 fifty moves 27–34
pc('f_wk', 'king', true, 'c3', { in: 27.25, out: 33.9, outKind: 'sink' });
pc('f_wr', 'rook', true, 'a1', { in: 27.35, out: 33.92, outKind: 'sink', moves: [[28.4, 'a5', 0.28, 'slide'], [29.1, 'h5', 0.28, 'slide'], [29.8, 'h1', 0.28, 'slide'], [30.5, 'c1', 0.28, 'slide'], [31.2, 'a1', 0.28, 'slide']] });
pc('f_bk', 'king', false, 'f6', { in: 27.45, out: 33.94, outKind: 'sink', moves: [[28.75, 'e6', 0.28, 'lift'], [29.45, 'd6', 0.28, 'lift'], [30.15, 'e7', 0.28, 'lift'], [30.85, 'f7', 0.28, 'lift'], [31.55, 'f6', 0.28, 'lift']] });
cue(28.3, 'ratchet', { dur: 3.4 }); cue(31.7, 'counterHit');
// --- DRAW №3 insufficient material 34–41.5
pc('m_wk', 'king', true, 'd4', { in: 34.25, out: 41.35, outKind: 'sink' });
pc('m_bk', 'king', false, 'f6', { in: 34.35, out: 41.37, outKind: 'sink' });
pc('m_wb', 'bishop', true, 'c2', { in: 37.0, enter: 'pop', out: 38.4, outKind: 'pop' });
pc('m_wn', 'knight', true, 'c2', { in: 38.4, enter: 'pop', out: 41.39, outKind: 'sink' });
hl('ring', ['c2'], 37.0, 41.0, { pulse: 8, silent: true });
// --- DRAW №4 agreement 41.5–46.5
pc('a_wk', 'king', true, 'e4', { in: 41.65, out: 46.35, outKind: 'sink', glow: [[43.6, 46.2, 0.5, 5]] });
pc('a_bk', 'king', false, 'e6', { in: 41.75, out: 46.37, outKind: 'sink', glow: [[43.6, 46.2, 0.6, 5]] });
// --- SUMMARY 46.5–52: half the board lights up (½ point each)
pc('h_wk', 'king', true, 'd4', { in: 46.6, out: 51.75, glow: [[47.1, 51.5, 0.35, 4]] });
pc('h_bk', 'king', false, 'e5', { in: 46.7, out: 51.77, glow: [[47.1, 51.5, 0.35, 4]] });
{
  const sq = []; for (let f = 0; f < 4; f++) for (let r = 1; r <= 8; r++) sq.push({ sq: 'abcd'[f] + r, d: (3 - f) + Math.abs(r - 4.5) * 0.5 });
  hl('fill', sq, 47.1, 51.5, { st: 0.06, max: 0.55 });
}
cue(51.75, 'clearAll');

// ================================================================= camera
const OV = { el: 60, d: 23.5, tgt: [0, 0, 0.1], fov: 40 };
const CAM = [
  { t: 0, az: 140, el: 9, d: 5.6, tgt: [2.8, 0.8, -3.0], fov: 40 },
  { t: 3.25, az: 118, el: 13, d: 5.2, tgt: [2.6, 0.8, -2.8], fov: 40, e: 'lin' },
  { t: 4.1, az: 14, el: 56, d: 13.5, tgt: [2.0, 0, -2.1], fov: 40, e: 'expo' },
  { t: 12.3, az: 4, el: 54, d: 13, tgt: [2.0, 0, -2.1], fov: 40, e: 'lin' },
  { t: 12.69, az: 4, el: 52, d: 12.6, tgt: [2.0, 0, -2.1], fov: 40, e: 'lin' },
  { t: 12.7, az: 150, el: 20, d: 7, tgt: [2.4, 0.5, -2.8], fov: 40, e: 'cut' },
  { t: 19.45, az: 122, el: 24, d: 6.4, tgt: [2.4, 0.5, -2.8], fov: 40, e: 'lin' },
  { t: 20.1, ...OV, az: 8, e: 'expo' },
  { t: 26.95, ...OV, az: -2, d: 23, e: 'lin' },
  { t: 27.45, ...OV, az: -16, e: 'expo' },
  { t: 33.95, ...OV, az: -8, d: 23, e: 'lin' },
  { t: 34.45, az: 14, el: 55, d: 17, tgt: [0, 0, 0.3], fov: 40, e: 'expo' },
  { t: 41.4, az: 4, el: 57, d: 16.5, tgt: [0, 0, 0.3], fov: 40, e: 'lin' },
  { t: 41.95, az: 90, el: 12, d: 7.2, tgt: [0.5, 0.75, -0.5], fov: 40, e: 'expo' },
  { t: 46.4, az: 70, el: 16, d: 6.6, tgt: [0.5, 0.75, -0.5], fov: 40, e: 'lin' },
  { t: 47.0, ...OV, az: 6, e: 'expo' },
  { t: 51.9, ...OV, az: -4, d: 23, e: 'lin' },
  { t: 53.4, az: 30, el: 80, d: 25, tgt: [0, 0, 0], fov: 40, e: 'expo' },
  { t: 60.0, az: 55, el: 82, d: 24, tgt: [0, 0, 0], fov: 40, e: 'lin' },
];
E.camCues(CAM);

// ================================================================= lighting per section
function lightAt(t) {
  const hook = 1 - prog(t, 3.3, 4.1);
  const mate = prog(t, 12.7, 12.75) * (1 - prog(t, 19, 20));
  const agree = prog(t, 41.9, 42.4) * (1 - prog(t, 46.3, 46.8));
  const cta = prog(t, 52, 53.5);
  const flash = t >= 12.7 ? Math.exp(-(t - 12.7) * 6) : 0;
  let focus = null;
  if (t > 12.7 && t < 19.5) focus = { x: 3.0, y: 1.8, z: -3.0, i: 30 * (1 - prog(t, 17, 19.5)) + 120 * flash };
  if (agree > 0) focus = { x: 0.5, y: 2.0, z: -0.5, i: 22 * agree };
  return {
    rim: 1 + 0.6 * hook + 0.8 * mate + 0.5 * agree,
    key: 1 - 0.45 * hook - 0.25 * mate - 0.3 * agree - 0.55 * cta,
    floor: 1 - 0.5 * cta, bloom: 1 + 0.8 * flash, focus,
  };
}
export const stateAt = E.makeStateAt(CAM, lightAt);

// ================================================================= on-screen text
export const B1 = 1395, B2 = 1462, B3 = 1529;
export const TEXTS = [
  // HOOK
  { k: 'k', t: 0.3, out: 3.35, str: 'У ТЕБЕ ФЕРЗЬ', y: 345, size: 120, style: 'slam', from: 2.4 },
  { k: 'k', t: 0.85, out: 3.35, str: 'У НЬОГО ЛИШЕ КОРОЛЬ', y: 490, size: 72, style: 'up' },
  { k: 'pl', t: 1.35, out: 3.35, str: 'І ЦЕ НІЧИЯ', y: 640, size: 92, rot: -2 },
  { k: 'label', t: 2.05, out: 3.35, str: 'ЧАСТИНА 3', y: 770, size: 34 },
  // STALEMATE
  { k: 'k', t: 4.15, out: 19.35, str: 'ПАТ', y: 340, size: 150, style: 'slam' },
  { k: 'b', t: 4.6, out: 10.6, str: 'білі ставлять ферзя на g6', y: B1 },
  { k: 'b', t: 6.0, out: 10.6, str: 'чорним ходити, а ходів немає', y: B2 },
  { k: 'b', t: 7.4, out: 10.6, str: 'і шаху королю теж немає', y: B3, accent: true },
  { k: 'pl', t: 8.6, out: 10.6, str: 'ПАТ = НІЧИЯ', y: 478, size: 64 },
  { k: 'b', t: 11.3, out: 16.0, str: 'а треба було так:', y: B1 },
  { k: 'pl', t: 12.75, out: 16.0, str: 'А ЦЕ ВЖЕ МАТ', y: 478, size: 64 },
  { k: 'b', t: 13.4, out: 16.0, str: 'різниця в одну клітинку', y: B2, accent: true },
  { k: 'b', t: 16.3, out: 19.35, str: 'перед ходом перевір,', y: B1 },
  { k: 'b', t: 16.9, out: 19.35, str: 'чи лишається в суперника хоч один хід', y: B2, accent: true },
  // DRAW №1
  { k: 'label', t: 19.95, out: 26.8, str: 'НІЧИЯ №1', y: 270, size: 36 },
  { k: 'k', t: 20.1, out: 26.8, str: 'ПОВТОРЕННЯ', y: 365, size: 120, style: 'slam' },
  { k: 'pl', t: 20.6, out: 22.6, str: '1 РАЗ', y: 500, size: 66 },
  { k: 'pl', t: 22.65, out: 25.0, str: '2 РАЗИ', y: 500, size: 66 },
  { k: 'pl', t: 25.05, out: 26.8, str: '3 РАЗИ', y: 500, size: 66 },
  { k: 'b', t: 21.0, out: 26.8, str: 'та сама позиція повторилася 3 рази', y: B1 },
  { k: 'b', t: 25.3, out: 26.8, str: 'і гра закінчується внічию', y: B2, accent: true },
  // DRAW №2
  { k: 'label', t: 27.45, out: 33.8, str: 'НІЧИЯ №2', y: 270, size: 36 },
  { k: 'k', t: 27.6, out: 33.8, str: '50 ХОДІВ', y: 365, size: 120, style: 'slam' },
  { k: 'counter', t: 28.3, dur: 3.4, out: 33.8, from: 0, to: 50, y: 560, size: 150 },
  { k: 'b', t: 28.5, out: 33.8, str: '50 ходів поспіль без жодного взяття', y: B1 },
  { k: 'b', t: 29.4, out: 33.8, str: 'і без жодного ходу пішаком', y: B2 },
  { k: 'b', t: 31.8, out: 33.8, str: 'нічия, навіть якщо в когось більше фігур', y: B3, accent: true },
  // DRAW №3
  { k: 'label', t: 34.45, out: 41.3, str: 'НІЧИЯ №3', y: 270, size: 36 },
  { k: 'k', t: 34.6, out: 41.3, str: 'МАЛО ФІГУР', y: 365, size: 120, style: 'slam' },
  { k: 'b', t: 35.2, out: 41.3, str: 'мат поставити просто нічим:', y: B1 },
  { k: 'b', t: 35.9, out: 41.3, str: 'король проти короля', y: B2 },
  { k: 'b', t: 37.1, out: 41.3, str: 'або король і один слон чи кінь', y: B3, accent: true },
  // DRAW №4
  { k: 'label', t: 41.95, out: 46.3, str: 'НІЧИЯ №4', y: 270, size: 36 },
  { k: 'k', t: 42.1, out: 46.3, str: 'ЗА ЗГОДОЮ', y: 365, size: 120, style: 'slam' },
  { k: 'b', t: 42.8, out: 46.3, str: 'один пропонує нічию,', y: B1 },
  { k: 'b', t: 43.6, out: 46.3, str: 'другий погоджується', y: B2, accent: true },
  // SUMMARY
  { k: 'k', t: 47.0, out: 51.65, str: 'НІЧИЯ', y: 345, size: 140, style: 'slam' },
  { k: 'pl', t: 47.5, out: 51.65, str: '½ ОЧКА КОЖНОМУ', y: 490, size: 70, rot: -2 },
  { k: 'b', t: 48.2, out: 51.65, str: 'не виграв, але й не програв', y: B1 },
  { k: 'b', t: 48.9, out: 51.65, str: 'іноді це найкращий результат', y: B2, accent: true },
  // CTA
  { k: 'k', t: 52.35, out: 99, str: 'ТЕПЕР ТИ ЗНАЄШ', y: 330, size: 84, style: 'up' },
  { k: 'pl', t: 52.75, out: 99, str: 'ПРО ПАТ І НІЧИЮ', y: 465, size: 84, rot: -2 },
];

// 2D effects consumed by main.js
export const FX = {
  whips: [[3.25, 4.1], [10.85, 11.3], [19.45, 20.1], [26.95, 27.45], [33.95, 34.45], [41.4, 41.95], [46.4, 47.0], [51.9, 53.4]],
  flashes: [[0.3, 0.3, 'o'], [12.7, 0.6, 'w'], [12.75, 0.4, 'o'], [31.7, 0.3, 'o'], [47.0, 0.25, 'o']],
  hotEmbers: [[-1, 4], [12.7, 19.5], [46.5, 52]],
  lists: [], dims: [],
};
E.finish(TEXTS);
