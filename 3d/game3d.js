// Time Toss 3D: PROTOTYPE of level 1 (Stone Age). Three.js, no build step, stylized primitives only.
import * as THREE from './vendor/three.module.min.js';

const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('debug');
const CFG = {
  hide: 3, shots: 3, rounds: 5, hp: 100, body: 34, headMult: 2,
  g: -12, flight: 0.9, botFlight: 1.0, rockR: 0.18,
  slowmo: 0.3, slowWindow: 0.3, holdReal: 0.5,
  aim: { travel: 0.29, ease: 28, cap: 2600 },   // mirrors the 2D stone-age aim tuning (high gain, fast capped ease)
  slide: 0.25, recenter: 0.3,
};
const PX = [-1.4, 0, 1.4], PZ = 0;          // player spots
const BX = [-2.2, 0, 2.2], BZ = -14;        // bot spots
const COVER_H = 0.95;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd4ee);
scene.fog = new THREE.Fog(0x9fd4ee, 22, 60);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
scene.add(new THREE.HemisphereLight(0xffffff, 0x7a6a40, 1.6));
const sun = new THREE.DirectionalLight(0xfff2d0, 1.6); sun.position.set(4, 10, 6); scene.add(sun);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const M = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const mat = { ground: M(0xc9b27a), grass: M(0x7fae4a), rock: M(0x8e8a84), rock2: M(0x6f6b66), skin: M(0xe9b07a), skinB: M(0xc98a5a),
  fur: M(0xa8642a), furB: M(0x5d6f3a), hair: M(0x3b2414), trunk: M(0x6b4423), leaf: M(0x3f8f3a), volc: M(0x6a5a52), lava: new THREE.MeshBasicMaterial({ color: 0xff6a1a }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }), club: M(0x8a5a2b),
  ring: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false }),
  warn: new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.5, depthWrite: false }) };

// ---------- world ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat.ground); ground.rotation.x = -Math.PI / 2; scene.add(ground);
const grass = new THREE.Mesh(new THREE.CircleGeometry(30, 24), mat.grass); grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0.01, -35); scene.add(grass);
const volcano = new THREE.Mesh(new THREE.ConeGeometry(9, 10, 9), mat.volc); volcano.position.set(-10, 5, -45); scene.add(volcano);
const lava = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.2, 9), mat.lava); lava.position.set(-10, 9.5, -45); scene.add(lava);
// trees merged into two instanced meshes (2 draw calls)
const treePos = [[-6, -10], [6.5, -11], [-7, -18], [7, -19], [-4.5, -24], [5, -26], [8, -4], [-8, -5]];
const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.22, 2, 6), mat.trunk, treePos.length);
const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.1, 0), mat.leaf, treePos.length);
const tmpM = new THREE.Matrix4();
treePos.forEach(([x, z], i) => { trunks.setMatrixAt(i, tmpM.makeTranslation(x, 1, z)); leaves.setMatrixAt(i, tmpM.makeTranslation(x, 2.4, z)); });
scene.add(trunks, leaves);

const covers = [];  // {x,z,hx,hy,hz}
const rockGeo = new THREE.IcosahedronGeometry(1, 0);
function makeCover(x, z, s) {
  const g = new THREE.Group();
  const a = new THREE.Mesh(rockGeo, mat.rock); a.scale.set(0.8 * s, 0.55, 0.45); a.position.y = 0.42; a.rotation.y = x * 0.7;
  const b = new THREE.Mesh(rockGeo, mat.rock2); b.scale.set(0.42 * s, 0.4, 0.38); b.position.set(0.35 * s, 0.75, 0.05); b.rotation.set(0.4, x, 0.2);
  g.add(a, b); g.position.set(x, 0, z); scene.add(g);
  covers.push({ x, z, hx: 0.75 * s, hy: COVER_H, hz: 0.42 });
}
PX.forEach((x) => makeCover(x, PZ - 0.8, 0.85));
BX.forEach((x) => makeCover(x, BZ + 1.0, 1.0));

