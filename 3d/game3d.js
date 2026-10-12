// Time Toss 3D: PROTOTYPE of level 1 (Stone Age). Three.js, no build step, stylized primitives only.
import * as THREE from './vendor/three.module.min.js';

const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('debug');
const CFG = {
  hide: 3, shots: 3, rounds: 5, hp: 100, body: 34, headMult: 2,
  g: -12, flight: 0.9, botFlight: 1.0, rockR: 0.18,
  slowmo: 0.3, slowWindow: 0.3, holdReal: 0.5,
  aim: { travel: 0.29, ease: 28, cap: 2600 },   // mirrors the 2D stone-age aim tuning (high gain, fast capped ease)
  slide: 0.25, recenter: 0.3, botScale: 1.35, wince: 0.7,
};
const PX = [-1.4, 0, 1.4], PZ = 0;          // player spots
const BX = [-2.0, 0, 2.0], BZ = -10;        // bot spots (closer than v1 so Grug reads on a 390-wide screen)
const P_COVER_H = 1.25, B_COVER_H = 1.45;   // cover heights hide a crouched caveman (bot is scaled up)

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const HORIZON = 0xf6d3a6;
scene.fog = new THREE.Fog(HORIZON, 28, 85);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 150);
scene.add(new THREE.HemisphereLight(0xffe2b8, 0x7a4e2a, 1.35));
const sun = new THREE.DirectionalLight(0xffc27a, 2.3); sun.position.set(6, 9, 5); scene.add(sun);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// one shared vertex-coloured, flat-shaded material for every merged prop / body part
const VC = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const mat = { ring: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false }),
  warn: new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.5, depthWrite: false }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x2a1a08, transparent: true, opacity: 0.28, depthWrite: false }),
  proj: new THREE.MeshLambertMaterial({ color: 0x7d7268, flatShading: true }) };

// ---------- tiny geometry merger: bake parts (geo + colour + transform) into one non-indexed geometry ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function builder() {
  const pos = [], col = [];
  const b = {
    add(geo, color, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], jitter = 0) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (jitter) { const a = g.attributes.position, key = {}; for (let i = 0; i < a.count; i++) { const k = a.getX(i).toFixed(3) + a.getY(i).toFixed(3) + a.getZ(i).toFixed(3); if (!key[k]) key[k] = [(rnd() - 0.5) * jitter, (rnd() - 0.5) * jitter, (rnd() - 0.5) * jitter]; a.setXYZ(i, a.getX(i) + key[k][0], a.getY(i) + key[k][1], a.getZ(i) + key[k][2]); } }
      g.applyMatrix4(_m.compose(new THREE.Vector3(...p), _q.setFromEuler(_e.set(...r)), new THREE.Vector3(...s)));
      const a = g.attributes.position; _c.set(color);
      for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); col.push(_c.r, _c.g, _c.b); }
      return b;
    },
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g; },
    mesh() { const m = new THREE.Mesh(b.geo(), VC); scene.add(m); return m; },
  };
  return b;
}
const ICO = new THREE.IcosahedronGeometry(1, 0), ICO1 = new THREE.IcosahedronGeometry(1, 1), SPH = new THREE.SphereGeometry(1, 10, 7),
  CYL = new THREE.CylinderGeometry(1, 1, 1, 8), CONE = new THREE.ConeGeometry(1, 1, 8), BOX = new THREE.BoxGeometry(1, 1, 1), DOD = new THREE.DodecahedronGeometry(1, 0);

// sky: CSS gradient behind a transparent canvas (no full-screen sky geometry)
// ---------- ground (canvas texture) ----------
function groundTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  x.fillStyle = '#c9a46a'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { const l = 55 + rnd() * 25; x.fillStyle = `hsl(${30 + rnd() * 12},${35 + rnd() * 20}%,${l}%)`; x.globalAlpha = 0.35; x.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 3, 2 + rnd() * 3); }
  x.globalAlpha = 1;
  for (let i = 0; i < 70; i++) { x.fillStyle = `hsl(28,15%,${40 + rnd() * 25}%)`; x.beginPath(); x.ellipse(rnd() * 256, rnd() * 256, 1.5 + rnd() * 3, 1 + rnd() * 2, rnd() * 3, 0, 7); x.fill(); }
  for (let i = 0; i < 40; i++) { const gx = rnd() * 256, gy = rnd() * 256; x.strokeStyle = `hsl(${80 + rnd() * 25},45%,${32 + rnd() * 12}%)`; x.lineWidth = 1.4; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(gx + k * 2, gy); x.lineTo(gx + k * 2 + (rnd() - 0.5) * 5, gy - 5 - rnd() * 5); x.stroke(); } }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshLambertMaterial({ map: groundTex() }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);

