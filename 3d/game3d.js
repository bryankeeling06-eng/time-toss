// Time Toss 3D: PROTOTYPE of level 1 (Stone Age). Three.js, no build step, stylized primitives only.
import * as THREE from './vendor/three.module.min.js';

const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('debug'), TEST = Q.has('test');
// Numbers ported from the 2D game's BALANCE (match, stone-age weapon, bot stats at 0 trophies, stamina, coins, upgrades).
const CFG = {
  hide: 3, shots: 3, rounds: 5, maxSuddenDeath: 3, hp: 100, headMult: 2, legMult: 0.75,
  weaponDmg: 20,                                            // Wooden Spear / throwing rock base body damage (2D stone weapon)
  bot: { hp: 100, dmg: 14, acc: 0.5, head: 0.15, retarget: 0.6, retargetSettle: 0.35, aimLine: 1.0, runSpeed: 3.4, dashChance: 0.35 },
  stamina: { drain: 0.2, regen: 0.45, tiredUntil: 0.35 },
  coins: { win: 50, loss: 20, draw: 20, streakBonus: [0, 5, 10, 15] },
  upg: { cost: [0, 150, 400, 900], dmg: [0, 0.10, 0.20, 0.35], steady: [0, 0.30, 0.55, 0.75], speed: [0, 0.06, 0.12, 0.18], names: ['Stock', 'Tuned', 'Pro', 'Legend'] },
  guide: 0.55, knock: { head: 0.6, body: 0.45, leg: 0.75 },
  g: -12, flight: 1.3, botFlight: 1.45, rockR: 0.18, headZone: 0.24,   // v4 range: 2x farther -> longer, loftier arc; head hit radius 0.24*s (visual head 0.3*s)
  slowmo: 0.3, slowWindow: 0.3, holdReal: 0.5,
  aim: { travel: 0.29, ease: 28, cap: 2600 },   // mirrors the 2D stone-age aim tuning (high gain, fast capped ease)
  slide: 0.25, recenter: 0.3, botScale: 1.75, hideRun: 7, watchdog: 2.5, wince: 0.7,
};
const PX = [-1.4, 0, 1.4], PZ = 0;          // player spots
const BX = [-3.0, 0, 3.0], BZ = -20;        // bot spots: 2x farther than v3 (was z -10, x ±2.0)
const P_COVER_H = 1.35, B_COVER_H = 2.3;   // cover heights hide a crouched caveman (bot is scaled up)

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const HORIZON = 0xf6d3a6;
scene.fog = new THREE.Fog(HORIZON, 45, 120);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 150);
scene.add(new THREE.HemisphereLight(0xffe2b8, 0x7a4e2a, 1.35));
const sun = new THREE.DirectionalLight(0xffc27a, 2.3); sun.position.set(6, 9, 5); scene.add(sun);

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
const ICO = new THREE.IcosahedronGeometry(1, 0), ICO1 = new THREE.IcosahedronGeometry(1, 1), SPH = new THREE.SphereGeometry(1, 8, 6),
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
// Each barricade has 4 real 3D stage shapes (big pile -> chipped pile -> two-rock stack -> rubble). Collision box = that stage's bounds.
function rockPile(x, z, w, h, d) {
  const cols = [0, 1, 2, 3, 4, 5].map(() => ROCKC[Math.floor(rnd() * ROCKC.length)]), rr = [0, 1, 2, 3, 4, 5].map(() => [rnd(), rnd() * 3, rnd() * 0.3]);
  const stages = [
    [[ICO, 0, [0, 0.5, 0], [0.62, 0.56, 0.62]], [DOD, 1, [-0.42, 0.3, 0.12], [0.36, 0.34, 0.42]], [ICO, 2, [0.45, 0.26, -0.05], [0.32, 0.3, 0.4]], [ICO, 3, [0.1, 0.86, 0], [0.3, 0.17, 0.35]]],
    [[ICO, 0, [0.05, 0.42, 0], [0.55, 0.46, 0.58]], [DOD, 1, [-0.42, 0.28, 0.12], [0.34, 0.32, 0.4]], [ICO, 2, [0.42, 0.24, -0.05], [0.3, 0.28, 0.38]], [DOD, 4, [-0.12, 0.74, 0.05], [0.24, 0.2, 0.28]]],
    [[DOD, 0, [-0.18, 0.3, 0], [0.4, 0.32, 0.45]], [ICO, 2, [0.3, 0.26, 0.04], [0.34, 0.28, 0.4]], [DOD, 4, [0.02, 0.56, -0.02], [0.26, 0.2, 0.3]], [ICO, 5, [-0.48, 0.1, 0.2], [0.14, 0.12, 0.16]]],
    [[DOD, 0, [-0.2, 0.16, 0], [0.3, 0.2, 0.36]], [DOD, 2, [0.26, 0.14, 0.06], [0.26, 0.18, 0.3]], [ICO, 4, [0.03, 0.3, -0.04], [0.2, 0.16, 0.24]], [ICO, 5, [0.5, 0.07, 0.25], [0.12, 0.09, 0.14]], [ICO, 3, [-0.55, 0.07, -0.2], [0.1, 0.08, 0.12]]],
  ].map((parts) => { const b = builder(); parts.forEach(([g, ci, p, sc]) => b.add(g, cols[ci], [p[0] * w, p[1] * h, p[2] * d], [sc[0] * w, sc[1] * h, sc[2] * d], rr[ci], 0.26)); const geo = b.geo(); geo.computeBoundingBox(); return geo; });
  const mesh = new THREE.Mesh(stages[0], VC); mesh.position.set(x, 0, z); scene.add(mesh);
  covers.push({ x, z, hx: w / 2, hy: h, hz: d / 2, w0: w / 2, h0: h, mesh, stages, stage: 0, broken: false, shake: 0 });
}
PX.forEach((x) => rockPile(x, PZ - 0.85, 1.35, P_COVER_H, 0.8));
BX.forEach((x) => rockPile(x, BZ + 1.5, 2.2, B_COVER_H, 1.25));
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
[[-6, 16, -45], [8, 19, -50], [20, 14, -40], [-25, 18, -50]].forEach(([x, y, z]) => { for (let k = 0; k < 4; k++) scen.add(ICO, 0xffffff, [x + k * 1.6 - 2.4, y + (k % 2) * 0.6, z], [1.6 + (k % 2) * 0.6, 1.1, 1.3], [0, 0, 0], 0.3); });
scen.mesh();

