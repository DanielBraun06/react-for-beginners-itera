// «Пішак»: детермінована 3D-сцена. Усе рахується від часу t, тож window.renderFrame(t) дає той самий кадр за будь-якого порядку.
import * as THREE from 'three';

const TL = await window.TIMELINE_PROMISE;
const EV = TL.events;
const W = 1080, H = 1920;

// ------------------------------------------------------------ math
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const sm = u => u * u * (3 - 2 * u);
const eio = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eout = u => 1 - Math.pow(1 - u, 3);
const ein = u => u * u * u;
const eback = u => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
// затухаюча пружина від поштовху в t0
const kick = (t, t0, f = 3, d = 6) => { const x = t - t0; return x < 0 ? 0 : Math.exp(-d * x) * Math.sin(2 * Math.PI * f * x); };
const wob = (t, s) => Math.sin(t * 0.53 + s) * 0.5 + Math.sin(t * 0.91 + s * 2.1) * 0.3 + Math.sin(t * 1.37 + s * 3.3) * 0.2;
const gauss = (t, c, w) => Math.exp(-((t - c) * (t - c)) / (2 * w * w));
const sqr = n => [n.charCodeAt(0) - 97 - 3.5, parseInt(n[1], 10) - 4.5];
const hash = (x, y, s) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
function vnoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash(ix, iy, s), hash(ix + 1, iy, s), ux), lerp(hash(ix, iy + 1, s), hash(ix + 1, iy + 1, s), ux), uy);
}
const fbm = (x, y, s) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { v += a * vnoise(x * f, y * f, s + i * 13); f *= 2; a *= 0.5; } return v; };

// ------------------------------------------------------------ procedural textures
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function woodCanvas(w, h, c1, c2, { rings = 7, seed = 1, warp = 2.2, streak = 0.12, vs = 1.5 } = {}) {
  const cv = canvas(w, h), ctx = cv.getContext('2d'), img = ctx.createImageData(w, h), D = img.data;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w, n = fbm(u * 3, v * vs, seed);
      const g = Math.pow(0.5 + 0.5 * Math.sin((u * rings + n * warp) * Math.PI * 2), 4);
      const st = (hash(Math.floor(x / 2), Math.floor(y / 50), seed) - 0.5) * streak;
      const k = clamp(g * 0.55 + st + (n - 0.5) * 0.35 + 0.18), i = (y * w + x) * 4;
      D[i] = lerp(c1[0], c2[0], k); D[i + 1] = lerp(c1[1], c2[1], k); D[i + 2] = lerp(c1[2], c2[2], k); D[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0); return cv;
}
function tex(cv, rep = 1) {
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
  return t;
}
function radialCanvas(stops, size = 256) {
  const cv = canvas(size, size), c = cv.getContext('2d'), g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  c.fillStyle = g; c.fillRect(0, 0, size, size); return cv;
}

const MAPLE = [[232, 186, 128], [178, 116, 60]];
const WALNUT = [[70, 42, 27], [30, 17, 10]];
const woodMaple = tex(woodCanvas(256, 512, ...MAPLE, { seed: 3 }));
const woodWalnut = tex(woodCanvas(256, 512, ...WALNUT, { seed: 7, rings: 9 }));

function boardCanvas() {
  const S = 1024, q = S / 8, cv = canvas(S, S), c = cv.getContext('2d');
  const light = woodCanvas(256, 256, [236, 196, 140], [196, 142, 84], { seed: 11, rings: 5 });
  const dark = woodCanvas(256, 256, [124, 74, 40], [66, 37, 20], { seed: 17, rings: 6 });
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const isDark = (i + j) % 2 === 0, src = isDark ? dark : light;
    c.save(); c.translate(i * q + q / 2, j * q + q / 2);
    if ((i * 3 + j) % 2) c.rotate(Math.PI / 2);
    const ox = hash(i, j, 1) * 120, oy = hash(i, j, 2) * 120;
    c.drawImage(src, ox, oy, 136, 136, -q / 2, -q / 2, q, q);
    c.fillStyle = `rgba(${hash(i, j, 3) > 0.5 ? '255,230,200' : '30,15,5'},${0.04 + hash(i, j, 4) * 0.05})`;
    c.fillRect(-q / 2, -q / 2, q, q);
    c.restore();
  }
  c.strokeStyle = 'rgba(25,12,4,0.55)'; c.lineWidth = 2;
  for (let k = 0; k <= 8; k++) { c.beginPath(); c.moveTo(k * q, 0); c.lineTo(k * q, S); c.stroke(); c.beginPath(); c.moveTo(0, k * q); c.lineTo(S, k * q); c.stroke(); }
  // потертості
  for (let n = 0; n < 160; n++) {
    c.strokeStyle = `rgba(255,235,205,${0.03 + hash(n, 5, 9) * 0.05})`; c.lineWidth = 1;
    const x = hash(n, 1, 9) * S, y = hash(n, 2, 9) * S, a = hash(n, 3, 9) * 6.28, l = 6 + hash(n, 4, 9) * 30;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  return cv;
}
function arrowCanvas() {
  const cv = canvas(128, 512), c = cv.getContext('2d');
  c.shadowColor = 'rgba(255,255,255,1)'; c.shadowBlur = 18; c.fillStyle = '#fff';
  c.beginPath(); c.moveTo(52, 500); c.lineTo(76, 500); c.lineTo(76, 150); c.lineTo(108, 150); c.lineTo(64, 40); c.lineTo(20, 150); c.lineTo(52, 150); c.closePath(); c.fill();
  return cv;
}
function hankyCanvas() {
  const cv = canvas(128, 128), c = cv.getContext('2d');
  c.fillStyle = '#f3ead8'; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = 'rgba(70,110,170,0.75)'; c.lineWidth = 5;
  for (const p of [18, 46, 82, 110]) { c.beginPath(); c.moveTo(p, 0); c.lineTo(p, 128); c.stroke(); c.beginPath(); c.moveTo(0, p); c.lineTo(128, p); c.stroke(); }
  c.strokeStyle = 'rgba(200,70,60,0.8)'; c.lineWidth = 6; c.strokeRect(5, 5, 118, 118);
  return cv;
}

// ------------------------------------------------------------ renderer / scene
const glc = canvas(W, H);
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070403);
scene.fog = new THREE.Fog(0x070403, 9, 19);
const camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 60);

const LAMP_POS = new THREE.Vector3(-4.0, 4.3, 2.0), LAMP_AIM = new THREE.Vector3(0.3, 0, 0.3);
const spot = new THREE.SpotLight(0xffc68a, 1, 0, 0.85, 0.7, 0);
spot.position.copy(LAMP_POS); spot.target.position.copy(LAMP_AIM);
spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0003; spot.shadow.normalBias = 0.015;
spot.shadow.camera.near = 2; spot.shadow.camera.far = 14;
scene.add(spot, spot.target);
const hemi = new THREE.HemisphereLight(0x8a8aa6, 0x2a170c, 0.12); scene.add(hemi);
const fill = new THREE.DirectionalLight(0xffd2a0, 0.4); fill.position.set(1.5, 2.5, 7); scene.add(fill);
const rim = new THREE.DirectionalLight(0xa8b4e0, 0.18); rim.position.set(2.5, 3, -5); scene.add(rim);
const goldLight = new THREE.PointLight(0xffb640, 0, 4.5, 1.6); goldLight.position.set(-0.5, 0.8, 4.3); scene.add(goldLight);