// ---------- static scenery merged into ONE draw call ----------
const covers = [];  // collision boxes {x,z,hx,hy,hz}
const ROCKC = [0x8f8377, 0x9a8f80, 0x7b746c, 0xa89a86, 0x857a6c, 0x6f6a63];
const scen = builder();
function rockPile(x, z, w, h, d) {   // each barricade is its own mesh (local origin at its base) so it can crumble
  const c = () => ROCKC[Math.floor(rnd() * ROCKC.length)], b = builder();
  b.add(ICO, c(), [0, h * 0.5, 0], [w * 0.62, h * 0.56, d * 0.62], [rnd(), rnd() * 3, rnd() * 0.3], 0.28);
  b.add(DOD, c(), [-w * 0.42, h * 0.3, d * 0.12], [w * 0.36, h * 0.34, d * 0.42], [rnd(), rnd() * 3, 0], 0.25);
  b.add(ICO, c(), [w * 0.45, h * 0.26, -d * 0.05], [w * 0.32, h * 0.3, d * 0.4], [rnd(), rnd() * 3, 0], 0.25);
  b.add(ICO, c(), [w * 0.1, h * 0.86, 0], [w * 0.3, h * 0.17, d * 0.35], [rnd(), rnd() * 3, 0], 0.2);
  const mesh = b.mesh(); mesh.position.set(x, 0, z);
  covers.push({ x, z, hx: w / 2, hy: h, hz: d / 2, w0: w / 2, h0: h, mesh, stage: 0, broken: false, shake: 0 });
}
PX.forEach((x) => rockPile(x, PZ - 0.85, 1.35, P_COVER_H, 0.8));
BX.forEach((x) => rockPile(x, BZ + 1.1, 1.65, B_COVER_H, 0.95));
// scattered boulders + trees + ferns + volcano + clouds (decor only)
[[-5, -6], [5.5, -3], [-6.5, -14], [6, -15], [3.5, -21], [-3, -25], [9, -9], [-9, -2]].forEach(([x, z]) => { const s = 0.4 + rnd() * 0.7; scen.add(ICO, ROCKC[Math.floor(rnd() * 6)], [x, s * 0.4, z], [s, s * 0.7, s * 0.9], [rnd(), rnd() * 3, 0], 0.3); });
[[-6, -9], [6.5, -8], [-7.5, -18], [7.5, -19], [-4.5, -27], [5, -29], [9, -2.5], [-9, -4]].forEach(([x, z], i) => {
  const h = 2.2 + rnd(); scen.add(CYL, 0x6b4423, [x, h / 2, z], [0.18, h, 0.18], [0, 0, (rnd() - 0.5) * 0.15]);
  if (i % 2) { for (let k = 0; k < 6; k++) scen.add(CONE, 0x4f8c3a, [x, h, z], [0.15, 1.8, 0.45], [0.9, (k / 6) * 6.28, 0]); }   // palm-ish fronds
  else { scen.add(ICO, 0x3f8f3a, [x, h + 0.4, z], [1.2, 1, 1.2], [rnd(), rnd(), 0], 0.3); scen.add(ICO, 0x58a845, [x + 0.5, h + 0.9, z + 0.2], [0.8, 0.7, 0.8], [rnd(), 0, 0], 0.2); }
});
for (let i = 0; i < 14; i++) { const x = (rnd() - 0.5) * 16, z = -2 - rnd() * 16; if (Math.abs(x) < 3.2) continue; scen.add(CONE, 0x6aa04a, [x, 0.25, z], [0.25, 0.5, 0.25], [0, 0, (rnd() - 0.5) * 0.6]); }
scen.add(CONE, 0x7a5e52, [-14, 7, -55], [12, 14, 12]).add(CONE, 0x5d4740, [-14, 13.2, -55], [3.4, 2, 3.4]).add(CONE, 0xff7a20, [-14, 14.1, -55], [2.2, 0.6, 2.2])
  .add(ICO, 0xb8b0a8, [-13, 17.5, -55], [2, 1.5, 2], [0, 0, 0], 0.4).add(ICO, 0xd0c8c0, [-11.5, 19.5, -55], [2.5, 1.8, 2.2], [0, 0, 0], 0.4);  // smoke puffs
scen.add(CONE, 0x8a7a68, [16, 5, -62], [11, 10, 11]).add(CONE, 0x958470, [4, 4, -70], [12, 8, 12]);
[[-6, 16, -45], [8, 19, -50], [20, 14, -40], [-25, 18, -50]].forEach(([x, y, z]) => { for (let k = 0; k < 4; k++) scen.add(ICO1, 0xffffff, [x + k * 1.6 - 2.4, y + (k % 2) * 0.6, z], [1.6 + (k % 2) * 0.6, 1.1, 1.3], [0, 0, 0], 0.3); });
scen.mesh();

// ---------- characters: 7 points drive everything (pose and spring ragdoll); parts are rigid groups on those points ----------
// pts: 0 pelvis, 1 chest, 2 head, 3 lh, 4 rh (throw hand), 5 lf, 6 rf
const LIMBS = [[1, 3, 0.1], [1, 4, 0.1], [0, 5, 0.13], [0, 6, 0.13]];
const MAXC = 2;
const limbIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.8, 1, 7), new THREE.MeshLambertMaterial({ flatShading: true }), 4 * MAXC);
const knobIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ flatShading: true }), 6 * MAXC);
scene.add(limbIM, knobIM);
const UP = new THREE.Vector3(0, 1, 0);