// ---------- characters: 7 points -> capsule-ish parts; same points drive the spring ragdoll ----------
const P = { pelvis: 0, chest: 1, head: 2, lh: 3, rh: 4, lf: 5, rf: 6 };
const BONES = [[0, 1, 0.27, 'fur'], [1, 3, 0.085, 'skin'], [1, 4, 0.085, 'skin'], [0, 5, 0.11, 'skin'], [0, 6, 0.11, 'skin']];
const cyl = new THREE.CylinderGeometry(1, 1, 1, 7); const sph = new THREE.IcosahedronGeometry(1, 1);
const UP = new THREE.Vector3(0, 1, 0);
function makeChar(furMat, skinMat) {
  const c = { pts: [], prev: [], rest: [], rag: false, x: 0, z: 0, face: -1, crouch: 0, throwT: 0, hp: CFG.hp, meshes: [], flash: 0 };
  for (let i = 0; i < 7; i++) { c.pts.push(new THREE.Vector3()); c.prev.push(new THREE.Vector3()); }
  BONES.forEach(([a, b, r, m]) => { const mesh = new THREE.Mesh(cyl, m === 'fur' ? furMat : skinMat); mesh.userData.r = r; scene.add(mesh); c.meshes.push(mesh); });
  c.headM = new THREE.Mesh(sph, skinMat); c.headM.scale.setScalar(0.27); scene.add(c.headM);
  c.hairM = new THREE.Mesh(sph, mat.hair); c.hairM.scale.set(0.29, 0.17, 0.29); scene.add(c.hairM);
  c.club = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 0.7, 6), mat.club); scene.add(c.club);
  c.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), mat.shadow); c.shadow.rotation.x = -Math.PI / 2; scene.add(c.shadow);
  return c;
}
function pose(c) {
  const { x, z, face } = c, cr = c.crouch, p = c.pts;
  const py = 0.85 - cr * 0.42;
  p[0].set(x, py, z); p[1].set(x, py + 0.55 - cr * 0.08, z + face * 0.08 * cr); p[2].set(x, p[1].y + 0.36, p[1].z + face * 0.05);
  const wind = c.throwT > 0 ? Math.sin(Math.min(1, c.throwT) * Math.PI) : 0;
  p[3].set(x - 0.4, p[1].y - 0.4, z + face * 0.1);
  p[4].set(x + 0.42, p[1].y - 0.3 + wind * 0.8, z - face * wind * 0.35);
  p[5].set(x - 0.17, 0.1, z + face * 0.15 * cr); p[6].set(x + 0.17, 0.1, z - face * 0.1 * cr);
}
const tv = new THREE.Vector3();
function draw(c) {
  const p = c.pts;
  BONES.forEach(([a, b], i) => {
    const m = c.meshes[i], r = m.userData.r; tv.subVectors(p[b], p[a]); const len = tv.length() || 0.001;
    m.position.addVectors(p[a], p[b]).multiplyScalar(0.5); m.scale.set(r, len + r * (i === 0 ? 0.6 : 0.8), r);
    m.quaternion.setFromUnitVectors(UP, tv.divideScalar(len));
  });
  c.headM.position.copy(p[2]); c.hairM.position.set(p[2].x, p[2].y + 0.14, p[2].z);
  if (c.rag) c.hairM.position.copy(p[2]).addScaledVector(tv.subVectors(p[2], p[1]).normalize(), 0.14);
  c.club.position.copy(p[4]).add(new THREE.Vector3(0, 0.25, 0)); c.club.visible = !c.rag && c.showClub;
  c.shadow.position.set((p[0].x + p[2].x) / 2, 0.02, (p[0].z + p[2].z) / 2);
  const k = c.flash > 0 ? 1 : 0; c.headM.material.emissive.setRGB(k * 0.6, 0, 0); c.meshes[0].material.emissive.setRGB(k * 0.6, 0, 0);
}
function startRagdoll(c, impulse) {
  c.rag = true; c.ragT = 0;
  for (let i = 0; i < 7; i++) c.prev[i].copy(c.pts[i]).addScaledVector(impulse, -1 / 60 * (i === 2 ? 1.6 : i === 1 ? 1.2 : 0.7));
  c.rest = BONES.map(([a, b]) => [a, b, c.pts[a].distanceTo(c.pts[b])]);
  c.rest.push([2, 1, c.pts[2].distanceTo(c.pts[1])], [3, 4, c.pts[3].distanceTo(c.pts[4]), 0.05], [5, 6, c.pts[5].distanceTo(c.pts[6]), 0.1], [2, 0, c.pts[2].distanceTo(c.pts[0]), 0.08]);
}
function stepRagdoll(c, dt) {  // verlet points + distance springs (stiff for bones, soft for posture) + ground friction
  c.ragT += dt; const p = c.pts, q = c.prev;
  for (let i = 0; i < 7; i++) {
    const vx = (p[i].x - q[i].x) * 0.99, vy = (p[i].y - q[i].y) * 0.99, vz = (p[i].z - q[i].z) * 0.99;
    q[i].copy(p[i]); p[i].x += vx; p[i].y += vy + CFG.g * dt * dt; p[i].z += vz;
  }
  for (let it = 0; it < 6; it++) {
    for (const [a, b, L, k = 1] of c.rest) {
      tv.subVectors(p[b], p[a]); const d = tv.length() || 1e-4, f = ((d - L) / d) * 0.5 * k;
      p[a].addScaledVector(tv, f); p[b].addScaledVector(tv, -f);
    }
    for (let i = 0; i < 7; i++) { const r = i === 2 ? 0.27 : i === 0 || i === 1 ? 0.25 : 0.09; if (p[i].y < r) { p[i].y = r; q[i].x += (p[i].x - q[i].x) * 0.3; q[i].z += (p[i].z - q[i].z) * 0.3; } }
  }
}
function settled(c) { let s = 0; for (let i = 0; i < 7; i++) s += c.pts[i].distanceTo(c.prev[i]); return c.ragT > 0.6 && s < 0.01; }

