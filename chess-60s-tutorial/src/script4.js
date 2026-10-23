// Part 4 «Що робити на початку партії»: centre, develop, castle — shown as one real opening
// (1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.O-O Nf6, …O-O). Same contract as script.js: stateAt, TEXTS, CUES, B1, FX.
import { createEngine, prog, F } from './engine.js';

export const DUR = 60;
const E = createEngine();
const { cue, pc, hl, beam } = E;
export const CUES = E.CUES;

// ================================================================= SCENARIO
// full starting position from frame 0; moves per piece
const back = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
const MV = {
  // hook: the beginner's flank-pawn start, then rewind
  wp0: [[0.7, 'a4', 0.4, 'lift'], [4.2, 'a2', 0.4, 'slide']],
  bp4: [[1.3, 'e5', 0.4, 'lift'], [4.2, 'e7', 0.4, 'slide'], [9.4, 'e5', 0.45, 'lift']],
  wp7: [[1.9, 'h4', 0.4, 'lift'], [4.2, 'h2', 0.4, 'slide']],
  // rule 1: centre
  wp4: [[8.5, 'e4', 0.45, 'lift']],
  // rule 2: develop
  wb6: [[19.5, 'f3', 0.55, 'jump', 1.4]],
  bb1: [[20.6, 'c6', 0.55, 'jump', 1.4]],
  wb5: [[22.6, 'c4', 0.55, 'lift']],
  bb5: [[23.6, 'c5', 0.55, 'lift']],
  // rule 3: castle
  wb4: [[31.9, 'g1', 0.55, 'slide']],
  wb7: [[32.6, 'f1', 0.6, 'jump', 1.4]],
  bb6: [[35.8, 'f6', 0.55, 'jump', 1.4]],
  bb4: [[36.9, 'g8', 0.55, 'slide']],
  bb7: [[37.6, 'f8', 0.6, 'jump', 1.4]],
};
for (let f = 0; f < 8; f++) {
  pc('wp' + f, 'pawn', true, F[f] + 2, { out: 51.75 + f * 0.006, moves: MV['wp' + f] || [] });
  pc('wb' + f, back[f], true, F[f] + 1, { out: 51.8 + f * 0.006, moves: MV['wb' + f] || [] });
  pc('bp' + f, 'pawn', false, F[f] + 7, { out: 51.85 + f * 0.006, moves: MV['bp' + f] || [] });
  pc('bb' + f, back[f], false, F[f] + 8, { out: 51.9 + f * 0.006, moves: MV['bb' + f] || [] });
}
cue(51.75, 'clearAll');
// hook marks
hl('ring', ['a4'], 1.1, 4.1, { pulse: 10, silent: true }); hl('ring', ['h4'], 2.3, 4.1, { pulse: 10 });
cue(4.15, 'rewind');
// rule 1: the four centre squares, then what the e4 pawn controls
hl('fill', ['d4', 'e4', 'd5', 'e5'], 7.3, 17.7, { st: 0.12, max: 0.6, pulse: 4 });
hl('dot', ['d5', 'f5'], 10.9, 13.3, { st: 0.15 });
hl('ring', ['e4', 'e5'], 13.6, 17.7, { st: 0.15, pulse: 7 });
// rule 2: knights fight for e5, bishop eyes f7
beam('f3', 'e5', 20.1, 21.9, { grow: 0.2 });
hl('ring', ['e5'], 20.1, 21.9, { pulse: 10, silent: true });
beam('c6', 'e5', 21.2, 21.9, { grow: 0.2, silent: true });
beam('c4', 'f7', 23.2, 25.6, { grow: 0.25 });
hl('ring', ['f7'], 23.4, 25.6, { pulse: 9, silent: true });
hl('fill', ['f3', 'c6', 'c4', 'c5'], 26.0, 29.6, { st: 0.15, max: 0.5 });
// rule 3: the pawn wall in front of the castled king
hl('ring', ['g1'], 32.5, 35.4, { pulse: 6, silent: true });
hl('fill', ['f2', 'g2', 'h2'], 33.2, 35.4, { st: 0.12, max: 0.55 });
hl('fill', ['f7', 'g7', 'h7'], 38.2, 39.8, { st: 0.12, max: 0.55 });

