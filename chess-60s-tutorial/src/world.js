// 3D layer: board, pieces, square highlights, beams. Pure function of time via update(t, state).
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const W = 1080, H = 1920;
const ORANGE = new THREE.Color('#FF5204');
const hot = () => ORANGE.clone();   // emissive accents stay exact brand orange; glow is added in 2D from glowPass()

export const canvas = document.createElement('canvas');
canvas.width = W; canvas.height = H;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 26, 62);
export const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);

// ---------------------------------------------------------------- environment (reflections)
{
  const env = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
  env.add(box);
  const panel = (w, h, col, k, pos, look) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(...look); env.add(m); };
  panel(10, 4, 0xffffff, 3.0, [0, 12, 4], [0, 0, 0]);          // top softbox
  panel(3, 10, 0xffffff, 1.2, [-12, 4, 6], [0, 2, 0]);          // left strip
  panel(4, 12, '#FF5204', 5.0, [12, 3, -6], [0, 2, 0]);         // orange strip right/back
  panel(12, 3, '#FF5204', 4.0, [0, 2, -13], [0, 2, 0]);         // orange back
  const pm = new THREE.PMREMGenerator(renderer);
  var ENV = pm.fromScene(env, 0.03).texture;   // used by pieces only (env sampling is the most expensive part on SwiftShader)
}

// ---------------------------------------------------------------- lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 0.25));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(-5, 12, 7); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
scene.add(key);
const rimA = new THREE.SpotLight(ORANGE, 900, 40, 0.75, 0.6, 2); rimA.position.set(3, 5, -11); scene.add(rimA, rimA.target);
const rimB = new THREE.SpotLight(ORANGE, 500, 40, 0.8, 0.6, 2); rimB.position.set(11, 3.5, 1); scene.add(rimB, rimB.target);
const fillW = new THREE.PointLight(0xffffff, 40, 30, 2); fillW.position.set(-6, 5, 8); scene.add(fillW);
const focus = new THREE.PointLight(ORANGE, 0, 6, 2); scene.add(focus);   // moving accent light (e.g. king glow)

// ---------------------------------------------------------------- board
export const sqPos = s => ({ x: 'abcdefgh'.indexOf(s[0]) - 3.5, z: 3.5 - (parseInt(s[1]) - 1) });
const lightMat = new THREE.MeshStandardMaterial({ color: 0xa6a6a6, roughness: 0.5, metalness: 0 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.28, metalness: 0 });
const frameMat = new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.3 });
const boardGroup = new THREE.Group(); scene.add(boardGroup);
{
  const frame = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.42, 9.2), frameMat); frame.position.y = -0.226; frame.receiveShadow = true; boardGroup.add(frame);
  const sqG = new THREE.BoxGeometry(1, 0.04, 1);
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const m = new THREE.Mesh(sqG, (f + r) % 2 === 0 ? darkMat : lightMat); // a1 dark
    m.position.set(f - 3.5, -0.02, 3.5 - r); m.receiveShadow = true; boardGroup.add(m);
  }
  const lineM = new THREE.MeshBasicMaterial({ color: hot(2.2), toneMapped: false });
  const L = 8.22, th = 0.035;
  for (const [w, d, x, z] of [[L, th, 0, L / 2], [L, th, 0, -L / 2], [th, L, L / 2, 0], [th, L, -L / 2, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), lineM); m.position.set(x, 0.002, z); m.userData.glow = 1; boardGroup.add(m);
  }
}
// floor glow under/around the board
{
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 256, 30, 256, 256, 256); gr.addColorStop(0, 'rgba(255,82,4,0.55)'); gr.addColorStop(0.35, 'rgba(255,82,4,0.18)'); gr.addColorStop(1, 'rgba(255,82,4,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  var floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.5 }));
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = -0.45; scene.add(floorGlow);
}

