/* Time Toss: duel your way through history. Plain canvas + DOM, no build step, no downloaded assets. */
(function () {
  'use strict';

  // =====================================================================
  // BALANCE: every tunable number for progression, economy and combat.
  // =====================================================================
  var BALANCE = {
    match: { rounds: 5, shots: 3, hide: 5, maxSuddenDeath: 3 },
    // Trophies: +win, -loss (per era index 0..4), era unlock thresholds (index = era).
    // streakBonus[i] = extra trophies for the (i+1)th win in a row; the last value repeats (2nd +5, 3rd +10, 4th+ +15).
    // A loss resets the streak to 0 (a draw leaves it unchanged, no bonus).
    trophies: { win: 25, loss: [10, 10, 15, 15, 15], draw: 0, thresholds: [0, 1000, 2500, 4500, 7000], streakBonus: [0, 5, 10, 15] },
    // Pretend coins (earned only by playing; nothing is ever sold for money). streakBonus works like the trophy one.
    coins: { win: 50, loss: 20, draw: 20, streakBonus: [0, 5, 10, 15] },
    stamina: { drain: 0.2, regen: 0.45, tiredUntil: 0.35 },   // duck stamina per second (1 = full bar)
    player: { baseHealth: 100 },
    headMult: 2,            // head hits do double damage
    // Bot stats per era index, scaled gently by the player's trophies:
    //   health = baseHealth[era] + trophies * healthPerTrophy
    //   damage = baseDamage[era] + trophies * damagePerTrophy   (x headMult on a head hit)
    //   accuracy = min(accMax, baseAcc[era] + trophies * accPerTrophy)  (chance a throw is on target)
    bot: {
      baseHealth: [100, 130, 170, 220, 280], healthPerTrophy: 0.05,
      baseDamage: [14, 18, 22, 28, 34], damagePerTrophy: 0.006,
      baseAcc: [0.5, 0.52, 0.55, 0.58, 0.6], accPerTrophy: 0.00002, accMax: 0.7,
      headShare: 0.15
    },
    // Weapon upgrade levels per era (buy in order; equip any owned). dmg = body damage.
    // steady: extra aim-guide length (share of the arc). reload: throw cooldown multiplier.
    weapons: {
      stone: [
        { id: 'spear0', name: 'Wooden Spear', dmg: 20, cost: 0, tip: '#b07a48', note: 'A pointy stick' },
        { id: 'flint', name: 'Sharp Flint', dmg: 25, cost: 150, tip: '#9aa0ac', note: '+25% damage' },
        { id: 'bonetip', name: 'Bone Tip', dmg: 30, cost: 350, tip: '#f4ecd6', steady: 0.15, note: '+50% damage, longer aim guide' },
        { id: 'obsidian', name: 'Obsidian Spear', dmg: 36, cost: 700, tip: '#3a2a4a', steady: 0.15, reload: 0.7, note: '+80% damage, longer guide, faster throws' }
      ],
      castle: [{ id: 'bow0', name: 'Short Bow', dmg: 22, cost: 0 }, { id: 'longbow', name: 'Longbow', dmg: 28, cost: 400 }, { id: 'crossbow', name: 'Crossbow', dmg: 34, cost: 900, reload: 0.8 }],
      wildwest: [{ id: 'musket0', name: 'Old Musket', dmg: 26, cost: 0 }, { id: 'brass', name: 'Brass Musket', dmg: 32, cost: 600 }, { id: 'cannon', name: 'Mini Cannon', dmg: 40, cost: 1200 }],
      modern: [{ id: 'rifle0', name: 'Scout Rifle', dmg: 30, cost: 0 }, { id: 'scope', name: 'Pro Scope', dmg: 36, cost: 900, steady: 0.3 }, { id: 'marksman', name: 'Marksman Rifle', dmg: 44, cost: 1600 }],
      space: [{ id: 'blaster0', name: 'Ray Blaster', dmg: 34, cost: 0 }, { id: 'plasma', name: 'Plasma Blaster', dmg: 42, cost: 1400 }, { id: 'nova', name: 'Nova Cannon', dmg: 50, cost: 2400, reload: 0.8 }]
    },
    // Outfits per era: hp = extra max health, dmgBonus = extra damage share.
    outfits: {
      stone: [
        { id: 'leaf', name: 'Leaf Wrap', hp: 0, cost: 0, note: 'Breezy!', look: { tunic: '#6fae3a', spot: '#3f7a22', leaf: true } },
        { id: 'tunic', name: 'Animal-Skin Tunic', hp: 20, cost: 120, note: '+20 health', look: { tunic: '#e8962a', spot: '#7a3e16', spots: true } },
        { id: 'mammoth', name: 'Mammoth Fur Cloak', hp: 40, cost: 400, note: '+40 health', look: { tunic: '#e8962a', spot: '#7a3e16', spots: true, cloak: '#7a5236' } },
        { id: 'bonearmor', name: 'Bone Armor', hp: 60, dmgBonus: 0.1, cost: 800, note: '+60 health, +10% damage', look: { tunic: '#b86a2a', spot: '#6a3a16', spots: true, bones: true } }
      ],
      castle: [{ id: 'tabard', name: 'Cloth Tabard', hp: 0, cost: 0 }, { id: 'leather', name: 'Leather Armor', hp: 30, cost: 500 }, { id: 'chain', name: 'Chain Mail', hp: 60, cost: 1100 }],
      wildwest: [{ id: 'vest', name: 'Cowpoke Vest', hp: 0, cost: 0 }, { id: 'piratecoat', name: 'Pirate Coat', hp: 40, cost: 800 }, { id: 'duster', name: 'Iron Duster', hp: 70, dmgBonus: 0.1, cost: 1500 }],
      modern: [{ id: 'fatigues', name: 'Desert Fatigues', hp: 0, cost: 0 }, { id: 'vestplate', name: 'Padded Vest', hp: 50, cost: 1200 }, { id: 'ghillie', name: 'Ghillie Suit', hp: 80, cost: 2000 }],
      space: [{ id: 'jumpsuit', name: 'Jumpsuit', hp: 0, cost: 0 }, { id: 'spacesuit', name: 'Space Suit', hp: 60, cost: 1800 }, { id: 'mech', name: 'Mech Armor', hp: 100, dmgBonus: 0.1, cost: 3000 }]
    }
  };

  // =====================================================================
  // ERAS: per-era scene, weapon physics, cover, bot. Only built:true is playable.
  // =====================================================================
  var ERAS = [
    { id: 'stone', name: 'Stone Age', weapon: 'Spear', built: true, scene: 'canyon',
      cover: { kind: 'rock', tall: 0.8, low: 0.8, halfW: 1.2 },
      shot: { kind: 'arc', speed: 7.6, g: 5, guide: 0.55, len: 0.9, cool: 0.6, ring: true },
      aimTime: 8, botTime: 8.5, dist: [8, 10], lane: [-0.2, 2.6], agility: 0.4,
      bot: { name: 'Ugga Bunga', look: 'caveman', tell: 'windup', flight: 0.75 },
      player: { outfit: 'cave' }, ammo: 'spear',
      hints: { aim: 'Hold, aim above him, let go to throw', bot: 'Hold DUCK when he winds up!' } },
    { id: 'castle', name: 'Castle', weapon: 'Bow & arrows', built: false, scene: 'castle',
      cover: { kind: 'haystack', tall: 1.0, low: 1.0, halfW: 1.1 },
      shot: { kind: 'arc', speed: 16, g: 7, guide: 0.35, len: 0.8, cool: 0.5 },
      aimTime: 7, botTime: 8, dist: [11, 14], agility: 0.55,
      bot: { name: 'Sir Wobblebottom', look: 'knight', tell: 'windup', flight: 0.6 }, player: { outfit: 'knight' }, ammo: 'arrow',
      hints: { aim: 'Aim a little above, let go to shoot', bot: 'Hold DUCK when he draws!' } },
    { id: 'wildwest', name: 'Wild West', weapon: 'Musket', built: false, scene: 'saloon',
      cover: { kind: 'barrel', tall: 1.0, low: 1.0, halfW: 0.6 },
      shot: { kind: 'arc', speed: 40, g: 3, guide: 0.2, len: 0.2, cool: 1.2 },
      aimTime: 7, botTime: 7.5, dist: [12, 15], agility: 0.65,
      bot: { name: 'Dusty Pete', look: 'bandit', tell: 'glint', flight: 0.3 }, player: { outfit: 'cowpoke' }, ammo: 'ball',
      hints: { aim: 'Nearly straight shots, slow reload', bot: 'Hold DUCK when you see the glint!' } },
    { id: 'modern', name: 'Desert Ops', weapon: 'Scoped rifle', built: false, scene: 'desert',
      cover: { kind: 'halftone', tall: 2.3, low: 0.6, halfW: 1.3 },
      shot: { kind: 'hitscan', zoom: 2.3, sens: 1.25, cool: 0.45 },
      aimTime: 7, botTime: 7.5, dist: [8.6, 10.6], agility: 0.8,
      bot: { name: 'Sgt. Cactus', look: 'cactus', tell: 'glint', flight: 0 }, player: { outfit: 'modern' }, ammo: 'bullet',
      hints: { aim: 'Drag to aim · hold to zoom · let go to fire', bot: 'Hold DUCK when you see the glint!' } },
    { id: 'space', name: 'Moon Base', weapon: 'Laser blaster', built: false, scene: 'moon',
      cover: { kind: 'shield', tall: 1.2, low: 1.2, halfW: 1.0, blockChance: 0.3 },
      shot: { kind: 'hitscan', zoom: 1.6, sens: 1.1, cool: 0.35 },
      aimTime: 6, botTime: 7, dist: [10, 13], agility: 0.9,
      bot: { name: 'Zorp', look: 'alien', tell: 'glint', flight: 0 }, player: { outfit: 'space' }, ammo: 'cell',
      hints: { aim: 'Instant laser! Watch his shield', bot: 'Hold DUCK when his blaster glows!' } }
  ];
  var ERA_BY_ID = {}; ERAS.forEach(function (e, i) { e.idx = i; ERA_BY_ID[e.id] = e; });

  var $ = function (id) { return document.getElementById(id); };
  var app = $('app'), cv = $('cv'), ctx = cv.getContext('2d');
  var CAM_H = 1.3;

  // ---------- seeded RNG (mulberry32) ----------
  var seedState = 0;
  function setSeed(n) { seedState = (n >>> 0) || 1; }
  function rnd() {
    seedState = (seedState + 0x6D2B79F5) >>> 0;
    var t = seedState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rr(a, b) { return a + (b - a) * rnd(); }
  var qs = new URLSearchParams(location.search);
  setSeed(qs.has('seed') ? parseInt(qs.get('seed'), 10) : (Date.now() ^ (Math.random() * 1e9)));
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function approach(v, t, d) { return v < t ? Math.min(t, v + d) : Math.max(t, v - d); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t) * (1 - t); }
  var CFG = { shots: BALANCE.match.shots, rounds: BALANCE.match.rounds, hide: BALANCE.match.hide, drain: BALANCE.stamina.drain, regen: BALANCE.stamina.regen, tiredUntil: BALANCE.stamina.tiredUntil };

  // =====================================================================
  // SAVE (versioned key, safe parsing, atomic writes)
  // =====================================================================
  var SAVE_KEY = 'timetoss_save_v1';
  var failWrites = false, saveWasCorrupt = false;
  function allIds(kind) { var o = {}; Object.keys(BALANCE[kind]).forEach(function (era) { BALANCE[kind][era].forEach(function (it) { o[it.id] = { era: era, item: it }; }); }); return o; }
  var WEAPON_IDS = allIds('weapons'), OUTFIT_IDS = allIds('outfits');
  function defaultSave() {
    var s = { v: 1, trophies: 0, unlocked: 0, coins: 0, owned: { weapons: [], outfits: [] }, equip: { weapons: {}, outfits: {} },
      stats: { matches: 0, wins: 0, losses: 0, draws: 0 }, streak: 0, bestStreak: 0, muted: false, last: 'stone' };
    ['weapons', 'outfits'].forEach(function (k) {
      Object.keys(BALANCE[k]).forEach(function (era) {
        BALANCE[k][era].forEach(function (it) { if (it.cost === 0) s.owned[k].push(it.id); });
        s.equip[k][era] = BALANCE[k][era][0].id;
      });
    });
    return s;
  }
  function num(x, lo, hi, def) { return (typeof x === 'number' && isFinite(x)) ? clamp(Math.floor(x), lo, hi) : def; }
  function sanitize(o) {
    if (!o || typeof o !== 'object' || o.v !== 1) return null;
    var d = defaultSave(), th = BALANCE.trophies.thresholds;
    d.coins = num(o.coins, 0, 1e7, 0);
    // Unlocks are derived from trophies (never trusted from the stored field); the era floor keeps them consistent.
    d.trophies = num(o.trophies, 0, 1e7, 0); d.unlocked = 0;
    for (var i = th.length - 1; i > 0; i--) if (d.trophies >= th[i]) { d.unlocked = i; break; }
    ['weapons', 'outfits'].forEach(function (k) {
      var ids = k === 'weapons' ? WEAPON_IDS : OUTFIT_IDS;
      if (o.owned && Array.isArray(o.owned[k])) o.owned[k].forEach(function (id) { if (ids[id] && d.owned[k].indexOf(id) < 0) d.owned[k].push(id); });
      if (o.equip && o.equip[k] && typeof o.equip[k] === 'object') Object.keys(d.equip[k]).forEach(function (era) {
        var id = o.equip[k][era]; if (ids[id] && ids[id].era === era && d.owned[k].indexOf(id) >= 0) d.equip[k][era] = id;
      });
    });
    if (o.stats && typeof o.stats === 'object') ['matches', 'wins', 'losses', 'draws'].forEach(function (k) { d.stats[k] = num(o.stats[k], 0, 1e7, 0); });
    d.streak = num(o.streak, 0, 1e6, 0); d.bestStreak = Math.max(d.streak, num(o.bestStreak, 0, 1e6, 0));
    d.muted = o.muted === true;
    d.last = ERA_BY_ID[o.last] ? o.last : 'stone';
    return d;
  }
  function loadSave() {
    var raw = null; saveWasCorrupt = false;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return defaultSave(); }
    if (raw == null) return defaultSave();
    var o = null; try { o = JSON.parse(raw); } catch (e) { o = null; }
    var s = sanitize(o);
    if (!s) {
      saveWasCorrupt = true;
      try { localStorage.setItem(SAVE_KEY + '_bad', String(raw).slice(0, 5000)); } catch (e) {}
      s = defaultSave(); writeSave(s);
    }
    return s;
  }
  function writeSave(s) {
    if (failWrites) return false;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
  }
  function cloneSave(s) { return JSON.parse(JSON.stringify(s)); }
  var SAVE = loadSave();
  // Apply a trophy change with the 0 clamp and the era floor. Returns the new save copy (not yet written).
  function withTrophies(s, delta) {
    var n = cloneSave(s), th = BALANCE.trophies.thresholds;
    n.trophies = Math.max(0, n.trophies + delta);
    for (var i = th.length - 1; i > 0; i--) if (n.trophies >= th[i]) { n.unlocked = Math.max(n.unlocked, i); break; }
    n.trophies = Math.max(n.trophies, th[n.unlocked]);
    return n;
  }
  function streakPick(arr, streak) { return streak <= 0 ? 0 : arr[Math.min(streak, arr.length) - 1]; }
  // Match reward: returns { save (new copy, unwritten), trophyBase, streakBonus, delta (actual), coins, coinBonus, streak, unlockedNew }
  function matchReward(s, era, result) {
    var B = BALANCE, n, base = 0, bonus = 0, coins = 0, cb = 0, streak = s.streak;
    if (result === 'win') { streak = s.streak + 1; base = B.trophies.win; bonus = streakPick(B.trophies.streakBonus, streak); coins = B.coins.win; cb = streakPick(B.coins.streakBonus, streak); }
    else if (result === 'lose') { streak = 0; base = -B.trophies.loss[era.idx]; coins = B.coins.loss; }
    else { base = B.trophies.draw; coins = B.coins.draw; }
    n = withTrophies(s, base + bonus);
    n.coins = s.coins + coins + cb; n.streak = streak; n.bestStreak = Math.max(s.bestStreak, streak);
    n.stats.matches++; if (result === 'win') n.stats.wins++; else if (result === 'lose') n.stats.losses++; else n.stats.draws++;
    n.last = era.id;
    return { save: n, trophyBase: base, streakBonus: bonus, delta: n.trophies - s.trophies, coins: coins, coinBonus: cb, streak: streak,
      from: s.trophies, to: n.trophies, unlockedNew: n.unlocked > s.unlocked ? ERAS[n.unlocked] : null, floored: (s.trophies + base + bonus) < n.trophies };
  }
  function isUnlocked(i) { return i <= SAVE.unlocked; }
  function nextEraInfo(t, unlocked) {
    var th = BALANCE.trophies.thresholds;
    if (unlocked >= ERAS.length - 1) return null;
    var i = unlocked + 1;
    return { era: ERAS[i], need: th[i], from: th[unlocked], left: Math.max(0, th[i] - t), frac: clamp((t - th[unlocked]) / (th[i] - th[unlocked]), 0, 1) };
  }

  // ---------- gear lookups ----------
  function weaponOf(era) { var id = SAVE.equip.weapons[era.id]; return BALANCE.weapons[era.id].filter(function (w) { return w.id === id; })[0] || BALANCE.weapons[era.id][0]; }
  function outfitOf(era) { var id = SAVE.equip.outfits[era.id]; return BALANCE.outfits[era.id].filter(function (w) { return w.id === id; })[0] || BALANCE.outfits[era.id][0]; }
  function playerDamage(head) { var w = weaponOf(G.era), o = outfitOf(G.era); return Math.round(w.dmg * (1 + (o.dmgBonus || 0)) * (head ? BALANCE.headMult : 1)); }
  function playerMaxHp() { return BALANCE.player.baseHealth + (outfitOf(G.era).hp || 0); }
  function botStats(era, trophies) {
    var b = BALANCE.bot, i = era.idx;
    return { hp: Math.round(b.baseHealth[i] + trophies * b.healthPerTrophy), dmg: Math.round(b.baseDamage[i] + trophies * b.damagePerTrophy),
      acc: Math.min(b.accMax, b.baseAcc[i] + trophies * b.accPerTrophy), head: b.headShare };
  }
  function guideLen() { return G.era.shot.guide + (weaponOf(G.era).steady || 0); }
  function coolTime() { return (G.era.shot.cool || 0.5) * (weaponOf(G.era).reload || 1); }

  // ---------- layout ----------
  var W = 390, H = 844, DPR = 1, CX = 195, Y0 = 440, FOC = 430, PX = 90, PY = 830, PS = 1;
  function proj(wx, wy, z) { var s = FOC / z; return { x: CX + wx * s, y: Y0 + (CAM_H - wy) * s, s: s }; }

  // ---------- state ----------
  var G = {
    era: ERAS[0], phase: 'menu', pt: 0, time: 0, ts: 1, paused: false,
    round: 1, sudden: 0, hpP: 100, hpB: 100, maxP: 100, maxB: 100, dmgP: 0, dmgB: 0, bot: botStats(ERAS[0], 0),
    shotsP: 3, shotsB: 3, countNum: 0, timeLeft: 0, cool: 0, endT: 0, ending: false, timeUp: false, ko: null,
    aim: { x: 195, y: 400 }, aiming: false, hover: null, pointerId: null, pressT: 0, last: null,
    scope: 0, scopeTarget: 0, scopeHold: 0,
    enemy: { baseWx: 0.5, z: 9, wx: 0.5, tx: 0.5, duck: 0, duckTarget: 0, duckT: 0, actT: 0, flash: 0, hitT: 0, hatOff: 0, pose: 0, dizzy: 0 },
    coverH: 0.8, coverFrom: 0.8, coverTo: 0.8, coverT: 1,
    player: { duck: 0, stam: 1, tired: false, flash: 0, recoil: 0, hitT: 0 },
    pcH: 0, duckHeld: false, keyDuck: false, btnDuck: false, ptrDuck: false,
    botShots: [], tell: 0, botForce: null, proj: [], stuck: [], botSpears: [], nearStuck: [],
    fx: [], shake: 0, freeze: false,
    lastShot: null, shotLog: [], botLog: [], roundGain: { p: 0, b: 0 },
    stats: { shots: 0, hits: 0, heads: 0, dodges: 0, botHits: 0 },
    result: null, lastReward: null
  };
  // ---------- audio (WebAudio synth; resumes on first gesture for iOS) ----------
  var actx = null, master = null, noiseBuf = null;
  var muted = SAVE.muted;
  function audio() {
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(actx.destination);
        noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.6, actx.sampleRate);
        var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { actx = null; }
    }
    if (actx && actx.state !== 'running') { try { var p = actx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  }
  function tone(f, dur, type, vol, f2, delay) {
    if (!actx || muted || actx.state !== 'running') return;
    var t0 = actx.currentTime + (delay || 0);
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, fc, delay) {
    if (!actx || muted || actx.state !== 'running' || !noiseBuf) return;
    var t0 = actx.currentTime + (delay || 0);
    var s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = fc || 1200;
    g.gain.setValueAtTime(vol || 0.3, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.02);
  }
  var sfx = {
    beep: function (last) { tone(last ? 880 : 560, 0.13, 'square', 0.12); },
    go: function () { tone(660, 0.1, 'square', 0.12); tone(990, 0.18, 'square', 0.12, null, 0.1); },
    shot: function () { noise(0.22, 0.5, 2200); tone(140, 0.14, 'sine', 0.35, 45); },
    pop: function () { tone(320, 0.14, 'sine', 0.35, 980); noise(0.06, 0.2, 5000); },
    head: function () { tone(320, 0.12, 'sine', 0.35, 980); tone(1250, 0.2, 'triangle', 0.2, 1700, 0.08); },
    puff: function () { noise(0.35, 0.22, 650); },
    ding: function () { tone(1500, 0.12, 'triangle', 0.16); tone(1900, 0.1, 'triangle', 0.1, null, 0.05); },
    glint: function () { tone(2300, 0.07, 'sine', 0.09); tone(3000, 0.08, 'sine', 0.07, null, 0.08); },
    ouch: function () { tone(520, 0.28, 'sawtooth', 0.12, 180); },
    whoosh: function () { noise(0.35, 0.18, 500); },
    throw: function () { noise(0.28, 0.25, 1400); tone(420, 0.22, 'sine', 0.12, 160); },
    bonk: function () { tone(240, 0.12, 'square', 0.14, 520); tone(700, 0.1, 'sine', 0.2, 1100, 0.05); },
    clonk: function () { tone(170, 0.14, 'triangle', 0.3, 120); noise(0.08, 0.2, 2500); },
    thud: function () { noise(0.25, 0.3, 380); },
    coin: function () { tone(1300, 0.08, 'square', 0.08); tone(1750, 0.12, 'square', 0.08, null, 0.07); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.18, null, i * 0.12); }); },
    lose: function () { [494, 440, 392, 330].forEach(function (f, i) { tone(f, 0.26, 'triangle', 0.16, null, i * 0.16); }); }
  };
  function setMuted(m) {
    muted = m; SAVE.muted = m; writeSave(SAVE);
    if (master) master.gain.value = m ? 0 : 0.6;
    $('muteBtn').textContent = m ? '🔇' : '🔊';
  }

  // ---------- scenes (cached background; redrawn as vectors inside a scope) ----------
  var bg = document.createElement('canvas'), bgc = bg.getContext('2d');
  var props = [], clouds = [];
  function buildScenery() {
    var s0 = seedState; setSeed(7);
    props = []; clouds = [];
    if (G.era.scene === 'desert') {
      props = [
        { t: 'palm', wx: -4.6, z: 13 }, { t: 'palm', wx: -3.2, z: 27 }, { t: 'palm', wx: 5.4, z: 21 },
        { t: 'palm', wx: 1.6, z: 95 }, { t: 'palm', wx: -1.2, z: 75 }, { t: 'palm', wx: 9, z: 60 },
        { t: 'cactus', wx: 4.2, z: 10.5 }, { t: 'cactus', wx: -3.0, z: 32 }, { t: 'cactus', wx: 2.6, z: 42 },
        { t: 'cactus', wx: 7, z: 46 }, { t: 'cactus', wx: -7.5, z: 40 }, { t: 'cactus', wx: 0.4, z: 64 },
        { t: 'cactus', wx: -5.2, z: 17 }, { t: 'cactus', wx: 6.2, z: 30 }
      ];
      for (var i = 0; i < 16; i++) props.push({ t: rnd() < 0.5 ? 'bush' : 'rock', wx: rr(-12, 12), z: rr(22, 90) });
    } else {
      props = [
        { t: 'cycad', wx: -4.0, z: 11 }, { t: 'cycad', wx: 4.6, z: 12.5 }, { t: 'cycad', wx: -2.6, z: 24 }, { t: 'cycad', wx: 3.2, z: 28 },
        { t: 'cycad', wx: 6.5, z: 38 }, { t: 'cycad', wx: -6, z: 34 }, { t: 'fern', wx: -3.3, z: 7.5 }, { t: 'fern', wx: 4.1, z: 8.2 },
        { t: 'fern', wx: 2.2, z: 18 }, { t: 'fern', wx: -1.6, z: 30 }
      ];
      for (var j = 0; j < 14; j++) props.push({ t: 'boulder', wx: rr(-10, 10), z: rr(16, 70) });
    }
    props.sort(function (a, b) { return b.z - a.z; });
    for (var k = 0; k < 8; k++) clouds.push({ x: rr(-0.2, 1.1), y: rr(0.08, 0.75), w: rr(0.35, 0.8), h: rr(0.035, 0.07), k: k % 3 });
    setSeed(s0);
  }
  function drawClouds(c, cols) {
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i], x = cl.x * W, y = cl.y * Y0, w = cl.w * W, h = cl.h * H;
      c.fillStyle = cols[cl.y < 0.35 ? 0 : cl.y < 0.6 ? 1 : 2];
      c.beginPath();
      c.ellipse(x, y, w * 0.5, h * 0.45, 0, 0, 7);
      c.ellipse(x - w * 0.18, y - h * 0.3, w * 0.22, h * 0.45, 0, 0, 7);
      c.ellipse(x + w * 0.12, y - h * 0.35, w * 0.26, h * 0.55, 0, 0, 7);
      c.fill();
    }
  }
  function drawBoulder(c, x, y, s, w, h, col, col2) {
    var hw = w * s / 2, hh = h * s;
    c.fillStyle = 'rgba(120,50,40,.28)'; c.beginPath(); c.ellipse(x + hw * 0.1, y, hw * 1.1, hh * 0.18, 0, 0, 7); c.fill();
    c.fillStyle = col; c.beginPath(); c.moveTo(x - hw, y);
    c.bezierCurveTo(x - hw * 1.02, y - hh * 0.7, x - hw * 0.55, y - hh * 1.04, x - hw * 0.05, y - hh);
    c.bezierCurveTo(x + hw * 0.45, y - hh * 1.06, x + hw * 1.0, y - hh * 0.75, x + hw, y); c.closePath(); c.fill();
    c.fillStyle = col2; c.beginPath(); c.moveTo(x + hw * 0.1, y);
    c.bezierCurveTo(x + hw * 0.4, y - hh * 0.5, x + hw * 0.6, y - hh * 0.85, x + hw * 0.45, y - hh * 0.98);
    c.bezierCurveTo(x + hw * 0.85, y - hh * 0.8, x + hw * 1.0, y - hh * 0.5, x + hw, y); c.closePath(); c.fill();
  }
  function drawCycad(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(120,50,40,.25)'; c.beginPath(); c.ellipse(0.1, 0, 0.6, 0.1, 0, 0, 7); c.fill();
    c.fillStyle = '#8a5a3a'; c.beginPath(); c.moveTo(-0.18, 0); c.lineTo(-0.13, -1.0); c.lineTo(0.13, -1.0); c.lineTo(0.18, 0); c.closePath(); c.fill();
    c.strokeStyle = '#6e4428'; c.lineWidth = 0.035; c.beginPath();
    for (var i = 1; i < 5; i++) { c.moveTo(-0.16, -i * 0.2); c.lineTo(0.16, -i * 0.2 + 0.08); }
    c.stroke();
    var fr = [[-1.3, 0.2], [-1.0, -0.5], [-0.35, -0.9], [0.35, -0.9], [1.0, -0.5], [1.3, 0.2]];
    for (var j = 0; j < fr.length; j++) {
      var lx = fr[j][0], ly = fr[j][1];
      c.strokeStyle = j % 2 ? '#3f8f3a' : '#56a844'; c.lineWidth = 0.16; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -1.05); c.quadraticCurveTo(lx * 0.5, -1.05 + ly - 0.4, lx, -1.05 + ly + 0.35); c.stroke();
    }
    c.restore();
  }
  function drawFern(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round';
    for (var i = -3; i <= 3; i++) {
      c.strokeStyle = i % 2 ? '#4f9a3c' : '#62b24a'; c.lineWidth = 0.1;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(i * 0.12, -0.5, i * 0.22, -0.55 + Math.abs(i) * 0.08); c.stroke();
    }
    c.restore();
  }
  function ptero(c, x, y, k) {
    c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = 'rgba(58,30,74,.75)';
    c.beginPath(); c.moveTo(-26, -6); c.quadraticCurveTo(-12, -10, -3, 2); c.lineTo(0, 0); c.lineTo(3, 2); c.quadraticCurveTo(12, -10, 26, -6); c.quadraticCurveTo(12, -2, 2, 6); c.lineTo(-2, 6); c.quadraticCurveTo(-12, -2, -26, -6); c.fill();
    c.beginPath(); c.moveTo(0, 1); c.lineTo(11, -2); c.lineTo(1, 4); c.fill();
    c.restore();
  }
  function drawCanyon(c) {
    var g = c.createLinearGradient(0, 0, 0, Y0);
    g.addColorStop(0, '#2f1f6e'); g.addColorStop(0.3, '#6a2c8a'); g.addColorStop(0.58, '#c24a86'); g.addColorStop(0.82, '#f5775a'); g.addColorStop(1, '#ffc36a');
    c.fillStyle = g; c.fillRect(-W, -H, W * 3, Y0 + H + 1);
    var sx = CX - W * 0.06;
    var sg = c.createRadialGradient(sx, Y0, 0, sx, Y0, W * 0.6);
    sg.addColorStop(0, 'rgba(255,225,130,.85)'); sg.addColorStop(0.3, 'rgba(255,170,100,.35)'); sg.addColorStop(1, 'rgba(255,140,120,0)');
    c.fillStyle = sg; c.fillRect(sx - W * 0.6, Y0 - W * 0.6, W * 1.2, W * 0.6);
    c.fillStyle = '#ffe08a'; c.beginPath(); c.arc(sx, Y0, W * 0.09, Math.PI, 0); c.fill();
    drawClouds(c, ['rgba(70,40,130,.5)', 'rgba(150,60,150,.4)', 'rgba(240,120,120,.4)']);
    ptero(c, W * 0.7, H * 0.2, 1); ptero(c, W * 0.82, H * 0.245, 0.65); ptero(c, W * 0.2, H * 0.3, 0.5);
    // volcano + smoke
    c.fillStyle = '#9a4a6a'; c.beginPath(); c.moveTo(W * 0.54, Y0 + 1); c.lineTo(W * 0.64, Y0 - H * 0.085); c.lineTo(W * 0.7, Y0 - H * 0.085); c.lineTo(W * 0.82, Y0 + 1); c.fill();
    c.fillStyle = '#ff9a4a'; c.beginPath(); c.ellipse(W * 0.67, Y0 - H * 0.085, W * 0.03, H * 0.006, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(210,160,190,.55)';
    [[0.66, 0.1, 0.022], [0.64, 0.118, 0.03], [0.61, 0.138, 0.038], [0.575, 0.158, 0.045]].forEach(function (p) { c.beginPath(); c.arc(W * p[0], Y0 - H * p[1], W * p[2], 0, 7); c.fill(); });
    // far buttes
    c.fillStyle = '#d27a7a';
    c.beginPath(); c.moveTo(W * 0.26, Y0 + 1); c.lineTo(W * 0.3, Y0 - H * 0.04); c.lineTo(W * 0.44, Y0 - H * 0.04); c.lineTo(W * 0.47, Y0 + 1); c.fill();
    c.beginPath(); c.moveTo(W * 0.78, Y0 + 1); c.lineTo(W * 0.8, Y0 - H * 0.025); c.lineTo(W * 0.9, Y0 - H * 0.025); c.lineTo(W * 0.93, Y0 + 1); c.fill();
    // ground
    var gg = c.createLinearGradient(0, Y0, 0, H);
    gg.addColorStop(0, '#f7b77e'); gg.addColorStop(0.2, '#eca06a'); gg.addColorStop(1, '#d47c4c');
    c.fillStyle = gg; c.fillRect(-W, Y0, W * 3, H * 2);
    c.fillStyle = 'rgba(255,210,160,.3)';
    c.beginPath(); c.ellipse(W * 0.5, Y0 + H * 0.06, W * 0.5, H * 0.025, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(W * 0.75, Y0 + H * 0.3, W * 0.6, H * 0.04, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(170,80,50,.16)';
    c.beginPath(); c.ellipse(W * 0.3, Y0 + H * 0.17, W * 0.6, H * 0.04, 0.05, 0, 7); c.fill();
    c.beginPath(); c.ellipse(W * 0.1, Y0 + H * 0.38, W * 0.55, H * 0.05, 0.08, 0, 7); c.fill();
    var hz = c.createLinearGradient(0, Y0 - 10, 0, Y0 + 24);
    hz.addColorStop(0, 'rgba(255,200,150,0)'); hz.addColorStop(0.4, 'rgba(255,205,150,.5)'); hz.addColorStop(1, 'rgba(255,200,150,0)');
    c.fillStyle = hz; c.fillRect(-W, Y0 - 10, W * 3, 34);
    // canyon walls (layered sandstone)
    function wall(pts, face) {
      c.save(); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath();
      c.fillStyle = '#c9633f'; c.fill(); c.clip();
      var bands = ['#d9774c', '#b5553a', '#e8905e', '#c25f40', '#dd8254'];
      for (var b = 0; b < 16; b++) { c.fillStyle = bands[b % bands.length]; c.fillRect(-W, H * 0.1 + b * H * 0.035, W * 3, H * 0.018); }
      c.fillStyle = 'rgba(90,30,40,.25)'; c.beginPath(); c.moveTo(face[0][0], face[0][1]); for (var j = 1; j < face.length; j++) c.lineTo(face[j][0], face[j][1]); c.closePath(); c.fill();
      c.restore();
    }
    wall([[-10, H * 0.12], [W * 0.07, H * 0.14], [W * 0.12, H * 0.22], [W * 0.17, H * 0.3], [W * 0.19, Y0 - H * 0.07], [W * 0.215, Y0 + 3], [W * 0.05, Y0 + H * 0.12], [-10, Y0 + H * 0.16]],
      [[W * 0.12, H * 0.22], [W * 0.17, H * 0.3], [W * 0.19, Y0 - H * 0.07], [W * 0.215, Y0 + 3], [W * 0.14, Y0 + H * 0.05], [W * 0.1, H * 0.3]]);
    wall([[W + 10, H * 0.16], [W * 0.93, H * 0.18], [W * 0.88, H * 0.27], [W * 0.84, H * 0.36], [W * 0.82, Y0 - H * 0.05], [W * 0.8, Y0 + 3], [W * 0.95, Y0 + H * 0.1], [W + 10, Y0 + H * 0.13]],
      [[W * 0.88, H * 0.27], [W * 0.84, H * 0.36], [W * 0.82, Y0 - H * 0.05], [W * 0.8, Y0 + 3], [W * 0.86, Y0 + H * 0.04], [W * 0.9, H * 0.34]]);
    for (var k = 0; k < props.length; k++) {
      var p = props[k], q = proj(p.wx, 0, p.z);
      if (q.x < -W * 0.5 || q.x > W * 1.5) continue;
      if (p.t === 'cycad') drawCycad(c, q.x, q.y, q.s);
      else if (p.t === 'fern') drawFern(c, q.x, q.y, q.s);
      else drawBoulder(c, q.x, q.y, q.s, 0.9, 0.45, '#b58a6e', '#94705a');
    }
  }
  function mesa(c, x0, x1, top, col) {
    var hgt = Y0 - top, r = Math.min((x1 - x0) * 0.22, hgt * 1.2);
    c.fillStyle = col; c.beginPath(); c.moveTo(x0, Y0 + 2);
    c.bezierCurveTo(x0 + r * 0.3, top + hgt * 0.35, x0 + r * 0.4, top, x0 + r * 1.3, top);
    c.lineTo(x1 - r * 1.3, top);
    c.bezierCurveTo(x1 - r * 0.4, top, x1 - r * 0.3, top + hgt * 0.35, x1, Y0 + 2);
    c.closePath(); c.fill();
  }
  function drawSaguaro(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(150,50,70,.28)'; c.beginPath(); c.ellipse(0.15, 0, 0.5, 0.1, 0, 0, 7); c.fill();
    c.lineCap = 'round';
    c.strokeStyle = '#3f9a5c'; c.lineWidth = 0.36;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -2.3); c.stroke();
    c.lineWidth = 0.24;
    c.beginPath(); c.moveTo(0, -1.0); c.lineTo(-0.5, -1.0); c.lineTo(-0.5, -1.7); c.stroke();
    c.beginPath(); c.moveTo(0, -1.3); c.lineTo(0.45, -1.3); c.lineTo(0.45, -1.9); c.stroke();
    c.strokeStyle = '#2f7d49'; c.lineWidth = 0.1;
    c.beginPath(); c.moveTo(0.1, -0.1); c.lineTo(0.1, -2.25); c.stroke();
    c.restore();
  }
  function drawPalm(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(150,50,70,.25)'; c.beginPath(); c.ellipse(0.3, 0, 0.8, 0.12, 0, 0, 7); c.fill();
    c.strokeStyle = '#8a5a3c'; c.lineWidth = 0.22; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(0.5, -2.5, 0.2, -4.6); c.stroke();
    var fx = 0.2, fy = -4.6;
    var leaves = [[-2.0, 0.6], [-1.3, -0.5], [0, -0.9], [1.3, -0.5], [2.0, 0.6], [-0.7, 0.9], [0.8, 0.9]];
    for (var i = 0; i < leaves.length; i++) {
      var lx = leaves[i][0], ly = leaves[i][1];
      c.fillStyle = i % 2 ? '#2f8f5a' : '#3fae6a';
      c.beginPath(); c.moveTo(fx, fy);
      c.quadraticCurveTo(fx + lx * 0.5, fy + ly * 0.5 - 0.6, fx + lx, fy + ly + 0.3);
      c.quadraticCurveTo(fx + lx * 0.5, fy + ly * 0.5 - 0.1, fx, fy);
      c.fill();
    }
    c.restore();
  }
  function drawBush(c, x, y, s, rock) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (rock) {
      c.fillStyle = '#b9585f'; c.beginPath(); c.ellipse(0, -0.2, 0.7, 0.32, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#a24a55'; c.beginPath(); c.ellipse(0.2, -0.12, 0.45, 0.2, 0, Math.PI, 0); c.fill();
    } else {
      c.fillStyle = '#9a4a5a';
      c.beginPath(); c.arc(-0.25, -0.2, 0.28, 0, 7); c.arc(0.1, -0.32, 0.32, 0, 7); c.arc(0.4, -0.18, 0.24, 0, 7); c.fill();
      c.fillStyle = '#6f8a4a'; c.beginPath(); c.arc(0.05, -0.36, 0.16, 0, 7); c.fill();
    }
    c.restore();
  }
  function drawDesert(c) {
    // sky
    var g = c.createLinearGradient(0, 0, 0, Y0);
    g.addColorStop(0, '#2a1d66'); g.addColorStop(0.28, '#4d2a88'); g.addColorStop(0.52, '#8a3596');
    g.addColorStop(0.74, '#cf4d8c'); g.addColorStop(0.9, '#f47a6c'); g.addColorStop(1, '#ffb35c');
    c.fillStyle = g; c.fillRect(-W, -H, W * 3, Y0 + H + 1);
    // sun + glow
    var sx = CX + W * 0.03;
    var sg = c.createRadialGradient(sx, Y0, 0, sx, Y0, W * 0.6);
    sg.addColorStop(0, 'rgba(255,225,130,.8)'); sg.addColorStop(0.25, 'rgba(255,170,110,.35)'); sg.addColorStop(1, 'rgba(255,140,120,0)');
    c.fillStyle = sg; c.fillRect(sx - W * 0.6, Y0 - W * 0.6, W * 1.2, W * 0.6);
    c.fillStyle = '#ffe68a'; c.beginPath(); c.arc(sx, Y0, W * 0.075, Math.PI, 0); c.fill();
    // clouds
    var ccol = ['rgba(70,40,130,.55)', 'rgba(140,60,160,.45)', 'rgba(230,110,150,.4)'];
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i], x = cl.x * W, y = cl.y * Y0, w = cl.w * W, h = cl.h * H;
      c.fillStyle = ccol[cl.y < 0.35 ? 0 : cl.y < 0.6 ? 1 : 2];
      c.beginPath();
      c.ellipse(x, y, w * 0.5, h * 0.45, 0, 0, 7);
      c.ellipse(x - w * 0.18, y - h * 0.3, w * 0.22, h * 0.45, 0, 0, 7);
      c.ellipse(x + w * 0.12, y - h * 0.35, w * 0.26, h * 0.55, 0, 0, 7);
      c.fill();
    }
    // mesas
    mesa(c, W * 0.30, W * 0.52, Y0 - H * 0.012, '#ec959c');
    mesa(c, W * 0.60, W * 0.74, Y0 - H * 0.016, '#ec959c');
    mesa(c, -W * 0.08, W * 0.36, Y0 - H * 0.05, '#dc6f7e');
    mesa(c, W * 0.70, W * 1.06, Y0 - H * 0.04, '#dc6f7e');
    mesa(c, W * 0.46, W * 0.58, Y0 - H * 0.01, '#e27c86');
    // ground
    var gg = c.createLinearGradient(0, Y0, 0, H);
    gg.addColorStop(0, '#f6ab92'); gg.addColorStop(0.18, '#ec8d84'); gg.addColorStop(1, '#dc6e74');
    c.fillStyle = gg; c.fillRect(-W, Y0, W * 3, H * 2);
    // soft dunes
    c.fillStyle = 'rgba(255,190,160,.35)';
    c.beginPath(); c.ellipse(W * 0.2, Y0 + H * 0.05, W * 0.6, H * 0.03, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(W * 0.85, Y0 + H * 0.1, W * 0.5, H * 0.035, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(190,80,95,.18)';
    c.beginPath(); c.ellipse(W * 0.7, Y0 + H * 0.2, W * 0.7, H * 0.05, -0.05, 0, 7); c.fill();
    c.beginPath(); c.ellipse(W * 0.05, Y0 + H * 0.33, W * 0.6, H * 0.06, 0.08, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,200,170,.22)';
    c.beginPath(); c.ellipse(W * 0.6, Y0 + H * 0.4, W * 0.55, H * 0.04, 0, 0, 7); c.fill();
    // horizon haze
    var hz = c.createLinearGradient(0, Y0 - 10, 0, Y0 + 24);
    hz.addColorStop(0, 'rgba(255,200,150,0)'); hz.addColorStop(0.4, 'rgba(255,200,150,.45)'); hz.addColorStop(1, 'rgba(255,200,150,0)');
    c.fillStyle = hz; c.fillRect(-W, Y0 - 10, W * 3, 34);
    // props, far to near
    for (var k = 0; k < props.length; k++) {
      var p = props[k], q = proj(p.wx, 0, p.z);
      if (q.x < -W * 0.5 || q.x > W * 1.5) continue;
      if (p.t === 'cactus') drawSaguaro(c, q.x, q.y, q.s);
      else if (p.t === 'palm') drawPalm(c, q.x, q.y, q.s);
      else drawBush(c, q.x, q.y, q.s, p.t === 'rock');
    }
  }
  function drawWorld(c) { if (G.era.scene === 'desert') drawDesert(c); else drawCanyon(c); }
  function buildBg() {
    bg.width = Math.round(W * DPR); bg.height = Math.round(H * DPR);
    bgc.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawWorld(bgc);
  }
  function drawBigRock(c, x, base, s, w, h) {
    drawBoulder(c, x, base, s, w, h, '#b88c70', '#937058');
    var hw = w * s / 2, hh = h * s;
    c.fillStyle = 'rgba(255,230,200,.35)'; c.beginPath(); c.ellipse(x - hw * 0.35, base - hh * 0.78, hw * 0.28, hh * 0.12, -0.3, 0, 7); c.fill();
    c.strokeStyle = 'rgba(90,55,40,.6)'; c.lineWidth = Math.max(1, s * 0.03); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - hw * 0.1, base - hh * 0.95); c.lineTo(x - hw * 0.02, base - hh * 0.6); c.lineTo(x - hw * 0.15, base - hh * 0.35);
    c.moveTo(x + hw * 0.55, base - hh * 0.5); c.lineTo(x + hw * 0.7, base - hh * 0.25); c.stroke();
    c.fillStyle = '#7fa04a'; c.beginPath(); c.ellipse(x - hw * 0.6, base - hh * 0.55, hw * 0.12, hh * 0.07, 0.3, 0, 7); c.ellipse(x + hw * 0.2, base - hh * 0.97, hw * 0.1, hh * 0.05, 0, 0, 7); c.fill();
  }

  // ---------- enemy ----------
  function coverGeom() {
    var e = G.enemy, co = G.era.cover, z = e.z - 0.7, q = proj(e.baseWx, 0, z);
    return { x: q.x, base: q.y, s: q.s, z: z, w: 2 * co.halfW * q.s, top: q.y - G.coverH * q.s, x0: q.x - co.halfW * q.s, x1: q.x + co.halfW * q.s };
  }
  function enemyGeom() {
    var e = G.enemy, q = proj(e.wx, 0, e.z), s = q.s, sink = e.duck * 1.25 - Math.sin(G.time * 3) * 0.015;
    return {
      x: q.x, foot: q.y, s: s, sink: sink, ridgeTop: coverGeom().top, cover: coverGeom(),
      head: { x: q.x, y: q.y - (1.45 - sink) * s, r: 0.27 * s },
      body: { x0: q.x - 0.3 * s, x1: q.x + 0.3 * s, y0: q.y - (1.24 - sink) * s, y1: q.y },
      lens: { x: q.x + 0.21 * s, y: q.y - (1.0 - sink) * s },
      hand: { x: q.x + 0.3 * s, y: q.y - (1.8 - sink) * s }
    };
  }
  var PAL_C = { skin: '#e8a878', skin2: '#cf8a5c', hair: '#6b3a1e', tunic: '#f0a030', spot: '#8a4a1a', fur: '#8a5a3a', wood: '#a0663a', stone: '#b8bcc6',
    eye: '#fff', pupil: '#1d1a24', nose: '#d98a60', mouth: '#5a2a1a', tooth: '#fff' };
  var PAL_CW = {}; Object.keys(PAL_C).forEach(function (k) { PAL_CW[k] = '#fff'; });
  function ln(c, x0, y0, x1, y1, w, col) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  function drawCaveman(c, P, windup, hurt, hasSpear) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.fillStyle = P.fur; c.beginPath(); c.ellipse(-0.14, -0.06, 0.14, 0.08, 0, 0, 7); c.ellipse(0.14, -0.06, 0.14, 0.08, 0, 0, 7); c.fill();
    ln(c, -0.12, -0.1, -0.12, -0.45, 0.14, P.skin); ln(c, 0.12, -0.1, 0.12, -0.45, 0.14, P.skin);
    // tunic
    c.fillStyle = P.tunic; c.beginPath(); c.moveTo(-0.32, -0.36);
    for (var i = 0; i <= 6; i++) c.lineTo(-0.32 + i * 0.107, i % 2 ? -0.3 : -0.38);
    c.lineTo(0.33, -0.9); c.quadraticCurveTo(0.31, -1.2, 0.05, -1.22); c.lineTo(-0.2, -1.2); c.quadraticCurveTo(-0.33, -1.15, -0.33, -0.9); c.closePath(); c.fill();
    c.fillStyle = P.skin; c.beginPath(); c.arc(0.2, -1.12, 0.1, 0, 7); c.fill();
    c.fillStyle = P.spot; [[-0.15, -0.6], [0.1, -0.8], [0.18, -0.5], [-0.05, -1.0], [-0.22, -0.9], [0.02, -0.45]].forEach(function (p) { c.beginPath(); c.ellipse(p[0], p[1], 0.05, 0.035, 0.4, 0, 7); c.fill(); });
    // left arm
    ln(c, -0.3, -1.08, -0.42, -0.7, 0.13, P.skin); c.fillStyle = P.skin; c.beginPath(); c.arc(-0.42, -0.66, 0.08, 0, 7); c.fill();
    // right arm + spear
    if (windup) {
      ln(c, 0.28, -1.1, 0.42, -1.6, 0.13, P.skin);
      if (hasSpear) { ln(c, 0.85, -1.9, 0.12, -1.52, 0.05, P.wood); c.fillStyle = P.stone; c.beginPath(); c.moveTo(0.02, -1.47); c.lineTo(0.16, -1.47); c.lineTo(0.12, -1.6); c.closePath(); c.fill(); }
      c.fillStyle = P.skin; c.beginPath(); c.arc(0.43, -1.66, 0.08, 0, 7); c.fill();
    } else {
      ln(c, 0.28, -1.08, 0.42, -0.82, 0.13, P.skin);
      if (hasSpear) { ln(c, 0.45, -0.08, 0.45, -1.95, 0.05, P.wood); c.fillStyle = P.stone; c.beginPath(); c.moveTo(0.39, -1.93); c.lineTo(0.51, -1.93); c.lineTo(0.45, -2.12); c.closePath(); c.fill(); }
      c.fillStyle = P.skin; c.beginPath(); c.arc(0.44, -0.8, 0.08, 0, 7); c.fill();
    }
    // head + hair
    c.fillStyle = P.skin; c.beginPath(); c.arc(0, -1.45, 0.26, 0, 7); c.fill();
    c.fillStyle = P.hair; c.beginPath(); c.moveTo(-0.3, -1.38);
    var spikes = [[-0.34, -1.55], [-0.26, -1.62], [-0.28, -1.74], [-0.14, -1.7], [-0.1, -1.82], [0.02, -1.72], [0.12, -1.83], [0.16, -1.7], [0.3, -1.74], [0.27, -1.6], [0.35, -1.55], [0.3, -1.38]];
    spikes.forEach(function (p) { c.lineTo(p[0], p[1]); });
    c.quadraticCurveTo(0.22, -1.55, 0, -1.58); c.quadraticCurveTo(-0.22, -1.55, -0.3, -1.38); c.fill();
    c.beginPath(); c.moveTo(-0.2, -1.3); c.quadraticCurveTo(0, -1.12, 0.2, -1.3); c.quadraticCurveTo(0, -1.2, -0.2, -1.3); c.fill();
    ln(c, -0.16, -1.53, 0.16, -1.53, 0.045, P.hair);
    if (hurt) {
      c.strokeStyle = P.pupil; c.lineWidth = 0.03; c.beginPath();
      c.moveTo(-0.12, -1.5); c.lineTo(-0.05, -1.43); c.moveTo(-0.05, -1.5); c.lineTo(-0.12, -1.43);
      c.moveTo(0.05, -1.5); c.lineTo(0.12, -1.43); c.moveTo(0.12, -1.5); c.lineTo(0.05, -1.43); c.stroke();
      c.fillStyle = P.mouth; c.beginPath(); c.ellipse(0, -1.31, 0.05, 0.045, 0, 0, 7); c.fill();
    } else {
      c.fillStyle = P.eye; c.beginPath(); c.arc(-0.08, -1.47, 0.055, 0, 7); c.arc(0.08, -1.47, 0.055, 0, 7); c.fill();
      c.fillStyle = P.pupil; c.beginPath(); c.arc(-0.07, -1.465, 0.028, 0, 7); c.arc(0.09, -1.465, 0.028, 0, 7); c.fill();
      c.strokeStyle = P.mouth; c.lineWidth = 0.028; c.beginPath(); c.arc(0, -1.36, 0.08, 0.35, Math.PI - 0.35); c.stroke();
      c.fillStyle = P.tooth; c.fillRect(-0.035, -1.3, 0.03, 0.035);
    }
    c.fillStyle = P.nose; c.beginPath(); c.arc(0, -1.4, 0.06, 0, 7); c.fill();
  }
  // ---------- glowing halftone cover (sprite-cached) ----------
  var coverCache = new Map();
  function sdRound(px, py, cx, cy, hx, hy, r) {
    var qx = Math.abs(px - cx) - hx + r, qy = Math.abs(py - cy) - hy + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }
  function coverSprite(wpx, hpx, res) {
    wpx = Math.round(wpx); hpx = Math.max(2, Math.round(hpx)); res = Math.round(res * 4) / 4;
    var key = wpx + 'x' + hpx + '@' + res;
    var hit = coverCache.get(key); if (hit) return hit;
    var fr = Math.min(Math.max(wpx, hpx) * 0.2, hpx * 0.6 + 6, 46), pad = fr + 3;
    var cw = wpx + pad * 2, ch = hpx + pad + 2;
    var cvs = document.createElement('canvas');
    cvs.width = Math.max(1, Math.ceil(cw * res)); cvs.height = Math.max(1, Math.ceil(ch * res));
    var c = cvs.getContext('2d'); c.setTransform(res, 0, 0, res, 0, 0);
    var cx = pad + wpx / 2, base = hpx + pad;
    var rad = Math.min(wpx * 0.3, hpx * 0.9);
    var bcy = base - hpx / 2 + rad / 2, bhy = hpx / 2 + rad / 2;
    var sp = Math.max(3.2, wpx / 24);
    var dotsOut = new Path2D(), dotsIn = new Path2D(), row = 0;
    for (var y = base - hpx - fr; y <= base; y += sp * 0.87, row++) {
      for (var x = cx - wpx / 2 - fr + (row % 2 ? sp / 2 : 0); x <= cx + wpx / 2 + fr; x += sp) {
        var d = sdRound(x, y, cx, bcy, wpx / 2, bhy, rad);
        if (d > fr) continue;
        if (d <= -sp * 0.3) { dotsIn.moveTo(x + sp * 0.26, y); dotsIn.arc(x, y, sp * 0.26, 0, 6.2832); }
        else { var r = sp * 0.52 * (1 - Math.max(0, d) / fr); if (r > 0.35) { dotsOut.moveTo(x + r, y); dotsOut.arc(x, y, r, 0, 6.2832); } }
      }
    }
    c.save(); c.beginPath(); c.rect(0, 0, cw, base); c.clip();
    var body = new Path2D();
    body.roundRect ? body.roundRect(cx - wpx / 2, base - hpx, wpx, hpx + rad, rad) : body.rect(cx - wpx / 2, base - hpx, wpx, hpx + rad);
    var lg = c.createLinearGradient(0, base - hpx, 0, base);
    lg.addColorStop(0, '#fff18a'); lg.addColorStop(0.5, '#ffd83a'); lg.addColorStop(1, '#ffb21f');
    c.fillStyle = lg; c.globalAlpha = 0.95; c.fill(body);
    c.globalAlpha = 1; c.fillStyle = '#ffe34f'; c.fill(dotsOut);
    c.fillStyle = 'rgba(255,250,200,.55)'; c.fill(dotsIn);
    c.strokeStyle = 'rgba(255,253,225,.8)'; c.lineWidth = Math.max(1, sp * 0.3); c.stroke(body);
    c.restore();
    var spr = { cvs: cvs, ox: cx, oy: base, w: cw, h: ch };
    if (coverCache.size > 24) coverCache.clear();
    coverCache.set(key, spr);
    return spr;
  }
  function drawCover(c, cx, base, wpx, hpx, res, glow) {
    if (hpx < 1) return;
    if (glow) {
      var R = Math.max(wpx, hpx) * 1.05, pulse = 0.85 + 0.15 * Math.sin(G.time * 3);
      var gr = c.createRadialGradient(cx, base - hpx * 0.45, 0, cx, base - hpx * 0.45, R);
      gr.addColorStop(0, 'rgba(255,236,120,' + (0.55 * pulse) + ')'); gr.addColorStop(1, 'rgba(255,200,90,0)');
      c.fillStyle = gr; c.fillRect(cx - R, base - hpx * 0.45 - R, R * 2, R + hpx * 0.45);
    }
    var s = coverSprite(wpx, hpx, res);
    c.drawImage(s.cvs, cx - s.ox, base - s.oy, s.w, s.h);
  }

  var PAL_E = { g: '#4cb05f', g2: '#3a9150', hi: '#7ad38a', hat: '#c9793a', brim: '#b8652d', band: '#e8434a', boot: '#6b3b22', eye: '#fff', pupil: '#1d1a24', gun: '#3b3345', mouth: '#1d5a30' };
  var PAL_W = { g: '#fff', g2: '#fff', hi: '#fff', hat: '#fff', brim: '#fff', band: '#fff', boot: '#fff', eye: '#fff', pupil: '#fff', gun: '#fff', mouth: '#fff' };
  function drawCactusMan(c, pal, aiming, hat, hurt) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    // boots
    c.fillStyle = pal.boot;
    c.beginPath(); c.ellipse(-0.13, -0.05, 0.12, 0.07, 0, 0, 7); c.ellipse(0.13, -0.05, 0.12, 0.07, 0, 0, 7); c.fill();
    // arms
    c.strokeStyle = pal.g; c.lineWidth = 0.17;
    c.beginPath(); c.moveTo(-0.2, -0.72); c.lineTo(-0.46, -0.72); c.lineTo(-0.46, -1.02); c.stroke();
    // trunk
    c.fillStyle = pal.g; c.beginPath();
    if (c.roundRect) c.roundRect(-0.27, -1.3, 0.54, 1.24, 0.26); else c.rect(-0.27, -1.3, 0.54, 1.24);
    c.fill();
    c.strokeStyle = pal.g2; c.lineWidth = 0.035;
    c.beginPath(); c.moveTo(-0.12, -1.15); c.lineTo(-0.12, -0.12); c.moveTo(0.02, -1.22); c.lineTo(0.02, -0.1); c.moveTo(0.15, -1.15); c.lineTo(0.15, -0.12); c.stroke();
    c.strokeStyle = pal.hi; c.lineWidth = 0.05; c.globalAlpha *= 0.7;
    c.beginPath(); c.moveTo(-0.2, -1.05); c.lineTo(-0.2, -0.35); c.stroke(); c.globalAlpha /= 0.7;
    // bandana
    c.fillStyle = pal.band;
    c.beginPath(); c.moveTo(-0.27, -1.22); c.lineTo(0.27, -1.22); c.lineTo(0.25, -1.13); c.lineTo(0, -1.0); c.lineTo(-0.25, -1.13); c.closePath(); c.fill();
    // rifle + right arm
    c.strokeStyle = pal.gun; c.fillStyle = pal.gun;
    if (aiming) {
      c.lineWidth = 0.09; c.beginPath(); c.moveTo(0.05, -0.9); c.lineTo(0.36, -0.92); c.stroke();
      c.lineWidth = 0.08; c.beginPath(); c.moveTo(0.14, -1.0); c.lineTo(0.3, -1.0); c.stroke();
      c.beginPath(); c.arc(0.21, -0.9, 0.06, 0, 7); c.fill();
      c.strokeStyle = pal.g; c.lineWidth = 0.16; c.beginPath(); c.moveTo(0.22, -0.7); c.lineTo(0.34, -0.86); c.stroke();
    } else {
      c.lineWidth = 0.08; c.beginPath(); c.moveTo(0.4, -0.45); c.lineTo(0.44, -1.55); c.stroke();
      c.lineWidth = 0.1; c.beginPath(); c.moveTo(0.36, -1.0); c.lineTo(0.38, -1.25); c.stroke();
      c.strokeStyle = pal.g; c.lineWidth = 0.17; c.beginPath(); c.moveTo(0.2, -0.72); c.lineTo(0.42, -0.8); c.lineTo(0.42, -0.95); c.stroke();
    }
    // head
    c.fillStyle = pal.g; c.beginPath(); c.arc(0, -1.45, 0.27, 0, 7); c.fill();
    c.strokeStyle = pal.g2; c.lineWidth = 0.03; c.beginPath(); c.moveTo(-0.14, -1.6); c.lineTo(-0.16, -1.3); c.moveTo(0.14, -1.6); c.lineTo(0.16, -1.3); c.stroke();
    // face
    if (hurt) {
      c.strokeStyle = pal.pupil; c.lineWidth = 0.035;
      c.beginPath();
      c.moveTo(-0.14, -1.52); c.lineTo(-0.06, -1.44); c.moveTo(-0.06, -1.52); c.lineTo(-0.14, -1.44);
      c.moveTo(0.06, -1.52); c.lineTo(0.14, -1.44); c.moveTo(0.14, -1.52); c.lineTo(0.06, -1.44); c.stroke();
      c.fillStyle = pal.mouth; c.beginPath(); c.ellipse(0, -1.34, 0.05, 0.04, 0, 0, 7); c.fill();
    } else {
      c.fillStyle = pal.eye; c.beginPath(); c.arc(-0.1, -1.48, 0.075, 0, 7); c.arc(0.1, -1.48, 0.075, 0, 7); c.fill();
      c.fillStyle = pal.pupil; c.beginPath(); c.arc(-0.09, -1.47, 0.038, 0, 7); c.arc(0.11, -1.47, 0.038, 0, 7); c.fill();
      c.strokeStyle = pal.mouth; c.lineWidth = 0.03; c.beginPath(); c.arc(0, -1.39, 0.08, 0.3, Math.PI - 0.3); c.stroke();
    }
    // hat
    if (hat) {
      c.fillStyle = pal.brim; c.beginPath(); c.ellipse(0, -1.66, 0.42, 0.08, 0, 0, 7); c.fill();
      c.fillStyle = pal.hat; c.beginPath(); c.moveTo(-0.23, -1.67);
      c.bezierCurveTo(-0.25, -1.95, -0.1, -1.92, 0, -1.86); c.bezierCurveTo(0.1, -1.92, 0.25, -1.95, 0.23, -1.67); c.closePath(); c.fill();
      c.fillStyle = pal.band; c.fillRect(-0.23, -1.73, 0.46, 0.05);
    }
  }
  function drawHat(c, x, y, s, rot) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.translate(0, 1.75);
    c.fillStyle = PAL_E.brim; c.beginPath(); c.ellipse(0, -1.66, 0.42, 0.08, 0, 0, 7); c.fill();
    c.fillStyle = PAL_E.hat; c.beginPath(); c.moveTo(-0.23, -1.67);
    c.bezierCurveTo(-0.25, -1.95, -0.1, -1.92, 0, -1.86); c.bezierCurveTo(0.1, -1.92, 0.25, -1.95, 0.23, -1.67); c.closePath(); c.fill();
    c.fillStyle = PAL_E.band; c.fillRect(-0.23, -1.73, 0.46, 0.05);
    c.restore();
  }
  function drawGlint(c, x, y, k) {
    var r = 6 + 14 * k;
    c.save(); c.globalCompositeOperation = 'lighter';
    var gr = c.createRadialGradient(x, y, 0, x, y, r * 1.6);
    gr.addColorStop(0, 'rgba(255,255,255,' + (0.95 * k) + ')'); gr.addColorStop(0.3, 'rgba(160,230,255,' + (0.6 * k) + ')'); gr.addColorStop(1, 'rgba(120,200,255,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, r * 1.6, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,' + k + ')'; c.lineWidth = 2;
    var a = G.time * 2;
    c.beginPath();
    for (var i = 0; i < 4; i++) { var an = a + i * Math.PI / 2, rl = i % 2 ? r * 0.8 : r * 1.5; c.moveTo(x, y); c.lineTo(x + Math.cos(an) * rl, y + Math.sin(an) * rl); }
    c.stroke(); c.restore();
  }

  function enemyHasSpear() { return !(G.enemy.throwT > 0); }
  // Spears flying away from a behind-the-back camera foreshorten to a dot, so draw them with a minimum on-screen length.
  function drawSpear3D(c, p, d, len, tip, alpha, stuck) {
    var a = proj(p.x, p.y, p.z), b = proj(p.x - d.x * 0.3, p.y - d.y * 0.3, Math.max(0.6, p.z - d.z * 0.3));
    var dx = a.x - b.x, dy = a.y - b.y, L0 = Math.hypot(dx, dy) || 1, ux = dx / L0, uy = dy / L0;
    if (L0 < 0.5) { ux = 0.3; uy = -0.95; }
    var L = Math.max(L0 / 0.3 * len, len * a.s * 0.75) * (stuck ? 0.72 : 1), w = Math.max(2, 0.07 * a.s);
    c.save(); c.globalAlpha = alpha == null ? 1 : alpha; c.lineCap = 'round';
    if (!stuck) { c.strokeStyle = 'rgba(255,240,210,.35)'; c.lineWidth = w * 2.2; c.beginPath(); c.moveTo(a.x - ux * L * 1.8, a.y - uy * L * 1.8); c.lineTo(a.x - ux * L, a.y - uy * L); c.stroke(); }
    c.strokeStyle = '#6e4428'; c.lineWidth = w; c.beginPath(); c.moveTo(a.x - ux * L, a.y - uy * L); c.lineTo(a.x, a.y); c.stroke();
    c.strokeStyle = '#c28650'; c.lineWidth = w * 0.45; c.beginPath(); c.moveTo(a.x - ux * L, a.y - uy * L); c.lineTo(a.x, a.y); c.stroke();
    if (!stuck) {
      var tl = w * 2.8, tw = w * 1.3;
      c.fillStyle = tip; c.strokeStyle = 'rgba(40,20,20,.6)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(a.x + ux * tl, a.y + uy * tl); c.lineTo(a.x - uy * tw, a.y + ux * tw); c.lineTo(a.x + uy * tw, a.y - ux * tw); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
  }
  function drawWorldSpears(c, test) {
    var tip = weaponOf(G.era).tip || '#9aa0ac';
    for (var i = 0; i < G.stuck.length; i++) { var st = G.stuck[i]; if (test(st.p.z)) drawSpear3D(c, st.p, st.d, G.era.shot.len, tip, st.t > 2 ? Math.max(0, 1 - (st.t - 2) * 2) : 1, true); }
    for (var j = 0; j < G.proj.length; j++) {
      var pr = G.proj[j]; if (!test(pr.z)) continue;
      var sp = Math.hypot(pr.vx, pr.vy, pr.vz) || 1;
      drawSpear3D(c, pr, { x: pr.vx / sp, y: pr.vy / sp, z: pr.vz / sp }, G.era.shot.len, tip, 1, false);
    }
  }
  function enemyAiming() { return G.phase === 'playerHide' || G.phase === 'botFire' || G.phase === 'swap'; }
  function drawEnemyLayer(c, res) {
    var e = G.enemy, g = enemyGeom(), cg = g.cover, era = G.era;
    if (era.shot.kind === 'arc') drawWorldSpears(c, function (z) { return z > e.z; });
    if (e.duck < 0.6) { c.fillStyle = 'rgba(130,50,50,.3)'; c.beginPath(); c.ellipse(g.x + 0.1 * g.s, g.foot, 0.45 * g.s, 0.09 * g.s, 0, 0, 7); c.fill(); }
    c.save();
    c.beginPath(); c.rect(g.x - 3 * g.s, g.foot - 3 * g.s, 6 * g.s, 3 * g.s); c.clip();
    c.translate(g.x, g.foot + g.sink * g.s); c.scale(g.s, g.s);
    var hurt = e.hitT > 0 || G.ko === 'bot';
    if (era.bot.look === 'cactus') {
      var aiming = enemyAiming(), hat = e.hatOff <= 0;
      drawCactusMan(c, PAL_E, aiming, hat, hurt);
      if (e.flash > 0) { c.globalAlpha = Math.min(0.9, e.flash); drawCactusMan(c, PAL_W, aiming, hat, hurt); c.globalAlpha = 1; }
    } else {
      var wind = G.phase === 'botFire' && G.tell > 0, hs = enemyHasSpear();
      drawCaveman(c, PAL_C, wind, hurt, hs);
      if (e.flash > 0) { c.globalAlpha = Math.min(0.9, e.flash); drawCaveman(c, PAL_CW, wind, hurt, hs); c.globalAlpha = 1; }
    }
    c.restore();
    if (era.cover.kind === 'halftone') drawCover(c, cg.x, cg.base, cg.w, G.coverH * cg.s, res, true);
    else drawBigRock(c, cg.x, cg.base, cg.s, cg.w / cg.s, G.coverH);
    if (era.shot.kind === 'arc') drawWorldSpears(c, function (z) { return z <= e.z; });
    if (G.tell > 0 && G.phase === 'botFire') {
      if (era.bot.tell === 'glint') drawGlint(c, g.lens.x, g.lens.y, G.tell);
      var bx = g.x, by = g.head.y - g.s * 0.95, br = g.s * 0.22 * (0.9 + 0.1 * G.tell);
      c.fillStyle = '#ff3b4f'; c.beginPath(); c.arc(bx, by, br, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = '900 ' + Math.round(br * 1.5) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', bx, by + br * 0.08);
    }
    if (e.dizzy > 0 || G.ko === 'bot') {
      var n = 3, rad = g.s * 0.32;
      for (var i = 0; i < n; i++) {
        var an = G.time * 5 + i * 2.094;
        star(c, g.head.x + Math.cos(an) * rad, g.head.y - g.s * 0.28 + Math.sin(an) * rad * 0.35, g.s * 0.07, g.s * 0.03, 5, an);
        c.fillStyle = '#ffe14a'; c.fill();
      }
    }
  }

  // ---------- player (seen from behind) ----------
  var PAL_K = { skin: '#f0b088', skin2: '#d8906a', hair: '#3a2418', fur: '#7a4a2e', fur2: '#5a3420', wood: '#a0663a', wood2: '#7a4a28', bone: '#f4ecd6', bone2: '#d8ccb0', leaf: '#4f9a3c' };
  var PAL_KW = {}; Object.keys(PAL_K).forEach(function (k) { PAL_KW[k] = '#fff'; });
  function drawPlayerCave(c, P, look, tip, k, rec, spear) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    var white = P === PAL_KW, tun = white ? '#fff' : look.tunic, spot = white ? '#fff' : look.spot;
    var hipY = -150 + 64 * k, sh = hipY - 112 + rec * 6, headY = sh - 38;
    for (var sd = -1; sd <= 1; sd += 2) {
      var fx = sd * 30 + (sd > 0 ? 6 : 0), fy = sd > 0 ? -14 : -6, kx = sd * (34 + 18 * k), ky = -80 + 40 * k, hx = sd * 20;
      line(c, hx, hipY, kx, ky, 30, P.skin); line(c, kx, ky, fx, fy - 14, 24, P.skin); line(c, kx + sd * 4, ky + 4, fx + sd * 3, fy - 16, 8, P.skin2);
      c.fillStyle = P.fur; c.beginPath(); c.ellipse(fx, fy - 6, 25, 17, 0, 0, 7); c.fill();
      line(c, fx - 18, fy - 12, fx + 18, fy - 14, 3, P.fur2); line(c, fx - 18, fy - 2, fx + 18, fy - 4, 3, P.fur2);
    }
    // back
    c.fillStyle = P.skin; c.beginPath();
    c.moveTo(-42, hipY + 10); c.lineTo(-58, sh + 12); c.quadraticCurveTo(-56, sh - 8, -36, sh - 10); c.lineTo(36, sh - 10); c.quadraticCurveTo(56, sh - 8, 58, sh + 12); c.lineTo(42, hipY + 10); c.closePath(); c.fill();
    // tunic (one shoulder)
    c.fillStyle = tun; c.beginPath(); c.moveTo(-50, hipY + 30);
    for (var i = 0; i <= 8; i++) c.lineTo(-50 + i * 12.5, hipY + (i % 2 ? 22 : 34));
    c.lineTo(54, sh + 36); c.lineTo(-12, sh - 9); c.lineTo(-38, sh - 10); c.quadraticCurveTo(-56, sh - 8, -58, sh + 12); c.closePath(); c.fill();
    if (look.spots || white) { c.fillStyle = spot; [[-30, hipY - 10], [10, hipY - 40], [30, hipY], [-20, sh + 40], [-40, sh + 10], [20, hipY + 18], [-8, hipY + 14]].forEach(function (p) { c.beginPath(); c.ellipse(p[0], p[1], 8, 5, 0.4, 0, 7); c.fill(); }); }
    if (look.leaf && !white) { c.fillStyle = P.leaf; for (var l = 0; l < 7; l++) { c.beginPath(); c.ellipse(-44 + l * 15, hipY + 30, 9, 5, l % 2 ? 0.5 : -0.5, 0, 7); c.fill(); } line(c, -30, sh + 60, 30, sh + 50, 3, P.leaf); }
    line(c, -44, hipY - 2, 44, hipY - 2, 6, P.fur2);
    if (look.bones || (white && look.bones)) {
      for (var b = 0; b < 3; b++) { var yy = sh + 30 + b * 22; line(c, -34 + b * 2, yy, 34 - b * 2, yy + 4, 7, P.bone); c.fillStyle = P.bone; c.beginPath(); c.arc(-36 + b * 2, yy, 5, 0, 7); c.arc(36 - b * 2, yy + 4, 5, 0, 7); c.fill(); }
      line(c, 0, sh + 20, 0, hipY - 6, 6, P.bone2);
      c.fillStyle = P.bone; c.beginPath(); c.ellipse(-48, sh + 2, 16, 11, -0.3, 0, 7); c.ellipse(48, sh + 2, 16, 11, 0.3, 0, 7); c.fill();
    }
    // left arm
    line(c, -52, sh + 8, -66, sh + 66, 22, P.skin); line(c, -66, sh + 66, -60, sh + 112, 19, P.skin);
    c.fillStyle = P.skin; c.beginPath(); c.arc(-60, sh + 116, 11, 0, 7); c.fill();
    if (look.cloak) {
      var cl = white ? '#fff' : look.cloak;
      c.fillStyle = cl; c.beginPath(); c.moveTo(-64, sh + 2); c.quadraticCurveTo(0, sh - 26, 64, sh + 2); c.lineTo(66, hipY - 4);
      for (var f = 0; f <= 10; f++) c.lineTo(66 - f * 13.2, hipY + (f % 2 ? -14 : 2));
      c.closePath(); c.fill();
      if (!white) { c.strokeStyle = 'rgba(40,20,10,.35)'; c.lineWidth = 3; c.beginPath(); for (var h = 0; h < 9; h++) { c.moveTo(-50 + h * 12, sh + 14 + (h % 3) * 8); c.lineTo(-54 + h * 12, sh + 44 + (h % 2) * 10); } c.stroke(); }
      c.fillStyle = white ? '#fff' : '#f4ecd6'; c.beginPath(); c.moveTo(-6, sh - 8); c.quadraticCurveTo(-20, sh + 2, -14, sh + 16); c.quadraticCurveTo(-10, sh + 4, -2, sh - 2); c.fill();
    }
    // head + shaggy hair
    c.fillStyle = P.skin; c.fillRect(-12, sh - 22, 24, 16);
    c.beginPath(); c.ellipse(-31, headY + 6, 6, 9, 0, 0, 7); c.ellipse(31, headY + 6, 6, 9, 0, 0, 7); c.fill();
    c.fillStyle = P.hair; c.beginPath();
    for (var a = 0; a <= 16; a++) { var an = Math.PI * 0.9 + a * (Math.PI * 1.2 / 16), r = a % 2 ? 31 : 40; c.lineTo(Math.cos(an) * r, headY + Math.sin(an) * r); }
    c.lineTo(28, headY + 18); c.lineTo(18, headY + 30); c.lineTo(6, headY + 22); c.lineTo(-6, headY + 30); c.lineTo(-18, headY + 22); c.lineTo(-28, headY + 18); c.closePath(); c.fill();
    // spear held overhead
    var kick = rec * 14;
    if (spear) {
      line(c, 30, sh + 44 + kick, 72, sh - 168 + kick, 8, P.wood);
      line(c, 33, sh + 40 + kick, 74, sh - 166 + kick, 3, P.wood2);
      line(c, 66, sh - 140 + kick, 69, sh - 154 + kick, 11, P.fur);
      c.fillStyle = white ? '#fff' : tip; c.beginPath(); c.moveTo(66, sh - 166 + kick); c.lineTo(80, sh - 166 + kick); c.lineTo(78, sh - 196 + kick); c.closePath(); c.fill();
    }
    line(c, 48, sh + 6, 72, sh - 36 + kick * 0.5, 24, P.skin); line(c, 72, sh - 36 + kick * 0.5, 56, sh - 78 + kick, 20, P.skin);
    c.fillStyle = P.skin; c.beginPath(); c.arc(57, sh - 80 + kick, 11, 0, 7); c.fill();
  }
  function drawPlayer(c) {
    var p = G.player;
    c.save(); c.translate(PX, PY); c.scale(PS, PS);
    var shake = p.hitT > 0 ? Math.sin(G.time * 60) * 4 * p.hitT : 0;
    c.fillStyle = 'rgba(140,40,60,.35)'; c.beginPath(); c.ellipse(4, 0, 74, 14, 0, 0, 7); c.fill();
    c.translate(shake, 0);
    if (G.era.player.outfit === 'cave') {
      var look = outfitOf(G.era).look || {}, tip = weaponOf(G.era).tip || '#9aa0ac', hasSpear = !(G.phase === 'aim' && G.cool > coolTime() - 0.35 && G.cool > 0);
      drawPlayerCave(c, PAL_K, look, tip, p.duck, p.recoil, hasSpear);
      if (p.flash > 0) { c.globalAlpha = Math.min(0.85, p.flash); drawPlayerCave(c, PAL_KW, look, tip, p.duck, p.recoil, hasSpear); c.globalAlpha = 1; }
    } else {
      drawPlayerModern(c, PAL_P, p.duck, p.recoil);
      if (p.flash > 0) { c.globalAlpha = Math.min(0.85, p.flash); drawPlayerModern(c, PAL_PW, p.duck, p.recoil); c.globalAlpha = 1; }
    }
    c.restore();
  }
  function playerCoverGeom() {
    if (G.era.cover.kind === 'halftone') return { x: PX + 36 * PS, base: PY - 42 * PS, w: 300 * PS, tall: 270 * PS, low: 110 * PS };
    return { x: PX + 44 * PS, base: PY - 30 * PS, w: 340 * PS, tall: 150 * PS, low: 150 * PS };
  }
  function playerTorso() { var hipY = -150 + 64 * G.player.duck; return { x: PX + 10 * PS, y: PY + (hipY - 60) * PS }; }
  function launchScreen() { return { x: PX + 76 * PS, y: PY - 440 * PS }; }
  function launchOrigin() { var z0 = 2.2, s = launchScreen(); return { x: (s.x - CX) * z0 / FOC, y: CAM_H - (s.y - Y0) * z0 / FOC, z: z0 }; }
  var PAL_P = { skin: '#f2a58a', skin2: '#dc8a72', shoe: '#ff8a2a', sole: '#fff3e0', sock: '#fff', shorts: '#8a6b3a', shorts2: '#6f5530', belt: '#4a3222',
    shirt: '#8e2a3a', shirt2: '#6e1f2e', strap: '#2e1c2a', hair: '#2b2230', cap: '#e8434a', cap2: '#b8303a', wood: '#9a5b3a', gun: '#3b3345', scope: '#241e2e', lens: '#7fd3ff' };
  var PAL_PW = {}; Object.keys(PAL_P).forEach(function (k) { PAL_PW[k] = '#fff'; });
  function line(c, x0, y0, x1, y1, w, col) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  function drawPlayerModern(c, P, k, rec) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    var hipY = -150 + 64 * k, sh = hipY - 112 + rec * 6, headY = sh - 38;
    // legs
    for (var sd = -1; sd <= 1; sd += 2) {
      var fx = sd * 30 + (sd > 0 ? 6 : 0), fy = sd > 0 ? -14 : -6;
      var kx = sd * (34 + 18 * k), ky = -80 + 40 * k;
      var hx = sd * 20;
      line(c, kx, ky, fx, fy - 14, 22, P.skin);
      line(c, kx + sd * 3, ky + 4, fx + sd * 2, fy - 14, 8, P.skin2);
      line(c, fx, fy - 18, fx, fy - 8, 20, P.sock);
      c.fillStyle = P.shoe; c.beginPath(); c.ellipse(fx, fy, 22, 12, 0, 0, 7); c.fill();
      c.fillStyle = P.sole; c.fillRect(fx - 20, fy + 4, 40, 5);
      line(c, hx, hipY, kx, ky - 6, 36, P.shorts);
    }
    // shorts seat + belt
    c.fillStyle = P.shorts; c.beginPath(); if (c.roundRect) c.roundRect(-46, hipY - 30, 92, 46, 16); else c.rect(-46, hipY - 30, 92, 46); c.fill();
    c.fillStyle = P.shorts2; c.fillRect(-2, hipY - 24, 4, 36);
    c.fillStyle = P.belt; c.fillRect(-46, hipY - 32, 92, 9);
    // torso
    c.fillStyle = P.shirt; c.beginPath();
    c.moveTo(-42, hipY - 28); c.lineTo(-58, sh + 12); c.quadraticCurveTo(-56, sh - 8, -36, sh - 10);
    c.lineTo(36, sh - 10); c.quadraticCurveTo(56, sh - 8, 58, sh + 12); c.lineTo(42, hipY - 28); c.closePath(); c.fill();
    c.fillStyle = P.shirt2; c.beginPath(); c.moveTo(14, sh - 8); c.lineTo(36, sh - 10); c.quadraticCurveTo(56, sh - 8, 58, sh + 12); c.lineTo(42, hipY - 28); c.lineTo(18, hipY - 28); c.closePath(); c.fill();
    // straps
    line(c, -28, sh - 6, -22, hipY - 30, 9, P.strap); line(c, 28, sh - 6, 22, hipY - 30, 9, P.strap);
    line(c, -26, sh + 52, 26, sh + 52, 8, P.strap);
    // left arm (supports the barrel)
    line(c, -50, sh + 6, -34, sh - 28, 24, P.shirt); line(c, -34, sh - 28, 10, sh - 56, 18, P.skin);
    // neck + head
    c.fillStyle = P.skin; c.fillRect(-12, sh - 22, 24, 16);
    c.beginPath(); c.ellipse(-30, headY + 4, 6, 9, 0, 0, 7); c.ellipse(30, headY + 4, 6, 9, 0, 0, 7); c.fill();
    c.fillStyle = P.hair; c.beginPath(); c.arc(0, headY, 31, 0, 7); c.fill();
    c.fillStyle = P.cap; c.beginPath(); c.arc(0, headY - 2, 32, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(0, headY - 12, -32, headY - 3); c.fill();
    c.fillStyle = P.cap2; c.beginPath(); c.ellipse(0, headY - 8, 12, 6, 0, 0, 7); c.fill();
    c.fillStyle = P.hair; c.beginPath(); c.ellipse(0, headY - 7, 8, 3.5, 0, 0, 7); c.fill();
    // rifle
    var kick = rec * 10;
    line(c, 36, sh + 14 + kick, 41, sh - 18 + kick, 15, P.wood);
    line(c, 41, sh - 18 + kick, 47, sh - 74 + kick, 10, P.gun);
    line(c, 47, sh - 74 + kick, 53, sh - 142 + kick, 5, P.gun);
    line(c, 33, sh - 26 + kick, 39, sh - 76 + kick, 12, P.scope);
    c.fillStyle = P.lens; c.beginPath(); c.arc(39, sh - 77 + kick, 5, 0, 7); c.fill();
    line(c, 36, sh - 40 + kick, 44, sh - 40 + kick, 4, P.gun); line(c, 38, sh - 62 + kick, 46, sh - 62 + kick, 4, P.gun);
    // right arm (trigger hand)
    line(c, 50, sh + 6, 72, sh + 22, 24, P.shirt); line(c, 72, sh + 22, 40, sh - 4 + kick, 18, P.skin);
  }
  function addFx(o) { o.t = 0; G.fx.push(o); return o; }
  function star(c, x, y, r1, r2, n, rot) {
    c.beginPath();
    for (var i = 0; i < n * 2; i++) { var r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath();
  }
  function drawFx(c, layer) {
    for (var i = 0; i < G.fx.length; i++) {
      var f = G.fx[i]; if (f.layer !== layer) continue;
      var u = f.t / f.life;
      if (f.k === 'pow') {
        var sc = f.size * (u < 0.2 ? 0.5 + u * 3 : 1.1 - (u - 0.2) * 0.2), al = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
        c.save(); c.globalAlpha = al;
        star(c, f.x, f.y, sc, sc * 0.55, 10, f.rot); c.fillStyle = '#fff'; c.fill();
        star(c, f.x, f.y, sc * 0.86, sc * 0.46, 10, f.rot); c.fillStyle = f.col || '#ffe14a'; c.fill();
        c.lineWidth = Math.max(1.5, sc * 0.06); c.strokeStyle = '#ff7a2a'; c.stroke();
        c.fillStyle = '#c21f4a'; c.font = '900 ' + Math.round(sc * 0.5) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(f.text, f.x, f.y + 1);
        c.restore();
      } else if (f.k === 'puff') {
        c.save(); c.globalAlpha = (1 - u) * 0.85;
        for (var j = 0; j < f.parts.length; j++) {
          var pp = f.parts[j], rr2 = f.size * (0.35 + u * 0.9) * pp.s;
          c.fillStyle = j % 2 ? '#f7d2bd' : '#e9a792';
          c.beginPath(); c.arc(f.x + pp.dx * f.size * (0.3 + u), f.y + pp.dy * f.size * (0.2 + u * 0.6) - u * f.size * 0.4, rr2, 0, 7); c.fill();
        }
        c.restore();
      } else if (f.k === 'spark') {
        c.save(); c.globalAlpha = 1 - u; c.strokeStyle = '#fff3a0'; c.lineWidth = Math.max(1.5, f.size * 0.08); c.lineCap = 'round';
        c.beginPath();
        for (var m = 0; m < 8; m++) {
          var an = f.rot + m * Math.PI / 4, r0 = f.size * (0.2 + u * 0.8), r1 = r0 + f.size * 0.35 * (1 - u);
          c.moveTo(f.x + Math.cos(an) * r0, f.y + Math.sin(an) * r0); c.lineTo(f.x + Math.cos(an) * r1, f.y + Math.sin(an) * r1);
        }
        c.stroke(); c.restore();
      } else if (f.k === 'hat') {
        c.save(); c.globalAlpha = u > 0.75 ? (1 - u) * 4 : 1; drawHat(c, f.x + f.vx * f.t, f.y - f.vy * f.t + f.g * f.t * f.t, f.s, f.t * 9 * (f.vx < 0 ? -1 : 1)); c.restore();
      } else if (f.k === 'flash') {
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - u;
        star(c, f.x, f.y, f.size, f.size * 0.4, 7, f.rot); c.fillStyle = '#ffec8a'; c.fill(); c.restore();
      } else if (f.k === 'tracer') {
        c.save(); c.globalAlpha = 1 - u; c.strokeStyle = '#fff6b0'; c.lineWidth = 3; c.lineCap = 'round';
        var tt = Math.min(1, u * 3), bx = f.x + (f.x2 - f.x) * tt, by = f.y + (f.y2 - f.y) * tt;
        var ax2 = f.x + (f.x2 - f.x) * Math.max(0, tt - 0.4), ay2 = f.y + (f.y2 - f.y) * Math.max(0, tt - 0.4);
        c.beginPath(); c.moveTo(ax2, ay2); c.lineTo(bx, by); c.stroke(); c.restore();
      }
    }
  }
  function drawTexts(c) {
    for (var i = 0; i < G.fx.length; i++) {
      var f = G.fx[i]; if (f.k !== 'txt') continue;
      var u = f.t / f.life, p = f.layer === 'world' ? toScreen(f.x, f.y) : { x: f.x, y: f.y };
      var y = p.y - 26 - u * 40, al = u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1, sc = u < 0.12 ? 0.6 + u * 3.3 : 1;
      c.save(); c.globalAlpha = al; c.translate(clamp(p.x, 70, W - 70), y); c.scale(sc, sc);
      c.font = '900 ' + (f.size || 22) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 5; c.strokeStyle = 'rgba(40,16,40,.85)'; c.strokeText(f.text, 0, 0);
      c.fillStyle = f.col || '#fff'; c.fillText(f.text, 0, 0);
      c.restore();
    }
  }
  var FONT = '"Avenir Next","Segoe UI",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  function puff(x, y, size, layer) {
    var parts = []; for (var i = 0; i < 6; i++) parts.push({ dx: Math.cos(i * 1.1) * (0.5 + (i % 3) * 0.2), dy: Math.sin(i * 1.7) * 0.4, s: 0.6 + (i % 3) * 0.25 });
    addFx({ k: 'puff', x: x, y: y, size: size, parts: parts, life: 0.8, layer: layer });
  }

  // ---------- scope ----------
  function scopeInfo() {
    var a = easeOut(G.scope);
    var R = Math.min(W * 0.46, H * 0.28) * (0.55 + 0.45 * a);
    var z = 1 + (G.era.shot.zoom - 1) * a;
    var sw = swayOffset();
    return { a: a, R: R, z: z, cx: CX, cy: H * 0.4, ax: G.aim.x + sw.x * a, ay: G.aim.y + sw.y * a };
  }
  function swayOffset() { var t = G.time; return { x: Math.sin(t * 1.1) * 1.6 + Math.sin(t * 2.7) * 0.6, y: Math.cos(t * 1.4) * 1.3 }; }
  function toScreen(x, y) {
    if (G.scope < 0.05) return { x: x, y: y };
    var s = scopeInfo();
    return { x: s.cx + (x - s.ax) * s.z, y: s.cy + (y - s.ay) * s.z };
  }
  function drawScope(c) {
    if (G.scope < 0.02) return;
    var s = scopeInfo();
    c.save();
    c.fillStyle = 'rgba(14,7,28,' + (0.86 * s.a) + ')';
    c.beginPath(); c.rect(-20, -20, W + 40, H + 40); c.arc(s.cx, s.cy, s.R, 0, 7, true); c.fill();
    c.beginPath(); c.arc(s.cx, s.cy, s.R, 0, 7); c.clip();
    c.save();
    c.translate(s.cx, s.cy); c.scale(s.z, s.z); c.translate(-s.ax, -s.ay);
    drawWorld(c);
    drawEnemyLayer(c, DPR * s.z);
    drawFx(c, 'world');
    c.restore();
    // lens tint + vignette
    var vg = c.createRadialGradient(s.cx, s.cy, s.R * 0.55, s.cx, s.cy, s.R);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,25,.55)');
    c.fillStyle = vg; c.fillRect(s.cx - s.R, s.cy - s.R, s.R * 2, s.R * 2);
    // reticle
    c.strokeStyle = 'rgba(20,10,30,.9)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(s.cx - s.R, s.cy); c.lineTo(s.cx - 10, s.cy); c.moveTo(s.cx + 10, s.cy); c.lineTo(s.cx + s.R, s.cy);
    c.moveTo(s.cx, s.cy - s.R); c.lineTo(s.cx, s.cy - 10); c.moveTo(s.cx, s.cy + 10); c.lineTo(s.cx, s.cy + s.R); c.stroke();
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(s.cx - s.R, s.cy); c.lineTo(s.cx - s.R * 0.6, s.cy); c.moveTo(s.cx + s.R * 0.6, s.cy); c.lineTo(s.cx + s.R, s.cy);
    c.moveTo(s.cx, s.cy + s.R * 0.6); c.lineTo(s.cx, s.cy + s.R); c.stroke();
    c.fillStyle = 'rgba(20,10,30,.9)';
    for (var i = 1; i <= 3; i++) { c.beginPath(); c.arc(s.cx + i * s.R * 0.14, s.cy, 2.2, 0, 7); c.arc(s.cx - i * s.R * 0.14, s.cy, 2.2, 0, 7); c.fill(); c.beginPath(); c.arc(s.cx, s.cy + i * s.R * 0.14, 2.2, 0, 7); c.fill(); }
    c.fillStyle = '#ff3b4f'; c.beginPath(); c.arc(s.cx, s.cy, 2.6, 0, 7); c.fill();
    c.restore();
    c.save(); c.strokeStyle = '#1a1026'; c.lineWidth = 10 * s.a; c.beginPath(); c.arc(s.cx, s.cy, s.R + 4, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.beginPath(); c.arc(s.cx, s.cy, s.R - 1, 0, 7); c.stroke(); c.restore();
  }
  function drawCrosshair(c, x, y) {
    c.save(); c.lineWidth = 4; c.strokeStyle = 'rgba(30,10,40,.6)';
    c.beginPath(); c.arc(x, y, 13, 0, 7); c.stroke();
    c.lineWidth = 2; c.strokeStyle = '#fff'; c.beginPath(); c.arc(x, y, 13, 0, 7);
    c.moveTo(x - 20, y); c.lineTo(x - 7, y); c.moveTo(x + 7, y); c.lineTo(x + 20, y); c.moveTo(x, y - 20); c.lineTo(x, y - 7); c.moveTo(x, y + 7); c.lineTo(x, y + 20); c.stroke();
    c.fillStyle = '#ff3b4f'; c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); c.restore();
  }

  var hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function setClass(el, cls, on) { if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on); }
  var bannerT = 0;
  function banner(text, cls, dur) {
    var b = $('banner');
    b.textContent = text; b.className = 'banner' + (text ? ' show' : '') + (cls ? ' ' + cls : '');
    bannerT = dur || 0;
  }
  function hint(text, low) { var h = $('hint'); if (h.textContent !== text) h.textContent = text; setClass(h, 'show', !!text); h.style.top = low ? 'calc(env(safe-area-inset-top) + 172px)' : ''; }
  function showCount(n) {
    var el = $('count');
    setClass(el, 'show', n > 0);
    if (n > 0 && hudCache.count !== n) { hudCache.count = n; $('countNum').textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    if (n <= 0) hudCache.count = 0;
  }
  function bump(id) { var el = $(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  function pips(id, left) {
    var key = id + 'n'; if (hudCache[key] === left) return; hudCache[key] = left;
    var el = $(id), h = '';
    var sp = G.era.ammo === 'spear' ? 'sp' : '';
    for (var i = 0; i < CFG.shots; i++) h += '<i class="' + sp + (i >= left ? ' used' : '') + '"></i>';
    el.innerHTML = h;
  }
  // ---------- near-layer spears (bot throws, spears stuck by the player) ----------
  function bez(s, u) {
    var cx = (s.x0 + s.x1) / 2, cy = Math.min(s.y0, s.y1) - 170 * PS, v = 1 - u;
    return { x: v * v * s.x0 + 2 * v * u * cx + u * u * s.x1, y: v * v * s.y0 + 2 * v * u * cy + u * u * s.y1,
      dx: 2 * v * (cx - s.x0) + 2 * u * (s.x1 - cx), dy: 2 * v * (cy - s.y0) + 2 * u * (s.y1 - cy) };
  }
  function flatSpear(c, x, y, ang, L, w, tip, alpha, stuck) {
    var ux = Math.cos(ang), uy = Math.sin(ang), vis = stuck ? L * 0.7 : L;
    c.save(); c.globalAlpha = alpha; c.lineCap = 'round';
    c.strokeStyle = '#6e4428'; c.lineWidth = w; c.beginPath(); c.moveTo(x - ux * vis, y - uy * vis); c.lineTo(x, y); c.stroke();
    c.strokeStyle = '#b77a48'; c.lineWidth = w * 0.45; c.beginPath(); c.moveTo(x - ux * vis, y - uy * vis); c.lineTo(x, y); c.stroke();
    if (!stuck) { var tl = w * 2.6, tw = w * 1.1; c.fillStyle = tip; c.beginPath(); c.moveTo(x + ux * tl, y + uy * tl); c.lineTo(x - uy * tw, y + ux * tw); c.lineTo(x + uy * tw, y - ux * tw); c.closePath(); c.fill(); }
    c.restore();
  }
  function drawNearSpears(c) {
    for (var i = 0; i < G.nearStuck.length; i++) { var n = G.nearStuck[i]; flatSpear(c, n.x, n.y, n.ang, n.L, n.w, '#b8bcc6', n.t > 2 ? Math.max(0, 1 - (n.t - 2) * 2) : 1, true); }
    for (var j = 0; j < G.botSpears.length; j++) {
      var s = G.botSpears[j], u = clamp(s.t / s.dur, 0, 1), b = bez(s, u), L = s.L0 + (s.L1 - s.L0) * u * u;
      flatSpear(c, b.x, b.y, Math.atan2(b.dy, b.dx), L, Math.max(2, L * 0.06), '#b8bcc6', 1, false);
    }
  }

  // ---------- HUD ----------
  function updHud(dt) {
    var era = G.era;
    var fp = clamp(G.hpP / G.maxP, 0, 1), fb = clamp(G.hpB / G.maxB, 0, 1);
    setText('hpP', String(Math.ceil(G.hpP))); setText('hpB', String(Math.ceil(G.hpB)));
    var kP = fp.toFixed(3), kB = fb.toFixed(3);
    if (hudCache.fp !== kP) { hudCache.fp = kP; $('hpFillP').style.transform = 'scaleX(' + kP + ')'; setClass($('hpBoxP'), 'mid', fp < 0.6); setClass($('hpBoxP'), 'low', fp < 0.3); }
    if (hudCache.fb !== kB) { hudCache.fb = kB; $('hpFillB').style.transform = 'scaleX(' + kB + ')'; setClass($('hpBoxB'), 'mid', fb < 0.6); setClass($('hpBoxB'), 'low', fb < 0.3); }
    setText('dmgP', '⚔ ' + G.dmgP); setText('dmgB', '⚔ ' + G.dmgB);
    setText('roundLbl', G.round > CFG.rounds ? 'SUDDEN DEATH' : era.name.toUpperCase() + ' · ROUND ' + G.round + ' / ' + CFG.rounds);
    pips('pipsP', G.shotsP); pips('pipsB', G.shotsB);
    var mode = G.phase === 'aim' ? 'mode-aim' : G.phase === 'botFire' ? 'mode-bot' : '';
    setClass(app, 'mode-aim', mode === 'mode-aim'); setClass(app, 'mode-bot', mode === 'mode-bot');
    setClass($('sideP'), 'active', G.phase === 'aim' || G.phase === 'enemyHide');
    setClass($('sideB'), 'active', G.phase === 'botFire' || G.phase === 'playerHide');
    if (mode) {
      var tot = mode === 'mode-aim' ? era.aimTime : era.botTime, tl = Math.max(0, G.timeLeft);
      var w = (tl / tot).toFixed(3);
      if (hudCache.tw !== w) { hudCache.tw = w; $('timerBar').style.transform = 'scaleX(' + w + ')'; }
      setText('timerTxt', tl.toFixed(1));
      setClass($('timer'), 'low', tl < 2.5);
    }
    if (mode === 'mode-aim') { var bs = $('bullets').children; for (var i = 0; i < bs.length; i++) setClass(bs[i], 'used', i >= G.shotsP); }
    if (mode === 'mode-bot') {
      var off = (289 * (1 - G.player.stam)).toFixed(1);
      if (hudCache.st !== off) { hudCache.st = off; $('stamRing').style.strokeDashoffset = off; }
      setClass($('duckBtn'), 'tired', G.player.tired);
      setClass($('duckBtn'), 'down', G.player.duck > 0.5);
    }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner(''); }
  }

  // ---------- flow ----------
  var bgEra = null;
  function setEra(era) {
    G.era = era;
    if (bgEra !== era) { bgEra = era; buildScenery(); coverCache.clear(); buildBg(); }
    $('avP').innerHTML = AVATARS[era.player.outfit === 'cave' ? 'cave' : 'modern'];
    $('avB').innerHTML = AVATARS[era.bot.look] || AVATARS.cactus;
    $('nmB').textContent = era.bot.name; $('oBn').textContent = era.bot.name.toUpperCase();
    var ic = AMMO_ICONS[era.ammo] || AMMO_ICONS.bullet, h = '';
    for (var i = 0; i < CFG.shots; i++) h += '<i>' + ic + '</i>';
    $('bullets').innerHTML = h;
    hudCache = {};
    G.coverH = era.cover.low;
  }
  function hideOverlays() { ['menu', 'eras', 'over', 'shop'].forEach(function (id) { $(id).classList.remove('show'); }); }
  function startMatch(era) {
    era = era || G.era;
    if (!era.built || !isUnlocked(era.idx)) return false;
    setEra(era);
    G.round = 1; G.sudden = 0; G.dmgP = 0; G.dmgB = 0; G.ko = null; G.koT = 0;
    G.maxP = playerMaxHp(); G.hpP = G.maxP; G.bot = botStats(era, SAVE.trophies); G.maxB = G.bot.hp; G.hpB = G.maxB;
    G.fx = []; G.stuck = []; G.proj = []; G.botSpears = []; G.nearStuck = []; G.shotLog = []; G.botLog = []; G.result = null; G.lastReward = null;
    G.stats = { shots: 0, hits: 0, heads: 0, dodges: 0, botHits: 0 };
    G.enemy.dizzy = 0; G.enemy.throwT = 0;
    hideOverlays();
    beginRound();
    return true;
  }
  function beginRound() {
    var e = G.enemy, prev = e.baseWx, nx, tries = 0, era = G.era;
    var lane = era.lane || [-2.0, 2.4], sep = Math.min(1.4, (lane[1] - lane[0]) * 0.36);
    do { nx = rr(lane[0], lane[1]); tries++; } while (Math.abs(nx - prev) < sep && tries < 20);
    if (Math.abs(nx - prev) < sep) nx = Math.abs(lane[0] - prev) > Math.abs(lane[1] - prev) ? lane[0] : lane[1];
    e.baseWx = nx; e.wx = nx; e.tx = nx; e.z = rr(era.dist[0], era.dist[1]); e.duck = 1; e.duckTarget = 1; e.flash = 0; e.hitT = 0; e.hatOff = 0; e.duckT = 0; e.dizzy = 0; e.throwT = 0;
    G.coverH = era.cover.tall; G.coverT = 1; G.coverFrom = G.coverTo = era.cover.tall;
    G.shotsP = CFG.shots; G.shotsB = CFG.shots; G.cool = 0; G.timeUp = false; G.tell = 0; G.botShots = []; G.ending = false;
    G.proj = []; G.botSpears = [];
    G.roundGain = { p: 0, b: 0 };
    G.scope = 0; G.scopeTarget = 0; G.pointerId = null; G.aiming = false;
    setPhase('enemyHide'); G.countNum = 0;
    banner(G.round > CFG.rounds ? 'SUDDEN DEATH · ENEMY IS HIDING' : 'ENEMY IS HIDING'); hint('');
    sfx.whoosh();
  }
  function setPhase(p) { G.phase = p; G.pt = 0; G.endT = 0; G.ending = false; }
  function dropCover(to) { G.coverFrom = G.coverH; G.coverTo = to; G.coverT = 0; }
  function startAim() {
    setPhase('aim'); showCount(0); G.countNum = 0;
    if (G.era.cover.low !== G.coverH) dropCover(G.era.cover.low);
    G.enemy.actT = 0.8; G.enemy.duckTarget = 0; G.timeLeft = G.era.aimTime;
    var cg = coverGeom(); G.aim.x = cg.x; G.aim.y = cg.top - 60;
    banner(G.era.shot.kind === 'arc' ? 'THROW!' : 'SHOOT!', 'go', 0.8); sfx.go();
  }
  function endAim() { releaseAim(); setPhase('swap'); banner('SWAP! YOUR TURN TO HIDE', 'good'); hint(''); }
  function startPlayerHide() { setPhase('playerHide'); G.countNum = 0; banner("YOU'RE HIDING"); hint(''); releaseAim(); sfx.whoosh(); G.player.stam = 1; G.player.tired = false; }
  function startBotFire() {
    setPhase('botFire'); showCount(0); G.countNum = 0;
    G.shotsB = CFG.shots; G.timeLeft = G.era.botTime; G.player.stam = 1; G.player.tired = false;
    banner('DODGE!', 'go', 0.8); sfx.go();
    var arc = G.era.shot.kind === 'arc', fl = G.era.bot.flight || 0, t = rr(1.0, 1.5); G.botShots = [];
    for (var i = 0; i < CFG.shots; i++) {
      var lead = rr(0.6, 1.0);
      G.botShots.push({ tellAt: t - lead, fireAt: t, impactAt: t + fl, told: false, fired: false, done: false, intent: null });
      t += arc ? rr(2.0, 2.5) : rr(1.5, 2.0);
    }
  }
  function endRound() {
    setPhase('roundEnd'); G.tell = 0;
    banner(G.round > CFG.rounds ? 'SUDDEN DEATH DONE' : 'ROUND ' + G.round + ' DONE', 'good');
    hint('You dealt ' + G.roundGain.p + '  ·  ' + G.era.bot.name + ' dealt ' + G.roundGain.b, true);
  }
  function nextRound() {
    hint('');
    if (G.round >= CFG.rounds) {
      if (G.dmgP !== G.dmgB) { matchOver('points'); return; }
      if (G.sudden < BALANCE.match.maxSuddenDeath) { G.sudden++; G.round++; beginRound(); return; }
      matchOver('draw'); return;
    }
    G.round++; beginRound();
  }
  function knockOut(who) {
    if (G.ko) return;
    G.ko = who; G.koT = 1.6; releaseAim(); G.proj = [];
    banner(who === 'bot' ? 'KNOCKOUT!' : 'YOU GOT BONKED!', who === 'bot' ? 'good' : 'go'); hint('');
  }
  function matchOver(reason) {
    var result;
    if (reason === 'ko') result = G.ko === 'bot' ? 'win' : 'lose';
    else if (reason === 'points') result = G.dmgP > G.dmgB ? 'win' : 'lose';
    else result = 'draw';
    setPhase('over'); banner(''); hint(''); showCount(0); releaseAim();
    G.result = result; G.reason = reason;
    var rw = matchReward(SAVE, G.era, result);
    writeSave(rw.save); SAVE = rw.save; G.lastReward = rw;
    showEnd(rw);
    if (result === 'win') sfx.win(); else sfx.lose();
  }

  // ---------- shooting ----------
  var projId = 0;
  function canShoot() { return G.phase === 'aim' && G.shotsP > 0 && G.cool <= 0 && !G.ending && !G.timeUp && !G.ko; }
  function aimDir(sx, sy) {
    var O = launchOrigin(), D = G.enemy.z, P = { x: (sx - CX) * D / FOC, y: CAM_H - (sy - Y0) * D / FOC, z: D };
    var dx = P.x - O.x, dy = P.y - O.y, dz = P.z - O.z, L = Math.hypot(dx, dy, dz);
    return { x: dx / L, y: dy / L, z: dz / L };
  }
  // Screen point to aim at so an arc throw passes through world point T (low-angle ballistic solution).
  function solveAim(T) {
    var O = launchOrigin(), v = G.era.shot.speed, g = G.era.shot.g;
    var dx = T.x - O.x, dz = T.z - O.z, dy = T.y - O.y, R = Math.hypot(dx, dz);
    var disc = v * v * v * v - g * (g * R * R + 2 * dy * v * v);
    if (disc < 0) return null;
    var tn = (v * v - Math.sqrt(disc)) / (g * R), cs = 1 / Math.sqrt(1 + tn * tn), sn = tn * cs;
    var d = { x: dx / R * cs, y: sn, z: dz / R * cs }, k = (G.enemy.z - O.z) / d.z;
    var p = proj(O.x + d.x * k, O.y + d.y * k, O.z + d.z * k);
    return { x: p.x, y: p.y };
  }
  function playerThrow(sx, sy) {
    if (!canShoot()) return null;
    G.shotsP--; G.cool = coolTime(); G.stats.shots++;
    sfx.throw(); G.player.recoil = 1;
    var O = launchOrigin(), d = aimDir(sx, sy), v = G.era.shot.speed;
    var pr = { id: ++projId, x: O.x, y: O.y, z: O.z, vx: d.x * v, vy: d.y * v, vz: d.z * v, t: 0 };
    G.proj.push(pr);
    return { id: pr.id };
  }
  function stepProj(dt) {
    var e = G.enemy, co = G.era.cover, g = G.era.shot.g, zc = e.z - 0.7;
    for (var i = G.proj.length - 1; i >= 0; i--) {
      var pr = G.proj[i], n = 4, h = dt / n, res = null, hit = null;
      for (var j = 0; j < n && !res; j++) {
        var px = pr.x, py = pr.y, pz = pr.z, f, x, y;
        pr.vy -= g * h; pr.x += pr.vx * h; pr.y += pr.vy * h; pr.z += pr.vz * h; pr.t += h;
        if (pz < zc && pr.z >= zc) {
          f = (zc - pz) / (pr.z - pz); x = px + (pr.x - px) * f; y = py + (pr.y - py) * f;
          var dx = x - e.baseWx;
          if (Math.abs(dx) < co.halfW && y >= 0 && y < G.coverH * Math.sqrt(1 - (dx / co.halfW) * (dx / co.halfW))) { res = 'blocked'; hit = { x: x, y: y, z: zc - 0.05 }; }
        }
        if (!res && pz < e.z && pr.z >= e.z) {
          f = (e.z - pz) / (pr.z - pz); x = px + (pr.x - px) * f; y = py + (pr.y - py) * f;
          var sink = e.duck * 1.25, hy = 1.45 - sink, ex = x - e.wx;
          if (ex * ex + (y - hy) * (y - hy) <= 0.31 * 0.31) res = 'head';
          else if (Math.abs(ex) <= 0.32 && y >= 0 && y <= 1.26 - sink) res = 'body';
          if (res) hit = { x: x, y: y, z: e.z };
        }
        if (!res && pr.y <= 0) { res = 'miss'; hit = { x: pr.x, y: 0, z: pr.z }; }
        if (!res && (pr.z > e.z + 25 || pr.t > 4 || Math.abs(pr.x) > 40)) { res = 'miss'; hit = null; }
      }
      if (res) { G.proj.splice(i, 1); var sp = Math.hypot(pr.vx, pr.vy, pr.vz) || 1; resolvePlayerShot(res, hit, { x: pr.vx / sp, y: pr.vy / sp, z: pr.vz / sp }, null, pr.id); }
    }
  }
  function resolvePlayerShot(res, hit, dir, scr, id) {
    var e = G.enemy, g = enemyGeom(), dmg = 0;
    var sp = scr || (hit ? proj(hit.x, hit.y, hit.z) : { x: g.x, y: g.head.y - g.s });
    if (res === 'head' || res === 'body') {
      dmg = playerDamage(res === 'head');
      G.hpB = Math.max(0, G.hpB - dmg); G.dmgP += dmg; G.roundGain.p += dmg; G.stats.hits++; if (res === 'head') { G.stats.heads++; e.dizzy = 1.3; }
      e.flash = 1.2; e.hitT = 1.0; e.duckTarget = 1;
      addFx({ k: 'pow', x: sp.x, y: sp.y, size: g.s * (res === 'head' ? 0.75 : 0.6), text: res === 'head' ? 'BONK!' : 'POW!', rot: rnd() * 6, life: 0.75, layer: 'world' });
      addFx({ k: 'txt', x: sp.x, y: sp.y - g.s * 0.3, text: (res === 'head' ? 'HEAD! -' : '-') + dmg, col: res === 'head' ? '#ffe14a' : '#fff', size: res === 'head' ? 26 : 26, life: 1.1, layer: 'world' });
      puff(sp.x, sp.y, g.s * 0.3, 'world');
      if (res === 'head' && G.era.bot.look === 'cactus') { e.hatOff = 1; addFx({ k: 'hat', x: g.head.x, y: g.head.y - g.head.r * 1.2, vx: (rnd() < 0.5 ? -1 : 1) * rr(0.6, 1.2) * g.s, vy: 3.4 * g.s, g: 5.5 * g.s, s: g.s, life: 0.95, layer: 'world' }); }
      if (res === 'head') sfx.head(); else sfx.bonk();
      bump('hpBoxB');
      if (G.hpB <= 0) knockOut('bot');
    } else if (res === 'blocked') {
      if (hit && dir) { G.stuck.push({ p: hit, d: dir, t: 0 }); }
      addFx({ k: 'spark', x: sp.x, y: sp.y, size: g.s * 0.5, rot: rnd(), life: 0.45, layer: 'world' });
      addFx({ k: 'txt', x: sp.x, y: sp.y, text: G.era.cover.kind === 'rock' ? 'CLONK!' : 'BLOCKED', col: '#ffe9a0', size: 20, life: 0.9, layer: 'world' });
      sfx.clonk();
    } else {
      if (hit && dir && G.era.shot.kind === 'arc') G.stuck.push({ p: hit, d: dir, t: 0 });
      puff(sp.x, Math.max(sp.y, Y0 + 2), g.s * 0.35, 'world');
      var far = hit && hit.z < e.z - 0.8 ? 'TOO SHORT' : hit && hit.z > e.z + 0.8 ? 'TOO FAR' : 'MISS';
      addFx({ k: 'txt', x: sp.x, y: sp.y, text: far, col: '#ffd0c0', size: 20, life: 0.9, layer: 'world' });
      if (G.era.shot.kind === 'arc') sfx.thud(); else sfx.puff();
    }
    while (G.stuck.length > 8) G.stuck.shift();
    G.lastShot = { id: id || null, res: res, dmg: dmg, landZ: hit ? hit.z : 99, enemyZ: e.z };
    G.shotLog.push(G.lastShot);
    return G.lastShot;
  }
  function hitTest(x, y) {
    var g = enemyGeom(), cg = g.cover;
    if (y >= cg.top && y <= cg.base + 2 && x >= cg.x0 && x <= cg.x1) return 'blocked';
    if (G.phase === 'enemyHide') return 'blocked';
    var dx = x - g.head.x, dy = y - g.head.y;
    if (dx * dx + dy * dy <= Math.pow(g.head.r * 1.1, 2) && y < cg.top) return 'head';
    if (x >= g.body.x0 && x <= g.body.x1 && y >= g.body.y0 && y < Math.min(g.body.y1, cg.top)) return 'body';
    return 'miss';
  }
  function playerFire(x, y) { // hitscan eras (Era 4/5 prototype path)
    if (!canShoot()) return null;
    G.shotsP--; G.cool = coolTime(); G.stats.shots++;
    sfx.shot(); G.shake = 6; G.player.recoil = 1;
    return resolvePlayerShot(hitTest(x, y), null, null, { x: x, y: y });
  }
  function botFire(s) {
    G.shotsB--; s.fired = true;
    var b = G.bot;
    s.intent = G.botForce || (rnd() < b.acc ? (rnd() < b.head ? 'head' : 'hit') : 'miss');
    var g = enemyGeom();
    if (G.era.shot.kind === 'arc') {
      sfx.throw();
      var pc = playerCoverGeom(), x1, y1;
      if (s.intent === 'miss') { x1 = PX + (rnd() < 0.5 ? -1 : 1) * rr(120, 170) * PS; y1 = PY - rr(10, 70) * PS; }
      else { x1 = PX + rr(0, 40) * PS; y1 = pc.base - pc.tall + 12 * PS; }
      G.botSpears.push({ x0: g.hand.x, y0: g.hand.y, x1: x1, y1: y1, t: 0, dur: G.era.bot.flight, L0: 1.0 * g.s, L1: 150 * PS, shot: s });
      G.enemy.throwT = G.era.bot.flight + 0.35;
    } else {
      sfx.shot(); addFx({ k: 'flash', x: g.lens.x, y: g.lens.y, size: g.s * 0.45, rot: rnd(), life: 0.15, layer: 'world' });
      resolveBot(s, null);
    }
  }
  function resolveBot(s, sp) {
    if (s.done) return; s.done = true;
    var p = G.player, res = s.intent, pc = playerCoverGeom(), tx, ty;
    if ((res === 'hit' || res === 'head') && p.duck >= 0.6) res = 'dodge';
    if (G.ko) res = 'miss';
    if (res === 'hit' || res === 'head') {
      var dmg = Math.round(G.bot.dmg * (res === 'head' ? BALANCE.headMult : 1));
      G.hpP = Math.max(0, G.hpP - dmg); G.dmgB += dmg; G.roundGain.b += dmg; G.stats.botHits++;
      tx = PX + 10 * PS; ty = res === 'head' ? PY - 300 * PS : playerTorso().y;
      p.flash = 1.2; p.hitT = 0.5; G.shake = 10;
      addFx({ k: 'pow', x: tx, y: ty, size: 46 * PS, text: res === 'head' ? 'BONK!' : 'POW!', rot: rnd() * 6, life: 0.75, layer: 'near', col: '#ffd1e0' });
      addFx({ k: 'txt', x: tx + 30, y: ty - 30, text: 'OUCH! -' + dmg, col: '#ff9aa8', size: 24, life: 1.0, layer: 'near' });
      sfx.ouch(); bump('hpBoxP');
      if (G.hpP <= 0) knockOut('player');
    } else if (res === 'dodge') {
      G.stats.dodges++;
      tx = sp ? sp.x : pc.x - pc.w * 0.2; ty = pc.base - pc.tall + 14 * PS;
      if (G.era.shot.kind === 'arc') G.nearStuck.push({ x: tx, y: ty, ang: -2.2, L: 150 * PS, w: 9 * PS, t: 0 });
      addFx({ k: 'spark', x: tx, y: ty, size: 40 * PS, rot: rnd(), life: 0.45, layer: 'near' });
      addFx({ k: 'txt', x: tx + 20, y: ty - 20, text: 'DODGED!', col: '#a8ffb8', size: 26, life: 1.0, layer: 'near' });
      sfx.clonk();
    } else {
      tx = sp ? sp.x : PX + (rnd() < 0.5 ? -1 : 1) * rr(110, 150) * PS; ty = sp ? sp.y : PY - rr(40, 110) * PS;
      if (G.era.shot.kind === 'arc') G.nearStuck.push({ x: tx, y: ty, ang: tx < PX ? -2.4 : -0.9, L: 150 * PS, w: 9 * PS, t: 0 });
      puff(tx, ty, 30 * PS, 'near');
      addFx({ k: 'txt', x: tx, y: ty - 10, text: 'WHIFF!', col: '#ffd0c0', size: 22, life: 0.9, layer: 'near' });
      sfx.thud();
    }
    while (G.nearStuck.length > 6) G.nearStuck.shift();
    G.botLog.push(res);
    return res;
  }
  function releaseAim() { G.pointerId = null; G.scopeTarget = 0; G.last = null; G.aiming = false; }
  // ---------- update ----------
  function update(dt) {
    G.time += dt; G.pt += dt;
    var e = G.enemy, p = G.player, era = G.era;
    if (G.coverT < 1) { G.coverT = Math.min(1, G.coverT + dt / 0.4); G.coverH = G.coverFrom + (G.coverTo - G.coverFrom) * easeOut(G.coverT); }
    // enemy AI
    e.flash = Math.max(0, e.flash - dt * 3.5); e.dizzy = Math.max(0, e.dizzy - dt); e.throwT = Math.max(0, (e.throwT || 0) - dt);
    if (e.hatOff > 0 && e.hitT <= 0) e.hatOff = 0;
    var ag = era.agility;
    if (G.ko === 'bot') { e.duckTarget = 0; e.hitT = Math.max(e.hitT, 0.2); }
    else if (e.hitT > 0) { e.hitT -= dt; e.duckTarget = 1; if (e.hitT <= 0) { e.duckTarget = 0; e.actT = rr(0.5, 0.9); } }
    else if (G.phase === 'enemyHide') e.duckTarget = 1;
    else if (G.phase === 'aim' && G.coverT >= 1 && !G.freeze) {
      if (e.duckT > 0) { e.duckT -= dt; if (e.duckT <= 0) e.duckTarget = 0; }
      e.actT -= dt;
      if (e.actT <= 0) {
        var r = rnd();
        if (r < 0.2 + 0.3 * ag) { var nt, tr = 0; do { nt = e.baseWx + rr(-1, 1) * (0.4 + 0.6 * ag); tr++; } while (Math.abs(nt - e.wx) < 0.3 && tr < 10); e.tx = nt; e.actT = rr(0.9, 1.6) * (1.4 - ag * 0.6); }
        else if (r < 0.32 + 0.46 * ag) { e.duckTarget = 1; e.duckT = rr(0.35, 0.55 + 0.2 * ag); e.actT = e.duckT + rr(0.5, 1.0); }
        else e.actT = rr(0.8, 1.6) * (1.4 - ag * 0.6);
      }
    } else if (G.phase === 'aim') { if (G.coverT >= 1 && !G.freeze) e.duckTarget = 0; }
    else if (G.phase === 'menu' || G.phase === 'over') {
      e.duckTarget = 0; e.actT -= dt;
      if (e.actT <= 0) { e.tx = e.baseWx + rr(-0.7, 0.7); e.actT = rr(1.2, 2.2); }
    } else { e.duckTarget = 0; e.tx = approach(e.tx, e.baseWx, dt); }
    e.duck = approach(e.duck, e.duckTarget, dt * 6);
    e.wx = approach(e.wx, e.tx, dt * (1.0 + 1.4 * ag));

    // player duck / stamina
    p.flash = Math.max(0, p.flash - dt * 3.5); p.recoil = Math.max(0, p.recoil - dt * 5); p.hitT = Math.max(0, p.hitT - dt);
    G.duckHeld = G.keyDuck || G.btnDuck || G.ptrDuck;
    var want = G.phase === 'playerHide' || G.phase === 'swap' ? 1 : (G.phase === 'botFire' && G.duckHeld && !p.tired) ? 1 : 0;
    if (G.ko === 'player') want = 1;
    p.duck = approach(p.duck, want, dt * 9);
    if (G.phase === 'botFire') {
      if (p.duck > 0.5) p.stam -= CFG.drain * dt; else p.stam += CFG.regen * dt;
      p.stam = clamp(p.stam, 0, 1);
      if (!p.tired && p.stam <= 0) { p.tired = true; addFx({ k: 'txt', x: PX + 30, y: PY - 330 * PS, text: 'OUT OF BREATH!', col: '#ffb0b0', size: 20, life: 1.1, layer: 'near' }); }
      if (p.tired && p.stam >= CFG.tiredUntil) p.tired = false;
    }
    if (era.cover.kind === 'halftone') {
      var pcg = playerCoverGeom();
      var pcT = (G.phase === 'swap' || G.phase === 'playerHide') ? pcg.tall : (G.phase === 'botFire' || G.phase === 'roundEnd') ? pcg.low : 0;
      G.pcH = approach(G.pcH, pcT, dt * pcg.tall * (pcT < G.pcH && pcT > 0 ? 4 : 2.2));
    }
    if (G.scopeHold > 0) G.scopeHold -= dt;
    var st = G.scopeTarget > 0 || G.scopeHold > 0 ? 1 : 0;
    G.scope = approach(G.scope, st, dt / (st ? 0.16 : 0.2));
    G.shake = Math.max(0, G.shake - dt * 30);
    if (G.cool > 0) G.cool -= dt;

    for (var i = G.fx.length - 1; i >= 0; i--) { G.fx[i].t += dt; if (G.fx[i].t >= G.fx[i].life) G.fx.splice(i, 1); }
    for (var k = G.stuck.length - 1; k >= 0; k--) { G.stuck[k].t += dt; if (G.stuck[k].t > 2.5) G.stuck.splice(k, 1); }
    for (var m = G.nearStuck.length - 1; m >= 0; m--) { G.nearStuck[m].t += dt; if (G.nearStuck[m].t > 2.5) G.nearStuck.splice(m, 1); }
    if (G.proj.length) stepProj(dt);
    for (var b = G.botSpears.length - 1; b >= 0; b--) {
      var bs = G.botSpears[b]; bs.t += dt;
      if (bs.t >= bs.dur) { G.botSpears.splice(b, 1); resolveBot(bs.shot, { x: bs.x1, y: bs.y1 }); }
    }

    if (G.ko) { G.koT -= dt; if (G.koT <= 0 && G.phase !== 'over') matchOver('ko'); return; }

    switch (G.phase) {
      case 'enemyHide':
      case 'playerHide': {
        var n = Math.max(1, CFG.hide - Math.floor(G.pt));
        if (n !== G.countNum) { G.countNum = n; showCount(n); sfx.beep(n === 1); }
        if (G.pt >= CFG.hide) { if (G.phase === 'enemyHide') startAim(); else startBotFire(); }
        break;
      }
      case 'aim':
        G.timeLeft = era.aimTime - G.pt;
        if (!bannerT) hint(G.shotsP > 0 && !G.timeUp ? era.hints.aim : '');
        if (G.timeLeft <= 0 && !G.timeUp) { G.timeUp = true; releaseAim(); if (G.shotsP > 0) banner("TIME'S UP!", 'go', 1); }
        if (!G.ending && (G.shotsP <= 0 || G.timeUp) && !G.proj.length) { G.ending = true; G.endT = 0.9; }
        if (G.ending) { G.endT -= dt; if (G.endT <= 0) endAim(); }
        break;
      case 'swap':
        if (G.pt >= 1.4) startPlayerHide();
        break;
      case 'botFire': {
        G.timeLeft = era.botTime - G.pt;
        if (!bannerT) hint(G.shotsB > 0 ? era.hints.bot : '');
        var tl = 0;
        for (var j = 0; j < G.botShots.length; j++) {
          var s = G.botShots[j];
          if (!s.told && G.pt >= s.tellAt) { s.told = true; sfx.glint(); }
          if (s.told && !s.fired) tl = Math.max(tl, 0.55 + 0.45 * Math.sin((G.pt - s.tellAt) * 14));
          if (!s.fired && G.pt >= s.fireAt) botFire(s);
        }
        G.tell = tl;
        var allDone = G.botShots.every(function (x) { return x.done; });
        if (!G.ending && allDone) { G.ending = true; G.endT = 1.0; }
        if (G.ending) { G.endT -= dt; if (G.endT <= 0) endRound(); }
        else if (G.timeLeft <= -2) endRound();
        break;
      }
      case 'roundEnd':
        if (G.pt >= 1.9) nextRound();
        break;
    }
  }

  // ---------- render ----------
  function drawGuide(c, sx, sy) {
    var O = launchOrigin(), d = aimDir(sx, sy), v = G.era.shot.speed, g = G.era.shot.g, e = G.enemy, pts = [];
    for (var t = 0; t < 3; t += 0.035) {
      var x = O.x + d.x * v * t, y = O.y + d.y * v * t - 0.5 * g * t * t, z = O.z + d.z * v * t;
      if (y < 0 || z > e.z + 1) break;
      pts.push(proj(x, y, z));
    }
    var n = Math.max(4, Math.floor(pts.length * clamp(guideLen(), 0, 1)));
    c.save();
    for (var i = 1; i < Math.min(n, pts.length); i++) {
      var q = pts[i], a = 1 - i / (n + 2), r = Math.max(2, Math.min(5.5, 0.06 * q.s));
      c.globalAlpha = 0.35 + 0.6 * a;
      c.fillStyle = 'rgba(40,16,40,.6)'; c.beginPath(); c.arc(q.x, q.y + 1, r + 1.5, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(q.x, q.y, r, 0, 7); c.fill();
    }
    if (G.era.shot.ring && pts.length > 2) {
      // Ring = where the spear crosses the enemy's depth (or lands, if it falls short first).
      var tz = d.z > 0.01 ? (e.z - O.z) / (d.z * v) : 3, ty = O.y + d.y * v * tz - 0.5 * g * tz * tz;
      if (ty < 0) { var A = 0.5 * g, B = -d.y * v; tz = (-B + Math.sqrt(B * B + 4 * A * O.y)) / (2 * A); ty = 0.02; }
      var end = proj(O.x + d.x * v * tz, ty, O.z + d.z * v * tz), rr2 = Math.max(9, 0.26 * end.s);
      c.globalAlpha = 0.85; c.lineWidth = 2.5; c.strokeStyle = 'rgba(40,16,40,.55)'; c.beginPath(); c.arc(end.x, end.y + 1, rr2, 0, 7); c.stroke();
      c.strokeStyle = '#fff'; c.setLineDash([4, 4]); c.beginPath(); c.arc(end.x, end.y, rr2, 0, 7); c.stroke(); c.setLineDash([]);
    }
    c.restore();
  }
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var sh = G.shake;
    if (sh > 0) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    ctx.drawImage(bg, 0, 0, W, H);
    drawEnemyLayer(ctx, DPR);
    drawFx(ctx, 'world');
    var pc = playerCoverGeom();
    if (G.era.cover.kind === 'halftone') { if (G.pcH > 1) drawCover(ctx, pc.x, pc.base, pc.w, G.pcH, DPR, true); }
    else drawBigRock(ctx, pc.x, pc.base, 1, pc.w, pc.tall);
    drawPlayer(ctx);
    drawNearSpears(ctx);
    drawFx(ctx, 'near');
    if (G.era.shot.kind === 'hitscan') drawScope(ctx);
    if (G.phase === 'aim' && G.era.shot.kind === 'arc' && canShoot()) {
      if (G.aiming) drawGuide(ctx, G.aim.x, G.aim.y);
      else if (G.hover) drawGuide(ctx, G.hover.x, G.hover.y);
    }
    if (G.phase === 'aim' && G.era.shot.kind === 'hitscan' && G.scope < 0.3 && G.hover && canShoot()) drawCrosshair(ctx, G.hover.x, G.hover.y);
    drawTexts(ctx);
    if (G.tell > 0 && G.phase === 'botFire') {
      var vg = ctx.createRadialGradient(CX, H / 2, Math.min(W, H) * 0.4, CX, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(255,40,70,0)'); vg.addColorStop(1, 'rgba(255,40,70,' + (0.3 * G.tell) + ')');
      ctx.fillStyle = vg; ctx.fillRect(-20, -20, W + 40, H + 40);
    }
  }
  var lastT = 0;
  function loop(now) {
    var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016; lastT = now;
    if (!G.paused) update(dt * G.ts);
    updHud(dt * G.ts);
    render();
    requestAnimationFrame(loop);
  }
  function resize() {
    var r = app.getBoundingClientRect();
    W = Math.max(200, r.width); H = Math.max(300, r.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    CX = W / 2; Y0 = H * 0.52; FOC = Math.min(W * 1.12, H * 0.56);
    PS = Math.min(W / 390, H / 844) * 0.76; PX = W * 0.2; PY = H - Math.max(12, H * 0.015);
    coverCache.clear();
    buildBg();
  }

  // ---------- input ----------
  function pos(ev) { var r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
  function clampAim(p) { return { x: clamp(p.x, 0, W), y: clamp(p.y, H * 0.08, H * 0.92) }; }
  cv.addEventListener('pointerdown', function (ev) {
    audio(); ev.preventDefault();
    if (G.phase === 'aim') {
      if (G.pointerId !== null || !canShoot()) return;
      G.pointerId = ev.pointerId; try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
      var p = clampAim(pos(ev));
      G.aim.x = p.x; G.aim.y = p.y; G.last = pos(ev); G.pressT = G.time;
      if (G.era.shot.kind === 'arc') G.aiming = true; else G.scopeTarget = 1;
    } else if (G.phase === 'botFire' || G.phase === 'playerHide') {
      G.ptrDuck = true; G.pointerId = ev.pointerId; try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    }
  });
  cv.addEventListener('pointermove', function (ev) {
    var p = pos(ev);
    if (ev.pointerType === 'mouse') G.hover = clampAim(p);
    if (G.phase !== 'aim' || ev.pointerId !== G.pointerId || !G.last) return;
    if (G.era.shot.kind === 'arc') { var a = clampAim(p); G.aim.x = a.x; G.aim.y = a.y; G.last = p; return; }
    var z = 1 + (G.era.shot.zoom - 1) * easeOut(G.scope), k = G.era.shot.sens / z;
    G.aim.x = clamp(G.aim.x + (p.x - G.last.x) * k, 0, W);
    G.aim.y = clamp(G.aim.y + (p.y - G.last.y) * k, H * 0.2, H * 0.9);
    G.last = p;
  });
  function endPress(ev, fire) {
    if (ev.pointerId !== G.pointerId) return;
    if (G.ptrDuck) { G.ptrDuck = false; G.pointerId = null; return; }
    if (G.phase === 'aim' && fire && G.last) {
      if (G.era.shot.kind === 'arc') { var ax = G.aim.x, ay = G.aim.y; releaseAim(); playerThrow(ax, ay); return; }
      var held = G.time - G.pressT, steady = held >= 0.22 && G.scope > 0.7;
      var sw = swayOffset(), x = G.aim.x + sw.x * easeOut(G.scope), y = G.aim.y + sw.y * easeOut(G.scope);
      if (!steady) { var an = rnd() * 6.283, d = rnd() * 9; x += Math.cos(an) * d; y += Math.sin(an) * d; }
      releaseAim(); G.scopeHold = 0.35;
      playerFire(x, y);
    } else releaseAim();
  }
  cv.addEventListener('pointerup', function (ev) { endPress(ev, true); });
  cv.addEventListener('pointercancel', function (ev) { endPress(ev, false); });
  cv.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') G.hover = null; });
  var db = $('duckBtn');
  db.addEventListener('pointerdown', function (ev) { audio(); ev.preventDefault(); G.btnDuck = true; try { db.setPointerCapture(ev.pointerId); } catch (e) {} });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { db.addEventListener(n, function () { G.btnDuck = false; }); });
  window.addEventListener('keydown', function (ev) {
    audio();
    if (ev.code === 'Space' || ev.code === 'ArrowDown' || ev.code === 'KeyS') { G.keyDuck = true; if (G.phase === 'botFire') ev.preventDefault(); }
    if (ev.code === 'Enter' && (G.phase === 'menu' || G.phase === 'over') && !$('shop').classList.contains('show')) startMatch(ERA_BY_ID[SAVE.last] && ERA_BY_ID[SAVE.last].built ? ERA_BY_ID[SAVE.last] : ERAS[0]);
    if (ev.code === 'KeyM') setMuted(!muted);
  });
  window.addEventListener('keyup', function (ev) { if (ev.code === 'Space' || ev.code === 'ArrowDown' || ev.code === 'KeyS') G.keyDuck = false; });
  window.addEventListener('blur', function () { G.keyDuck = G.btnDuck = G.ptrDuck = false; });
  document.addEventListener('touchend', audio, { passive: true });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  // ---------- drawn icons (inline SVG, no assets) ----------
  var AVATARS = {
    cave: '<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#ffb36b"/><rect y="36" width="48" height="12" fill="#e8962a"/><circle cx="16" cy="42" r="2.5" fill="#7a3e16"/><circle cx="32" cy="44" r="2.5" fill="#7a3e16"/><ellipse cx="24" cy="25" rx="11" ry="12" fill="#f0b088"/><path d="M11 24l-2-7 5 1-1-7 6 3 2-6 4 5 4-5 2 6 6-3-1 7 5-1-2 7c-3-5-7-7-13-7s-10 2-13 7z" fill="#3a2418"/><path d="M17 22h14" stroke="#3a2418" stroke-width="2.4" stroke-linecap="round"/><circle cx="20" cy="26" r="1.8" fill="#1d1a24"/><circle cx="28" cy="26" r="1.8" fill="#1d1a24"/><circle cx="24" cy="29.5" r="2.4" fill="#d8906a"/><path d="M20 33q4 3 8 0" stroke="#7a3b35" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    caveman: '<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#8fd0ff"/><rect y="38" width="48" height="10" fill="#f0a030"/><ellipse cx="24" cy="26" rx="12" ry="12" fill="#e8a878"/><path d="M10 25l-3-8 6 1-1-8 6 4 2-7 4 6 4-6 2 7 6-4-1 8 6-1-3 8c-3-6-8-8-14-8s-11 2-14 8z" fill="#6b3a1e"/><path d="M14 33q10 10 20 0q-4 6-10 6t-10-6z" fill="#6b3a1e"/><path d="M16 22h16" stroke="#6b3a1e" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="26" r="2.6" fill="#fff"/><circle cx="28" cy="26" r="2.6" fill="#fff"/><circle cx="20.5" cy="26.3" r="1.3" fill="#1d1a24"/><circle cx="28.5" cy="26.3" r="1.3" fill="#1d1a24"/><circle cx="24" cy="30" r="3.2" fill="#d98a60"/><rect x="22" y="34" width="2.4" height="2.4" fill="#fff"/></svg>',
    modern: '<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#7fc8ff"/><path d="M14 48c0-8 4-12 10-12s10 4 10 12z" fill="#b8384b"/><ellipse cx="24" cy="24" rx="11" ry="12" fill="#f5b595"/><path d="M11 19c2-8 8-11 14-11s11 2 13 8l-2 1c-3-3-7-4-11-4s-9 2-12 7z" fill="#e8434a"/><circle cx="20" cy="25" r="1.8" fill="#2b2230"/><circle cx="28" cy="25" r="1.8" fill="#2b2230"/><path d="M20 30q4 3 8 0" stroke="#7a3b35" stroke-width="1.6" fill="none"/></svg>',
    cactus: '<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#ffc46b"/><rect x="13" y="16" width="22" height="34" rx="11" fill="#4cb05f"/><path d="M8 17c0-2 7-4 16-4s16 2 16 4-7 3-16 3S8 19 8 17z" fill="#b8652d"/><path d="M15 15c0-6 4-9 9-9s9 3 9 9z" fill="#c9793a"/><circle cx="20" cy="26" r="3.2" fill="#fff"/><circle cx="28" cy="26" r="3.2" fill="#fff"/><circle cx="20.6" cy="26.4" r="1.6" fill="#1d1a24"/><circle cx="28.6" cy="26.4" r="1.6" fill="#1d1a24"/></svg>'
  };
  var AMMO_ICONS = {
    spear: '<svg viewBox="0 0 16 46"><path d="M8 1l5 11H3z" fill="#c4c8d0" stroke="#6e7280" stroke-width="1"/><rect x="6.5" y="11" width="3" height="34" rx="1.5" fill="#a0663a"/><rect x="5.5" y="12" width="5" height="4" fill="#7a4a2e"/></svg>',
    bullet: '<svg viewBox="0 0 16 46"><path d="M3 18Q3 4 8 2q5 2 5 16v26H3z" fill="#e2a520"/><rect x="3" y="32" width="10" height="12" fill="#b8791a"/></svg>',
    arrow: '<svg viewBox="0 0 16 46"><path d="M8 1l4 8H4z" fill="#ccc"/><rect x="7" y="8" width="2" height="34" fill="#a0663a"/><path d="M8 36l-4 8M8 36l4 8" stroke="#e8434a" stroke-width="2"/></svg>',
    ball: '<svg viewBox="0 0 16 46"><circle cx="8" cy="30" r="7" fill="#444"/></svg>',
    cell: '<svg viewBox="0 0 16 46"><rect x="3" y="10" width="10" height="32" rx="3" fill="#39e0ff"/></svg>'
  };
  var ERA_ICONS = {
    stone: '<svg viewBox="0 0 58 58"><defs><linearGradient id="i1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a2c8a"/><stop offset="1" stop-color="#ffb36a"/></linearGradient></defs><rect width="58" height="58" fill="url(#i1)"/><circle cx="22" cy="40" r="10" fill="#ffe08a"/><rect y="40" width="58" height="18" fill="#e8955e"/><path d="M8 48c0-9 6-13 14-13s12 4 13 13z" fill="#b88c70"/><path d="M14 30Q30 6 48 26" stroke="#fff" stroke-width="2" stroke-dasharray="2 4" fill="none"/><path d="M40 14l10 16" stroke="#a0663a" stroke-width="3" stroke-linecap="round"/><path d="M37 9l5 2-2 5z" fill="#c4c8d0"/></svg>',
    castle: '<svg viewBox="0 0 58 58"><rect width="58" height="58" fill="#7ec3f0"/><rect y="42" width="58" height="16" fill="#6ab04c"/><path d="M12 44V20h6v4h5v-4h6v4h5v-4h6v24z" fill="#b0a898"/><rect x="24" y="32" width="10" height="12" rx="5" fill="#5a4a3a"/><path d="M6 12l40 10" stroke="#8a5a3a" stroke-width="2.4"/><path d="M46 22l-6 1 3-5z" fill="#ccc"/></svg>',
    wildwest: '<svg viewBox="0 0 58 58"><rect width="58" height="58" fill="#ffc46b"/><rect y="40" width="58" height="18" fill="#d9a066"/><rect x="18" y="24" width="20" height="24" rx="6" fill="#a0663a"/><path d="M18 30h20M18 42h20" stroke="#5a3a20" stroke-width="2.4"/><path d="M46 44V26m0 8h-4v-5m4 8h4v-6" stroke="#3f9a5c" stroke-width="3.4" stroke-linecap="round" fill="none"/></svg>',
    modern: '<svg viewBox="0 0 58 58"><defs><linearGradient id="i4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a2f92"/><stop offset="1" stop-color="#ffb35c"/></linearGradient></defs><rect width="58" height="58" fill="url(#i4)"/><rect y="40" width="58" height="18" fill="#ec8d84"/><rect x="16" y="32" width="26" height="12" rx="6" fill="#ffd83a"/><circle cx="29" cy="24" r="11" stroke="#fff" stroke-width="3" fill="none"/><path d="M29 9v9M29 30v9M14 24h9M35 24h9" stroke="#fff" stroke-width="3"/></svg>',
    space: '<svg viewBox="0 0 58 58"><rect width="58" height="58" fill="#1a1740"/><circle cx="10" cy="10" r="1.2" fill="#fff"/><circle cx="46" cy="16" r="1" fill="#fff"/><circle cx="30" cy="6" r="1" fill="#fff"/><circle cx="40" cy="32" r="9" fill="#b58cff"/><ellipse cx="40" cy="32" rx="15" ry="4" stroke="#ffd23f" stroke-width="2" fill="none"/><rect y="46" width="58" height="12" fill="#9aa0b8"/><path d="M6 36l18-6" stroke="#39e0ff" stroke-width="3" stroke-linecap="round"/></svg>'
  };
  function weaponIcon(w) { return '<svg viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#3a2a5e"/><path d="M12 46L40 16" stroke="#a0663a" stroke-width="5" stroke-linecap="round"/><path d="M36 20l3-3" stroke="#7a4a2e" stroke-width="8"/><path d="M38 8l10 2-2 10z" fill="' + (w.tip || '#ccc') + '" stroke="rgba(0,0,0,.35)" stroke-width="1"/></svg>'; }
  function outfitIcon(o) {
    var L = o.look || { tunic: '#999', spot: '#666' };
    var s = '<svg viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#3a2a5e"/><path d="M16 14h10l14 8-2 26H18l-4-26z" fill="' + L.tunic + '"/>';
    if (L.spots) s += '<circle cx="22" cy="26" r="2.4" fill="' + L.spot + '"/><circle cx="32" cy="34" r="2.4" fill="' + L.spot + '"/><circle cx="24" cy="40" r="2.4" fill="' + L.spot + '"/>';
    if (L.leaf) s += '<path d="M18 48l4-5 4 5 4-5 4 5 4-5" stroke="#4f9a3c" stroke-width="3" fill="none"/>';
    if (L.cloak) s += '<path d="M10 16q18-8 36 0l-2 30-4-3-4 4-4-4-4 4-4-4-4 4-4-4z" fill="' + L.cloak + '" opacity=".95"/>';
    if (L.bones) s += '<path d="M18 26h20M19 32h18M20 38h16" stroke="#f4ecd6" stroke-width="3" stroke-linecap="round"/><ellipse cx="15" cy="17" rx="5" ry="3.5" fill="#f4ecd6"/><ellipse cx="41" cy="19" rx="5" ry="3.5" fill="#f4ecd6"/>';
    return s + '</svg>';
  }

  // ---------- menu / era map / shop / end screen ----------
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function progressText(t, unlocked) {
    var ni = nextEraInfo(t, unlocked);
    return ni ? { frac: ni.frac, label: ni.era.name + ' at 🏆 ' + fmt(ni.need) + ' · ' + fmt(ni.left) + ' to go' } : { frac: 1, label: 'All eras unlocked!' };
  }
  function renderMenu() {
    $('mTro').textContent = fmt(SAVE.trophies);
    var pt = progressText(SAVE.trophies, SAVE.unlocked);
    $('mBar').style.width = (pt.frac * 100).toFixed(1) + '%'; $('mBarLbl').textContent = pt.label;
    $('mCoins').textContent = fmt(SAVE.coins);
    $('mStreak').textContent = (SAVE.streak > 0 ? '🔥 ' + SAVE.streak + ' win streak' : '🔥 No streak yet') + (SAVE.bestStreak > 1 ? ' · best ' + SAVE.bestStreak : '');
    $('mStreak').title = 'Best: ' + SAVE.bestStreak;
  }
  function showMenu() { hideOverlays(); G.phase = 'menu'; banner(''); hint(''); showCount(0); renderMenu(); $('menu').classList.add('show'); }
  function renderEraMap() {
    var th = BALANCE.trophies.thresholds, h = '';
    ERAS.forEach(function (e, i) {
      var un = isUnlocked(i), cls = !un ? 'locked' : !e.built ? 'soon' : 'ready';
      var tag = !un ? '🔒 🏆 ' + fmt(th[i]) + ' to unlock<br><span class="eprog">' + fmt(SAVE.trophies) + ' / ' + fmt(th[i]) + '</span>' : !e.built ? 'Coming soon' : 'PLAY ▶';
      h += '<button class="era ' + cls + '" data-i="' + i + '"><span class="eicon">' + ERA_ICONS[e.id] + '</span>' + (!un ? '<span class="lock">🔒</span>' : '') +
        '<span class="etext"><b>' + (i + 1) + '. ' + e.name + '</b><small>' + e.weapon + '</small></span><span class="etag">' + tag + '</span></button>';
    });
    $('eraList').innerHTML = h;
    $('eraTro').textContent = '🏆 ' + fmt(SAVE.trophies);
    $('eraHint').textContent = '';
  }
  function showEraMap() { hideOverlays(); G.phase = 'menu'; banner(''); hint(''); showCount(0); renderEraMap(); $('eras').classList.add('show'); }
  function eraHint(msg) { var el = $('eraHint'); el.textContent = msg; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  function tapEra(i) {
    var e = ERAS[i], th = BALANCE.trophies.thresholds;
    if (!isUnlocked(i)) { eraHint('Reach 🏆 ' + fmt(th[i]) + ' to unlock ' + e.name + ' (' + fmt(Math.max(0, th[i] - SAVE.trophies)) + ' to go). Win matches for +' + BALANCE.trophies.win + '!'); return 'locked'; }
    if (!e.built) { eraHint(e.name + ' (' + e.weapon + ') is coming soon! Keep duelling in the Stone Age.'); return 'soon'; }
    startMatch(e); return 'play';
  }
  var shopFrom = 'menu', shopTab = 'weapons';
  function shopEra() { return ERAS[0]; } // only Stone Age gear is built in this version
  function itemState(kind, it, list) {
    var era = shopEra(), owned = SAVE.owned[kind].indexOf(it.id) >= 0, eq = SAVE.equip[kind][era.id] === it.id;
    if (eq) return 'equipped';
    if (owned) return 'owned';
    if (kind === 'weapons') { var i = list.indexOf(it); if (i > 0 && SAVE.owned.weapons.indexOf(list[i - 1].id) < 0) return 'locked'; }
    return SAVE.coins >= it.cost ? 'buy' : 'poor';
  }
  function renderShop() {
    var era = shopEra(), list = BALANCE[shopTab][era.id], h = '';
    $('sCoins').textContent = fmt(SAVE.coins);
    Array.prototype.forEach.call(document.querySelectorAll('#shopTabs button'), function (b) { setClass(b, 'on', b.getAttribute('data-tab') === shopTab); });
    list.forEach(function (it, i) {
      var st = itemState(shopTab, it, list), stat, btn;
      if (shopTab === 'weapons') stat = 'Damage <b>' + it.dmg + '</b> · head ' + it.dmg * BALANCE.headMult + (it.note ? '<br>' + it.note : '');
      else stat = 'Health <b>' + (BALANCE.player.baseHealth + it.hp) + '</b>' + (it.dmgBonus ? ' · +' + Math.round(it.dmgBonus * 100) + '% damage' : '') + (it.note ? '<br>' + it.note : '');
      if (st === 'equipped') btn = '<button class="sbtn eq" disabled>EQUIPPED</button>';
      else if (st === 'owned') btn = '<button class="sbtn own" data-act="equip" data-id="' + it.id + '">EQUIP</button>';
      else if (st === 'locked') btn = '<button class="sbtn lockd" data-act="locked" data-id="' + it.id + '">🔒 ' + list[i - 1].name + ' first</button>';
      else btn = '<button class="sbtn ' + (st === 'poor' ? 'poor' : 'buy') + '" data-act="buy" data-id="' + it.id + '">🪙 ' + fmt(it.cost) + '</button>';
      h += '<div class="item ' + st + '" data-id="' + it.id + '"><span class="iicon">' + (shopTab === 'weapons' ? weaponIcon(it) : outfitIcon(it)) + '</span><span class="itext"><b>' + it.name + '</b><small>' + stat + '</small></span>' + btn + '</div>';
    });
    $('shopList').innerHTML = h;
  }
  function shopMsg(m) { var el = $('shopMsg'); el.textContent = m; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  function showShop(from) { shopFrom = from || 'menu'; hideOverlays(); G.phase = 'menu'; banner(''); hint(''); showCount(0); renderShop(); $('shopMsg').textContent = 'Pretend coins: earn them by playing matches.'; $('shop').classList.add('show'); }
  function findItem(kind, id) { var era = shopEra(), list = BALANCE[kind][era.id]; for (var i = 0; i < list.length; i++) if (list[i].id === id) return { it: list[i], list: list, era: era }; return null; }
  // Atomic purchase: build the new save, write it, and only then adopt it.
  function buyItem(kind, id) {
    var f = findItem(kind, id); if (!f) return 'unknown';
    var st = itemState(kind, f.it, f.list);
    if (st === 'owned' || st === 'equipped') return 'owned';
    if (st === 'locked') return 'locked';
    if (st === 'poor') return 'poor';
    var n = cloneSave(SAVE);
    n.coins -= f.it.cost; n.owned[kind].push(id); n.equip[kind][f.era.id] = id;
    if (!writeSave(n)) return 'error';
    SAVE = n; sfx.coin();
    return 'ok';
  }
  function equipItem(kind, id) {
    var f = findItem(kind, id); if (!f || SAVE.owned[kind].indexOf(id) < 0) return 'notowned';
    var n = cloneSave(SAVE); n.equip[kind][f.era.id] = id;
    if (!writeSave(n)) return 'error';
    SAVE = n; return 'ok';
  }
  function shopClick(act, id) {
    var f = findItem(shopTab, id); if (!f) return;
    if (act === 'buy') {
      var r = buyItem(shopTab, id);
      if (r === 'ok') shopMsg('Got it! ' + f.it.name + ' is equipped.');
      else if (r === 'poor') shopMsg('You need ' + fmt(f.it.cost - SAVE.coins) + ' more coins. Play matches to earn more!');
      else if (r === 'error') shopMsg("Couldn't save right now, so nothing was spent. Try again.");
    } else if (act === 'equip') { if (equipItem(shopTab, id) === 'ok') shopMsg(f.it.name + ' equipped.'); }
    else if (act === 'locked') shopMsg('Buy the upgrades in order.');
    renderShop();
  }
  var endAnim = null;
  function showEnd(rw) {
    var r = G.result, t = $('oTitle'), bot = G.era.bot.name;
    t.textContent = r === 'win' ? 'YOU WIN!' : r === 'lose' ? 'YOU LOSE' : 'DRAW!';
    t.className = 'endTitle' + (r === 'lose' ? ' lose' : '');
    var why = G.reason === 'ko' ? (r === 'win' ? 'Knockout in round ' + Math.min(G.round, 99) + '!' : bot + ' bonked you in round ' + G.round + '.')
      : G.reason === 'points' ? (G.sudden ? 'Decided in sudden death!' : 'Most damage after 5 rounds.') : 'Still tied after sudden death.';
    $('oSub').textContent = why;
    $('oP').textContent = G.dmgP; $('oB').textContent = G.dmgB;
    $('oHpP').textContent = Math.ceil(G.hpP) + ' HP left'; $('oHpB').textContent = Math.ceil(G.hpB) + ' HP left';
    var s = G.stats;
    $('oStats').textContent = 'Hits ' + s.hits + '/' + s.shots + ' · Head hits ' + s.heads + ' · Dodges ' + s.dodges;
    var sb = $('oStreak');
    if (r === 'win' && rw.streak >= 2) { sb.textContent = '🔥 ' + rw.streak + ' WIN STREAK'; sb.classList.add('show'); } else { sb.textContent = ''; sb.classList.remove('show'); }
    var dtxt;
    if (r === 'win') dtxt = '+' + rw.trophyBase + (rw.streakBonus ? ' +' + rw.streakBonus + ' streak' : '');
    else if (r === 'lose') dtxt = (rw.floored ? rw.trophyBase + ' · era floor keeps you at ' + fmt(rw.to) : String(rw.trophyBase)) + (rw.delta !== rw.trophyBase && !rw.floored ? ' (' + rw.delta + ')' : '');
    else dtxt = '+0';
    var chip = $('oDelta'); chip.textContent = dtxt; chip.className = 'delta ' + (rw.delta > 0 ? 'up' : rw.delta < 0 ? 'down' : 'flat'); void chip.offsetWidth; chip.classList.add('anim');
    $('oCoins').textContent = '+' + rw.coins + (rw.coinBonus ? ' +' + rw.coinBonus + ' streak' : '') + ' 🪙 · total ' + fmt(rw.save.coins);
    var from = progressText(rw.from, rw.save.unlocked - (rw.unlockedNew ? 1 : 0)), to = progressText(rw.to, rw.save.unlocked);
    var bar = $('oBar'); bar.style.transition = 'none'; bar.style.width = (from.frac * 100).toFixed(1) + '%'; void bar.offsetWidth;
    bar.style.transition = ''; bar.style.width = (rw.unlockedNew ? 100 : to.frac * 100).toFixed(1) + '%';
    $('oBarLbl').textContent = rw.unlockedNew ? '🔓 ' + rw.unlockedNew.name + ' unlocked! (coming soon)' : to.label;
    var t0 = performance.now(), el = $('oTro');
    if (endAnim) clearInterval(endAnim);
    el.textContent = fmt(rw.from);
    endAnim = setInterval(function () {
      var u = Math.min(1, (performance.now() - t0) / 900);
      el.textContent = fmt(Math.round(rw.from + (rw.to - rw.from) * easeOut(u)));
      if (u >= 1) { clearInterval(endAnim); endAnim = null; }
    }, 30);
    $('over').classList.add('show');
  }
  $('playBtn').addEventListener('click', function () { audio(); showEraMap(); });
  $('menuShopBtn').addEventListener('click', function () { audio(); showShop('menu'); });
  $('erasBack').addEventListener('click', function () { showMenu(); });
  $('eraList').addEventListener('click', function (ev) { var b = ev.target.closest('.era'); if (b) { audio(); tapEra(+b.getAttribute('data-i')); } });
  $('againBtn').addEventListener('click', function () { audio(); startMatch(G.era); });
  $('mapBtn').addEventListener('click', function () { audio(); showEraMap(); });
  $('endShopBtn').addEventListener('click', function () { audio(); showShop('over'); });
  $('shopBack').addEventListener('click', function () { if (shopFrom === 'over') { hideOverlays(); $('over').classList.add('show'); G.phase = 'over'; } else showMenu(); });
  $('shopTabs').addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) { shopTab = b.getAttribute('data-tab'); renderShop(); } });
  $('shopList').addEventListener('click', function (ev) { var b = ev.target.closest('button[data-act]'); if (b) { audio(); shopClick(b.getAttribute('data-act'), b.getAttribute('data-id')); } });
  $('muteBtn').addEventListener('click', function () { audio(); setMuted(!muted); });

  // ---------- test hook ----------
  window.__toss = {
    G: G, BALANCE: BALANCE, ERAS: ERAS, CFG: CFG,
    save: function () { return cloneSave(SAVE); }, rawSave: function () { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } },
    saveKey: SAVE_KEY, saveWasCorrupt: function () { return saveWasCorrupt; },
    resetSave: function () { SAVE = defaultSave(); writeSave(SAVE); renderMenu(); },
    setTrophies: function (n) { var s = cloneSave(SAVE); s.trophies = 0; s.unlocked = 0; SAVE = withTrophies(s, n); writeSave(SAVE); renderMenu(); return SAVE.trophies; },
    addTrophies: function (d) { SAVE = withTrophies(SAVE, d); writeSave(SAVE); return SAVE.trophies; },
    unlockAll: function () { var s = cloneSave(SAVE); s.unlocked = ERAS.length - 1; s.trophies = Math.max(s.trophies, BALANCE.trophies.thresholds[ERAS.length - 1]); SAVE = s; writeSave(SAVE); renderMenu(); },
    setCoins: function (n) { SAVE.coins = n; writeSave(SAVE); renderMenu(); },
    setStreak: function (n) { SAVE.streak = n; writeSave(SAVE); },
    failWrites: function (b) { failWrites = !!b; },
    buy: buyItem, equip: equipItem, tapEra: tapEra, showShop: showShop, showEraMap: showEraMap, showMenu: showMenu,
    reward: function (result, eraId) { var rw = matchReward(SAVE, ERA_BY_ID[eraId || 'stone'], result); writeSave(rw.save); SAVE = rw.save; return rw; },
    seed: function (n) { setSeed(n); },
    start: function (eraId) { return startMatch(ERA_BY_ID[eraId || 'stone']); },
    devStart: function (eraId) { var e = ERA_BY_ID[eraId]; setEra(e); var b = e.built; e.built = true; var u = SAVE.unlocked; SAVE.unlocked = 4; startMatch(e); e.built = b; SAVE.unlocked = u; },
    pause: function (b) { G.paused = b !== false; },
    step: function (sec, fps, noRender) { var d = 1 / (fps || 60), n = Math.round(sec / d); for (var i = 0; i < n; i++) { update(d); if (!noRender) updHud(d); } if (!noRender) render(); },
    timeScale: function (k) { G.ts = k; },
    force: function (ph) {
      if (G.phase === 'menu' || G.phase === 'over') startMatch(G.era.built ? G.era : ERAS[0]);
      if (ph === 'enemyHide') beginRound();
      else if (ph === 'aim') { beginRound(); startAim(); G.coverT = 1; G.coverH = G.era.cover.low; G.enemy.duck = 0; G.enemy.duckTarget = 0; }
      else if (ph === 'playerHide') startPlayerHide();
      else if (ph === 'botFire') startBotFire();
      else if (ph === 'roundEnd') endRound();
    },
    throwAt: function (x, y) { return playerThrow(x, y); },
    fireAt: function (x, y) { return playerFire(x, y); },
    solveAim: function (part) {
      var e = G.enemy, T = part === 'head' ? { x: e.wx, y: 1.45 - e.duck * 1.25, z: e.z } : { x: e.wx, y: Math.max(G.coverH + 0.15, 1.0) - e.duck * 1.25, z: e.z };
      return solveAim(T);
    },
    enemyScreen: function (part) { var g = enemyGeom(); return part === 'head' ? { x: g.head.x, y: g.head.y } : { x: g.x, y: (g.body.y0 + g.ridgeTop) / 2 }; },
    enemy: function () { var g = enemyGeom(); return { head: g.head, body: g.body, ridgeTop: g.ridgeTop, cover: { x0: g.cover.x0, x1: g.cover.x1, base: g.cover.base, top: g.cover.top }, wx: G.enemy.wx, z: G.enemy.z, duck: G.enemy.duck }; },
    freezeEnemy: function (b) { G.freeze = b !== false; },
    setDuck: function (b) { G.keyDuck = !!b; },
    botForce: function (m) { G.botForce = m || null; },
    setHp: function (p, b) { if (p != null) G.hpP = p; if (b != null) G.hpB = b; },
    setDmg: function (p, b) { G.dmgP = p; G.dmgB = b; },
    setRound: function (n) { G.round = n; },
    damage: function (head) { return playerDamage(!!head); }, maxHp: playerMaxHp, botStats: function () { return botStats(G.era, SAVE.trophies); },
    layout: function () { return { W: W, H: H, DPR: DPR, Y0: Y0, PX: PX, PY: PY, PS: PS }; }
  };

  // ---------- boot ----------
  resize();
  setEra(ERA_BY_ID[SAVE.last] && ERA_BY_ID[SAVE.last].built ? ERA_BY_ID[SAVE.last] : ERAS[0]);
  setMuted(muted);
  G.enemy.baseWx = 0.8; G.enemy.wx = 0.8; G.enemy.tx = 0.8; G.enemy.z = 9; G.enemy.duck = 0;
  renderMenu();
  requestAnimationFrame(loop);
})();