// стіл, дошка, рамка
const tableMat = new THREE.MeshStandardMaterial({ map: tex(woodCanvas(512, 512, [58, 36, 24], [24, 14, 9], { seed: 21, rings: 4, vs: 0.8 }), 3), roughness: 0.75 });
const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), tableMat);
table.rotation.x = -Math.PI / 2; table.position.y = -0.22; table.receiveShadow = true; scene.add(table);
const frameMat = new THREE.MeshStandardMaterial({ map: tex(woodCanvas(256, 512, [64, 36, 21], [28, 15, 9], { seed: 5, rings: 3 })), roughness: 0.45 });
const frame = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.22, 8.7), frameMat);
frame.position.y = -0.11; frame.receiveShadow = true; frame.castShadow = true; scene.add(frame);
const boardMat = new THREE.MeshStandardMaterial({ map: tex(boardCanvas()), roughness: 0.4, metalness: 0 });
const board = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), boardMat);
board.rotation.x = -Math.PI / 2; board.position.y = 0.002; board.receiveShadow = true; scene.add(board);

// ------------------------------------------------------------ pieces
function resample(p, N) {
  const L = [0]; for (let i = 1; i < p.length; i++) L.push(L[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const out = []; let k = 0;
  for (let i = 0; i < N; i++) {
    const s = (L[L.length - 1] * i) / (N - 1);
    while (k < L.length - 2 && L[k + 1] < s) k++;
    const u = (s - L[k]) / Math.max(1e-9, L[k + 1] - L[k]);
    out.push([lerp(p[k][0], p[k + 1][0], u), lerp(p[k][1], p[k + 1][1], u)]);
  }
  return out;
}
const arc = (p, cx, cy, rx, ry, a0, a1, n) => { for (let i = 1; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([Math.max(0, rx * Math.cos(a)), cy + ry * Math.sin(a)]); } p[p.length - 1][0] = 0; return p; };
const BASE = [[0, 0], [0.33, 0], [0.335, 0.03], [0.32, 0.06], [0.28, 0.075], [0.29, 0.095], [0.27, 0.115], [0.22, 0.14]];
const PROF = {
  pawn: arc([...BASE, [0.17, 0.19], [0.135, 0.27], [0.115, 0.36], [0.11, 0.41], [0.17, 0.43], [0.185, 0.45], [0.17, 0.47], [0.1, 0.485]], 0, 0.6, 0.145, 0.145, -0.99, Math.PI / 2, 16),
  queen: arc([[0, 0], [0.37, 0], [0.375, 0.035], [0.355, 0.07], [0.31, 0.09], [0.325, 0.115], [0.29, 0.14], [0.23, 0.17], [0.18, 0.23], [0.15, 0.34], [0.13, 0.5], [0.115, 0.66], [0.11, 0.74], [0.19, 0.77], [0.205, 0.795], [0.18, 0.82], [0.12, 0.84], [0.13, 0.9], [0.17, 0.98], [0.215, 1.06], [0.2, 1.08], [0.12, 1.065], [0.075, 1.1], [0.045, 1.125]], 0, 1.17, 0.05, 0.05, -1.1, Math.PI / 2, 8),
  bishop: arc([[0, 0], [0.35, 0], [0.355, 0.035], [0.335, 0.065], [0.3, 0.085], [0.31, 0.11], [0.27, 0.135], [0.21, 0.17], [0.16, 0.25], [0.13, 0.4], [0.115, 0.55], [0.11, 0.6], [0.19, 0.62], [0.2, 0.645], [0.17, 0.665], [0.1, 0.68], [0.12, 0.7]], 0, 0.86, 0.14, 0.2, -0.95, 1.25, 12).concat([[0.03, 1.07]]),
  king: [[0, 0], [0.37, 0], [0.375, 0.035], [0.355, 0.07], [0.31, 0.09], [0.325, 0.115], [0.29, 0.14], [0.23, 0.17], [0.18, 0.23], [0.15, 0.34], [0.13, 0.5], [0.115, 0.66], [0.11, 0.76], [0.2, 0.79], [0.21, 0.815], [0.18, 0.84], [0.12, 0.86], [0.14, 0.92], [0.19, 1.04], [0.2, 1.07], [0.0, 1.08]],
  knightBase: [[0, 0], [0.35, 0], [0.355, 0.035], [0.335, 0.065], [0.3, 0.085], [0.31, 0.11], [0.27, 0.135], [0.2, 0.18], [0.17, 0.25], [0.16, 0.3], [0, 0.3]],
};
PROF.bishop[PROF.bishop.length - 2][0] = 0.035; PROF.bishop.splice(PROF.bishop.length - 1, 1); PROF.bishop.push([0.04, 1.075], [0.045, 1.1], [0, 1.115]);
const NM = 72, P_PAWN = resample(PROF.pawn, NM), P_QUEEN = resample(PROF.queen, NM);
const lathe = p => new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), 44, Math.PI, Math.PI * 2);
const woodMat = (map, color = 0xffffff) => new THREE.MeshStandardMaterial({ map, color, roughness: 0.38, metalness: 0.0 });
const MAT_W = woodMat(woodMaple), MAT_B = woodMat(woodWalnut);
const MAT_EYE = new THREE.MeshStandardMaterial({ color: 0xfaf4e8, roughness: 0.25 });
const MAT_PUPIL = new THREE.MeshStandardMaterial({ color: 0x0d0805, roughness: 0.15 });
const MAT_INK = new THREE.MeshStandardMaterial({ color: 0x2a140a, roughness: 0.5 });
const MAT_GOLD = new THREE.MeshStandardMaterial({ color: 0xffc35a, metalness: 0.85, roughness: 0.28, emissive: 0x6a3a00, emissiveIntensity: 0.4 });
const GHOST = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
const shadowy = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };

function makeFace(r = 1) {
  const g = new THREE.Group(), eyes = [], brows = [];
  for (const sx of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(sx * 0.052 * r, 0.018 * r, 0);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.036 * r, 20, 14), MAT_EYE); white.scale.set(1, 1.18, 0.55);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018 * r, 14, 10), MAT_PUPIL); pupil.position.z = 0.016 * r; pupil.scale.z = 0.6;
    eg.add(white, pupil); g.add(eg); eyes.push({ eg, pupil });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.05 * r, 0.012 * r, 0.012 * r), MAT_INK); b.position.set(sx * 0.054 * r, 0.072 * r, 0.004 * r);
    g.add(b); brows.push(b);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.026 * r, 0.0065 * r, 6, 18, Math.PI), MAT_INK); smile.rotation.z = Math.PI; smile.position.set(0, -0.035 * r, -0.004 * r);
  const flat = new THREE.Mesh(new THREE.BoxGeometry(0.036 * r, 0.008 * r, 0.008 * r), MAT_INK); flat.position.set(0, -0.045 * r, -0.004 * r);
  const oh = new THREE.Mesh(new THREE.SphereGeometry(0.016 * r, 12, 8), MAT_PUPIL); oh.scale.set(1, 1.3, 0.4); oh.position.set(0, -0.048 * r, -0.004 * r);
  g.add(smile, flat, oh);
  g.userData = { eyes, brows, smile, flat, oh, r };
  return g;
}
// face state: gx, gy (-1..1), blink 0..1, wide, browL/browR {y, rot}, mouth 'flat'|'smile'|'o', smile amount
function setFace(f, s) {
  const { eyes, brows, smile, flat, oh, r } = f.userData;
  const lid = clamp(1 - (s.blink || 0)) * (s.squint ? 1 - 0.45 * s.squint : 1);
  eyes.forEach((e, i) => {
    const w = 1 + (s.wide || 0) * 0.35;
    e.eg.scale.set(w, Math.max(0.08, lid) * w, w);
    e.pupil.position.x = (s.gx || 0) * 0.014 * r; e.pupil.position.y = (s.gy || 0) * 0.016 * r;
    const wink = i === 1 && s.wink ? 1 - 0.92 * s.wink : 1; e.eg.scale.y *= wink;
  });
  const bl = s.browL || { y: 0, rot: 0 }, br = s.browR || { y: 0, rot: 0 };
  brows[0].position.y = (0.072 + bl.y * 0.025) * r; brows[0].rotation.z = bl.rot;
  brows[1].position.y = (0.072 + br.y * 0.025) * r; brows[1].rotation.z = br.rot;
  const m = s.mouth || 'flat';
  smile.visible = m === 'smile'; flat.visible = m === 'flat'; oh.visible = m === 'o';
  smile.scale.set(1, 0.35 + 0.9 * (s.smile ?? 1), 1);
}