function buildHead(skin, hair, eyeCol) {   // local: +z = face, radius ~0.3
  const skinD = new THREE.Color(skin).multiplyScalar(0.82).getHex();
  const head = builder()
    .add(SPH, skin, [0, 0, 0], [0.3, 0.31, 0.29])
    .add(SPH, skinD, [0, -0.04, 0.29], [0.075, 0.065, 0.07])                    // big nose
    .add(SPH, skinD, [0, -0.005, 0.315], [0.05, 0.045, 0.04])
    .add(SPH, skin, [0.29, 0, 0], [0.06, 0.08, 0.04]).add(SPH, skin, [-0.29, 0, 0], [0.06, 0.08, 0.04])   // ears
    .add(BOX, skinD, [0, 0.13, 0.25], [0.42, 0.06, 0.08], [0.25, 0, 0]);         // heavy brow ridge
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; head.add(ICO, hair, [Math.sin(a) * 0.27, 0.16 + Math.cos(a * 2) * 0.03 + (Math.cos(a) < -0.2 ? -0.08 : 0), Math.cos(a) * 0.24 - 0.04], [0.13, 0.14 + (Math.cos(a) < 0 ? 0.08 : 0), 0.13], [rnd(), rnd(), rnd()], 0.08); }
  head.add(ICO1, hair, [0, 0.22, -0.03], [0.29, 0.14, 0.27], [0, 0, 0], 0.06);   // shaggy cap
  for (let i = 0; i < 9; i++) { const a = -1.25 + (i / 8) * 2.5; head.add(ICO, hair, [Math.sin(a) * 0.2, -0.17 - Math.cos(a) * 0.07, 0.17 + Math.cos(a) * 0.05], [0.09, 0.11, 0.08], [rnd(), rnd(), rnd()], 0.05); }  // beard
  head.add(ICO, hair, [0, -0.3, 0.2], [0.1, 0.1, 0.07], [0, 0, 0], 0.04);
  const eyes = builder();
  for (const sx of [-1, 1]) eyes.add(SPH, 0xffffff, [sx * 0.1, 0.05, 0.255], [0.072, 0.075, 0.05]).add(SPH, eyeCol, [sx * 0.095, 0.05, 0.295], [0.036, 0.04, 0.03]).add(SPH, 0x111111, [sx * 0.093, 0.05, 0.315], [0.02, 0.022, 0.015]);
  const brow = () => builder().add(BOX, hair, [0, 0, 0], [0.15, 0.05, 0.06], [0, 0, 0], 0.01).geo();
  const grin = builder().add(new THREE.TorusGeometry(0.075, 0.018, 5, 10, Math.PI), 0x5a1f12, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI])
    .add(BOX, 0xffffff, [0, -0.03, 0.005], [0.1, 0.03, 0.02]).geo();    // grin with teeth
  const frown = builder().add(new THREE.TorusGeometry(0.06, 0.018, 5, 10, Math.PI), 0x5a1f12, [0, -0.05, 0], [1, 0.8, 1]).geo();
  return { head: head.geo(), eyes: eyes.geo(), brow: brow(), grin, frown };
}
function buildTorso(fur, furD) {   // local origin at pelvis, +y to chest (len ~0.55), +z = front
  const t = builder();
  t.add(CYL, fur, [0, 0.3, 0], [0.32, 0.62, 0.26], [0, 0, 0], 0.06)                 // fur tunic, bulky
   .add(SPH, fur, [0, 0.58, -0.04], [0.36, 0.2, 0.28], [0, 0, 0])                   // hunched shoulders
   .add(CONE, fur, [0, -0.04, 0], [0.36, 0.3, 0.29], [Math.PI, 0, 0])              // jagged skirt hem
   .add(CYL, 0x5b3a1a, [0, 0.08, 0], [0.33, 0.06, 0.27]);                          // belt
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28; t.add(CONE, furD, [Math.sin(a) * 0.32, -0.16, Math.cos(a) * 0.26], [0.06, 0.12, 0.06], [Math.PI, 0, 0]); }
  // spotted pelt slung over one shoulder (diagonal sash)
  t.add(BOX, 0xe8b04a, [0.06, 0.38, 0], [0.16, 0.72, 0.6], [0, 0, 0.6]);
  for (let i = 0; i < 9; i++) { const k = i / 8 - 0.5, sz = i % 2 ? 1 : -1; t.add(SPH, 0x4a2a10, [0.06 - k * 0.38 + sz * 0.02, 0.38 + k * 0.56, sz * 0.31], [0.04, 0.035, 0.012]); }
  t.add(SPH, 0xe8b04a, [-0.2, 0.68, 0], [0.14, 0.09, 0.2]);      // pelt bunched on shoulder
  // bone club slung on the back
  t.add(CYL, 0xf1e6c8, [0, 0.38, -0.3], [0.045, 0.75, 0.045], [0, 0, 0.7]).add(SPH, 0xf1e6c8, [0.24, 0.66, -0.3], [0.08, 0.07, 0.07]).add(SPH, 0xf1e6c8, [0.3, 0.58, -0.3], [0.08, 0.07, 0.07])
   .add(SPH, 0xf1e6c8, [-0.24, 0.1, -0.3], [0.06, 0.05, 0.05]).add(SPH, 0xf1e6c8, [-0.18, 0.06, -0.3], [0.06, 0.05, 0.05]).add(CYL, 0x5b3a1a, [0.15, 0.5, -0.27], [0.06, 0.02, 0.06], [0, 0, 0.7]);
  return t.geo();
}
let charN = 0;
function makeChar(o) {
  const c = { idx: charN++, pts: [], prev: [], rest: [], rag: false, x: 0, z: 0, face: -1, s: o.s, crouch: 0, throwT: 0, hp: CFG.hp, winceT: 0, wince: 0, skin: new THREE.Color(o.skin) };
  for (let i = 0; i < 7; i++) { c.pts.push(new THREE.Vector3()); c.prev.push(new THREE.Vector3()); }
  const h = buildHead(o.skin, o.hair, o.eye);
  c.headG = new THREE.Group(); scene.add(c.headG);
  c.headG.add(new THREE.Mesh(h.head, VC));
  c.eyes = new THREE.Mesh(h.eyes, VC); c.eyes.position.set(0, 0.05, 0); c.eyes.geometry.translate(0, -0.05, 0); c.headG.add(c.eyes);
  c.browL = new THREE.Mesh(h.brow, VC); c.browR = new THREE.Mesh(h.brow, VC); c.headG.add(c.browL, c.browR);
  c.grin = new THREE.Mesh(h.grin, VC); c.frown = new THREE.Mesh(h.frown, VC); c.grin.position.set(0, -0.12, 0.27); c.frown.position.set(0, -0.12, 0.27); c.headG.add(c.grin, c.frown);
  c.torso = new THREE.Mesh(buildTorso(o.fur, o.furD), VC); scene.add(c.torso);
  c.headG.scale.setScalar(o.s); c.torso.scale.setScalar(o.s);
  c.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6 * o.s, 14), mat.shadow); c.shadow.rotation.x = -Math.PI / 2; scene.add(c.shadow);
  return c;
}
function pose(c) {
  const { x, z, face, s } = c, cr = c.crouch, p = c.pts, sd = -face;   // sd: sign of the character's own right side in world x
  const py = (0.82 - cr * 0.55) * s;
  const lean = (0.12 + cr * 0.12) * s * face;                               // hunched forward
  p[0].set(x, py, z); p[1].set(x, py + (0.55 - cr * 0.1) * s, z + lean); p[2].set(x, p[1].y + 0.37 * s, p[1].z + lean * 0.6);
  const wind = c.throwT > 0 ? Math.sin(Math.min(1, c.throwT) * Math.PI) : 0;
  p[3].set(x - sd * 0.5 * s, p[1].y - 0.48 * s, p[1].z + face * 0.08 * s);
  p[4].set(x + sd * 0.5 * s, p[1].y - 0.42 * s + wind * 0.95 * s, p[1].z - face * wind * 0.4 * s);
  p[5].set(x - sd * 0.22 * s, 0.1 * s, z + face * 0.15 * cr * s); p[6].set(x + sd * 0.22 * s, 0.1 * s, z - face * 0.1 * cr * s);
}
const tv = new THREE.Vector3(), up = new THREE.Vector3(), rt = new THREE.Vector3(), fw = new THREE.Vector3(), bm = new THREE.Matrix4(), xa = new THREE.Vector3();
function basis(obj, a, b, c, pos) {   // y along a->b, x from the feet (character's right), z = facing
  up.subVectors(b, a).normalize(); rt.subVectors(c.pts[6], c.pts[5]);
  rt.addScaledVector(up, -rt.dot(up)); if (rt.lengthSq() < 1e-6) rt.set(1, 0, 0); rt.normalize();
  fw.crossVectors(up, rt).normalize();
  xa.crossVectors(up, fw);
  bm.makeBasis(xa, up, fw); obj.quaternion.setFromRotationMatrix(bm); obj.position.copy(pos);
}
const im = new THREE.Matrix4(), iq = new THREE.Quaternion(), isc = new THREE.Vector3(), ip = new THREE.Vector3();
function draw(c, dt) {
  const p = c.pts, s = c.s;
  basis(c.torso, p[0], p[1], c, p[0]);
  basis(c.headG, p[1], p[2], c, p[2]);
  LIMBS.forEach(([a, b, r], i) => {
    tv.subVectors(p[b], p[a]); const len = tv.length() || 0.001;
    ip.addVectors(p[a], p[b]).multiplyScalar(0.5); iq.setFromUnitVectors(UP, tv.divideScalar(len)); isc.set(r * s, len, r * s);
    limbIM.setMatrixAt(c.idx * 4 + i, im.compose(ip, iq, isc)); limbIM.setColorAt(c.idx * 4 + i, c.skin);
  });
  const knobs = [[3, 0.13], [4, 0.13], [5, 0.15], [6, 0.15], [1, 0.0], [1, 0.0]];   // fists + big feet
  knobs.forEach(([pi, r], i) => { ip.copy(p[pi]); if (pi >= 5) ip.y = Math.max(ip.y, 0.08 * s); isc.set(r * s, (pi >= 5 ? 0.6 : 1) * r * s, (pi >= 5 ? 1.5 : 1) * r * s); iq.copy(c.torso.quaternion); knobIM.setMatrixAt(c.idx * 6 + i, im.compose(ip, iq, isc)); knobIM.setColorAt(c.idx * 6 + i, c.skin); });
  limbIM.instanceMatrix.needsUpdate = knobIM.instanceMatrix.needsUpdate = true; limbIM.instanceColor.needsUpdate = knobIM.instanceColor.needsUpdate = true;
  // expression: wince = squint + frown + brows pinched down, then recover
  if (c.winceT > 0) c.winceT -= dt;
  const w = c.rag ? 1 : c.winceT > 0 ? 1 : 0; c.wince += (w - c.wince) * Math.min(1, dt * (w ? 25 : 6));
  c.eyes.scale.set(1, 1 - 0.85 * c.wince, 1);
  c.browL.position.set(-0.1, 0.165 - 0.05 * c.wince, 0.27); c.browL.rotation.z = -0.15 - 0.35 * c.wince;
  c.browR.position.set(0.1, 0.165 - 0.05 * c.wince, 0.27); c.browR.rotation.z = 0.15 + 0.35 * c.wince;
  c.grin.visible = c.wince < 0.5; c.frown.visible = !c.grin.visible;
  c.shadow.position.set((p[0].x + p[2].x) / 2, 0.02, (p[0].z + p[2].z) / 2);
}
function startRagdoll(c, impulse) {
  c.rag = true; c.ragT = 0;
  for (let i = 0; i < 7; i++) c.prev[i].copy(c.pts[i]).addScaledVector(impulse, -1 / 60 * (i === 2 ? 1.6 : i === 1 ? 1.2 : 0.7));
  c.rest = LIMBS.map(([a, b]) => [a, b, c.pts[a].distanceTo(c.pts[b])]);
  c.rest.push([0, 1, c.pts[0].distanceTo(c.pts[1])], [2, 1, c.pts[2].distanceTo(c.pts[1])], [3, 4, c.pts[3].distanceTo(c.pts[4]), 0.05], [5, 6, c.pts[5].distanceTo(c.pts[6]), 0.3], [2, 0, c.pts[2].distanceTo(c.pts[0]), 0.08]);
}
function stepRagdoll(c, dt) {  // verlet points + distance springs (stiff for bones, soft for posture) + ground friction
  c.ragT += dt; const p = c.pts, q = c.prev, s = c.s;
  for (let i = 0; i < 7; i++) {
    const vx = (p[i].x - q[i].x) * 0.99, vy = (p[i].y - q[i].y) * 0.99, vz = (p[i].z - q[i].z) * 0.99;
    q[i].copy(p[i]); p[i].x += vx; p[i].y += vy + CFG.g * dt * dt; p[i].z += vz;
  }
  for (let it = 0; it < 6; it++) {
    for (const [a, b, L, k = 1] of c.rest) {
      tv.subVectors(p[b], p[a]); const d = tv.length() || 1e-4, f = ((d - L) / d) * 0.5 * k;
      p[a].addScaledVector(tv, f); p[b].addScaledVector(tv, -f);
    }
    for (let i = 0; i < 7; i++) { const r = (i === 2 ? 0.3 : i === 0 || i === 1 ? 0.3 : 0.12) * s; if (p[i].y < r) { p[i].y = r; q[i].x += (p[i].x - q[i].x) * 0.3; q[i].z += (p[i].z - q[i].z) * 0.3; } }
  }
}
function settled(c) { let s = 0; for (let i = 0; i < 7; i++) s += c.pts[i].distanceTo(c.prev[i]); return c.ragT > 0.6 && s < 0.01; }