// ================================================================= camera
const OV = { el: 60, d: 23.5, tgt: [0, 0, 0.1], fov: 40 };
const CAM = [
  { t: 0, az: -6, el: 40, d: 21.5, tgt: [0, 0, 0.6], fov: 40 },
  { t: 3.9, az: 5, el: 44, d: 20.5, tgt: [0, 0, 0.6], fov: 40, e: 'lin' },
  { t: 4.7, ...OV, az: -6, e: 'expo' },
  { t: 6.45, ...OV, az: -2, d: 23, e: 'lin' },
  { t: 7.1, az: 12, el: 56, d: 15.5, tgt: [0, 0, 0.3], fov: 40, e: 'expo' },
  { t: 17.8, az: 4, el: 58, d: 15, tgt: [0, 0, 0.3], fov: 40, e: 'lin' },
  { t: 18.5, az: -16, el: 54, d: 18.5, tgt: [0, 0, 0.6], fov: 40, e: 'expo' },
  { t: 29.8, az: -6, el: 56, d: 18, tgt: [0, 0, 0.6], fov: 40, e: 'lin' },
  { t: 30.5, az: 34, el: 46, d: 13, tgt: [2.0, 0.2, 1.6], fov: 40, e: 'expo' },
  { t: 35.2, az: 42, el: 44, d: 12.5, tgt: [2.0, 0.2, 1.4], fov: 40, e: 'lin' },
  { t: 35.9, az: 150, el: 44, d: 13, tgt: [2.0, 0.2, -1.6], fov: 40, e: 'expo' },
  { t: 40.2, az: 140, el: 46, d: 12.5, tgt: [2.0, 0.2, -1.6], fov: 40, e: 'lin' },
  { t: 41.0, ...OV, az: 380, el: 58, e: 'expo' },
  { t: 51.9, ...OV, az: 350, el: 60, e: 'lin' },
  { t: 53.4, az: 390, el: 80, d: 25, tgt: [0, 0, 0], fov: 40, e: 'expo' },
  { t: 60.0, az: 415, el: 82, d: 24, tgt: [0, 0, 0], fov: 40, e: 'lin' },
];
E.camCues(CAM);

// ================================================================= lighting per section
function lightAt(t) {
  const hook = 1 - prog(t, 3.3, 4.1);
  const sum = prog(t, 41, 42) * (1 - prog(t, 51.8, 52.5));
  const cta = prog(t, 52, 53.5);
  return { rim: 1 + 0.6 * hook + 0.3 * sum, key: 1 - 0.35 * hook - 0.55 * cta, floor: 1 - 0.5 * cta, bloom: 1, focus: null };
}
export const stateAt = E.makeStateAt(CAM, lightAt);