// білий пішак (герой): корінь → сквош → тіло, обличчя, руки, корона
const pawn = new THREE.Group(), pSquash = new THREE.Group(); pawn.add(pSquash); scene.add(pawn);
let pawnGeoKey = -1;
const MAT_HERO = woodMat(woodMaple);
const pBody = shadowy(new THREE.Mesh(lathe(P_PAWN), MAT_HERO), false); pSquash.add(pBody);
const pFace = makeFace(1); pSquash.add(pFace);
const arms = [-1, 1].map(sx => {
  const sh = new THREE.Group(); sh.position.set(sx * 0.12, 0.44, 0);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.015, 0.2, 10), MAT_W); stick.position.y = -0.1;
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), MAT_W); hand.position.y = -0.205;
  sh.add(stick, hand); pSquash.add(sh); return { sh, hand, sx };
});
const crown = new THREE.Group(); pSquash.add(crown);
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2, s = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), MAT_GOLD);
  s.position.set(Math.sin(a) * 0.2, 1.1, Math.cos(a) * 0.2); crown.add(shadowy(s));
}
const crownTop = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), MAT_GOLD); crownTop.position.y = 1.17; crown.add(shadowy(crownTop));
// тінь-ферзь: невидима, але кидає тінь
const ghost = new THREE.Group(), gSquash = new THREE.Group(); ghost.add(gSquash); scene.add(ghost);
gSquash.add(shadowy(new THREE.Mesh(lathe(P_QUEEN), GHOST)));
crown.children.forEach(c => { const m = new THREE.Mesh(c.geometry, GHOST); m.position.copy(c.position); gSquash.add(shadowy(m)); });

// хустинка
const hankyGeo = new THREE.PlaneGeometry(0.2, 0.2, 8, 8), hankyBase = hankyGeo.attributes.position.array.slice();
const hanky = shadowy(new THREE.Mesh(hankyGeo, new THREE.MeshStandardMaterial({ map: tex(hankyCanvas()), roughness: 0.9, side: THREE.DoubleSide })));
scene.add(hanky);

function piece(kind, mat, faceY, faceZ) {
  const g = new THREE.Group(), sq = new THREE.Group(); g.add(sq);
  if (kind === 'knight') {
    sq.add(shadowy(new THREE.Mesh(lathe(PROF.knightBase), mat)));
    const s = new THREE.Shape(); const pts = [[-0.14, 0.26], [-0.16, 0.5], [-0.12, 0.68], [-0.06, 0.8], [-0.02, 0.9], [0.03, 0.8], [0.12, 0.74], [0.25, 0.62], [0.28, 0.54], [0.22, 0.49], [0.11, 0.51], [0.05, 0.44], [0.13, 0.31], [0.14, 0.26]];
    s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p));
    const eg = new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 3 });
    eg.translate(0, 0, -0.075); eg.rotateY(-Math.PI / 2);
    const head = shadowy(new THREE.Mesh(eg, mat)); sq.add(head);
    const mane = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), MAT_INK)); mane.position.set(0, 0.6, -0.15); mane.rotation.x = -0.25; sq.add(mane);
  } else {
    sq.add(shadowy(new THREE.Mesh(lathe(PROF[kind]), mat)));
    if (kind === 'bishop') { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.022, 0.05), MAT_INK); sl.position.set(0.05, 0.95, 0.09); sl.rotation.set(0.2, -0.5, 0.65); sq.add(sl); }
    if (kind === 'king') {
      const a = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), MAT_GOLD)), b = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), MAT_GOLD));
      a.position.y = 1.16; b.position.y = 1.18; sq.add(a, b);
    }
  }
  const f = makeFace(kind === 'knight' ? 0.85 : 1); f.position.set(0, faceY, faceZ); sq.add(f);
  g.userData = { sq, face: f }; scene.add(g); return g;
}
const wKing = piece('king', MAT_W, 0.93, 0.155), wQueen = piece('queen', MAT_W, 0.93, 0.155), wBishop = piece('bishop', MAT_W, 0.82, 0.135), wKnight = piece('knight', MAT_W, 0.68, 0.22);
wKnight.userData.face.rotation.x = -0.25;
const bBishop = piece('bishop', MAT_B, 0.82, 0.135), bKing = piece('king', MAT_B, 0.93, 0.155);
const place = (g, n) => { const [x, z] = sqr(n); g.position.set(x, 0, z); };

// зірочки над слоном
const starShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.022 : 0.055; i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.015, bevelEnabled: false });
const stars = [0, 1, 2].map(() => { const m = new THREE.Mesh(starGeo, new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0xffa020, emissiveIntensity: 0.9 })); scene.add(m); return m; });

// стрілки світлом на дереві
const arrowTex = tex(arrowCanvas());
const mkArrow = color => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: arrowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.order = 'YXZ'; scene.add(m); return m; };
const arrowS = mkArrow(0xbfb6a8), arrowD = mkArrow(0xffb23c);