const player = makeChar({ s: 1, skin: 0xe9b07a, hair: 0x4a2a14, fur: 0x9a5a28, furD: 0x6e3c18, eye: 0x3a7bd5 }); player.face = -1; player.z = PZ;
const bot = makeChar({ s: CFG.botScale, skin: 0xc98a5a, hair: 0x2a1a10, fur: 0x6b7a3a, furD: 0x46522a, eye: 0x7a4a1a }); bot.face = 1; bot.z = BZ; bot.x = 0;

// ---------- reticle / warning ----------
const reticle = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 20), mat.ring); reticle.renderOrder = 9; scene.add(reticle);
const warn = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16), mat.warn); warn.rotation.x = -Math.PI / 2; scene.add(warn);
const projGeo = new THREE.DodecahedronGeometry(CFG.rockR, 0);
const projs = [];

// ---------- crumbling barricades: 4 stages (100/78/58/40% height), 4th hit breaks it; pooled debris + dust ----------
const STAGE_F = [1, 0.78, 0.58, 0.4], COVER_HITS = 4;
const DEB_N = 72, DUST_N = 40;
const debIM = new THREE.InstancedMesh(DOD, new THREE.MeshLambertMaterial({ flatShading: true }), DEB_N);
const dustIM = new THREE.InstancedMesh(ICO, new THREE.MeshLambertMaterial({ color: 0xe0c9a0, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true }), DUST_N);
debIM.frustumCulled = dustIM.frustumCulled = false; scene.add(debIM, dustIM);
const deb = Array.from({ length: DEB_N }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: 0.1 }));
const dust = Array.from({ length: DUST_N }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0.2 }));
let debI = 0, dustI = 0; const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
for (let i = 0; i < DEB_N; i++) { debIM.setMatrixAt(i, zeroM); debIM.setColorAt(i, _c.set(ROCKC[i % ROCKC.length])); }
for (let i = 0; i < DUST_N; i++) dustIM.setMatrixAt(i, zeroM);
function spawnDebris(pos, n, size, spread, up) {
  for (let k = 0; k < n; k++) { const d = deb[debI++ % DEB_N]; d.life = 1.1 + Math.random() * 0.6; d.p.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * spread * 0.5, (Math.random() - 0.5) * spread * 0.5));
    d.v.set((Math.random() - 0.5) * 5, up * (0.5 + Math.random()), (Math.random() - 0.3) * 3); d.w.set(Math.random() * 12, Math.random() * 12, Math.random() * 12); d.s = size * (0.5 + Math.random() * 0.8); }
}
function spawnDust(pos, n, spread) {
  for (let k = 0; k < n; k++) { const d = dust[dustI++ % DUST_N]; d.max = d.life = 0.5 + Math.random() * 0.5; d.p.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * 0.3, (Math.random() - 0.5) * spread * 0.4)); d.v.set((Math.random() - 0.5) * 1.5, 0.6 + Math.random(), (Math.random() - 0.5) * 1.2); d.s = 0.15 + Math.random() * 0.2; }
}
const pq = new THREE.Quaternion(), ps = new THREE.Vector3();
function stepParticles(dt) {
  deb.forEach((d, i) => { if (d.life <= 0) return; d.life -= dt; d.v.y += CFG.g * dt; d.p.addScaledVector(d.v, dt);
    if (d.p.y < d.s * 0.6) { d.p.y = d.s * 0.6; d.v.y = Math.abs(d.v.y) * 0.35; d.v.x *= 0.7; d.v.z *= 0.7; d.w.multiplyScalar(0.7); }
    d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; d.r.z += d.w.z * dt; const sc = d.life > 0 ? d.s * Math.min(1, d.life * 3) : 0;
    debIM.setMatrixAt(i, im.compose(d.p, pq.setFromEuler(d.r), ps.set(sc, sc, sc))); });
  dust.forEach((d, i) => { if (d.life <= 0) { dustIM.setMatrixAt(i, zeroM); return; } d.life -= dt; d.p.addScaledVector(d.v, dt); d.v.multiplyScalar(1 - dt * 2);
    const k = 1 - d.life / d.max, sc = d.life > 0 ? d.s * (0.6 + k * 1.6) * (1 - k * 0.5) : 0; dustIM.setMatrixAt(i, im.compose(d.p, pq.identity(), ps.set(sc, sc * 0.8, sc))); });
  debIM.instanceMatrix.needsUpdate = dustIM.instanceMatrix.needsUpdate = true;
  for (const c of covers) if (c.shake > 0) { c.shake -= dt; c.mesh.position.x = c.x + Math.sin(c.shake * 90) * 0.04 * (c.shake / 0.25); } else if (c.mesh.position.x !== c.x) c.mesh.position.x = c.x;
}
function applyStage(c) { const f = STAGE_F[Math.min(c.stage, STAGE_F.length - 1)]; c.hy = c.h0 * f; c.hx = c.w0 * (0.8 + 0.2 * f); c.mesh.scale.set(0.8 + 0.2 * f, f, 0.85 + 0.15 * f); }
function hitCover(c, at) {
  c.stage++; c.shake = 0.25;
  if (c.stage >= COVER_HITS) {   // break: tumbling chunks, no longer blocks
    c.broken = true; c.mesh.visible = false;
    spawnDebris(new THREE.Vector3(c.x, c.hy * 0.5, c.z), 16, c.w0 * 0.45, c.w0 * 1.6, 3.5); spawnDust(new THREE.Vector3(c.x, 0.3, c.z), 12, c.w0 * 2);
    return 'BARRICADE SMASHED!';
  }
  applyStage(c); spawnDebris(at, 6, 0.14 * c.w0 / 0.7, 0.4, 4); spawnDust(at, 5, 0.5);
  return 'CRUNCH!';
}
function resetCovers() { for (const c of covers) { c.stage = 0; c.broken = false; c.mesh.visible = true; applyStage(c); } }