// ---------------------------------------------------------------- piece geometry
const V = (r, y) => new THREE.Vector2(r, y);
const arc = (cx, cy, r, a0, a1, n = 10) => { const p = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; };
const BASE = (R = 0.38) => [[0, 0], [R, 0], [R, 0.045], [R - 0.02, 0.065], [R - 0.02, 0.1], [R - 0.06, 0.125], [R - 0.08, 0.15]];
const lathe = pts => new THREE.LatheGeometry(pts.map(p => V(Math.max(p[0], 0), p[1])), 56).toNonIndexed();
const prep = g => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); return g; };
function pieceGeometry(type) {
  const parts = [];
  if (type === 'pawn') {
    parts.push(lathe([...BASE(0.36), [0.24, 0.2], [0.16, 0.34], [0.13, 0.45], [0.2, 0.47], [0.21, 0.5], [0.13, 0.53], [0.115, 0.55], ...arc(0, 0.66, 0.145, -52, 90, 14)]));
  } else if (type === 'rook') {
    parts.push(lathe([...BASE(0.39), [0.28, 0.2], [0.24, 0.3], [0.23, 0.6], [0.27, 0.64], [0.29, 0.68], [0.29, 0.79], [0.2, 0.79], [0.2, 0.74], [0, 0.74]]));
    for (let i = 0; i < 6; i++) { const b = new THREE.BoxGeometry(0.16, 0.12, 0.09); b.translate(0, 0.84, 0.245); b.rotateY(i * Math.PI / 3); parts.push(b); }
  } else if (type === 'bishop') {
    parts.push(lathe([...BASE(0.37), [0.25, 0.2], [0.15, 0.4], [0.1, 0.6], [0.19, 0.62], [0.19, 0.65], [0.1, 0.68], [0.12, 0.72], [0.165, 0.79], [0.17, 0.84], [0.14, 0.92], [0.07, 0.99], [0.035, 1.01], ...arc(0, 1.05, 0.045, -60, 90, 8)]));
    const s = new THREE.BoxGeometry(0.03, 0.17, 0.4); s.rotateZ(0.6); s.translate(0.05, 0.88, 0); // mitre slit as raised ridge
    parts.push(s);
  } else if (type === 'queen' || type === 'king') {
    const crown = type === 'queen'
      ? [[0.13, 0.84], [0.17, 0.92], [0.23, 1.06], [0.2, 1.08], [0.12, 1.05], [0.09, 1.1], ...arc(0, 1.16, 0.075, -40, 90, 8)]
      : [[0.13, 0.84], [0.19, 0.96], [0.21, 1.08], [0.15, 1.12], [0.1, 1.15], [0, 1.17]];
    parts.push(lathe([...BASE(0.42), [0.29, 0.2], [0.17, 0.45], [0.12, 0.72], [0.22, 0.74], [0.22, 0.78], [0.12, 0.81], ...crown]));
    if (type === 'queen') {
      for (let i = 0; i < 8; i++) { const sp = new THREE.SphereGeometry(0.038, 12, 8); sp.translate(0.225, 1.08, 0); sp.rotateY(i * Math.PI / 4); parts.push(sp); }
    } else {
      const a = new THREE.BoxGeometry(0.07, 0.3, 0.07); a.translate(0, 1.3, 0); parts.push(a);
      const b = new THREE.BoxGeometry(0.22, 0.07, 0.07); b.translate(0, 1.33, 0); parts.push(b);
    }
  } else if (type === 'knight') {
    parts.push(lathe([...BASE(0.38), [0.27, 0.2], [0.24, 0.26], [0, 0.26]]));
    // head profile (facing +x): polygon smoothed with Chaikin (sharp ear kept), extruded, deep rounded bevel for volume
    const O = [[-0.24, 0.24], [-0.235, 0.4], [-0.22, 0.55], [-0.19, 0.7], [-0.14, 0.84], [-0.07, 0.96], [-0.02, 1.04], [0.02, 1.15, 1], [0.06, 1.03], [0.12, 1.0], [0.2, 0.95],
      [0.3, 0.86], [0.38, 0.77], [0.42, 0.71], [0.42, 0.66, 1], [0.37, 0.62], [0.3, 0.63], [0.22, 0.66], [0.14, 0.66], [0.08, 0.6], [0.06, 0.52], [0.1, 0.42], [0.18, 0.33], [0.24, 0.27], [0.25, 0.24, 1]];
    let P = O;
    for (let it = 0; it < 3; it++) { const Q = []; for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; if (a[2]) Q.push(a); else Q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]); if (!b[2]) Q.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); } P = Q; }
    const sh = new THREE.Shape(P.map(p => V(p[0], p[1])));
    let ex = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.085, bevelSize: 0.055, bevelSegments: 7, curveSegments: 12, steps: 1 });
    ex.translate(0, 0, -0.1);
    ex.translate(-0.06, 0, 0);
    ex.deleteAttribute('uv'); ex.deleteAttribute('normal'); ex = mergeVertices(ex, 1e-4); ex.computeVertexNormals();
    parts.push(ex);
    for (const z of [-0.183, 0.183]) { const e = new THREE.SphereGeometry(0.03, 12, 8); e.scale(1, 0.8, 0.5); e.translate(0.1, 0.86, z); parts.push(e); }  // eyes
  }
  const g = mergeGeometries(parts.map(prep));
  return g;
}
const GEO = {}; for (const t of ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']) GEO[t] = pieceGeometry(t);
const whiteBase = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.32, envMap: ENV, envMapIntensity: 0.55 });
const blackBase = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.2, envMap: ENV, envMapIntensity: 1.5 });
const pieceMeshes = {};
function getPiece(id, type, white) {
  let m = pieceMeshes[id];
  if (!m) {
    m = new THREE.Mesh(GEO[type], (white ? whiteBase : blackBase).clone());
    m.castShadow = true; m.receiveShadow = true; m.userData.piece = 1; scene.add(m); pieceMeshes[id] = m;
  }
  return m;
}