// золото на d8, спалах, іскри
const glowTex = tex(radialCanvas([[0, 'rgba(255,220,140,1)'], [0.35, 'rgba(255,170,60,0.55)'], [1, 'rgba(255,140,20,0)']]));
const d8Glow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
d8Glow.rotation.x = -Math.PI / 2; { const [x, z] = sqr('d8'); d8Glow.position.set(x, 0.006, z); } scene.add(d8Glow);
const flashSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
scene.add(flashSpr);
const dotTex = tex(radialCanvas([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,240,210,0.5)'], [1, 'rgba(255,220,180,0)']], 64));
const NS = 70, sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NS * 3), 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ map: dotTex, size: 0.06, color: 0xffcf70, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(sparks);

// промінь лампи і пил
const beamLen = LAMP_POS.distanceTo(LAMP_AIM) + 1;
const beamGeo = new THREE.ConeGeometry(Math.tan(0.6) * beamLen, beamLen, 48, 1, true); beamGeo.translate(0, -beamLen / 2, 0);
const beamMat = new THREE.ShaderMaterial({
  uniforms: { k: { value: 0.05 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: 'varying float h; varying vec3 n; varying vec3 vp; void main(){ h = -position.y; vec4 mv = modelViewMatrix*vec4(position,1.); vp = mv.xyz; n = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }',
  fragmentShader: `uniform float k; varying float h; varying vec3 n; varying vec3 vp; void main(){ float f = pow(abs(dot(normalize(-vp), n)), 2.0); float a = k * f * smoothstep(0.0, 1.5, h) * (1.0 - smoothstep(${(beamLen * 0.6).toFixed(2)}, ${beamLen.toFixed(2)}, h)); gl_FragColor = vec4(vec3(1.0,0.78,0.5)*a, a); }`,
});
const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.copy(LAMP_POS);
beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), LAMP_AIM.clone().sub(LAMP_POS).normalize());
scene.add(beam);
const ND = 420, dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(ND * 3), 3));
const dustMat = new THREE.PointsMaterial({ map: dotTex, size: 0.03, color: 0xffd9a8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
const dust = new THREE.Points(dustGeo, dustMat); scene.add(dust);
const beamDir = LAMP_AIM.clone().sub(LAMP_POS).normalize();

// ------------------------------------------------------------ animation
const HOPS = [...EV.pawnHops.map(h => ({ ...h, h: h.to === 'd8' ? 0.42 : 0.3, crouch: h.to === 'd8' ? 0.35 : 0.2 })),
  { t: EV.strike, dur: EV.impact - EV.strike, from: 'e5', to: 'd6', h: 0.26, crouch: EV.strike - EV.strikeCrouch }].sort((a, b) => a.t - b.t);

function hopState(t) {
  let pos = sqr('e2'), y = 0, sqz = 0, lean = 0;
  for (const h of HOPS) {
    const a = sqr(h.from), b = sqr(h.to);
    if (t < h.t - h.crouch) break;
    if (t < h.t) { pos = a; sqz += 0.11 * eout(ramp(t, h.t - h.crouch, h.t)); lean = -0.15 * ramp(t, h.t - h.crouch, h.t); break; }
    if (t < h.t + h.dur) { const u = (t - h.t) / h.dur; pos = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]; y = 4 * h.h * u * (1 - u); sqz = -0.1 * (1 - u) + 0.02; lean = 0.18 * (1 - 2 * u); break; }
    pos = b; const tau = t - h.t - h.dur;
    if (tau < 0.9) { sqz += 0.13 * Math.exp(-7 * tau) * Math.cos(2 * Math.PI * 2.3 * tau); lean += -0.12 * kick(t, h.t + h.dur, 2, 5); }
  }
  return { pos, y, sqz, lean };
}

function setSquash(grp, s) { const sy = 1 - s, sx = 1 / Math.sqrt(Math.max(0.3, sy)); grp.scale.set(sx, sy, sx); }
const blinkAt = (t, seed) => { let b = 0; for (let k = 0; k < 20; k++) { const c = 1.2 + k * 2.6 + hash(k, seed, 3) * 1.6; b = Math.max(b, gauss(t, c, 0.045)); } return b; };

function pawnRig(t) {
  const hs = hopState(t);
  // поворот корпусу: косі погляди, слон, удар, ферзь озирається
  let yaw = 0.5 * gauss(t, 6.85, 0.22) - 0.3 * gauss(t, 7.35, 0.18) - 0.55 * gauss(t, 7.85, 0.2);
  yaw += -0.55 * sm(ramp(t, 14.6, 15.2)) * (1 - sm(ramp(t, 18.6, 19.1)));
  // «секрет»: озирається на глядача, потім крутиться на діагональ
  yaw += 2.2 * eio(ramp(t, 19.1, 19.6)) * (1 - eio(ramp(t, 21.25, 21.75)));
  yaw += -0.785 * eio(ramp(t, 21.25, 21.75)) * (1 - sm(ramp(t, 22.8, 23.7)));
  yaw += 1.4 * eio(ramp(t, EV.lookBack, EV.lookBack + 0.6)) - 0.85 * eio(ramp(t, 40.4, 41.1));
  const breathF = t > 11.3 && t < 13.2 ? 1.3 : 0.25, breathA = t > 11.3 && t < 13.2 ? 0.03 : 0.013;
  let sqz = hs.sqz + breathA * Math.sin(t * Math.PI * 2 * breathF);
  sqz += 0.06 * sm(ramp(t, EV.breath[0], EV.breath[0] + 0.5)) * (1 - sm(ramp(t, EV.breath[1] - 0.25, EV.breath[1])));
  sqz -= 0.08 * sm(ramp(t, EV.breath[0] + 0.5, EV.breath[1])) * (1 - ramp(t, EV.breath[1], EV.breath[1] + 0.3));
  // переляк від слона
  const startle = t >= EV.bishopDrop ? Math.exp(-3 * (t - EV.bishopDrop)) : 0;
  let y = hs.y + 0.12 * Math.max(0, Math.sin(clamp((t - EV.bishopDrop) / 0.35) * Math.PI)) * (t > EV.bishopDrop ? 1 : 0);
  // перетворення
  const m = eio(ramp(t, EV.morph[0], EV.morph[1]));
  const stretch = 0.12 * kick(t, EV.morph[0] + 0.05, 1.6, 2.5);
  pawn.position.set(hs.pos[0], y, hs.pos[1]); pawn.rotation.y = yaw; pawn.rotation.x = hs.lean;
  setSquash(pSquash, sqz - stretch);
  const key = m <= 0 ? 0 : m >= 1 ? 1 : Math.round(m * 1000) / 1000;
  if (key !== pawnGeoKey) { pBody.geometry.dispose(); pBody.geometry = lathe(P_PAWN.map((p, i) => [lerp(p[0], P_QUEEN[i][0], key), lerp(p[1], P_QUEEN[i][1], key)])); pawnGeoKey = key; }
  pBody.castShadow = m >= 1; ghost.visible = m < 1;
  MAT_HERO.emissive.setHex(0xff9a20); MAT_HERO.emissiveIntensity = 0.5 * gauss(t, EV.flash + 0.2, 0.35);
  const cs = eback(ramp(t, EV.morph[0] + 0.45, EV.morph[1] + 0.1)); crown.scale.setScalar(Math.max(0.0001, cs)); crown.visible = cs > 0.001;
  ghost.position.copy(pawn.position); ghost.rotation.copy(pawn.rotation); setSquash(gSquash, sqz - stretch);
  // обличчя
  pFace.position.set(0, lerp(0.6, 0.93, m), lerp(0.129, 0.148, m));
  pFace.position.y += 0.006 * Math.sin(t * 2 * Math.PI * breathF);
  const glance = gauss(t, 6.85, 0.22) - gauss(t, 7.35, 0.18) * 0.6 - gauss(t, 7.85, 0.2);
  let gx = clamp(glance * 1.6, -1, 1), gy = 0;
  const atBishop = sm(ramp(t, 14.2, 14.7)) * (1 - sm(ramp(t, 17.0, 17.4)));
  gx = lerp(gx, -0.7, atBishop); gy = lerp(gy, 0.9, atBishop);
  const diag = sm(ramp(t, 21.6, 21.8)) * (1 - sm(ramp(t, 22.2, 22.5)));
  gx = lerp(gx, 0, diag); gy = lerp(gy, -0.3, diag);
  const back = sm(ramp(t, EV.lookBack, EV.lookBack + 0.5)) * (1 - sm(ramp(t, 40.4, 40.9)));
  gx = lerp(gx, 1, back);
  const fwd8 = sm(ramp(t, 31.3, 31.8)) * (1 - sm(ramp(t, 33.4, 33.6)));
  gy = lerp(gy, 0.6, fwd8);
  const skeptic = clamp(gauss(t, 6.85, 0.3) + gauss(t, 7.35, 0.25) + gauss(t, 7.85, 0.3));
  const sly = sm(ramp(t, 19.6, 20.1)) * (1 - sm(ramp(t, 22.0, 22.3)));
  const tired = sm(ramp(t, 11.2, 11.5)) * (1 - sm(ramp(t, 12.9, 13.4)));
  const hmph = sm(ramp(t, 8.0, 8.2)) * (1 - sm(ramp(t, 8.7, 9.1)));
  const wide = startle + 0.8 * gauss(t, EV.impact + 0.05, 0.12) + 0.9 * gauss(t, EV.flash + 0.6, 0.4);
  const smile = sm(ramp(t, EV.smile, EV.smile + 0.5)) + 0.6 * sm(ramp(t, EV.flash + 0.9, EV.flash + 1.4)) * (1 - sm(ramp(t, EV.lookBack - 0.2, EV.lookBack)));
  let mouth = 'flat';
  if (startle > 0.25 || tired > 0.5) mouth = 'o';
  if (sly > 0.5 || smile > 0.2) mouth = 'smile';
  const wink = gauss(t, 41.75, 0.12) * 1.0;
  setFace(pFace, {
    gx, gy, blink: blinkAt(t, 1) * (wide > 0.3 ? 0 : 1), wide, squint: Math.max(tired * 0.5, hmph * 0.6, smile * 0.4, sly * 0.15), wink,
    browL: { y: 0.6 * startle + 0.3 * tired - 0.2 * sly + 0.25 * fwd8, rot: 0.3 * tired - 0.25 * sly },
    browR: { y: 0.9 * skeptic + 0.6 * startle + 0.3 * tired + 0.6 * sly - 0.3 * hmph + 0.25 * fwd8, rot: -0.3 * tired - 0.2 * skeptic + 0.15 * sly },
    mouth, smile: Math.max(sly * 0.5, smile),
  });
  // руки: спокій, витирання лоба, переляк, удар
  const shY = lerp(0.44, 0.78, m), shX = lerp(0.12, 0.125, m);
  const wipeUp = sm(ramp(t, EV.hankyOut, EV.hankyOut + 0.3)) * (1 - sm(ramp(t, EV.wipe[1], EV.wipe[1] + 0.35)));
  const wipeOsc = t > EV.wipe[0] && t < EV.wipe[1] ? Math.sin((t - EV.wipe[0]) * Math.PI * 2 * 2.2) * 0.25 : 0;
  const swing = 0.25 * hs.lean * 4 + 0.15 * Math.sin(t * 1.3);
  arms.forEach(({ sh, sx }) => {
    sh.position.set(sx * shX, shY, 0);
    let rz = sx * (0.28 + 0.05 * Math.sin(t * 2 * Math.PI * breathF)), rx = -swing * 0.4;
    rz += sx * (0.9 * startle);
    rz += sx * 1.2 * Math.max(0, kick(t, EV.impact, 1.5, 4)) + sx * 0.6 * sm(ramp(t, EV.strikeCrouch, EV.strike)) * (1 - ramp(t, EV.impact, EV.impact + 0.3));
    if (sx < 0) { rz = lerp(rz, -2.55 + wipeOsc, wipeUp); rx = lerp(rx, -0.75, wipeUp); }
    rz += sx * 0.7 * sm(ramp(t, EV.flash, EV.flash + 0.4)) * (1 - sm(ramp(t, EV.flash + 1.2, EV.flash + 1.8)));
    sh.rotation.set(rx, 0, rz);
  });
}

function hankyAt(t) {
  const vis = t >= EV.hankyOut;
  hanky.visible = vis; if (!vis) return;
  const P = hanky.geometry.attributes.position, A = P.array;
  if (t < EV.impact) {
    pawn.updateMatrixWorld(true);
    const hp = new THREE.Vector3(); arms[0].hand.getWorldPosition(hp);
    hanky.position.copy(hp); hanky.position.y -= 0.09;
    hanky.rotation.set(0, pawn.rotation.y + 0.3, 0.1 * Math.sin(t * 3));
    hanky.scale.setScalar(Math.max(0.001, eout(ramp(t, EV.hankyOut, EV.hankyOut + 0.25))));
    for (let i = 0; i < A.length; i += 3) { const x = hankyBase[i], y = hankyBase[i + 1]; const k = (0.1 - y) / 0.2; A[i + 2] = 0.03 * k * Math.sin(t * 7 + x * 30 + y * 10); A[i] = x * (1 - 0.35 * k); }
  } else {
    pawnRig(EV.impact); pawn.updateMatrixWorld(true);
    const p0 = new THREE.Vector3(); arms[0].hand.getWorldPosition(p0); p0.y -= 0.09;
    pawnRig(t);
    const u = ramp(t, EV.impact, EV.impact + 0.75), [ex, ez] = sqr('e5');
    const p1 = new THREE.Vector3(ex + 0.1, 0.012, ez - 0.05);
    hanky.position.set(lerp(p0.x, p1.x, eout(u)), lerp(p0.y, p1.y, u) + 0.55 * Math.sin(u * Math.PI), lerp(p0.z, p1.z, eout(u)));
    hanky.rotation.set(lerp(0, -Math.PI / 2, eout(u)), lerp(0.3, 2.2, u), lerp(0, 0.4, u) + 0.6 * Math.sin(u * 9) * (1 - u));
    hanky.scale.setScalar(1);
    const land = u >= 1 ? 1 : 0;
    for (let i = 0; i < A.length; i += 3) { const x = hankyBase[i], y = hankyBase[i + 1]; A[i] = x; A[i + 2] = (1 - land) * 0.05 * Math.sin(t * 11 + x * 25 + y * 18) * (1 - u * 0.7) + land * 0.012 * Math.max(0, Math.sin(x * 40 + y * 31)); }
  }
  P.needsUpdate = true; hanky.geometry.computeVertexNormals();
}

function dropIn(g, t, t0, sqn) {
  const [x, z] = sqr(sqn), fall = 0.38;
  g.visible = t >= t0 - fall;
  const u = ramp(t, t0 - fall, t0);
  g.position.set(x, t < t0 ? 2.6 * (1 - ein(u)) : 0, z);
  setSquash(g.userData.sq, t >= t0 ? 0.16 * Math.exp(-7 * (t - t0)) * Math.cos(2 * Math.PI * 2.4 * (t - t0)) : -0.06 * u);
}
function travel(g, t, t0, dur, a, b, h, spin = 0) {
  if (t < t0) return;
  const A = sqr(a), B = sqr(b), u = clamp((t - t0) / dur), e = h > 0 ? u : eio(u);
  g.position.set(lerp(A[0], B[0], e), 4 * h * u * (1 - u), lerp(A[1], B[1], e));
  g.rotation.y = spin * eio(u);
  if (h === 0) g.rotation.z = -0.22 * Math.sin(u * Math.PI) * Math.sign(B[0] - A[0]);
  if (t > t0 + dur) setSquash(g.userData.sq, 0.14 * Math.exp(-7 * (t - t0 - dur)) * Math.cos(2 * Math.PI * 2.4 * (t - t0 - dur)));
}

function othersRig(t) {
  dropIn(wKing, t, EV.drops[0], 'e1'); dropIn(wQueen, t, EV.drops[1], 'd1'); dropIn(wBishop, t, EV.drops[2], 'c1'); dropIn(wKnight, t, EV.drops[3], 'g1');
  wKnight.rotation.y = -0.4;
  travel(wKnight, t, EV.knightJump, 0.55, 'g1', 'f3', 0.75); if (t > EV.knightJump) wKnight.rotation.y = lerp(-0.4, 0.2, ramp(t, EV.knightJump, EV.knightJump + 0.55));
  travel(wBishop, t, EV.bishopFly, 0.62, 'c1', 'g5', 0.95, Math.PI * 2);
  travel(wQueen, t, EV.queenSlide, 0.55, 'd1', 'a4', 0);
  dropIn(bKing, t, 0, 'g8');
  // самовпевнені білі фігури
  for (const [g, s] of [[wKing, 2], [wQueen, 3], [wBishop, 4], [wKnight, 5], [bKing, 6]]) {
    setFace(g.userData.face, { blink: blinkAt(t, s), squint: 0.55, mouth: 'smile', smile: 0.4, gx: 0.3 * Math.sin(t * 0.4 + s), browL: { y: 0.2, rot: 0 }, browR: { y: 0.2, rot: 0 } });
  }
  setFace(bKing.userData.face, { blink: blinkAt(t, 6), squint: 0.7, mouth: 'flat', browL: { y: -0.1, rot: -0.3 }, browR: { y: -0.1, rot: 0.3 } });
  // чорний слон
  const B = bBishop, [bx, bz] = sqr('d6'), t0 = EV.bishopDrop;
  B.visible = t >= EV.bishopShadow;
  const du = ramp(t, EV.bishopShadow, t0);
  B.position.set(bx, t < t0 ? 3.2 * (1 - lerp(ein(du), du, 0.25)) : 0, bz);
  B.rotation.set(0, -2.36 + 0.0, 0); B.quaternion.setFromEuler(new THREE.Euler(0, -2.36, 0));
  let bs = t >= t0 ? 0.18 * Math.exp(-6 * (t - t0)) * Math.cos(2 * Math.PI * 2 * (t - t0)) : -0.05 * du;
  bs += 0.012 * Math.sin(t * 2.1);
  setSquash(B.userData.sq, bs);
  // падіння після удару
  const dir = new THREE.Vector3(-Math.SQRT1_2, 0, Math.SQRT1_2), axis = new THREE.Vector3(Math.SQRT1_2, 0, Math.SQRT1_2);
  const sq = B.userData.sq;
  if (t >= EV.impact) {
    const tau = t - EV.impact;
    const th = tau < 0.4 ? (Math.PI / 2) * ein(tau / 0.4) * 0.97 + 0.1 * Math.sin(tau / 0.4 * Math.PI) : Math.PI / 2 - 0.1 * Math.exp(-7 * (tau - 0.4)) * Math.abs(Math.sin((tau - 0.4) * 14));
    const slide = 0.25 * eout(clamp(tau / 0.7));
    const pivot = dir.clone().multiplyScalar(0.33);
    const q = new THREE.Quaternion().setFromAxisAngle(axis, th);
    const off = new THREE.Vector3(0, 0, 0).sub(pivot).applyQuaternion(q).add(pivot);
    let roll = 0, rollX = 0;
    if (t > EV.bishopRollOff) { const r = ramp(t, EV.bishopRollOff, EV.bishopRollOff + 1.3); rollX = -2.2 * ein(r); roll = rollX / 0.33; }
    B.position.set(bx + off.x + dir.x * slide + rollX, off.y + 0.01, bz + off.z + dir.z * slide);
    const qr = new THREE.Quaternion().setFromAxisAngle(dir, roll);
    B.quaternion.copy(qr.multiply(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -2.36, 0))));
    B.visible = t < EV.bishopRollOff + 1.4;
    setSquash(sq, 0);
  }
  const menace = sm(ramp(t, t0 + 0.6, t0 + 1.0)), smug = sm(ramp(t, 19.0, 19.5));
  const stun = t >= EV.impact;
  setFace(B.userData.face, {
    blink: stun ? 0 : blinkAt(t, 9), wide: stun ? 0.4 : 0, squint: stun ? 0 : 0.35 * menace + 0.3 * smug,
    gx: stun ? 0.8 * Math.cos((t - EV.impact) * 9) : 0.6 * menace, gy: stun ? 0.8 * Math.sin((t - EV.impact) * 9) : -0.6 * menace,
    browL: { y: stun ? 0.8 : -0.3 * menace, rot: stun ? 0 : -0.45 * menace }, browR: { y: stun ? 0.8 : -0.3 * menace + 0.3 * smug, rot: stun ? 0 : 0.45 * menace },
    mouth: stun ? 'o' : smug > 0.5 ? 'smile' : 'flat', smile: 0.5,
  });
  // зірочки
  const showStars = t > EV.impact + 0.35 && t < EV.bishopRollOff + 0.2;
  B.updateMatrixWorld(true);
  const head = new THREE.Vector3(0, 0.9, 0).applyMatrix4(B.matrixWorld);
  stars.forEach((s, i) => {
    s.visible = showStars;
    const a = (t - EV.impact) * 5 + (i * Math.PI * 2) / 3;
    s.position.set(head.x + Math.cos(a) * 0.2, head.y + 0.28 + 0.04 * Math.sin(a * 2), head.z + Math.sin(a) * 0.2);
    s.rotation.set(0, -a, 0.3); s.scale.setScalar(eout(ramp(t, EV.impact + 0.35, EV.impact + 0.6)));
  });
}