// ---------- HUD ----------
const $ = (id) => document.getElementById(id);
let bannerT = 0;
const banner = (t, s = 1.4) => { $('banner').textContent = t; bannerT = s; };
const hint = (t) => { $('hint').textContent = t; };
function hud() {
  $('hpP').firstChild.style.width = Math.max(0, player.hp) + '%'; $('hpE').firstChild.style.width = Math.max(0, bot.hp) + '%';
  $('info').textContent = G.phase === 'over' ? '' : `Round ${G.round}/${CFG.rounds}` + (G.phase === 'aim' ? ` · Throws left ${CFG.shots - G.shot}` : '');
}

// ---------- game state ----------
const G = { phase: 'boot', pt: 0, round: 1, shot: 0, ts: 1, slow: null, slot: 1, slideFrom: 0, slideT: 9, slideDur: CFG.slide,
  aim: { on: false, sx: 0, sy: 0, base: new THREE.Vector2(0, 2.0), tgt: new THREE.Vector2(), shown: new THREE.Vector2() },
  bot: { slot: 1, tx: 0, plan: [], dashT: 0, fireT: 0, fired: 0, tgtSlot: 1 }, log: [], ko: null, errors: 0, fps: 0, slowCount: 0 };
window.__T = { G, player, bot, CFG, PX, BX, BZ, cam: camera, covers };

