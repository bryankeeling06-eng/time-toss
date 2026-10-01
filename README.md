# Time Toss

A cartoon duel through history. Hide behind a rock, pop up, and lob spears at a silly caveman before he lobs them back at you. Win matches to earn trophies and pretend coins, then climb toward the next era. Friendly, bloodless, made for phones.

**Play:** https://bryankeeling06-eng.github.io/time-toss/

It's plain static HTML/CSS/JS on a canvas. There's no build step, no frameworks, no downloaded assets and no trackers. All the art is drawn in code.

## Eras

| # | Era | Weapon | Status |
|---|-----|--------|--------|
| 1 | Stone Age | Spear (slow, high arc) | **Playable** |
| 2 | Castle | Bow & arrows | Unlocks at 🏆 1,000 (coming soon) |
| 3 | Wild West | Musket | Unlocks at 🏆 2,500 (coming soon) |
| 4 | Desert Ops | Scoped rifle | Unlocks at 🏆 4,500 (coming soon) |
| 5 | Moon Base | Laser blaster + shield | Unlocks at 🏆 7,000 (coming soon) |

Eras are data-driven: each entry in the `ERAS` array in `game.js` sets its scene, cover, weapon physics, bot and hints. Only `built: true` eras can be played.

## How to play

1. Tap **PLAY**, then pick **Stone Age** on the era map.
2. **Your turn:** "ENEMY IS HIDING" counts down 5 to 1 while Ugga Bunga ducks behind his rock. Then you get **3 spears, with no time limit**. Take as long as you like; your turn ends once the 3rd spear lands.
   - Touch and hold to aim, drag, and let go to throw. Spears fly in a slow, high arc, so **aim above him**.
   - While you aim, a dotted guide shows the start of the arc and a dashed ring shows where the spear will reach his distance. He moves and ducks, and the spear takes about a second to get there, so lead him a little.
   - Head hits do double damage. Spears that hit the rock go "CLONK!".
3. **His turn:** "YOU'RE HIDING" counts down, then he throws 3 spears at you.
   - Watch for the wind-up (a red "!" and a red edge on the screen), then hold **DUCK** until the spear lands. You can also touch and hold anywhere, or hold Space on a keyboard.
   - Ducking uses stamina (the ring around the button). If you run out, you have to stand up and catch your breath.
4. That's one round. A match is up to **5 rounds**.

On desktop, use the mouse (click, hold, drag, release) to throw. `M` mutes, `Enter` starts.

## Winning

- Both fighters have a health bar. Knock his health to 0 and you win right away (**KO**).
- If nobody is knocked out after 5 rounds, **most total damage wins**.
- **Tie:** if the damage is equal after 5 rounds, you play sudden-death rounds (up to 3). If it's still tied after that, the match is a draw.

## Progression

- **Trophies** go up when you win and down when you lose. The menu and end screen show your trophies and a progress bar to the next era.
- Trophies never drop below 0, or below the threshold of an era you've already unlocked (the era floor).
- **Win streaks** add bonus trophies and coins. A loss resets the streak. When you're on a streak of 2 or more, the end screen shows a 🔥 badge, and the menu shows your current and best streak.
- **Coins** are pretend. You only earn them by playing (a loss still pays a little), and you spend them in the **SHOP** on spear upgrades and outfits. Your outfit is shown on your character.
- Progress is saved in `localStorage` (`timetoss_save_v1`, versioned). A damaged save is backed up to `timetoss_save_v1_bad` and reset, so the game doesn't crash.

## Balance

Every number lives in the `BALANCE` object at the top of `game.js`.

**Trophies**

| | Value |
|---|---|
| Win | +25 |
| Loss | −10 in eras 1–2, −15 in eras 3–5 |
| Draw | 0 |
| Win-streak bonus (`trophies.streakBonus`) | 2nd win in a row +5, 3rd +10, 4th and after +15 (capped) |
| Unlock thresholds | Era 2 at 1,000 · Era 3 at 2,500 · Era 4 at 4,500 · Era 5 at 7,000 |
| Floors | Never below 0 or below the threshold of your highest unlocked era |

