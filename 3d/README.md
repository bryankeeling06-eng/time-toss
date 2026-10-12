# Time Toss 3D (PROTOTYPE)

**This is a prototype**, not the live game. The real game is the 2D version at the repo root (`../index.html`), which this folder does not touch.

Live: https://bryankeeling06-eng.github.io/time-toss/3d/ (add `?debug` for an fps / draw-call readout)

Level 1 only (Stone Age): 5 rounds, 3 throws each, a 3 s hide timer (same as the 2D game).
- **Hide:** slide your finger left, middle, or right to pick one of the 3 rock covers.
- **Aim:** drag to aim. Aim is high-gain, so a short drag sweeps all the covers. The marker eases toward your finger, and you're re-centered before each throw. Releasing throws at the finger target.
- Rocks fly on a custom-gravity arc. The bot (Grug) hides, dashes between covers, and throws back. Before each throw, a red ring warns you which cover it is aiming at.
- Head shots and the knockout throw get slow-mo with a zoomed camera. This is decided at release by pre-simulating the throw.
- A knockout triggers a small verlet ragdoll: 7 points with stiff bone springs, soft posture springs, gravity, and ground friction.
- Pretend coins are only shown as text. There are no ads.

Tech: plain ES modules, Three.js r169 vendored in `vendor/`, and no build step. Pixel ratio is capped at 2. There are no shadow maps (blob shadows instead), about 37 draw calls, and stylized primitives only.