function setPhase(p) { G.phase = p; G.pt = 0; }
function slideTo(i, dur) { i = Math.max(0, Math.min(2, i)); if (i === G.slot && G.slideT >= G.slideDur) return; G.slideFrom = player.x; G.slot = i; G.slideT = 0; G.slideDur = dur; }

function newMatch() {
  resetCovers();
  for (const c of [player, bot]) { c.hp = CFG.hp; c.rag = false; c.flash = 0; }
  projs.splice(0).forEach((r) => scene.remove(r.mesh));
  G.round = 1; G.ko = null; G.ts = 1; G.slow = null; player.x = PX[1]; G.slot = 1; bot.x = BX[1]; G.bot.slot = 1;
  startEnemyHide();
}
function startEnemyHide() {
  setPhase('enemyHide'); banner('GRUG IS HIDING'); hint('Get ready to throw');
  const b = G.bot, fin = Math.floor(Math.random() * 3); b.plan = []; let s = b.slot, t = 0.3;
  while (t < CFG.hide - 0.6) { const n = (s + 1 + Math.floor(Math.random() * 2)) % 3; b.plan.push([t, n]); s = n; t += 0.5 + Math.random() * 0.6; }
  b.plan.push([t, fin]);
}
function startAim() { setPhase('aim'); G.shot = 0; G.aim.armed = -1; G.aim.ready = false; banner('YOUR THROW!'); }
function nextShot() { G.aim.ready = false; G.aim.on = false; slideTo(1, CFG.recenter); G.aim.tgt.copy(G.aim.base); G.aim.shown.copy(G.aim.base); G.bot.dashT = 1.2 + Math.random(); hint('Drag to aim · release to throw'); }
function startPlayerHide() { setPhase('playerHide'); banner("SWAP! YOU'RE HIDING"); hint('Slide your finger to hide'); }
function startBotFire() { setPhase('botFire'); G.bot.fired = 0; G.bot.fireT = 0.4; hint('Slide to dodge!'); }

// ---------- projectiles ----------
function launch(owner, from, to, T) {
  const v = new THREE.Vector3().subVectors(to, from).multiplyScalar(1 / T); v.y -= 0.5 * CFG.g * T;
  const mesh = new THREE.Mesh(projGeo, mat.proj); mesh.position.copy(from); scene.add(mesh);
  const r = { owner, pos: from.clone(), vel: v, mesh, live: true, age: 0, spin: new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0) };
  // decide slow-mo at release by pre-resolving the throw against the current scene
  const pre = preResolve(r);
  r.pred = pre; const target = owner === 'player' ? bot : player;
  r.wantSlow = pre.res === 'head' || (pre.res !== 'miss' && pre.res !== 'cover' && target.hp - dmg(pre.res) <= 0);
  projs.push(r); return r;
}
function dmg(res) { return res === 'head' ? CFG.body * CFG.headMult : res === 'body' ? CFG.body : res === 'leg' ? Math.round(CFG.body * 0.75) : 0; }
const SIM_DT = 1 / 120;
function collide(r, pos) {
  for (const c of covers) if (!c.broken && Math.abs(pos.x - c.x) < c.hx + CFG.rockR && pos.y < c.hy + CFG.rockR && Math.abs(pos.z - c.z) < c.hz + CFG.rockR) return { res: 'cover', c };
  const t = r.owner === 'player' ? bot : player;
  if (t.rag) return null;
  const p = t.pts;
  const s = t.s;
  if (pos.distanceTo(p[2]) < 0.3 * s + CFG.rockR) return { res: 'head' };
  if (segDist(pos, p[0], p[1]) < 0.3 * s + CFG.rockR) return { res: 'body' };
  if (segDist(pos, p[0], p[5]) < 0.13 * s + CFG.rockR || segDist(pos, p[0], p[6]) < 0.13 * s + CFG.rockR) return { res: 'leg' };
  if (pos.y <= CFG.rockR) return { res: 'miss' };
  return null;
}
const sa = new THREE.Vector3(), sb = new THREE.Vector3();
function segDist(p, a, b) { sa.subVectors(b, a); const t = Math.max(0, Math.min(1, sb.subVectors(p, a).dot(sa) / sa.lengthSq())); return sb.copy(a).addScaledVector(sa, t).distanceTo(p); }
function preResolve(r) {
  const pos = r.pos.clone(), vel = r.vel.clone(); let t = 0;
  while (t < 4) { vel.y += CFG.g * SIM_DT; pos.addScaledVector(vel, SIM_DT); t += SIM_DT; const h = collide(r, pos); if (h) return { res: h.res, t }; }
  return { res: 'miss', t };
}
function stepProj(r, dt) {
  r.age += dt;
  if (!r.live) { r.vel.y += CFG.g * dt; r.pos.addScaledVector(r.vel, dt); if (r.pos.y < CFG.rockR) { r.pos.y = CFG.rockR; r.vel.multiplyScalar(0.5); r.vel.y = Math.abs(r.vel.y) * 0.3; } r.mesh.position.copy(r.pos); return; }
  let n = Math.max(1, Math.ceil(dt / SIM_DT)); const h = dt / n;
  while (n--) {
    r.vel.y += CFG.g * h; r.pos.addScaledVector(r.vel, h);
    if (r.wantSlow && !G.slow && r.age >= r.pred.t - CFG.slowWindow) { G.slow = { r, hold: 0, focus: r.owner === 'player' ? bot : player }; G.slowCount++; }
    const hit = collide(r, r.pos); if (hit) { impact(r, hit.res, hit.c); break; }
  }
  r.mesh.position.copy(r.pos); r.mesh.rotation.x += r.spin.x * dt; r.mesh.rotation.y += r.spin.y * dt;
}
function impact(r, res, cov) {
  r.live = false; r.done = performance.now();
  const target = r.owner === 'player' ? bot : player;
  G.log.push({ owner: r.owner, res, predicted: r.pred.res, slow: !!r.wantSlow });
  const v = r.vel.clone(); r.vel.multiplyScalar(-0.25); r.vel.y = 2;
  if (res === 'head' || res === 'body' || res === 'leg') {
    target.hp -= dmg(res); target.winceT = CFG.wince;
    banner(res === 'head' ? 'BONK! HEAD SHOT!' : res === 'leg' ? 'TOE STUBBED!' : 'THWACK!', 1.2);
    if (target.hp <= 0 && !G.ko) { G.ko = target === bot ? 'bot' : 'player'; startRagdoll(target, v.multiplyScalar(0.35).add(new THREE.Vector3(0, 1.5, 0))); }
  } else if (res === 'cover') { G.coverHits = (G.coverHits || 0) + 1; banner(hitCover(cov, r.pos), 0.7); }
}