// ---------------------------------------------------------------- highlights
const HLG = {
  fill: new THREE.PlaneGeometry(0.94, 0.94).rotateX(-Math.PI / 2),
  dot: new THREE.CircleGeometry(0.15, 40).rotateX(-Math.PI / 2),
  ring: new THREE.RingGeometry(0.34, 0.43, 48).rotateX(-Math.PI / 2),
  x: mergeGeometries([new THREE.PlaneGeometry(0.72, 0.1).rotateX(-Math.PI / 2).rotateY(Math.PI / 4), new THREE.PlaneGeometry(0.72, 0.1).rotateX(-Math.PI / 2).rotateY(-Math.PI / 4)]),
};
const hlMeshes = {};
function getHL(kind, sq) {
  const k = kind + sq; let m = hlMeshes[k];
  if (!m) {
    const hotK = kind === 'fill' ? 1 : 1.8;
    m = new THREE.Mesh(HLG[kind], new THREE.MeshBasicMaterial({ color: hot(hotK), transparent: true, depthWrite: false, toneMapped: kind === 'fill' }));
    const p = sqPos(sq); m.position.set(p.x, kind === 'fill' ? 0.003 : 0.006, p.z); m.renderOrder = 2; m.userData.glow = kind !== 'fill'; scene.add(m); hlMeshes[k] = m;
  }
  return m;
}
const beamMat = new THREE.MeshBasicMaterial({ color: hot(3.2), toneMapped: false, transparent: true });
const beamGeo = new THREE.BoxGeometry(1, 0.03, 0.08); beamGeo.translate(0.5, 0, 0);
const beams = [];
function getBeam(i) { if (!beams[i]) { const m = new THREE.Mesh(beamGeo, beamMat.clone()); m.renderOrder = 3; m.userData.glow = 1; scene.add(m); beams[i] = m; } return beams[i]; }
// shockwave ring on board
const shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: hot(2.5), transparent: true, depthWrite: false, toneMapped: false }));
shock.position.y = 0.01; shock.userData.glow = 1; scene.add(shock);

