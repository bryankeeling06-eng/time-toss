# TIME TOSS

A cartoon duel through history. Hide, aim, toss — phone-first (390×844). Plain canvas + DOM, no build step.

**Live:** https://bryankeeling06-eng.github.io/time-toss/

## Eras

| # | Era | Weapon | Cover | Scene | Bot |
|---|-----|--------|-------|-------|-----|
| 1 | Stone Age | Spear (slow high arc) | Rocks | Canyon sunset | Ugga Bunga |
| 2 | Castle | Bow & arrows (faster arc) | Haystacks | Meadow + keep | Sir Wobblebottom |
| 3 | Wild West | Musket (nearly straight, slow reload) | Barrels | Saloon town | Dusty Pete |
| 4 | Desert Ops | Scoped rifle (hitscan + hold-to-zoom) | Yellow dotted mats | Pink desert sunset | Sgt. Cactus |
| 5 | Moon Base | Laser blaster (instant) | Energy shields (**blockChance 0.20**, free window after a block) | Moon base | Zorp |

All five are playable. Unlock with trophies: **500 / 1,250 / 2,250 / 3,500**.

## How to play

1. Tap **PLAY**, pick an unlocked era.
2. **Hide (5 s):** the enemy scurries between 3 covers — watch where they stop.
3. **Your turn:** **3 shots, no time limit.** Turn ends when the 3rd projectile resolves.
   - **Pull-down slingshot aim (all eras):** press in the throw area, **pull DOWN** (and sideways) — the aim guide / reticle moves the **opposite** way (pull down → aim up toward the enemy). Finger stays low so it doesn’t cover the target. **Release to fire.**
   - Arc eras (Stone / Castle / Wild West): dotted guide + ring; the ring still needs to sit on (or a bit above) the enemy for arcs.
   - Desert Ops / Moon: same pull-down aim; hold to zoom, release to fire.
4. **Their turn:** slide **◀ ▶** between your 3 covers or hold **DUCK** when they wind up / glint.
5. **KO** or most damage after **5 rounds** (tie → sudden death).

Controls: touch aim, ◀ ▶ move, DUCK; desktop also supports mouse, arrows/A/D, Space. Sound resumes after an iPhone call or app switch (the 🔊/🔇 mute toggle is remembered).

### Aim sensitivity (`shot.sens`)

Aim Δ = −finger Δ × `sens` (÷ zoom while scoped). Lower = less twitchy for kids.

| Era | sens | notes |
|-----|------|-------|
| Stone Age | **0.70** | slightly softened |
| Castle | **0.48** | softest — reported too twitchy for ~7–11 |
| Wild West | **0.62** | softened |
| Desert Ops | **0.85** | was 1.25; ÷ zoom while held |
| Moon Base | **0.78** | was 1.10; ÷ zoom while held |

## Characters & ammo (per era)

Each era has its **own player silhouette + held weapon** and **enemy look** (not a shared caveman body with a hat swap):

| Era | Player | Enemy | Projectile |
|-----|--------|-------|------------|
| Stone Age | Caveman + overhead spear | Ugga Bunga (caveman) | Spear |
| Castle | Knight in plate + bow | Sir Wobblebottom (knight + helm/plume) | Arrow (fletching) |
| Wild West | Cowpoke + stetson + musket | Dusty Pete (bandit + bandana) | Musket ball + smoke puff |
| Desert Ops | Soldier + scoped rifle | Sgt. Cactus (cactus) | Rifle tracer |
| Moon Base | Space suit + dome helm + blaster | Zorp (big-headed alien) | Cyan laser bolt |

Moon shields: **`blockChance` 0.20** (was 0.35). A successful block opens a free window so the next careful shot can land (shields dim while open).

## Progression & fresh save

- **Trophies**, **win streaks**, and **pretend coins** (shop only — nothing is sold for money).
- Shop gear is **per era** (weapons unlock in order; outfits anytime). The shop shows gear for your last-played unlocked era.
- **This build resets progress.** Saves use `localStorage` key **`timetoss_save_v2`**. Old `timetoss_save_v1` data is ignored. Everyone starts at 0 trophies / 0 coins / streak 0. A damaged save is backed up to `timetoss_save_v2_bad` and reset.

## Balance

Numbers live in `BALANCE` at the top of `game.js`.

| | Value |
|---|---|
| Win / loss / draw trophies | +25 / −10 (eras 1–2) or −15 (3–5) / 0 |
| Streak trophy bonus | +0, +5, +10, +15 (caps) |
| Unlock thresholds | 0 · 500 · 1,250 · 2,250 · 3,500 |
| Coins win / loss | 50 / 20 (+ streak bonuses) |
| Shots / hide / rounds | 3 / 5 s / 5 (+ up to 3 sudden death) |
| Bot base accuracy (`baseAcc`) | Stone 50% · Castle 55% · Wild West 60% · Desert Ops 65% · Moon 70% (progressive; +trophies, cap 78%) |
| Bot retarget on slide | **60%** (`bot.retarget`) if settled **≥0.35 s** on the new rock (`retargetSettle`); slide duration **0.25 s** |
| Moon shield `blockChance` | **0.20** (was 0.35); after a block the next body/head shot is free (`shieldOpen`) |

Head hits deal ×2. Duck stamina drains while held on the bot turn (unchanged). Sliding away still works, but the bot re-aims more often so free slide-dodges are rarer.

## Run locally

```sh
cd time-toss
python3 -m http.server 8766
# open http://127.0.0.1:8766/
```

## License

Made for fun. Cartony, no blood.