// ---------- input (touch + mouse via pointer events) ----------
const cvs = renderer.domElement;
let ptr = null;
function gain() { return 6.5 / (CFG.aim.travel * innerWidth); }   // world units per px: a short drag sweeps all covers
cvs.addEventListener('pointerdown', (e) => {
  e.preventDefault(); ptr = { id: e.pointerId, x: e.clientX, y: e.clientY };
  if (G.phase === 'over') { newMatch(); return; }
  if (G.phase === 'aim' && G.aim.ready && !projs.some((r) => r.live) && !G.slow) { G.aim.on = true; G.aim.sx = e.clientX; G.aim.sy = e.clientY; }
  else slideFinger(e.clientX);
});
cvs.addEventListener('pointermove', (e) => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (G.aim.on) { const k = gain(); G.aim.tgt.set(clampN(G.aim.base.x + (e.clientX - G.aim.sx) * k, -4, 4), clampN(G.aim.base.y - (e.clientY - G.aim.sy) * k, 0.2, 3.6)); }
  else slideFinger(e.clientX);
});
const endPtr = (e) => {
  if (!ptr || e.pointerId !== ptr.id) return; ptr = null;
  if (G.aim.on) { G.aim.on = false; fireAt(G.aim.tgt.x, G.aim.tgt.y); }   // release fires at the finger target, not the eased marker
};
cvs.addEventListener('pointerup', endPtr); cvs.addEventListener('pointercancel', endPtr);
function slideFinger(x) { if (G.phase === 'playerHide' || G.phase === 'botFire') slideTo(Math.floor((x / innerWidth) * 3), CFG.slide); }
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
function fireAt(x, y) {
  G.aim.ready = false; player.throwT = 0.01;
  launch('player', new THREE.Vector3(player.x + 0.4, 1.9, PZ - 0.3), new THREE.Vector3(x, y, BZ), CFG.flight);
  G.shot++; hint('');
}