So a streak pays +25, +30, +35, +40, +40, and so on. A loss resets the streak to 0 and applies the normal loss. A draw leaves the streak as it is and pays no bonus.

**Coins**

| | Value |
|---|---|
| Win | 50 |
| Loss | 20 |
| Draw | 20 |
| Win-streak bonus (`coins.streakBonus`) | 2nd win in a row +5, 3rd +10, 4th and after +15 |

**Stone Age gear** (you buy spears in order and can equip any spear you own; outfits can be bought in any order)

| Spear | Damage (head ×2) | Cost | Extra |
|---|---|---|---|
| Wooden Spear | 20 (40) | free | |
| Sharp Flint | 25 (50) | 150 | |
| Bone Tip | 30 (60) | 350 | longer aim guide |
| Obsidian Spear | 36 (72) | 700 | longer guide, faster throws |

| Outfit | Health | Cost | Extra |
|---|---|---|---|
| Leaf Wrap | 100 | free | |
| Animal-Skin Tunic | 120 | 120 | |
| Mammoth Fur Cloak | 140 | 400 | |
| Bone Armor | 160 | 800 | +10% damage |

All Stone Age items cost **2,520 coins** in total. Later eras have placeholder gear in the config.

**Combat**

- Player base health is 100 (plus the outfit bonus). Head hits do ×2 damage (`headMult`).
- Bot health = `baseHealth[era] + trophies × 0.05`. Stone Age starts at 100 and is 150 at 1,000 trophies.
- Bot damage = `baseDamage[era] + trophies × 0.006`. Stone Age starts at 14 and is 20 at 1,000 trophies.
- Bot accuracy = `min(0.7, baseAcc[era] + trophies × 0.00002)`. Stone Age starts at 50% and is 52% at 1,000 trophies. 15% of the bot's on-target throws are head hits.
- Ducking stamina drains at 0.2/s and refills at 0.45/s. When it runs out, you're too tired to duck until it's back to 35%.
- 3 throws per turn, a 5-second hide, no time limit on your throws (the bot turn takes about 8.5 s), up to 5 rounds plus 3 sudden-death rounds.

**Pacing** (measured headlessly with a simulated player at real speed, plus a Monte Carlo of the trophy rules)

- Real-speed match length over 12 matches: **min 38 s, median 71 s, max 151 s**. Strong play ends with a KO in 2 to 3 rounds (~40–70 s). Close matches go all 5 rounds (~130–150 s).
- Expected trophies per match with streaks: 14.5 at a 60% win rate, 17.1 at 65%, 19.8 at 70% (11.0 / 12.7 / 14.5 without streaks).
- Matches to reach Era 2 (1,000 trophies), median of 20,000 simulated careers: **69 / 59 / 55** at 60 / 65 / 70% wins (89 / 78 / 68 without streaks). That's roughly **1.2–2.8 hours** (counting ~5 s between matches), depending on how long your matches run. Players who win 60–70% of the time tend to have the longer, closer matches, so ~2.2–2.8 hours is the likely figure for them.
- Coins per match: about 41–46 with streaks, so the whole Stone Age shop (2,520) takes about 55–61 matches, which is about when you reach Era 2.

## Run locally

```sh
cd time-toss
python3 -m http.server 8766
# open http://localhost:8766/
```

## Test

The Playwright suite lives outside the repo (`/workspace/toss_test.py`). It starts its own local server on a free port (8766 or higher) and runs headless Chrome at 390x844 (as a 3x phone) plus one desktop check:

```sh
python3 /workspace/toss_test.py                                              # full suite, local
python3 /workspace/toss_test.py https://bryankeeling06-eng.github.io/time-toss/ --quick   # live smoke test
```

The game exposes a test hook, `window.__toss`. It has the state and config (`G`, `BALANCE`, `ERAS`), save helpers (`save`, `setTrophies`, `setCoins`, `setStreak`, `failWrites`, `reward`), shop actions (`buy`, `equip`), the match clock (`seed`, `pause`, `step`, `force(phase)`) and aiming helpers (`throwAt`, `solveAim`, `enemy`, `setDuck`, `botForce`, `setHp`, `setDmg`).