// ================================================================= on-screen text
export const B1 = 1395, B2 = 1462, B3 = 1529;
export const TEXTS = [
  // HOOK
  { k: 'k', t: 0.3, out: 3.95, str: 'ПОЧИНАЄШ ТАК?', y: 345, size: 112, style: 'slam', from: 2.4 },
  { k: 'pl', t: 2.35, out: 3.95, str: 'ТИ ВЖЕ ПРОГРАЄШ', y: 495, size: 84, rot: -2 },
  { k: 'label', t: 2.9, out: 3.95, str: 'ЧАСТИНА 4', y: 620, size: 34 },
  // INTRO
  { k: 'k', t: 4.65, out: 6.4, str: '3 ПРАВИЛА', y: 345, size: 130, style: 'slam' },
  { k: 'pl', t: 5.05, out: 6.4, str: 'ПЕРШИХ ХОДІВ', y: 495, size: 84, rot: -2 },
  // RULE 1
  { k: 'label', t: 6.95, out: 17.75, str: 'ПРАВИЛО №1', y: 270, size: 36 },
  { k: 'k', t: 7.1, out: 17.75, str: 'ЗАЙМИ ЦЕНТР', y: 365, size: 116, style: 'slam' },
  { k: 'b', t: 7.6, out: 13.4, str: '4 головні клітинки: d4, e4, d5, e5', y: B1 },
  { k: 'b', t: 9.9, out: 13.4, str: 'перший хід: пішак у центр', y: B2 },
  { k: 'b', t: 11.1, out: 13.4, str: 'і він уже б’є поля суперника', y: B3, accent: true },
  { k: 'b', t: 13.8, out: 17.75, str: 'хто тримає центр,', y: B1 },
  { k: 'b', t: 14.5, out: 17.75, str: 'той і керує грою', y: B2, accent: true },
  // RULE 2
  { k: 'label', t: 18.4, out: 29.75, str: 'ПРАВИЛО №2', y: 270, size: 36 },
  { k: 'k', t: 18.55, out: 29.75, str: 'ВИВЕДИ ФІГУРИ', y: 365, size: 110, style: 'slam' },
  { k: 'b', t: 19.0, out: 25.7, str: 'спершу коні й слони, ближче до центру', y: B1 },
  { k: 'b', t: 20.3, out: 25.7, str: 'кінь атакує центр, кінь захищає', y: B2 },
  { k: 'b', t: 23.3, out: 25.7, str: 'а слон уже цілиться у слабке поле f7', y: B3, accent: true },
  { k: 'b', t: 26.0, out: 29.75, str: 'кожною фігурою по одному ходу', y: B1 },
  { k: 'b', t: 26.8, out: 29.75, str: 'і не виводь ферзя зарано', y: B2, accent: true },
  // RULE 3
  { k: 'label', t: 30.45, out: 39.95, str: 'ПРАВИЛО №3', y: 270, size: 36 },
  { k: 'k', t: 30.6, out: 39.95, str: 'СХОВАЙ КОРОЛЯ', y: 365, size: 110, style: 'slam' },
  { k: 'b', t: 31.0, out: 35.5, str: 'зроби рокіровку якомога раніше', y: B1 },
  { k: 'b', t: 33.3, out: 35.5, str: 'король сховався за пішаками', y: B2 },
  { k: 'b', t: 34.1, out: 35.5, str: 'а тура вийшла в гру', y: B3, accent: true },
  { k: 'b', t: 36.2, out: 39.95, str: 'суперник робить те саме', y: B1 },
  { k: 'b', t: 38.3, out: 39.95, str: 'і тепер можна починати бій', y: B2, accent: true },
  // SUMMARY
  { k: 'k', t: 41.0, out: 51.65, str: 'ДЕБЮТ', y: 345, size: 140, style: 'slam' },
  { k: 'pl', t: 41.4, out: 51.65, str: 'ЗА 3 КРОКИ', y: 490, size: 84, rot: -2 },
  // CTA
  { k: 'k', t: 52.35, out: 99, str: 'ТЕПЕР ТИ ЗНАЄШ', y: 330, size: 84, style: 'up' },
  { k: 'pl', t: 52.75, out: 99, str: 'ЯК ПОЧИНАТИ ПАРТІЮ', y: 465, size: 84, rot: -2 },
];

// 2D effects consumed by main.js
export const FX = {
  whips: [[3.9, 4.7], [6.45, 7.1], [17.8, 18.5], [29.8, 30.5], [35.2, 35.9], [40.2, 41.0], [51.9, 53.4]],
  flashes: [[0.3, 0.3, 'o'], [2.35, 0.25, 'o'], [4.65, 0.25, 'o']],
  hotEmbers: [[-1, 4], [41, 52]],
  lists: [{ t: 42.0, out: 51.6, y: 660, st: 1.3, title: 'ЗАПАМ’ЯТАЙ:', items: [
    'займи центр пішаками',
    'виведи коней і слонів',
    'сховай короля рокіровкою',
    'і тільки потім атакуй',
  ] }],
  dims: [[41.8, 51.6, 0.62]],
};
E.finish(TEXTS, FX.lists);