const player = makeChar(mat.fur, mat.skin); player.face = -1; player.showClub = true;
const bot = makeChar(mat.furB, mat.skinB); bot.face = 1; bot.showClub = true; bot.z = BZ; bot.x = 0;
player.z = PZ;

// ---------- reticle / warning ----------
const reticle = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 20), mat.ring); reticle.renderOrder = 9; scene.add(reticle);
const warn = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16), mat.warn); warn.rotation.x = -Math.PI / 2; scene.add(warn);
const projGeo = new THREE.DodecahedronGeometry(CFG.rockR, 0);
const projs = [];

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
  aim: { on: false, sx: 0, sy: 0, base: new THREE.Vector2(0, 1.3), tgt: new THREE.Vector2(), shown: new THREE.Vector2() },
  bot: { slot: 1, tx: 0, plan: [], dashT: 0, fireT: 0, fired: 0, tgtSlot: 1 }, log: [], ko: null, errors: 0, fps: 0, slowCount: 0 };
window.__T = { G, player, bot, CFG, PX, BX, BZ, cam: camera };

function setPhase(p) { G.phase = p; G.pt = 0; }
function slideTo(i, dur) { i = Math.max(0, Math.min(2, i)); if (i === G.slot && G.slideT >= G.slideDur) return; G.slideFrom = player.x; G.slot = i; G.slideT = 0; G.slideDur = dur; }