function fxRig(t) {
  // стрілки
  const [ex, ez] = sqr('e5');
  const aS = sm(ramp(t, EV.arrowStraight, EV.arrowStraight + 0.35)) * (1 - sm(ramp(t, EV.arrowDiag + 0.1, EV.arrowDiag + 0.5)));
  arrowS.visible = aS > 0.01; arrowS.material.opacity = aS;
  arrowS.scale.set(0.55, 0.95, 1); arrowS.position.set(ex, 0.006, ez + 0.75); arrowS.rotation.set(-Math.PI / 2, Math.PI, 0);
  const g = eout(ramp(t, EV.arrowDiag, EV.arrowDiag + 0.4)), aD = g * (1 - sm(ramp(t, EV.impact, EV.impact + 0.5)));
  arrowD.visible = aD > 0.01; arrowD.material.opacity = aD * (0.9 + 0.1 * Math.sin(t * 12));
  const L = 1.25 * g;
  arrowD.scale.set(0.6, Math.max(0.01, L), 1);
  arrowD.position.set(ex - Math.SQRT1_2 * (0.08 + L / 2), 0.007, ez + Math.SQRT1_2 * (0.08 + L / 2));
  arrowD.rotation.set(-Math.PI / 2, (3 * Math.PI) / 4, 0);
  // золото
  let glow = 0.8 * sm(ramp(t, EV.goldGlow, EV.goldGlow + 1.2)) * (0.85 + 0.15 * Math.sin(t * 2.6));
  glow += 0.6 * sm(ramp(t, 33.4, 34.4));
  glow += 2.5 * gauss(t, EV.flash, 0.18) * (t < EV.flash ? 1 : 1) ;
  glow = t > EV.flash ? lerp(glow, 0.45 + 2.2 * Math.exp(-2.2 * (t - EV.flash)), 1) : glow;
  d8Glow.material.opacity = clamp(glow, 0, 1);
  d8Glow.scale.setScalar(1 + 0.3 * clamp(glow - 0.6, 0, 2));
  goldLight.intensity = glow * 1.4 + (t > EV.lampClick ? 0.25 : 0);
  const fu = ramp(t, EV.flash, EV.flash + 1.0);
  flashSpr.visible = t > EV.flash - 0.05 && fu < 1;
  { const [x, z] = sqr('d8'); flashSpr.position.set(x, 0.6, z); }
  flashSpr.scale.setScalar(0.4 + 4.5 * eout(clamp(fu * 2.2)));
  flashSpr.material.opacity = (1 - fu) * (1 - fu);
  const P = sparkGeo.attributes.position.array, su = t - EV.flash;
  sparks.visible = su > 0 && su < 2.2; sparks.material.opacity = clamp(1 - su / 2.2);
  { const [x, z] = sqr('d8');
    for (let i = 0; i < NS; i++) {
      const a = hash(i, 1, 5) * Math.PI * 2, el = 0.2 + hash(i, 2, 5) * 1.1, sp = 0.8 + hash(i, 3, 5) * 1.6;
      const vx = Math.cos(a) * Math.cos(el) * sp, vy = Math.sin(el) * sp, vz = Math.sin(a) * Math.cos(el) * sp;
      const d = Math.max(0, su);
      P[i * 3] = x + vx * d * 0.9; P[i * 3 + 1] = Math.max(0.02, 0.55 + vy * d - 1.2 * d * d); P[i * 3 + 2] = z + vz * d * 0.9;
    } }
  sparkGeo.attributes.position.needsUpdate = true;
  // лампа
  let lamp = 1;
  if (t > EV.flicker[0] && t < EV.flicker[1]) {
    const dips = [[13.86, 0.05, 0.75], [14.05, 0.03, 0.5], [14.62, 0.04, 0.55], [15.48, 0.03, 0.6], [15.6, 0.05, 0.7], [16.35, 0.04, 0.45], [17.08, 0.03, 0.6]];
    let d = 0; for (const [c, w, k] of dips) d = Math.max(d, k * gauss(t, c, w));
    lamp = (0.82 + 0.05 * Math.sin(t * 47) * Math.sin(t * 13)) * (1 - d);
  }
  lamp *= 1 - 0.12 * sm(ramp(t, 12.6, 13.6)) * (1 - sm(ramp(t, 18.0, 19.0)));
  lamp *= 1 - 0.25 * sm(ramp(t, 29.5, 31.0)) * (1 - sm(ramp(t, EV.flash, EV.flash + 0.6)));
  lamp *= lerp(1, 0.18, eio(ramp(t, EV.lampDim[0], EV.lampDim[1])));
  if (t >= EV.lampClick) lamp = 0.0;
  spot.intensity = 2.35 * lamp;
  hemi.intensity = 0.12 * (t >= EV.lampClick ? 0.45 : 1); fill.intensity = 0.4 * Math.max(lamp, 0.15); rim.intensity = 0.18 * (t >= EV.lampClick ? 0.5 : 1);
  beamMat.uniforms.k.value = 0.05 * lamp;
  dustMat.opacity = 0.65 * lamp;
  // пил у промені
  const D = dustGeo.attributes.position.array, tmp = new THREE.Vector3();
  for (let i = 0; i < ND; i++) {
    const s = hash(i, 7, 1), along = 1.2 + s * (beamLen - 2.0), r = Math.sqrt(hash(i, 8, 1)) * Math.tan(0.55) * along, a = hash(i, 9, 1) * 6.283;
    const side1 = new THREE.Vector3(1, 0, 0).cross(beamDir).normalize(), side2 = beamDir.clone().cross(side1);
    tmp.copy(LAMP_POS).addScaledVector(beamDir, along).addScaledVector(side1, Math.cos(a) * r).addScaledVector(side2, Math.sin(a) * r);
    const ph = hash(i, 10, 1) * 100;
    D[i * 3] = tmp.x + 0.12 * Math.sin(t * 0.21 + ph); D[i * 3 + 1] = tmp.y + 0.1 * Math.sin(t * 0.17 + ph * 1.3) - ((t * 0.02 + ph) % 0.3); D[i * 3 + 2] = tmp.z + 0.12 * Math.cos(t * 0.19 + ph);
  }
  dustGeo.attributes.position.needsUpdate = true;
  return lamp;
}