// ---------- update ----------
function update(dtReal) {
  // time scale: slow-mo shot cam (head shots + KO throw), then hold, then back to 1
  if (G.slow) { const r = G.slow.r; if (r.live) G.ts = CFG.slowmo; else { G.slow.hold += dtReal; G.ts = CFG.slowmo; const koHold = G.ko && !settled(G.slow.focus) && G.slow.hold < 3; if (G.slow.hold > CFG.holdReal && !koHold) { G.slow = null; G.ts = 1; } } }
  else G.ts = 1;
  const dt = dtReal * G.ts;
  G.pt += dt; if (bannerT > 0 && (bannerT -= dtReal) <= 0) $('banner').textContent = '';

  // player slide (eased)
  if (!player.rag) { G.slideT += dt; const k = Math.min(1, G.slideT / G.slideDur); const e = 1 - Math.pow(1 - k, 3); player.x = G.slideFrom + (PX[G.slot] - G.slideFrom) * e; }
  if (player.throwT > 0) { player.throwT += dt * 3; if (player.throwT > 1) player.throwT = 0; }
  if (bot.throwT > 0) { bot.throwT += dt * 3; if (bot.throwT > 1) bot.throwT = 0; }
  player.crouch += ((G.phase === 'playerHide' ? 1 : 0) - player.crouch) * Math.min(1, dt * 10);

  const b = G.bot;
  const anyLive = projs.some((r) => r.live);
  if (G.phase === 'enemyHide') {
    if (b.plan.length && G.pt >= b.plan[0][0]) b.slot = b.plan.shift()[1];
    $('count').textContent = Math.max(1, CFG.hide - Math.floor(G.pt));
    if (G.pt >= CFG.hide) { $('count').textContent = ''; startAim(); }
  } else if (G.phase === 'aim') {
    if (!G.aim.ready && !anyLive && !G.slow && !G.ko && player.throwT === 0) {
      if (G.shot >= CFG.shots) { setPhase('swap'); banner('SWAP! YOUR TURN TO HIDE'); }
      else if (G.aim.armed !== G.shot) { G.aim.armed = G.shot; nextShot(); }   // re-center before each throw
      else if (G.slideT >= G.slideDur && bot.crouch < 0.05) G.aim.ready = true;
    }
    if (!anyLive && !G.slow) { b.dashT -= dt; if (b.dashT <= 0) { b.slot = (b.slot + 1 + Math.floor(Math.random() * 2)) % 3; b.dashT = 1.4 + Math.random() * 1.4; } }
    const k = 1 - Math.exp(-CFG.aim.ease * dt), cap = CFG.aim.cap * gain() * dt;
    tv.set(G.aim.tgt.x - G.aim.shown.x, G.aim.tgt.y - G.aim.shown.y, 0).multiplyScalar(k); if (tv.length() > cap) tv.setLength(cap);
    G.aim.shown.x += tv.x; G.aim.shown.y += tv.y;
  } else if (G.phase === 'swap') { if (G.pt > 1) startPlayerHide(); }
  else if (G.phase === 'playerHide') {
    $('count').textContent = Math.max(1, CFG.hide - Math.floor(G.pt));
    if (G.pt >= CFG.hide) { $('count').textContent = ''; startBotFire(); }
  } else if (G.phase === 'botFire' && !G.ko) {
    if (b.fired < CFG.shots && !anyLive && !G.slow) {
      b.fireT -= dt;
      if (b.fireT <= 0.8 && b.windup !== true) { b.windup = true; b.tgtSlot = G.slot; }   // aims at the rock you're at when it winds up
      if (b.fireT <= 0) {
        b.windup = false; b.fired++; b.fireT = 1.3; bot.throwT = 0.01;
        const head = Math.random() < 0.3, miss = Math.random() < 0.25;
        const tx = PX[b.tgtSlot] + (miss ? (Math.random() - 0.5) * 1.6 : (Math.random() - 0.5) * 0.15);
        launch('bot', new THREE.Vector3(bot.x - 0.6, 2.9, BZ + 0.4), new THREE.Vector3(tx, head ? 1.74 : 1.4, PZ), CFG.botFlight);
      }
    }
    if (b.fired >= CFG.shots && !anyLive && !G.slow && b.fireT < 0.4) { G.round++; if (G.round > CFG.rounds) endMatch(); else startEnemyHide(); }
    else if (b.fired >= CFG.shots && !anyLive) b.fireT -= dt;
  }
  if (G.ko && G.phase !== 'over' && !G.slow) { const c = G.ko === 'bot' ? bot : player; if (settled(c) || c.ragT > 3) endMatch(); }

  // bot motion: slide along its covers, crouched while hiding / while you aim (pops up between dashes)
  if (!bot.rag) {
    const tx = BX[b.slot]; if (!(G.phase === "aim" && anyLive)) bot.x += clampN(tx - bot.x, -dt * 4, dt * 4);   // holds still while your rock flies, so the release-time verdict stays true
    const hidden = G.phase === 'enemyHide' || G.phase === 'swap' || G.phase === 'playerHide';
    bot.crouch += ((hidden ? 1 : 0) - bot.crouch) * Math.min(1, dt * 8);
  }
  projs.forEach((r) => stepProj(r, dt)); stepParticles(dt);
  for (let i = projs.length - 1; i >= 0; i--) if (!projs[i].live && projs[i].age > 4) { scene.remove(projs[i].mesh); projs.splice(i, 1); }
  for (const c of [player, bot]) { if (c.rag) { const n = Math.ceil(dt / (1 / 120)); for (let i = 0; i < n; i++) stepRagdoll(c, dt / n); } else pose(c); draw(c, dtReal); }

  // reticle + bot warning marker
  reticle.visible = G.phase === 'aim' && (G.aim.ready || G.aim.on);
  reticle.position.set(G.aim.shown.x, G.aim.shown.y, BZ + 0.2); reticle.lookAt(camera.position);
  warn.visible = G.phase === 'botFire' && b.windup === true; warn.position.set(PX[b.tgtSlot], 0.03, PZ);
  warn.material.opacity = 0.3 + 0.25 * Math.sin(performance.now() / 70);

  // camera: third person behind/above the player; slow-mo zooms onto the target
  const want = new THREE.Vector3(player.x * 0.55 + 1.5, 4.3, 5.0), look = new THREE.Vector3(player.x * 0.2 + 0.35, 0.9, BZ);
  let fov = 58;
  if (Array.isArray(G.closeup)) { const [x, y, z] = G.closeup; want.set(x + 2.2, y + 2.4, z + 5.5); look.set(x, y, z); fov = 40; }
  else if (G.closeup) { const c = G.closeup === 'bot' ? bot : player, h = c.pts[2]; want.set(h.x + 0.5 * c.s, h.y + 0.15, h.z + c.face * 2.6 * c.s); look.copy(h); fov = 30; }
  if (G.slow) { const f = G.slow.focus.pts[2]; look.copy(f); if (G.slow.focus === player) want.set(f.x + 1.5, 2.6, 3.2); fov = G.slow.focus === bot ? 26 : 45; }
  if (G.closeup) { camera.position.copy(want); G.look = look.clone(); camera.fov = fov; camera.updateProjectionMatrix(); reticle.visible = false; }   // debug/test close-ups snap
  camera.position.lerp(want, Math.min(1, dtReal * 6)); G.look = (G.look || look.clone()).lerp(look, Math.min(1, dtReal * 6)); camera.lookAt(G.look);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dtReal * 5); camera.updateProjectionMatrix(); }
  hud();
}
function endMatch() {
  setPhase('over'); $('count').textContent = '';
  const win = bot.hp <= 0 || (player.hp > 0 && player.hp > bot.hp), draw = player.hp === bot.hp && player.hp > 0;
  banner(G.ko === 'bot' ? 'KNOCKOUT! YOU WIN!' : G.ko === 'player' ? 'KNOCKED OUT!' : draw ? 'DRAW!' : win ? 'YOU WIN!' : 'GRUG WINS!', 999);
  hint(`+${win ? 50 : 20} pretend coins · tap to play again`);
}

// ---------- loop ----------
let last = performance.now(), fAcc = 0, fN = 0;
if (DEBUG) $('fps').style.display = 'block';
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); renderer.render(scene, camera);
  fAcc += dt; fN++; if (fAcc >= 0.5) { G.fps = fN / fAcc; fAcc = 0; fN = 0; if (DEBUG) $('fps').textContent = `${G.fps.toFixed(0)} fps · ${renderer.info.render.calls} calls · ${renderer.info.render.triangles} tris · pr ${renderer.getPixelRatio()}`; }
  requestAnimationFrame(frame);
}
newMatch(); requestAnimationFrame(frame);
// test hooks: px delta needed to aim at a world point from the re-centered aim (no game logic bypassed)
window.__T.aimDelta = (wx, wy) => { const k = gain(); return { dx: (wx - G.aim.base.x) / k, dy: -(wy - G.aim.base.y) / k }; };
window.__T.renderer = renderer;
window.__T.predict = (x, y) => { const from = new THREE.Vector3(player.x + 0.4, 1.9, PZ - 0.3), to = new THREE.Vector3(x, y, BZ), T = CFG.flight; const v = to.clone().sub(from).multiplyScalar(1 / T); v.y -= 0.5 * CFG.g * T; return preResolve({ owner: 'player', pos: from, vel: v }); };