// ---------- characters: 7 points drive everything (pose and spring ragdoll); parts are rigid groups on those points ----------
// pts: 0 pelvis, 1 chest, 2 head, 3 lh, 4 rh (throw hand), 5 lf, 6 rf
const LIMBS = [[1, 3, 0.1], [1, 4, 0.1], [0, 5, 0.13], [0, 6, 0.13]];
const MAXC = 2;
const limbIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.8, 1, 7), new THREE.MeshLambertMaterial({ flatShading: true }), 4 * MAXC);
const knobIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ flatShading: true }), 6 * MAXC);
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
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; head.add(ICO, hair, [Math.sin(a) * 0.27, 0.16 + Math.cos(a * 2) * 0.03 + (Math.cos(a) < -0.2 ? -0.08 : 0), Math.cos(a) * 0.24 - 0.04], [0.13, 0.14 + (Math.cos(a) < 0 ? 0.08 : 0), 0.13], [rnd(), rnd(), rnd()], 0.08); }
  head.add(ICO1, hair, [0, 0.22, -0.03], [0.29, 0.14, 0.27], [0, 0, 0], 0.06);   // shaggy cap
  for (let i = 0; i < 7; i++) { const a = -1.25 + (i / 6) * 2.5; head.add(ICO, hair, [Math.sin(a) * 0.2, -0.17 - Math.cos(a) * 0.07, 0.17 + Math.cos(a) * 0.05], [0.09, 0.11, 0.08], [rnd(), rnd(), rnd()], 0.05); }  // beard
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
  const c = { kbT: 0, kbDur: 0.45, kbZone: 'body', idx: charN++, pts: [], prev: [], rest: [], rag: false, x: 0, z: 0, face: -1, s: o.s, crouch: 0, throwT: 0, hp: CFG.hp, winceT: 0, wince: 0, skin: new THREE.Color(o.skin) };
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
  const py = (0.82 - cr * 0.6) * s;
  const lean = (0.12 + cr * 0.14) * s * face;                               // hunched forward
  p[0].set(x, py, z); p[1].set(x, py + (0.55 - cr * 0.15) * s, z + lean); p[2].set(x, p[1].y + (0.37 - cr * 0.04) * s, p[1].z + lean * 0.6);
  if (c.kbT > 0) {   // knockback (2D knock(): head snaps back, body folds, legs buckle), decays over kbDur
    const k = Math.sin(Math.PI * Math.min(1, (c.kbDur - c.kbT) / c.kbDur * 1.6 + 0.2)) * (c.kbT / c.kbDur), bk = -face * s;
    if (c.kbZone === 'head') { p[2].z += bk * 0.32 * k; p[2].y -= 0.05 * k * s; p[1].z += bk * 0.1 * k; }
    else if (c.kbZone === 'leg') { p[0].y -= 0.22 * k * s; p[1].y -= 0.22 * k * s; p[2].y -= 0.2 * k * s; p[1].z += bk * 0.08 * k; }
    else { p[1].z += bk * 0.3 * k; p[2].z += bk * 0.38 * k; p[0].z += bk * 0.08 * k; }
  }
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
// readability at range: dark inverted-hull outline on Grug's head + torso (2 draws, shared material) and a name tag + HP bar sprite
{
  const ol = new THREE.MeshBasicMaterial({ color: 0x2a1405, side: THREE.BackSide, fog: false });
  const h = new THREE.Mesh(bot.headG.children[0].geometry, ol); h.scale.setScalar(1.09); bot.headG.add(h);
  const t = new THREE.Mesh(bot.torso.geometry, ol); t.scale.set(1.08, 1.04, 1.1); bot.torso.add(t);
}
const tagCv = document.createElement('canvas'); tagCv.width = 256; tagCv.height = 72;
const tagTex = new THREE.CanvasTexture(tagCv); tagTex.colorSpace = THREE.SRGBColorSpace;
const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, depthTest: false, fog: false, transparent: true })); tag.renderOrder = 10; tag.scale.set(2.6, 0.73, 1); scene.add(tag);
let tagHp = -1;
function drawTag(hp, max) {
  if (hp === tagHp) return; tagHp = hp; const x = tagCv.getContext('2d'); x.clearRect(0, 0, 256, 72);
  x.font = '900 34px system-ui,sans-serif'; x.textAlign = 'center'; x.lineWidth = 6; x.strokeStyle = '#3a1a05'; x.strokeText('GRUG', 128, 34); x.fillStyle = '#fff'; x.fillText('GRUG', 128, 34);
  x.fillStyle = '#3a1a05'; x.fillRect(38, 44, 180, 22); x.fillStyle = '#444'; x.fillRect(42, 48, 172, 14); x.fillStyle = hp / max > 0.35 ? '#ff8a4a' : '#ff3b3b'; x.fillRect(42, 48, 172 * Math.max(0, hp) / max, 14);
  tagTex.needsUpdate = true;
}

// ---------- reticle / warning / aim guide ----------
const reticle = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 20), mat.ring); reticle.renderOrder = 9; scene.add(reticle);
const warn = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16), mat.warn); warn.rotation.x = -Math.PI / 2; scene.add(warn);
const GUIDE_N = 14;
const guideIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), mat.ring, GUIDE_N); guideIM.frustumCulled = false; guideIM.renderOrder = 9; scene.add(guideIM);
const projGeo = new THREE.DodecahedronGeometry(CFG.rockR, 0);
const projs = [];

// ---------- crumbling barricades: 4 stage shapes, 4th hit breaks it; pooled debris + dust ----------
const COVER_HITS = 4;
const DEB_N = 72, DUST_N = 40;
const debIM = new THREE.InstancedMesh(DOD, new THREE.MeshLambertMaterial({ flatShading: true }), DEB_N);
const dustIM = new THREE.InstancedMesh(ICO, new THREE.MeshLambertMaterial({ color: 0xe0c9a0, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true }), DUST_N);
debIM.frustumCulled = dustIM.frustumCulled = false; scene.add(debIM, dustIM);
const deb = Array.from({ length: DEB_N }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: 0.1 }));
const dust = Array.from({ length: DUST_N }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0.2 }));
let debI = 0, dustI = 0; const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
for (let i = 0; i < DEB_N; i++) { debIM.setMatrixAt(i, zeroM); debIM.setColorAt(i, _c.set(ROCKC[i % ROCKC.length])); }
for (let i = 0; i < DUST_N; i++) dustIM.setMatrixAt(i, zeroM);
for (let i = 0; i < GUIDE_N; i++) guideIM.setMatrixAt(i, zeroM);
const tmpV = new THREE.Vector3();
function spawnDebris(pos, n, size, spread, up) {
  for (let k = 0; k < n; k++) { const d = deb[debI++ % DEB_N]; d.life = 1.1 + Math.random() * 0.6; d.p.copy(pos).add(tmpV.set((Math.random() - 0.5) * spread, Math.random() * spread * 0.5, (Math.random() - 0.5) * spread * 0.5));
    d.v.set((Math.random() - 0.5) * 5, up * (0.5 + Math.random()), (Math.random() - 0.3) * 3); d.w.set(Math.random() * 12, Math.random() * 12, Math.random() * 12); d.s = size * (0.5 + Math.random() * 0.8); }
}
function spawnDust(pos, n, spread) {
  for (let k = 0; k < n; k++) { const d = dust[dustI++ % DUST_N]; d.max = d.life = 0.5 + Math.random() * 0.5; d.p.copy(pos).add(tmpV.set((Math.random() - 0.5) * spread, Math.random() * 0.3, (Math.random() - 0.5) * spread * 0.4)); d.v.set((Math.random() - 0.5) * 1.5, 0.6 + Math.random(), (Math.random() - 0.5) * 1.2); d.s = 0.15 + Math.random() * 0.2; }
}
const pq = new THREE.Quaternion(), ps = new THREE.Vector3();
let particlesAwake = 0;
function stepParticles(dt) {
  if (particlesAwake <= 0) return; particlesAwake -= dt;
  deb.forEach((d, i) => { if (d.life <= 0) { debIM.setMatrixAt(i, zeroM); return; } d.life -= dt; d.v.y += CFG.g * dt; d.p.addScaledVector(d.v, dt);
    if (d.p.y < d.s * 0.6) { d.p.y = d.s * 0.6; d.v.y = Math.abs(d.v.y) * 0.35; d.v.x *= 0.7; d.v.z *= 0.7; d.w.multiplyScalar(0.7); }
    d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; d.r.z += d.w.z * dt; const sc = d.life > 0 ? d.s * Math.min(1, d.life * 3) : 0;
    debIM.setMatrixAt(i, im.compose(d.p, pq.setFromEuler(d.r), ps.set(sc, sc, sc))); });
  dust.forEach((d, i) => { if (d.life <= 0) { dustIM.setMatrixAt(i, zeroM); return; } d.life -= dt; d.p.addScaledVector(d.v, dt); d.v.multiplyScalar(1 - dt * 2);
    const k = 1 - d.life / d.max, sc = d.life > 0 ? d.s * (0.6 + k * 1.6) * (1 - k * 0.5) : 0; dustIM.setMatrixAt(i, im.compose(d.p, pq.identity(), ps.set(sc, sc * 0.8, sc))); });
  debIM.instanceMatrix.needsUpdate = dustIM.instanceMatrix.needsUpdate = true;
}
function stepCoverShake(dt) { for (const c of covers) if (c.shake > 0) { c.shake -= dt; c.mesh.position.x = c.x + Math.sin(c.shake * 90) * 0.04 * (c.shake / 0.25); } else if (c.mesh.position.x !== c.x) c.mesh.position.x = c.x; }
function applyStage(c) {
  const g = c.stages[Math.min(c.stage, c.stages.length - 1)], bb = g.boundingBox;
  c.mesh.geometry = g; c.hy = bb.max.y; c.hx = Math.max(-bb.min.x, bb.max.x) * 0.9;
}
function hitCover(c, at) {
  c.stage++; c.shake = 0.25; particlesAwake = 2.5;
  if (c.stage >= COVER_HITS) {   // break: tumbling chunks, no longer blocks
    c.broken = true; c.mesh.visible = false;
    spawnDebris(tmpV.set(c.x, c.hy * 0.5, c.z).clone(), 16, c.w0 * 0.45, c.w0 * 1.6, 3.5); spawnDust(new THREE.Vector3(c.x, 0.3, c.z), 12, c.w0 * 2);
    sfx.crumble(); return 'SMASHED!';
  }
  applyStage(c); spawnDebris(at, 6, 0.14 * c.w0 / 0.7, 0.4, 4); spawnDust(at, 5, 0.5); sfx.thud();
  return 'CRUNCH!';
}
function resetCovers() { for (const c of covers) { c.stage = 0; c.broken = false; c.mesh.visible = true; applyStage(c); } }
const botCover = (slot) => covers[3 + slot];
const intactBotSlots = () => [0, 1, 2].filter((i) => !botCover(i).broken);