// ------------------------------------------------------------ camera: один дубль
// [t, target xyz, yaw°, pitch°, dist, fov]
const KEYS = [
  [0.0, [0.7, 0.2, -2.6], -14, 15, 3.2, 32],
  [3.0, [0.7, 0.2, -2.6], -6, 16, 2.9, 32],
  [5.4, [0.35, 0.2, -2.6], 34, 22, 4.7, 34],
  [7.9, [0.4, 0.2, -2.3], 28, 22, 4.3, 34],
  [10.2, [0.5, 0.2, -1.1], 24, 19, 4.0, 34],
  [12.3, [0.5, 0.25, 0.35], 18, 15, 3.3, 33],
  [13.5, [0.15, 0.3, 0.9], 38, 13, 4.3, 34],
  [15.2, [0.1, 0.55, 1.0], 152, 8, 3.0, 38],
  [17.8, [0.05, 0.55, 1.05], 160, 7, 2.6, 38],
  [19.6, [0.0, 0.4, 1.0], 150, 12, 2.9, 36],
  [21.2, [0.0, 0.4, 1.0], 165, 12, 3.5, 36],
  [22.0, [0.0, 0.4, 1.05], 198, 13, 4.3, 36],
  [22.9, [-0.35, 0.35, 1.35], 205, 11, 3.4, 36],
  [24.6, [-1.2, 0.3, 1.8], 270, 14, 4.0, 34],
  [26.6, [-0.5, 0.25, 2.4], 368, 16, 3.6, 34],
  [30.2, [-0.5, 0.25, 2.8], 366, 10, 3.05, 34],
  [33.5, [-0.5, 0.3, 3.3], 364, 8, 2.7, 34],
  [34.7, [-0.5, 0.35, 3.5], 363, 9, 2.95, 34],
  [36.3, [-0.5, 0.48, 3.5], 370, 10, 3.6, 34],
  [38.4, [-0.5, 0.48, 3.4], 394, 12, 3.75, 34],
  [41.2, [-0.5, 0.48, 3.3], 400, 17, 4.4, 34],
  [45.0, [-0.45, 0.42, 3.1], 406, 24, 5.6, 34],
];
const cr = (p0, p1, p2, p3, u) => 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
function camAt(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const k0 = KEYS[Math.max(0, i - 1)], k1 = KEYS[i], k2 = KEYS[i + 1], k3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
  let u = clamp((t - k1[0]) / (k2[0] - k1[0]));
  u = lerp(u, sm(u), 0.55);
  const f = () => k1[1].map((_, j) => cr(k0[1][j], k1[1][j], k2[1][j], k3[1][j], u));
  const s = j => cr(k0[j], k1[j], k2[j], k3[j], u);
  const tg = f(), yaw = (s(2) * Math.PI) / 180, pitch = (s(3) * Math.PI) / 180;
  let dist = s(4), fov = s(5);
  // акценти: удари, приземлення, спалах
  const punch = 0.05 * kick(t, EV.impact, 2.2, 5) + 0.02 * kick(t, EV.bishopDrop, 2.5, 6) + 0.012 * EV.drops.reduce((a, d) => a + kick(t, d, 3, 8), 0) - 0.04 * kick(t, EV.flash, 1.2, 3);
  dist *= 1 - punch;
  // дрейф «з рук»
  const dx = 0.035 * wob(t, 1.3), dy = 0.025 * wob(t * 1.1, 4.1), dz = 0.03 * wob(t * 0.9, 7.7);
  const pos = new THREE.Vector3(tg[0] + dist * Math.sin(yaw) * Math.cos(pitch) + dx, tg[1] + dist * Math.sin(pitch) + dy, tg[2] + dist * Math.cos(yaw) * Math.cos(pitch) + dz);
  camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix();
  camera.up.set(Math.sin(0.006 * wob(t * 0.8, 2.2)), 1, 0);
  camera.lookAt(tg[0] + 0.01 * wob(t, 9), tg[1] + 0.006 * wob(t, 5), tg[2]);
  // землетрус від удару
  const sh = 0.012 * Math.exp(-6 * Math.max(0, t - EV.impact)) * (t > EV.impact ? 1 : 0) + 0.006 * Math.exp(-8 * Math.max(0, t - EV.bishopDrop)) * (t > EV.bishopDrop ? 1 : 0);
  camera.rotateZ(sh * Math.sin(t * 91)); camera.rotateX(sh * 0.6 * Math.sin(t * 73));
}

