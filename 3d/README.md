# Time Toss 3D (PROTOTYPE)

**This is a prototype**, not the live game. The real game is the 2D version at the repo root (`../index.html`), which this folder does not touch.

Live: https://bryankeeling06-eng.github.io/time-toss/3d/ (add `?debug` for an fps / draw-call readout)

Level 1 (Stone Age, vs Grug) plays the same way as the 2D level. Its numbers are ported from the 2D game's `BALANCE`:
- **Match:** best of 5 rounds with 3 throws each. The most damage after round 5 wins, with up to 3 sudden-death rounds, and a knockout ends the match early.
- **Hiding:** there's a 3-2-1 hide countdown (3 s) with beeps. Slide your finger to pick one of 3 rock covers.
- **Aim:** drag to aim. Aim is high-gain and eases toward your finger, you're re-centered before each throw, and releasing throws at the finger target. A dotted aim guide shows part of the arc.
- **Damage:** your throwing rock does 20 damage. Callouts: BONK! (head, ×2), OOF! (body), TOE STUBBED! (legs, ×0.75). Hits show damage numbers, a wince, and knockback (head snaps back, body folds, knees buckle).
- **Slow-mo:** head shots and the knockout throw get slow-mo. A knockout uses a spring ragdoll.
- **Grug (bot):** 100 HP, 14 damage, 50% accuracy, 15% head shots. A red ring locks onto your cover 1 s before he throws, and if you've settled on another cover he re-aims there 60% of the time.
  - **Duck:** hold DUCK (or Space/↓) to drop behind your cover. Ducking drains stamina at 0.2/s, it regenerates at 0.45/s, and once you run out you're too tired to duck until it's back to 0.35.
  - **Moving target:** while you aim he dashes between his intact covers, side-steps, or ducks briefly.
- **Crumbling barricades:** 4 hits each, with 3D stage shapes and pooled debris and dust. Grug only hides behind intact covers; when all of his are smashed, he's exposed.
- **Coins and save:** pretend coins only, with no ads and no money. A win pays 50 coins plus a streak bonus (+5/+10/+15) and a loss pays 20. Coins have a count-up animation and are saved under **`timetoss3d_save_v1`**. The 2D save (`timetoss_save_v2`) is never read or written.
- **Upgrades** (same effects as the 2D tiers):

  | Tier | Cost | Damage | Throw speed | Steadier (longer aim guide) |
  |---|---|---|---|---|
  | Tuned | 150 | +10% | +6% | 30% |
  | Pro | 400 | +20% | +12% | 55% |
  | Legend | 900 | +35% | +18% | 75% |
- **Admin (quiet QA), as in 2D:** `?admin=1` or `?unlock=all` gives a 50,000-coin session wallet and max tier. It's session-only and is never saved.
- **Camera:** it auto-fits so your whole near cover and your caveman stay on screen at any portrait height (tested at 390×664, 390×750, and 390×844), and it refits on resize and visualViewport changes.
- **Test hooks** exist only with `?test`.

Tech: plain ES modules, Three.js r169 vendored in `vendor/`, and no build step. Scenery is merged into one vertex-colored mesh, and limbs, debris, dust and aim-guide dots use instanced meshes. There are no shadow maps, and pixel ratio is capped at 2.