// ---------- audio: WebAudio tones + noise (ported from 2D sfx), unlocked on the first touch for iOS ----------
let actx = null, master = null, noiseBuf = null;
function unlockAudio() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      actx = new AC(); master = actx.createGain(); master.gain.value = SAVE.muted ? 0 : 0.6; master.connect(actx.destination);
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const b = actx.createBufferSource(); b.buffer = actx.createBuffer(1, 1, 22050); b.connect(master); b.start(0);   // iOS: silent buffer inside the gesture
    }
    if (actx.state !== 'running') actx.resume().catch(() => {});
    if (master) master.gain.value = SAVE.muted ? 0 : 0.6;
  } catch (e) { /* audio is optional */ }
}
['pointerdown', 'touchend', 'keydown'].forEach((n) => addEventListener(n, unlockAudio, { passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden && actx) actx.resume().catch(() => {}); });
function tone(f, dur, type, vol, f2, delay) {
  if (!actx || SAVE.muted || actx.state !== 'running') return;
  const t0 = actx.currentTime + (delay || 0), o = actx.createOscillator(), g = actx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol, fc, delay) {
  if (!actx || SAVE.muted || actx.state !== 'running' || !noiseBuf) return;
  const t0 = actx.currentTime + (delay || 0), s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = fc || 1200;
  g.gain.setValueAtTime(vol || 0.3, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.02);
}
const SFX = {
  beep: (last) => tone(last ? 880 : 560, 0.13, 'square', 0.12),
  go: () => { tone(660, 0.1, 'square', 0.12); tone(990, 0.18, 'square', 0.12, null, 0.1); },
  pop: () => { tone(320, 0.14, 'sine', 0.35, 980); noise(0.06, 0.2, 5000); },
  head: () => { tone(320, 0.12, 'sine', 0.35, 980); tone(1250, 0.2, 'triangle', 0.2, 1700, 0.08); },
  puff: () => noise(0.35, 0.22, 650),
  ouch: () => tone(520, 0.28, 'sawtooth', 0.12, 180),
  whoosh: () => noise(0.35, 0.18, 500),
  throw: () => { noise(0.28, 0.25, 1400); tone(420, 0.22, 'sine', 0.12, 160); },
  thud: () => { noise(0.18, 0.35, 700); tone(110, 0.15, 'sine', 0.3, 60); },
  crumble: () => { noise(0.6, 0.4, 500); tone(90, 0.4, 'sine', 0.3, 40); },
  tick: () => tone(1900, 0.035, 'square', 0.05),
  coin: () => { tone(1300, 0.08, 'square', 0.08); tone(1750, 0.12, 'square', 0.08, null, 0.07); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.18, null, i * 0.12)),
  lose: () => [494, 440, 392, 330].forEach((f, i) => tone(f, 0.26, 'triangle', 0.16, null, i * 0.16)),
  buy: () => { tone(880, 0.1, 'triangle', 0.15); tone(1320, 0.16, 'triangle', 0.15, null, 0.08); },
};
const sfxLog = [];
const sfx = new Proxy(SFX, { get: (o, k) => (...a) => { sfxLog.push(k); if (sfxLog.length > 60) sfxLog.shift(); o[k](...a); } });

