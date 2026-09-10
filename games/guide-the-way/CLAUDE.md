# Guide the Way

Read the root `CLAUDE.md` **3D / three.js** section first; this file is only
what's specific to this game.

## The solver drives the command budget

`maxCommands = solution.length + 3`. So `bfs` isn't just a validator — if it
disagrees with what `runSequence` actually does, the player gets the wrong
number of commands and a level can become unwinnable. Two bugs of exactly that
kind were fixed here; keep the two in lockstep:

- **`bfs` must apply arrow-tile redirects** — one forced move, no ice slide
  after it, no chaining. It originally ignored them entirely, so 5 of 75
  generated levels returned a "solution" that didn't replay.
- **Keys are collected mid-ice-slide**, not only on the cell first entered.

`HAND_LEVELS` (levels 1–5) still carry hard-coded `solution` arrays, but they
are **all wrong** — level 2's first command walks into a wall. `loadLevel`
ignores them and measures the real shortest path with `bfs`, keeping the array
only as a fallback. Don't trust those arrays.

Levels 6+ are generated. Verified: all of levels 1–300 replay under the
runtime's own movement rules and fit inside their command budget.

## Camera pitch

64°, shallower than glide/trace's 51°, because walls and props stand on the
cells. A piece of height `h` hides `h / tan(pitch)` of board behind it: at 64° a
0.5-tall wall costs 0.24 of a cell, at 51° it would swallow 0.4.

## The machine

Built procedurally to fill the world rect the camera can actually see, so it
reaches the frame edges at any board size. Rebuilding it means ~20 extruded
gears, so `layout()` only does that when the rect key actually changes —
otherwise a resize would rebuild on every event.

Gears mesh by touching at their pitch radius and counter-rotating at the inverse
tooth ratio. That ratio is what makes spinning discs read as a mechanism;
without it they look like unrelated decoration.

The env map is assigned **per material**, and every machine material opts out
with `envMap: null`. Using `scene.environment` instead would relight the
backdrop and destroy the bright-board / dim-machine separation.

## Gotchas

- **`inset: 0` does not stretch a canvas.** A canvas is a replaced element, so
  `width: auto` resolves to its intrinsic (backing-store) size and the browser
  ignores `right`/`bottom`. `#scene` needs explicit `width/height: 100%`, or the
  scene renders at viewport × devicePixelRatio CSS pixels pinned top-left and
  you see the top-left quadrant.
- **`#board-slot` must be `pointer-events: none`.** It sits directly over the
  board; without that it swallows taps on the robot.
- Direction glyphs are plain `↑↓←→`, not emoji. Colour emoji on a colour fill
  reads as mud, and the chunkier `▶`/`◀` have emoji presentation on iOS, so
  they'd render inconsistently against `▲`/`▼`.
- `ctx.roundRect` needs an iOS <16.4 fallback if you add canvas textures — a
  throw in a texture builder takes the whole module down.