// ------------------------------------------------------------ 2D: композит, субтитри
const out = document.getElementById('out'), ctx = out.getContext('2d');
const bloomC = canvas(270, 480), bctx = bloomC.getContext('2d');
const grains = [0, 1, 2, 3, 4, 5].map(s => { const c = canvas(540, 960), g = c.getContext('2d'), im = g.createImageData(540, 960); for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (hash(i, s, 2) - 0.5) * 120; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); return c; });

const SUB_Y = 1330, SUB_W = 820;
const words = TL.voice.map((v, i) => {
  const dur = v.src[1] - v.src[0], ws = v.text.split(' '), total = ws.reduce((a, w) => a + w.length + 1, 0);
  let acc = 0; const list = ws.map(w => { const at = v.at + 0.03 + (dur * acc) / total; acc += w.length + 1; return { w, at, hl: v.hl.includes(w) || v.hl.includes(w.replace(/[.,!?»]/g, '')) }; });
  const next = TL.voice[i + 1]; const end = Math.min(next ? next.at - 0.06 : 99, v.at + dur + 0.9);
  return { ...v, list, end };
});
function drawSubs(t) {
  const s = words.find(v => t >= v.at - 0.08 && t < v.end); if (!s) return;
  const size = s.at < 3 ? 80 : 62, lh = size * 1.22;
  ctx.font = `800 ${size}px Montserrat`;
  const lines = [[]]; let lw = 0; const sp = ctx.measureText(' ').width;
  for (const w of s.list) { const ww = ctx.measureText(w.w).width; if (lw + ww > SUB_W && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push({ ...w, ww }); lw += ww + sp; }
  const appear = eout(ramp(t, s.at - 0.08, s.at + 0.12)), fade = 1 - ramp(t, s.end - 0.15, s.end);
  const y0 = SUB_Y - ((lines.length - 1) * lh) / 2 + (1 - appear) * 14;
  // м'яке затемнення під текстом для контрасту
  const g = ctx.createRadialGradient(W / 2, SUB_Y, 40, W / 2, SUB_Y, 560);
  g.addColorStop(0, `rgba(8,4,2,${0.5 * appear * fade})`); g.addColorStop(1, 'rgba(8,4,2,0)');
  ctx.save(); ctx.translate(W / 2, SUB_Y); ctx.scale(1, 0.42); ctx.translate(-W / 2, -SUB_Y); ctx.fillStyle = g; ctx.fillRect(0, SUB_Y - 600, W, 1200); ctx.restore();
  ctx.textBaseline = 'middle';
  lines.forEach((ln, li) => {
    const tw = ln.reduce((a, w) => a + w.ww, 0) + sp * (ln.length - 1); let x = W / 2 - tw / 2; const y = y0 + li * lh;
    for (const w of ln) {
      const on = ramp(t, w.at - 0.05, w.at + 0.08), pop = 1 + 0.08 * Math.sin(Math.PI * ramp(t, w.at - 0.05, w.at + 0.2));
      ctx.save(); ctx.translate(x + w.ww / 2, y); ctx.scale(pop, pop);
      ctx.globalAlpha = on * fade * appear;
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 3;
      ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(20,10,4,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(w.w, -w.ww / 2, 0);
      ctx.shadowBlur = 0; ctx.fillStyle = w.hl && on > 0.5 ? '#ffc451' : '#fff8ee'; ctx.fillText(w.w, -w.ww / 2, 0);
      ctx.restore(); x += w.ww + sp;
    }
  });
}

let NO_SUBS = false;
function composite(t, lamp) {
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
  ctx.drawImage(glc, 0, 0);
  // блум
  bctx.filter = 'brightness(1.1) contrast(2.6) saturate(1.2)'; bctx.clearRect(0, 0, 270, 480); bctx.drawImage(glc, 0, 0, 270, 480);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.22 + 0.25 * gauss(t, EV.flash + 0.15, 0.4); ctx.filter = 'blur(26px)'; ctx.drawImage(bloomC, 0, 0, W, H); ctx.restore();
  // спалах
  const fl = gauss(t, EV.flash + 0.05, 0.12) * 0.7 + 0.25 * Math.exp(-3 * Math.max(0, t - EV.flash)) * (t > EV.flash ? 1 : 0);
  if (fl > 0.003) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,214,140,${fl})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // віньєтка
  const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.48, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(4,2,1,${0.62 + 0.25 * (1 - lamp)})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // зерно
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.09; ctx.drawImage(grains[Math.floor(t * 30) % grains.length], 0, 0, W, H); ctx.restore();
  // вхід з темряви на кадрі 0 — лише 4 кадри
  const fin = ramp(t, 0, 0.13); if (fin < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fin})`; ctx.fillRect(0, 0, W, H); }
  if (!NO_SUBS) drawSubs(t);
  // бренд у темряві
  const br = sm(ramp(t, EV.brand, EV.brand + 0.6));
  if (br > 0) {
    ctx.save(); ctx.globalAlpha = br * 0.9; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 46px Unbounded'; ctx.fillStyle = '#ffcf86'; ctx.shadowColor = 'rgba(255,170,60,0.6)'; ctx.shadowBlur = 24;
    ctx.fillText('ProstoChess', W / 2, 1450 - 10 * (1 - br)); ctx.restore();
  }
}

function renderFrame(t) {
  pawnRig(t); othersRig(t); hankyAt(t); const lamp = fxRig(t); camAt(t);
  renderer.render(scene, camera);
  composite(t, lamp);
}
window.renderFrame = renderFrame;
// обкладинка: крупний пішак з тінню-ферзем + інтрига
window.renderCover = async (t = 1.9) => {
  await document.fonts.load('900 92px Montserrat', 'Пішак недооцінювали'); await document.fonts.load('700 46px Montserrat', 'подивись тінь');
  NO_SUBS = true; renderFrame(t); NO_SUBS = false;
  const g = ctx.createLinearGradient(0, 1150, 0, 1700); g.addColorStop(0, 'rgba(6,3,1,0)'); g.addColorStop(0.45, 'rgba(6,3,1,0.72)'); g.addColorStop(1, 'rgba(6,3,1,0.85)');
  ctx.fillStyle = g; ctx.fillRect(0, 1150, W, 770);
  ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 20; ctx.textAlign = 'center';
  ctx.font = '900 96px Montserrat'; ctx.fillStyle = '#fff8ee'; ctx.fillText('Пішак, якого всі', W / 2, 1300);
  ctx.fillStyle = '#ffc451'; ctx.fillText('недооцінювали', W / 2, 1410);
  ctx.font = '700 46px Montserrat'; ctx.fillStyle = 'rgba(255,240,220,0.85)'; ctx.fillText('подивись на його тінь →', W / 2, 1520);
  ctx.textAlign = 'start'; ctx.shadowBlur = 0;
};
window.__seek = renderFrame;

await document.fonts.load('800 62px Montserrat', 'Це пішак ҐЄІЇ abc'); await document.fonts.load('600 46px Unbounded', 'ProstoChess');
renderFrame(0);
window.ready = true;
if (!navigator.webdriver) { const t0 = performance.now(); const loop = () => { renderFrame(((performance.now() - t0) / 1000) % TL.duration); requestAnimationFrame(loop); }; loop(); }