function newMatch() {
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
  const mesh = new THREE.Mesh(projGeo, mat.rock2); mesh.position.copy(from); scene.add(mesh);
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
  for (const c of covers) if (Math.abs(pos.x - c.x) < c.hx + CFG.rockR && pos.y < c.hy + CFG.rockR && Math.abs(pos.z - c.z) < c.hz + CFG.rockR) return { res: 'cover' };
  const t = r.owner === 'player' ? bot : player;
  if (t.rag) return null;
  const p = t.pts;
  if (pos.distanceTo(p[2]) < 0.27 + CFG.rockR) return { res: 'head' };
  if (segDist(pos, p[0], p[1]) < 0.27 + CFG.rockR) return { res: 'body' };
  if (segDist(pos, p[0], p[5]) < 0.11 + CFG.rockR || segDist(pos, p[0], p[6]) < 0.11 + CFG.rockR) return { res: 'leg' };
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
    const hit = collide(r, r.pos); if (hit) { impact(r, hit.res); break; }
  }
  r.mesh.position.copy(r.pos); r.mesh.rotation.x += r.spin.x * dt; r.mesh.rotation.y += r.spin.y * dt;
}
function impact(r, res) {
  r.live = false; r.done = performance.now();
  const target = r.owner === 'player' ? bot : player;
  G.log.push({ owner: r.owner, res, predicted: r.pred.res, slow: !!r.wantSlow });
  const v = r.vel.clone(); r.vel.multiplyScalar(-0.25); r.vel.y = 2;
  if (res === 'head' || res === 'body' || res === 'leg') {
    target.hp -= dmg(res); target.flash = 0.25;
    banner(res === 'head' ? 'BONK! HEAD SHOT!' : res === 'leg' ? 'TOE STUBBED!' : 'THWACK!', 1.2);
    if (target.hp <= 0 && !G.ko) { G.ko = target === bot ? 'bot' : 'player'; startRagdoll(target, v.multiplyScalar(0.35).add(new THREE.Vector3(0, 1.5, 0))); }
  } else if (res === 'cover') banner('CLONK!', 0.7);
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
  for (const c of [player, bot]) if (c.flash > 0) c.flash -= dtReal;

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
        launch('bot', new THREE.Vector3(bot.x - 0.4, 2.0, BZ + 0.3), new THREE.Vector3(tx, head ? 1.78 : 1.35, PZ), CFG.botFlight);
      }
    }
    if (b.fired >= CFG.shots && !anyLive && !G.slow && b.fireT < 0.4) { G.round++; if (G.round > CFG.rounds) endMatch(); else startEnemyHide(); }
    else if (b.fired >= CFG.shots && !anyLive) b.fireT -= dt;
  }
  if (G.ko && G.phase !== 'over' && !G.slow) { const c = G.ko === 'bot' ? bot : player; if (settled(c) || c.ragT > 3) endMatch(); }

  // bot motion: slide along its covers, crouched while hiding / while you aim (pops up between dashes)
  if (!bot.rag) {
    const tx = BX[b.slot]; bot.x += clampN(tx - bot.x, -dt * 4, dt * 4);
    const hidden = G.phase === 'enemyHide' || G.phase === 'swap' || G.phase === 'playerHide';
    bot.crouch += ((hidden ? 1 : 0) - bot.crouch) * Math.min(1, dt * 8);
  }
  projs.forEach((r) => stepProj(r, dt));
  for (let i = projs.length - 1; i >= 0; i--) if (!projs[i].live && projs[i].age > 4) { scene.remove(projs[i].mesh); projs.splice(i, 1); }
  for (const c of [player, bot]) { if (c.rag) { const n = Math.ceil(dt / (1 / 120)); for (let i = 0; i < n; i++) stepRagdoll(c, dt / n); } else pose(c); draw(c); }

  // reticle + bot warning marker
  reticle.visible = G.phase === 'aim' && (G.aim.ready || G.aim.on);
  reticle.position.set(G.aim.shown.x, G.aim.shown.y, BZ + 0.2); reticle.lookAt(camera.position);
  warn.visible = G.phase === 'botFire' && b.windup === true; warn.position.set(PX[b.tgtSlot], 0.03, PZ);
  warn.material.opacity = 0.3 + 0.25 * Math.sin(performance.now() / 70);

  // camera: third person behind/above the player; slow-mo zooms onto the target
  const want = new THREE.Vector3(player.x * 0.5, 3.1, 4.8), look = new THREE.Vector3(player.x * 0.2, 1.1, -12);
  let fov = 60;
  if (G.slow) { const f = G.slow.focus.pts[2]; look.copy(f); if (G.slow.focus === player) want.set(f.x + 1.5, 2.6, 3.2); fov = G.slow.focus === bot ? 22 : 45; }
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