// ---------- save: separate 3D key. The 2D save (timetoss_save_v2) is never read or written here. ----------
const SAVE_KEY = 'timetoss3d_save_v1';
function defSave() { return { v: 1, coins: 0, streak: 0, bestStreak: 0, upg: 0, muted: false, stats: { matches: 0, wins: 0, losses: 0, draws: 0 } }; }
function loadSave() {
  const d = defSave();
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (!o || typeof o !== 'object') return d;
    const n = (v, a, b, f) => (Number.isFinite(+v) ? Math.max(a, Math.min(b, Math.floor(+v))) : f);
    d.coins = n(o.coins, 0, 1e9, 0); d.streak = n(o.streak, 0, 1e6, 0); d.bestStreak = Math.max(d.streak, n(o.bestStreak, 0, 1e6, 0));
    d.upg = n(o.upg, 0, 3, 0); d.muted = !!o.muted; if (o.stats) for (const k in d.stats) d.stats[k] = n(o.stats[k], 0, 1e9, 0);
  } catch (e) { /* corrupt save -> defaults */ }
  return d;
}
// Quiet QA like 2D: ?admin=1 or ?unlock=all = session coin wallet (50,000) + max upgrade tier. Session only: nothing is saved.
const ADMIN = Q.get('admin') === '1' || Q.get('unlock') === 'all';
let SAVE = loadSave();
let sessionCoins = ADMIN ? Math.max(SAVE.coins, 50000) : null;
function writeSave(s) { if (ADMIN) return false; try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
const coinsNow = () => (sessionCoins != null ? sessionCoins : SAVE.coins);
const upgTier = () => (ADMIN ? 3 : SAVE.upg);
const U = () => ({ dmg: CFG.upg.dmg[upgTier()], steady: CFG.upg.steady[upgTier()], speed: CFG.upg.speed[upgTier()] });
const zoneMult = (z) => (z === 'head' ? CFG.headMult : z === 'leg' ? CFG.legMult : 1);
const playerDmg = (z) => Math.round(CFG.weaponDmg * (1 + U().dmg) * zoneMult(z));
const botDmg = (z) => Math.round(CFG.bot.dmg * zoneMult(z));
const flightTime = () => CFG.flight / (1 + U().speed);
const guideLen = () => CFG.guide + 0.25 * U().steady;
const streakPick = (arr, st) => (st <= 0 ? 0 : arr[Math.min(st, arr.length) - 1]);
function matchReward(result) {
  const s = SAVE, n = JSON.parse(JSON.stringify(s)); let coins, cb = 0, streak = s.streak;
  if (result === 'win') { streak = s.streak + 1; coins = CFG.coins.win; cb = streakPick(CFG.coins.streakBonus, streak); }
  else if (result === 'lose') { streak = 0; coins = CFG.coins.loss; } else coins = CFG.coins.draw;
  n.coins = s.coins + coins + cb; n.streak = streak; n.bestStreak = Math.max(s.bestStreak, streak);
  n.stats.matches++; n.stats[result === 'win' ? 'wins' : result === 'lose' ? 'losses' : 'draws']++;
  return { save: n, coins, coinBonus: cb, streak };
}

// ---------- HUD ----------
const $ = (id) => document.getElementById(id);
let bannerT = 0;
const banner = (t, s = 1.4) => { $('banner').textContent = t; bannerT = s; };
const hint = (t) => { $('hint').textContent = t; };
function showCount(n) { const el = $('count'); el.textContent = n || ''; if (n) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
const calloutLog = [];
function callout(text, sub, col) {
  const el = $('callout'); el.innerHTML = ''; const a = document.createElement('div'); a.textContent = text; a.className = 'big'; a.style.color = col;
  el.appendChild(a); if (sub) { const b = document.createElement('div'); b.className = 'sub'; b.textContent = sub; el.appendChild(b); }
  el.style.transform = `rotate(${((Math.random() - 0.5) * 12).toFixed(1)}deg)`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  calloutLog.push(text + (sub ? ' | ' + sub : '')); if (calloutLog.length > 30) calloutLog.shift();
}
const popPool = []; let popI = 0;
for (let i = 0; i < 6; i++) { const d = document.createElement('div'); d.className = 'pop'; $('hud').appendChild(d); popPool.push(d); }
function popText(world, text, col) {
  const d = popPool[popI++ % popPool.length], v = world.clone().project(camera);
  d.textContent = text; d.style.color = col || '#fff'; d.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; d.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
  d.classList.remove('go'); void d.offsetWidth; d.classList.add('go');
}
function hud() {
  $('hpP').firstChild.style.width = Math.max(0, player.hp) / CFG.hp * 100 + '%'; $('hpE').firstChild.style.width = Math.max(0, bot.hp) / G.botMax * 100 + '%';
  $('hpPn').textContent = Math.max(0, Math.ceil(player.hp)); $('hpEn').textContent = Math.max(0, Math.ceil(bot.hp));
  const inMatch = !['menu', 'over'].includes(G.phase);
  $('info').textContent = !inMatch ? '' : (G.round > CFG.rounds ? `Sudden death ${G.round - CFG.rounds}` : `Round ${G.round}/${CFG.rounds}`) + ` · You ${G.dmgP} – ${G.dmgB} Grug` + (G.phase === 'aim' ? ` · Throws ${CFG.shots - G.shot}` : '');
  const db = $('duck'); db.classList.toggle('show', G.phase === 'botFire' && !G.ko);
  db.classList.toggle('tired', player.tired); db.classList.toggle('down', player.crouch > 0.5);
  db.style.setProperty('--st', (player.stam * 100).toFixed(0) + '%');
}

// ---------- game state ----------
const G = { phase: 'menu', pt: 0, round: 1, sudden: 0, shot: 0, ts: 1, slow: null, slot: 1, slideFrom: 0, slideT: 9, slideDur: CFG.slide, settledT: 9,
  aim: { on: false, sx: 0, sy: 0, base: new THREE.Vector2(0, 2.8), tgt: new THREE.Vector2(), shown: new THREE.Vector2() },
  bot: { slot: 1, plan: [], actT: 1, dash: false, duckT: 0, tx: 0, shots: [], exposed: false, idleT: 0, hideMoved: false, hideStartX: 0 }, watchdog: 0, trace: {},
  log: [], ko: null, fps: 0, slowCount: 0, dmgP: 0, dmgB: 0, botMax: CFG.bot.hp, countNum: 0, duckHeld: false, stats: { shots: 0, hits: 0, heads: 0, dodges: 0 } };
player.stam = 1; player.tired = false;

function setPhase(p) { G.phase = p; G.pt = 0; }
function slideTo(i, dur) { i = Math.max(0, Math.min(2, i)); if (i === G.slot && G.slideT >= G.slideDur) return; G.slideFrom = player.x; G.slot = i; G.slideT = 0; G.slideDur = dur; G.settledT = 0; }
const rr = (a, b) => a + Math.random() * (b - a);

function startMatch() {
  hideOverlays(); resetCovers();
  projs.splice(0).forEach((r) => scene.remove(r.mesh));
  player.hp = CFG.hp; bot.hp = G.botMax = CFG.bot.hp;
  for (const c of [player, bot]) { c.rag = false; c.winceT = 0; c.kbT = 0; }
  Object.assign(G, { round: 1, sudden: 0, ko: null, ts: 1, slow: null, dmgP: 0, dmgB: 0, rewarded: false, result: null, stats: { shots: 0, hits: 0, heads: 0, dodges: 0 } });
  player.x = PX[1]; G.slot = 1; G.slideT = 9; bot.x = BX[1]; G.bot.slot = 1; G.bot.tx = BX[1];
  beginRound();
}
function beginRound() {
  const b = G.bot, ok = intactBotSlots();
  b.plan = []; b.dash = false; b.duckT = 0; b.shots = []; b.exposed = ok.length === 0; b.idleT = 0; b.hideMoved = false; b.hideStartX = bot.x; b.tx = BX[b.slot];
  // Every hide phase he relocates to a DIFFERENT intact cover. Variety: straight move, fake-out (start toward a decoy,
  // stop halfway, double back) or a double move (all the way to a decoy, then on to the real cover).
  const others = ok.filter((i) => i !== b.slot);
  if (others.length) {
    const fin = others[Math.floor(Math.random() * others.length)], decoys = ok.filter((i) => i !== fin && i !== b.slot), r = Math.random();
    let t = rr(0.2, 0.4);
    if (decoys.length && r < 0.3) { const d = decoys[0]; b.plan.push([t, BX[b.slot] + (BX[d] - BX[b.slot]) * rr(0.4, 0.6), null, 'fake']); t += rr(0.45, 0.6); }
    else if (r < 0.55) { const d = decoys.length ? decoys[0] : b.slot; if (d !== b.slot) { b.plan.push([t, BX[d], d, 'double']); t += rr(0.8, 0.95); } }
    b.plan.push([t, BX[fin], fin, 'final']);
  }
  setPhase('enemyHide'); G.countNum = 0;
  banner((G.round > CFG.rounds ? 'SUDDEN DEATH · ' : '') + (b.exposed ? 'NO COVER LEFT FOR GRUG!' : 'GRUG IS HIDING'), 1.6); hint('');
  sfx.whoosh();
}
function startAim() { setPhase('aim'); showCount(0); G.shot = 0; G.aim.armed = -1; G.aim.ready = false; G.bot.actT = 0.8; banner('THROW! Drag to aim!', 1.2); sfx.go(); }
function nextShot() { G.aim.ready = false; G.aim.on = false; slideTo(1, CFG.recenter); G.aim.tgt.copy(G.aim.base); G.aim.shown.copy(G.aim.base); hint('Drag to aim · release to throw'); }
function startPlayerHide() { setPhase('playerHide'); G.countNum = 0; banner("SWAP! YOU'RE HIDING"); hint('Slide your finger to hide'); sfx.whoosh(); player.stam = 1; player.tired = false; }
function startBotFire() {
  setPhase('botFire'); showCount(0); player.stam = 1; player.tired = false;
  banner('DODGE!', 0.8); hint('Slide to a cover · or hold DUCK'); sfx.go();
  let t = rr(1.0, 1.5); G.bot.shots = [];
  for (let i = 0; i < CFG.shots; i++) { G.bot.shots.push({ tellAt: t - CFG.bot.aimLine, fireAt: t, told: false, fired: false, target: null }); t += rr(2.0, 2.5); }
}
function endRound() { setPhase('roundEnd'); banner(G.round > CFG.rounds ? 'SUDDEN DEATH DONE' : `ROUND ${G.round} DONE`, 1.4); hint(`You dealt ${G.roundGain.p} · Grug dealt ${G.roundGain.b}`); }
function nextRound() {
  hint('');
  if (G.round >= CFG.rounds) {
    if (G.dmgP !== G.dmgB) return matchOver('points');
    if (G.sudden < CFG.maxSuddenDeath) { G.sudden++; G.round++; G.roundGain = { p: 0, b: 0 }; return beginRound(); }
    return matchOver('draw');
  }
  G.round++; G.roundGain = { p: 0, b: 0 }; beginRound();
}
G.roundGain = { p: 0, b: 0 };
function knockOut(who) {
  if (G.ko) return; G.ko = who;
  banner(who === 'bot' ? 'KNOCKOUT!' : 'YOU GOT BONKED!', 2); hint('');
}
let coinAnim = null;
function matchOver(reason) {
  if (G.rewarded) return; G.rewarded = true;
  const result = reason === 'ko' ? (G.ko === 'bot' ? 'win' : 'lose') : reason === 'points' ? (G.dmgP > G.dmgB ? 'win' : 'lose') : 'draw';
  setPhase('over'); banner(''); hint(''); showCount(0); G.result = result; G.reason = reason;
  const rw = matchReward(result);
  if (ADMIN) sessionCoins += rw.coins + rw.coinBonus; else { SAVE = rw.save; writeSave(SAVE); }
  G.lastReward = rw;
  // end screen
  $('oTitle').textContent = result === 'win' ? 'YOU WIN!' : result === 'lose' ? 'YOU LOSE' : 'DRAW!';
  $('oTitle').className = result === 'lose' ? 'lose' : '';
  $('oSub').textContent = reason === 'ko' ? (result === 'win' ? `Knockout in round ${G.round}!` : `Grug bonked you in round ${G.round}.`) : reason === 'points' ? (G.sudden ? 'Decided in sudden death!' : 'Most damage after 5 rounds.') : 'Still tied after sudden death.';
  $('oDmg').textContent = `Damage: you ${G.dmgP} · Grug ${G.dmgB}`;
  $('oStats').textContent = `Hits ${G.stats.hits}/${G.stats.shots} · Head hits ${G.stats.heads} · Dodges ${G.stats.dodges}`;
  $('oStreak').textContent = result === 'win' && rw.streak >= 2 ? `🔥 ${rw.streak} WIN STREAK` : '';
  $('oCoins').textContent = `+${rw.coins}${rw.coinBonus ? ' +' + rw.coinBonus + ' streak' : ''} 🪙 · total ${coinsNow()}`;
  const awarded = rw.coins + rw.coinBonus, cn = $('oCoinN'), cb = $('oCoinBig'), ct0 = performance.now() + 350; let lastTick = 0, lastVal = 0;
  if (coinAnim) clearInterval(coinAnim); cn.textContent = '0'; cb.classList.remove('done');
  coinAnim = setInterval(() => {   // victory coin count-up (display only; the save was written once above)
    const now = performance.now(), u = Math.max(0, Math.min(1, (now - ct0) / 1000)), v = Math.round(awarded * (1 - Math.pow(1 - u, 3)));
    if (v !== lastVal) { cn.textContent = String(v); lastVal = v; if (now - lastTick > 55) { lastTick = now; sfx.tick(); } }
    if (u >= 1) { clearInterval(coinAnim); coinAnim = null; cn.textContent = String(awarded); cb.classList.add('done'); sfx.coin(); }
  }, 30);
  $('over').classList.add('show');
  if (result === 'win') sfx.win(); else sfx.lose();
}

// ---------- menu / shop overlays ----------
function hideOverlays() { ['menu', 'over', 'shop'].forEach((id) => $(id).classList.remove('show')); }
function showMenu() { hideOverlays(); setPhase('menu'); banner(''); hint(''); showCount(0); $('mCoins').textContent = `🪙 ${coinsNow()} pretend coins`; $('mStreak').textContent = SAVE.streak > 0 ? `🔥 ${SAVE.streak} win streak` + (SAVE.bestStreak > 1 ? ` · best ${SAVE.bestStreak}` : '') : '🔥 No streak yet'; $('menu').classList.add('show'); }
let shopFrom = 'menu';
function renderShop() {
  const t = upgTier(), list = $('shopList'); list.innerHTML = '';
  $('shopCoins').textContent = `🪙 ${coinsNow()}`;
  CFG.upg.names.forEach((name, i) => {
    const row = document.createElement('div'); row.className = 'srow' + (i <= t ? ' owned' : '');
    const fx = `+${Math.round(CFG.upg.dmg[i] * 100)}% damage · +${Math.round(CFG.upg.speed[i] * 100)}% throw speed · ${Math.round(CFG.upg.steady[i] * 100)}% steadier (longer aim guide)`;
    row.innerHTML = `<div><b>${name}</b><small>${i === 0 ? 'Starter throwing rock (20 dmg)' : fx}</small></div>`;
    const btn = document.createElement('button'); btn.dataset.tier = i;
    if (i <= t) { btn.textContent = 'OWNED'; btn.disabled = true; }
    else if (i === t + 1) { btn.textContent = `🪙 ${CFG.upg.cost[i]}`; btn.disabled = coinsNow() < CFG.upg.cost[i]; btn.onclick = () => buyUpgrade(i); }
    else { btn.textContent = `🔒 ${CFG.upg.cost[i]}`; btn.disabled = true; }
    row.appendChild(btn); list.appendChild(row);
  });
}
function buyUpgrade(i) {
  const cost = CFG.upg.cost[i];
  if (i !== upgTier() + 1 || coinsNow() < cost) { $('shopMsg').textContent = 'Not enough pretend coins yet. Win matches to earn more!'; return false; }
  if (ADMIN) sessionCoins -= cost; else { const n = JSON.parse(JSON.stringify(SAVE)); n.coins -= cost; n.upg = i; SAVE = n; writeSave(n); }
  sfx.buy(); $('shopMsg').textContent = `${CFG.upg.names[i]} unlocked!`; renderShop(); return true;
}
function showShop(from) { shopFrom = from; hideOverlays(); $('shopMsg').textContent = 'Pretend coins only: earn them by playing.' + (ADMIN ? ' (admin session: nothing is saved)' : ''); renderShop(); $('shop').classList.add('show'); }
$('playBtn').onclick = () => startMatch();
$('menuShopBtn').onclick = () => showShop('menu');
$('againBtn').onclick = () => startMatch();
$('overShopBtn').onclick = () => showShop('over');
$('overMenuBtn').onclick = () => showMenu();
$('shopBack').onclick = () => (shopFrom === 'over' ? (hideOverlays(), $('over').classList.add('show')) : showMenu());
$('mute').onclick = (e) => { e.stopPropagation(); SAVE.muted = !SAVE.muted; writeSave(SAVE); if (master) master.gain.value = SAVE.muted ? 0 : 0.6; $('mute').textContent = SAVE.muted ? '🔇' : '🔊'; };
$('mute').textContent = SAVE.muted ? '🔇' : '🔊';

// ---------- projectiles ----------
function launch(owner, from, to, T) {
  const v = new THREE.Vector3().subVectors(to, from).multiplyScalar(1 / T); v.y -= 0.5 * CFG.g * T;
  const mesh = new THREE.Mesh(projGeo, mat.proj); mesh.position.copy(from); scene.add(mesh);
  const r = { owner, pos: from.clone(), vel: v, mesh, live: true, age: 0, spin: new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0) };
  // slow-mo decided at release by pre-resolving the throw (head hits and the knockout throw only)
  const pre = preResolve(r); r.pred = pre; const target = owner === 'player' ? bot : player;
  r.wantSlow = pre.res === 'head' || (pre.res !== 'miss' && pre.res !== 'cover' && target.hp - (owner === 'player' ? playerDmg(pre.res) : botDmg(pre.res)) <= 0);
  projs.push(r); sfx.throw(); return r;
}
const SIM_DT = 1 / 120;
function collide(r, pos) {
  for (const c of covers) if (!c.broken && Math.abs(pos.x - c.x) < c.hx + CFG.rockR && pos.y < c.hy + CFG.rockR && Math.abs(pos.z - c.z) < c.hz + CFG.rockR) return { res: 'cover', c };
  const t = r.owner === 'player' ? bot : player;
  if (t.rag) return null;
  const p = t.pts, s = t.s;
  if (pos.distanceTo(p[2]) < CFG.headZone * s + CFG.rockR) return { res: 'head' };
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
const ZONE_TEXT = { head: 'BONK!', body: 'OOF!', leg: 'TOE STUBBED!' }, ZONE_COL = { head: '#ffe14a', body: '#ffb03a', leg: '#9af0ff' };
function impact(r, res, cov) {
  r.live = false;
  const target = r.owner === 'player' ? bot : player, mine = r.owner === 'player';
  const v = r.vel.clone(); r.vel.multiplyScalar(-0.25); r.vel.y = 2;
  let shown = res;
  if (res === 'head' || res === 'body' || res === 'leg') {
    const d = mine ? playerDmg(res) : botDmg(res);
    target.hp = Math.max(0, target.hp - d); target.winceT = CFG.wince;
    target.kbZone = res; target.kbDur = target.kbT = CFG.knock[res];
    if (mine) { G.dmgP += d; G.roundGain.p += d; G.stats.hits++; if (res === 'head') G.stats.heads++; } else { G.dmgB += d; G.roundGain.b += d; }
    const mult = res === 'head' ? `×${CFG.headMult} · ` : res === 'leg' ? `×${CFG.legMult} · ` : '';
    if (mine) callout(ZONE_TEXT[res], mult + 'UGGA!', ZONE_COL[res]); else callout(res === 'head' ? 'BONK!' : 'OOF!', (res === 'head' ? `×${CFG.headMult} · ` : '') + 'OUCH!', '#ffd1e0');
    popText(r.pos, '-' + d, mine ? '#fff36a' : '#ff9aa8');
    if (res === 'head') sfx.head(); else sfx.pop(); if (!mine) sfx.ouch();
    if (target.hp <= 0 && !G.ko) { knockOut(mine ? 'bot' : 'player'); startRagdoll(target, v.multiplyScalar(0.35).add(new THREE.Vector3(0, 1.5, 0))); }
  } else if (res === 'cover') {
    const txt = hitCover(cov, r.pos); banner(txt, 0.7);
    if (!mine) { G.stats.dodges++; shown = player.crouch > 0.5 ? 'ducked' : 'cover'; if (player.crouch > 0.5) callout('DUCKED!', 'Nice!', '#a8ffb8'); }
    // he leaves a barricade that just got smashed and runs for an intact one
    if (cov.broken && covers.indexOf(cov) >= 3 && covers.indexOf(cov) - 3 === G.bot.slot) { const ok = intactBotSlots(); if (ok.length) { G.bot.slot = ok[Math.floor(Math.random() * ok.length)]; G.bot.dash = true; G.bot.tx = BX[G.bot.slot]; } else G.bot.exposed = true; }   // (v3 bug: tx was not updated, so the dash never finished)
  } else {
    if (!mine) { G.stats.dodges++; shown = player.crouch > 0.5 ? 'ducked' : 'missed'; callout(player.crouch > 0.5 ? 'DUCKED!' : 'MISSED ME!', '', '#a8ffb8'); }
    sfx.puff();
  }
  G.log.push({ owner: r.owner, res, shown, predicted: r.pred.res, slow: !!r.wantSlow });
}

// ---------- input (touch + mouse via pointer events; DUCK = hold button or Space/↓) ----------
const cvs = renderer.domElement;
let ptr = null;
function gain() { return 10 / (CFG.aim.travel * innerWidth); }   // ~0.29 of screen width sweeps 10 m: outer edge of his left cover -> right cover   // world units per px: a short drag sweeps all covers
const canAim = () => G.phase === 'aim' && G.aim.ready && !projs.some((r) => r.live) && !G.slow && !G.ko;
cvs.addEventListener('pointerdown', (e) => {
  e.preventDefault(); ptr = { id: e.pointerId, x: e.clientX, y: e.clientY };
  if (canAim()) { G.aim.on = true; G.aim.sx = e.clientX; G.aim.sy = e.clientY; }
  else slideFinger(e.clientX);
});
cvs.addEventListener('pointermove', (e) => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (G.aim.on) { const k = gain(); G.aim.tgt.set(clampN(G.aim.base.x + (e.clientX - G.aim.sx) * k, -6.5, 6.5), clampN(G.aim.base.y - (e.clientY - G.aim.sy) * k, 0.2, 6.5)); }
  else slideFinger(e.clientX);
});
const endPtr = (e) => {
  if (!ptr || e.pointerId !== ptr.id) return; ptr = null;
  if (G.aim.on) { G.aim.on = false; if (canAim()) fireAt(G.aim.tgt.x, G.aim.tgt.y); }   // release fires at the finger target, not the eased marker
};
cvs.addEventListener('pointerup', endPtr); cvs.addEventListener('pointercancel', endPtr);
const duckBtn = $('duck');
duckBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); G.btnDuck = true; try { duckBtn.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => duckBtn.addEventListener(n, () => { G.btnDuck = false; }));
addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') { G.keyDuck = true; e.preventDefault(); }
  if (!e.repeat && (e.code === 'ArrowLeft' || e.code === 'KeyA')) slideFingerSlot(G.slot - 1);
  if (!e.repeat && (e.code === 'ArrowRight' || e.code === 'KeyD')) slideFingerSlot(G.slot + 1);
});
addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') G.keyDuck = false; });
addEventListener('blur', () => { G.keyDuck = G.btnDuck = false; });
function slideFingerSlot(i) { if (G.phase === 'playerHide' || G.phase === 'botFire') slideTo(i, CFG.slide); }
function slideFinger(x) { slideFingerSlot(Math.floor((x / innerWidth) * 3)); }
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const handPos = () => new THREE.Vector3(player.x + 0.4, 1.9, PZ - 0.3);
function fireAt(x, y) {
  G.aim.ready = false; player.throwT = 0.01; G.stats.shots++;
  launch('player', handPos(), new THREE.Vector3(x, y, BZ), flightTime());
  G.shot++; hint('');
}
function drawGuide() {   // dotted arc for the first guideLen() of the throw (Tuned/Pro/Legend steady = longer guide)
  const on = G.phase === 'aim' && G.aim.on; if (!on && !G.guideOn) return; G.guideOn = on;
  const from = handPos(), to = new THREE.Vector3(G.aim.shown.x, G.aim.shown.y, BZ), T = flightTime(), v = to.clone().sub(from).multiplyScalar(1 / T); v.y -= 0.5 * CFG.g * T;
  const L = guideLen();
  for (let i = 0; i < GUIDE_N; i++) {
    if (!on) { guideIM.setMatrixAt(i, zeroM); continue; }
    const t = T * L * (i + 1) / GUIDE_N; ip.copy(from).addScaledVector(v, t); ip.y += 0.5 * CFG.g * t * t;
    guideIM.setMatrixAt(i, im.compose(ip, iq.identity(), isc.setScalar(1 - i / GUIDE_N * 0.5)));
  }
  guideIM.instanceMatrix.needsUpdate = true;
}