// ---------------------------------------------------------------- glow pass
// Cheap bloom: emissive-only render at 1/4 resolution into a 2D canvas, blurred and added in main.js.
export const glowCanvas = document.createElement('canvas'); glowCanvas.width = W / 4; glowCanvas.height = H / 4;
const gctx = glowCanvas.getContext('2d');
const occluder = new THREE.MeshBasicMaterial({ color: 0x000000 });
const glowPieceMats = {};
function glowPass() {
  const swapped = [];
  scene.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    if (o.userData.glow) return;
    if (o === floorGlow) { o.visible = false; swapped.push([o, null]); return; }
    let m = occluder;
    if (o.userData.piece && o.material.emissiveIntensity > 0.01) { const k = o.material.emissiveIntensity; m = glowPieceMats[o.uuid] || (glowPieceMats[o.uuid] = new THREE.MeshBasicMaterial()); m.color.copy(ORANGE).multiplyScalar(0.6 * k); }
    swapped.push([o, o.material]); o.material = m;
  });
  const fog = scene.fog; scene.fog = null; const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
  renderer.setViewport(0, 0, W / 4, H / 4); renderer.setScissor(0, 0, W / 4, H / 4); renderer.setScissorTest(true);
  renderer.render(scene, camera);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  scene.fog = fog; renderer.toneMapping = tm;
  for (const [o, m] of swapped) { if (m) o.material = m; else o.visible = true; }
  gctx.clearRect(0, 0, W / 4, H / 4); gctx.drawImage(canvas, 0, H - H / 4, W / 4, H / 4, 0, 0, W / 4, H / 4);
}

// ---------------------------------------------------------------- per-frame
// state: { cam:{pos,tgt,fov}, pieces:[{id,type,white,x,y,z,rx,ry,rz,s,glow}], hl:[{kind,sq,a}], beams:[{x1,z1,x2,z2,a}], shock:{x,z,r,a}, light:{rim,key,focus:{x,y,z,i}}, boardDim }
export function update(st) {
  const c = st.cam; camera.position.set(...c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(...c.tgt);
  for (const id in pieceMeshes) pieceMeshes[id].visible = false;
  for (const p of st.pieces) {
    const m = getPiece(p.id, p.type, p.white);
    if (p.s <= 0.001) continue;
    m.visible = true; m.position.set(p.x, p.y, p.z); m.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0, 'YXZ'); m.scale.setScalar(p.s);
    m.material.emissive = ORANGE; m.material.emissiveIntensity = p.glow || 0;
  }
  for (const k in hlMeshes) hlMeshes[k].visible = false;
  for (const h of st.hl) { if (h.a <= 0.001) continue; const m = getHL(h.kind, h.sq); m.visible = true; m.material.opacity = Math.min(1, h.a); const sc = h.sc ?? 1; m.scale.set(sc, 1, sc); }
  beams.forEach(b => b.visible = false);
  st.beams.forEach((b, i) => { if (b.a <= 0.001) return; const m = getBeam(i); m.visible = true; const dx = b.x2 - b.x1, dz = b.z2 - b.z1; m.position.set(b.x1, 0.03, b.z1); m.rotation.set(0, -Math.atan2(dz, dx), 0); m.scale.set(Math.hypot(dx, dz) + 0.0001, 1, b.w || 1); m.material.opacity = b.a; });
  shock.visible = !!st.shock && st.shock.a > 0;
  if (shock.visible) { shock.position.x = st.shock.x; shock.position.z = st.shock.z; shock.scale.setScalar(st.shock.r); shock.material.opacity = st.shock.a; }
  const L = st.light;
  rimA.intensity = 900 * L.rim; rimB.intensity = 500 * L.rim; key.intensity = 2.4 * L.key; fillW.intensity = 40 * L.key;
  focus.intensity = L.focus ? L.focus.i : 0; if (L.focus) focus.position.set(L.focus.x, L.focus.y, L.focus.z);
  floorGlow.material.opacity = 0.5 * (L.floor ?? 1);
  glowPass();
  renderer.render(scene, camera);
  return canvas;
}
const _v = new THREE.Vector3();
export function project(x, y, z) { _v.set(x, y, z).project(camera); return [(_v.x + 1) / 2 * W, (1 - _v.y) / 2 * H]; }
window.__w = { renderer, key, scene, camera, THREE };