// ---------- camera framing: fit the player + his whole near cover on any portrait aspect ----------
const fitPts = Array.from({ length: 20 }, () => new THREE.Vector3());
const camDir = new THREE.Vector3(0.7, 2.9, 7.2).normalize(), lookBase = new THREE.Vector3();
const FRAME = { left: -0.93, right: 0.93, bottom: -0.86, top: 0.62 };   // NDC box kept clear (top = HUD + Grug, bottom = hint/duck)
function framePoints(px) {
  const c = covers[G.slot], hx = c.w0 * 1.05, ch = c.h0 * 1.02, cz = c.z;
  let i = 0; for (const x of [c.x - hx, c.x + hx]) for (const y of [0, ch]) for (const z of [cz - c.hz, cz + c.hz]) fitPts[i++].set(x, y, z);
  for (const x of [px - 0.62, px + 0.62]) for (const y of [0, 2.15]) for (const z of [PZ - 0.45, PZ + 0.45]) fitPts[i++].set(x, y, z);
  const fc = covers[3]; for (const x of [BX[0] - fc.w0, BX[2] + fc.w0]) for (const y of [0, fc.h0 + 1.6]) fitPts[i++].set(x, y, fc.z);   // whole far cover row + Grug's head room
  return fitPts;
}
const fitCam = new THREE.PerspectiveCamera();
function fitDistance(px, look) {
  fitCam.fov = 58; fitCam.aspect = innerWidth / innerHeight; fitCam.near = 0.1; fitCam.far = 150; fitCam.updateProjectionMatrix();
  const pts = framePoints(px); let lo = 4, hi = 20;
  for (let it = 0; it < 14; it++) {
    const d = (lo + hi) / 2; fitCam.position.copy(look).addScaledVector(camDir, d); fitCam.lookAt(look); fitCam.updateMatrixWorld();
    let ok = true; for (const p of pts) { const v = tmpV.copy(p).project(fitCam); if (v.z > 1 || v.x < FRAME.left || v.x > FRAME.right || v.y < FRAME.bottom || v.y > FRAME.top) { ok = false; break; } }
    if (ok) hi = d; else lo = d;
  }
  return hi;
}
function onResize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); G.fitD = null; }
addEventListener('resize', onResize); if (window.visualViewport) visualViewport.addEventListener('resize', onResize);

// ---------- update ----------
function update(dtReal) {
  if (G.slow) { const r = G.slow.r; G.ts = CFG.slowmo; if (!r.live) { G.slow.hold += dtReal; const koHold = G.ko && !settled(G.slow.focus) && G.slow.hold < 3; if (G.slow.hold > CFG.holdReal && !koHold) { G.slow = null; G.ts = 1; } } }
  else G.ts = 1;
  const dt = dtReal * G.ts;
  G.pt += dt; if (bannerT > 0 && (bannerT -= dtReal) <= 0) $('banner').textContent = '';
  if (!player.rag) { G.slideT += dt; G.settledT += dt; const k = Math.min(1, G.slideT / G.slideDur); const e = 1 - Math.pow(1 - k, 3); player.x = G.slideFrom + (PX[G.slot] - G.slideFrom) * e; }
  for (const c of [player, bot]) { if (c.throwT > 0) { c.throwT += dt * 3; if (c.throwT > 1) c.throwT = 0; } if (c.kbT > 0) c.kbT = Math.max(0, c.kbT - dt); }

  // player duck / stamina (2D: drain 0.2/s while ducked, regen 0.45/s, tired until 0.35)
  G.duckHeld = !!(G.keyDuck || G.btnDuck);
  const wantDuck = G.phase === 'playerHide' || G.phase === 'swap' ? 1 : (G.phase === 'botFire' && G.duckHeld && !player.tired) ? 1 : 0;
  player.crouch += (wantDuck - player.crouch) * Math.min(1, dt * 12);
  if (G.phase === 'botFire') {
    player.stam = clampN(player.stam + (player.crouch > 0.5 ? -CFG.stamina.drain : CFG.stamina.regen) * dt, 0, 1);
    if (!player.tired && player.stam <= 0) { player.tired = true; callout('OUT OF BREATH!', '', '#ffb0b0'); }
    if (player.tired && player.stam >= CFG.stamina.tiredUntil) player.tired = false;
  }

  const b = G.bot, anyLive = projs.some((r) => r.live);
  if (G.phase === 'enemyHide' || G.phase === 'playerHide') {
    if (G.phase === 'enemyHide' && b.plan.length && G.pt >= b.plan[0][0]) { const [, x, slot] = b.plan.shift(); b.tx = x; if (slot != null) b.slot = slot; }
    // watchdog (hide): if he still hasn't left his spot by 1.6 s, send him to another intact cover
    if (G.phase === 'enemyHide' && !b.hideMoved && G.pt > 1.6 && !b.plan.length) { const o = intactBotSlots().filter((i) => i !== b.slot); if (o.length) { b.slot = o[Math.floor(Math.random() * o.length)]; b.tx = BX[b.slot]; G.watchdog++; } }
    const n = Math.max(1, CFG.hide - Math.floor(G.pt));
    if (n !== G.countNum && G.pt < CFG.hide) { G.countNum = n; showCount(n); sfx.beep(n === 1); }   // 3-2-1 with beeps
    if (G.pt >= CFG.hide) { showCount(0); if (G.phase === 'enemyHide') startAim(); else startBotFire(); }
  } else if (G.phase === 'aim') {
    if (!G.aim.ready && !anyLive && !G.slow && !G.ko && player.throwT === 0) {
      if (G.shot >= CFG.shots) { setPhase('swap'); banner('SWAP! YOUR TURN TO HIDE'); }
      else if (G.aim.armed !== G.shot) { G.aim.armed = G.shot; nextShot(); }   // re-center before each throw
      else if (G.slideT >= G.slideDur && bot.crouch < 0.3) G.aim.ready = true;
    }
    // moving target (2D aim-phase AI at era 0): dash to another INTACT cover, side-step, or duck briefly
    // NOTE (v4 fix): v3 also required !G.aim.on here, so the AI clock stopped whenever a finger was down. On a phone
    // you drag almost the whole aim phase, and the rest of the time a rock is in flight -> Grug never moved.
    if (!anyLive && !G.slow && !G.ko && !(TEST && G.aiHold)) {
      // watchdog (aim): nothing happened for CFG.watchdog s -> force a strafe or a dash
      if (b.idleT > CFG.watchdog) { const o = intactBotSlots().filter((i) => i !== b.slot); if (o.length && Math.random() < 0.6) { b.slot = o[Math.floor(Math.random() * o.length)]; b.dash = true; b.tx = BX[b.slot]; } else { b.dash = false; b.tx = BX[b.slot] + (bot.x > BX[b.slot] ? -1 : 1) * rr(0.6, 1.0); } b.idleT = 0; b.actT = rr(0.8, 1.4); G.watchdog++; }
      if (b.dash) { if (Math.abs(bot.x - b.tx) < 0.02) { b.dash = false; b.actT = rr(0.6, 1.2); b.tx = BX[b.slot]; } }
      else {
        if (b.duckT > 0) b.duckT -= dt;
        b.actT -= dt;
        if (b.actT <= 0) {
          const others = intactBotSlots().filter((i) => i !== b.slot), r = Math.random();
          if (others.length && r < CFG.bot.dashChance) { b.slot = others[Math.floor(Math.random() * others.length)]; b.dash = true; b.tx = BX[b.slot]; }
          else if (r < 0.62) { b.tx = BX[b.slot] + (bot.x > BX[b.slot] + 0.1 ? -1 : bot.x < BX[b.slot] - 0.1 ? 1 : Math.random() < 0.5 ? -1 : 1) * rr(0.6, 1.0); b.actT = rr(0.7, 1.3); }   // strafe out / peek
          else if (r < 0.8) { b.duckT = rr(0.35, 0.55); b.actT = b.duckT + rr(0.4, 0.8); b.tx = BX[b.slot]; }   // duck back behind cover
          else b.actT = rr(0.5, 1.1);
        }
      }
    }
    const k = 1 - Math.exp(-CFG.aim.ease * dt), cap = CFG.aim.cap * gain() * dt;
    tv.set(G.aim.tgt.x - G.aim.shown.x, G.aim.tgt.y - G.aim.shown.y, 0).multiplyScalar(k); if (tv.length() > cap) tv.setLength(cap);
    G.aim.shown.x += tv.x; G.aim.shown.y += tv.y;
  } else if (G.phase === 'swap') { if (G.pt > 1) startPlayerHide(); }
  else if (G.phase === 'botFire' && !G.ko) {
    let pending = false;
    for (const s of b.shots) {
      if (!s.told && G.pt >= s.tellAt) { s.told = true; s.target = G.slot; b.windup = true; b.tgtSlot = s.target; }   // red ring: locks the cover you're at
      if (!s.fired && G.pt >= s.fireAt) {
        s.fired = true; b.windup = false; bot.throwT = 0.01;
        if (s.target !== G.slot && G.slideT >= G.slideDur && G.settledT >= CFG.bot.retargetSettle && Math.random() < CFG.bot.retarget) { s.target = G.slot; s.retargeted = true; }
        const intent = (TEST && G.botForce) || (Math.random() < CFG.bot.acc ? (Math.random() < CFG.bot.head ? 'head' : 'hit') : 'miss');
        let tx = PX[s.target], ty = 1.45;
        if (intent === 'miss') { tx += (Math.random() < 0.5 ? -1 : 1) * rr(0.75, 0.95); ty = rr(0.9, 1.6); } else { tx += rr(-0.08, 0.08); ty = intent === 'head' ? 1.78 : 1.45; }
        s.intent = intent;
        launch('bot', bot.pts[4].clone().setZ(BZ + 0.6), new THREE.Vector3(tx, ty, PZ), CFG.botFlight);
      }
      if (!s.fired) pending = true;
    }
    if (!pending && !anyLive && !G.slow) endRound();
  } else if (G.phase === 'roundEnd') { if (G.pt > 1.6) nextRound(); }
  if (G.ko && !['over', 'menu'].includes(G.phase) && !G.slow) { const c = G.ko === 'bot' ? bot : player; if (settled(c) || c.ragT > 3) matchOver('ko'); }

  // bot motion: hide crouched behind his (intact) cover, stand to throw; holds still while your rock flies
  if (!bot.rag) {
    if (G.phase !== 'aim' && G.phase !== 'enemyHide') b.tx = BX[b.slot];
    const sp = b.dash ? CFG.bot.runSpeed : G.phase === 'enemyHide' ? CFG.hideRun : 1.8;
    const x0 = bot.x, c0 = bot.crouch;
    if (!(G.phase === 'aim' && anyLive)) bot.x += clampN(b.tx - bot.x, -dt * sp, dt * sp);
    if (Math.abs(bot.x - b.hideStartX) > 0.3 && G.phase === 'enemyHide') b.hideMoved = true;
    if (TEST) { const k = G.round + ':' + G.phase; const tr = G.trace[k] || (G.trace[k] = { min: bot.x, max: bot.x, slots: [] }); tr.min = Math.min(tr.min, bot.x); tr.max = Math.max(tr.max, bot.x); if (tr.slots[tr.slots.length - 1] !== b.slot) tr.slots.push(b.slot); }
    const hidden = G.phase === 'enemyHide' || G.phase === 'swap' || G.phase === 'playerHide' || G.phase === 'roundEnd' || (G.phase === 'aim' && b.duckT > 0 && !b.dash);
    bot.crouch += ((hidden ? 1 : 0) - bot.crouch) * Math.min(1, dt * 8);
    if (G.phase === 'aim' && !anyLive && !G.slow && !G.ko) b.idleT = Math.abs(bot.x - x0) > 1e-4 || Math.abs(bot.crouch - c0) > 1e-3 ? 0 : (b.idleT || 0) + dt; else b.idleT = 0;
  }
  projs.forEach((r) => stepProj(r, dt)); stepParticles(dt); stepCoverShake(dt);
  for (let i = projs.length - 1; i >= 0; i--) if (!projs[i].live && projs[i].age > 3) { scene.remove(projs[i].mesh); projs.splice(i, 1); }
  for (const c of [player, bot]) { if (c.rag) { const n = Math.ceil(dt / (1 / 120)); for (let i = 0; i < n; i++) stepRagdoll(c, dt / n); } else pose(c); draw(c, dtReal); }

  reticle.visible = G.phase === 'aim' && (G.aim.ready || G.aim.on);
  reticle.position.set(G.aim.shown.x, G.aim.shown.y, BZ + 0.2); reticle.scale.setScalar(1.6); reticle.lookAt(camera.position);
  warn.visible = G.phase === 'botFire' && b.windup === true; warn.position.set(PX[b.tgtSlot], 0.03, PZ);
  warn.material.opacity = 0.3 + 0.25 * Math.sin(performance.now() / 70);
  drawGuide();
  tag.visible = !bot.rag && G.phase !== 'menu' && G.phase !== 'enemyHide'; if (tag.visible) { drawTag(Math.ceil(bot.hp), G.botMax); tag.position.copy(bot.pts[2]).y += 0.95 * bot.s; }

  // camera: fitted third-person view (whole near cover + player on screen), slow-mo zooms onto the target
  lookBase.set(player.x * 0.35, 1.0, -6.5);
  const want = new THREE.Vector3(), look = lookBase.clone();
  if (G.fitD == null || Math.abs(G.fitX - player.x) > 0.01 || G.fitSlot !== G.slot) { G.fitD = fitDistance(player.x, lookBase); G.fitX = player.x; G.fitSlot = G.slot; }
  want.copy(lookBase).addScaledVector(camDir, G.fitD);
  let fov = 58;
  if (TEST && Array.isArray(G.closeup)) { const [x, y, z] = G.closeup; want.set(x + 2.2, y + 2.4, z + 5.5); look.set(x, y, z); fov = 40; }
  else if (TEST && G.closeup) { const c = G.closeup === 'bot' ? bot : player, h = c.pts[2]; want.set(h.x + 0.5 * c.s, h.y + 0.15, h.z + c.face * 2.6 * c.s); look.copy(h); fov = 30; }
  if (G.slow) { const f = G.slow.focus.pts[2]; look.copy(f); if (G.slow.focus === player) want.set(f.x + 1.5, 2.6, 3.2); fov = G.slow.focus === bot ? 26 : 45; }
  if ((TEST && G.closeup) || G.snapCam) { camera.position.copy(want); G.look = look.clone(); camera.fov = fov; camera.updateProjectionMatrix(); reticle.visible = false; G.snapCam = false; }
  camera.position.lerp(want, Math.min(1, dtReal * 6)); G.look = (G.look || look.clone()).lerp(look, Math.min(1, dtReal * 6)); camera.lookAt(G.look);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dtReal * 5); camera.updateProjectionMatrix(); }
  hud();
}

// ---------- loop ----------
let last = performance.now(), fAcc = 0, fN = 0;
if (DEBUG) $('fps').style.display = 'block';
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;   // up to 100 ms per frame (projectiles/ragdoll substep), so slow phones keep real-time pace
  update(dt); renderer.render(scene, camera);
  fAcc += dt; fN++; if (fAcc >= 0.5) { G.fps = fN / fAcc; fAcc = 0; fN = 0; if (DEBUG) $('fps').textContent = `${G.fps.toFixed(0)} fps · ${renderer.info.render.calls} calls · ${renderer.info.render.triangles} tris · pr ${renderer.getPixelRatio()}`; }
  requestAnimationFrame(frame);
}
resetCovers(); G.snapCam = true; showMenu(); requestAnimationFrame(frame);

// ---------- test hooks: only with ?test (never present in normal play) ----------
if (TEST) {
  const box = (pts) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { const v = p.clone().project(camera); const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; };
  window.__T = {
    G, player, bot, CFG, PX, BX, BZ, covers, cam: camera, renderer, sfxLog, calloutLog, SAVE_KEY,
    save: () => SAVE, coins: coinsNow, upgTier, playerDmg, flightTime, guideLen, startMatch, beginRound, buyUpgrade,
    aimDelta: (wx, wy) => { const k = gain(); return { dx: (wx - G.aim.base.x) / k, dy: -(wy - G.aim.base.y) / k }; },
    predict: (x, y) => { const from = handPos(), to = new THREE.Vector3(x, y, BZ), T = flightTime(); const v = to.clone().sub(from).multiplyScalar(1 / T); v.y -= 0.5 * CFG.g * T; return preResolve({ owner: 'player', pos: from, vel: v }); },
    smash: (ids) => ids.forEach((i) => { const c = covers[i]; c.stage = COVER_HITS; c.broken = true; c.mesh.visible = false; }),
    frame: () => {   // on-screen px boxes of the player's body (+ head radius) and his current near cover (true geometry bounds)
      const c = covers[G.slot], bb = c.mesh.geometry.boundingBox, cp = [];
      for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) cp.push(new THREE.Vector3(c.x + x, y, c.z + z));
      const pp = []; player.pts.forEach((p) => { for (const d of [[0.35, 0, 0], [-0.35, 0, 0], [0, 0.35, 0], [0, -0.1, 0]]) pp.push(p.clone().add(new THREE.Vector3(...d))); });
      const g = new THREE.Vector3(bot.x, 2.15 * bot.s, BZ), gf = new THREE.Vector3(bot.x, 0, BZ);   // his standing height on screen (independent of a duck in progress)
      return { W: innerWidth, H: innerHeight, cover: box(cp), player: box(pp), grugPx: Math.round(box([gf]).y0 - box([g]).y0) };
    },
  };
}
