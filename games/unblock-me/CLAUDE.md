# Unblock Me

Read the root `CLAUDE.md` **3D / three.js** and **Hand-Authored Levels** sections
first; this file is only what's specific to this game.

## Levels

Hand-authored grid art in `LEVELS`, one character per cell: `.` empty, `X` the
target, any other letter a block. Orientation and length are read off the art, so
adding a level is drawing one — there is no separate block list to keep in sync.

```
'...A..'    A is a vertical 3
'...A..'
'XX.A..'    X is the target, and must sit in the exit row
```

`par` is the true optimum, not an estimate. **Both checks must pass before you
commit a level:**

- `make verify` — runs the game's own BFS over every level and exits non-zero if
  any is unsolvable, trivial, malformed, or has the wrong `par`.
- the boot audit — `auditLevels()` runs on page load and `console.error`s the
  same findings. `window.__unblockAudit()` re-runs it from a device console.

Current state, all verified:

| Level | Blocks | Min moves | Tier |
|---|---|---|---|
| 1 First Slide | 5 | 4 | Beginner |
| 2 Shuffle | 6 | 7 | Beginner |
| 3 Crowded Yard | 8 | 12 | Intermediate |
| 4 Deadlock | 10 | 18 | Advanced |
| 5 The Long Way Round | 10 | 25 | Advanced |

Grid size and exit come from the data (`rows` sets the size, `exit` overrides
`{ row: 2, side: 'right' }`), so a non-6x6 pack needs no code change. `exit.side`
of `'left'` is handled throughout, but nothing ships using it, so treat it as
untested.

### The "Puzzle model" region

`tools/verify-levels.mjs` slices the source between the two
`// ── Puzzle model ──` / `// ── /Puzzle model ──` banner comments and runs that
text in node. **Keep both banners verbatim and keep the region free of DOM,
`three`, and `window`** — the tool fails loudly if the banners go missing, but it
will happily run a region that has picked up a browser dependency and then die on
a confusing `ReferenceError`.

## A move is one slide, not one cell

This is what `par` counts, and it has consequences all over:

- The BFS emits one successor per reachable landing position, not one per
  direction. That is why the state space stays small enough to solve at boot.
- A drag of any distance is one move.
- Arrow keys step one cell, so they **coalesce**: consecutive steps on the same
  block in the same direction update the previous `undo` entry instead of pushing
  a new one. Without that the keyboard would be scored strictly worse than the
  drag it stands in for, and level 1 could not be finished at par.
- `triggerWin` takes the same `coalesce` flag. The slide out through the gap is a
  move, but for the keyboard it is the *last cell of a move already counted*.
- Stopping the target at the wall and then sliding it out really is two moves.
  That is the rules, not a bug.

## Picking

Blocks are picked by raycasting the plane through their **top faces** and testing
footprints — deliberately not box colliders, for the reason in
`games/glide/CLAUDE.md` (a collider tall enough to be a comfortable target throws
a silhouette `height / tan(pitch)` up-screen and steals taps meant for the block
behind it). Every block here is the same height, so that one plane is exact for
all of them. A second pass with a 0.22 pad catches near-misses.

The same plane carries the drag, so the block tracks the finger one to one. The
0.055 grab lift is ignored in that mapping on purpose: honouring it would shift
the grab point by 0.04 of a cell for no visible gain.

## Clamping and the exit

`freeRange()` is shared by the solver and the drag clamp, so what a finger can do
and what the solver believes are the same function. `dragRange()` wraps it and
opens the ceiling past the board edge for the target once `canExit()` is true —
that extra stretch of corridor *is* the win, and it is why the target can be
dragged clean out instead of stopping at the wall.

Every input path needs its own exit case, because the exit is not a cell and
`cellAt()` therefore cannot name it:

- drag — `canWinFrom()` fires mid-gesture
- flick / release — `endDrag`
- tap-to-target — a tap anywhere beyond the block along a clear run
- arrow keys — stepping one past the wall

## Colours

Contrast is measured against the **well**, not the page. The well is dark and the
page is near-black (1.5:1), which looks like a violation of the root **Color &
Contrast** rule but isn't: the light oak frame between them carries the
silhouette at 7.4:1, the same job the portal's tile rims do. The numbers that
matter are block-on-well (5.9:1 plain, 3.6:1 target) and frame-on-well (4.6:1).
Change any one of the three and re-check all of them.

## Performance

A puzzle board is static between inputs, and the render loop leans on that.

- `shadowMap.autoUpdate = false`; `needsUpdate` is raised only while a drag or a
  tween is live, or `shadowHold` is still running. Measured on an iPad-sized
  canvas: an idle frame is **15 draw calls / 3.3k triangles** instead of 26 /
  6.4k. The `animating` flag is sampled **before** `stepTweens`, so the frame in
  which a slide finishes still refreshes — otherwise the piece lands and leaves
  its shadow at the old cell.
- `dirtyUntil` / `invalidate()` exist for changes the loop cannot see by
  itself: a rebuilt board, the 0.012 lift on a newly selected block, a hint
  appearing and expiring. Rather than call `invalidate()` from every input path
  — where one forgotten site strands a stale frame once reduced motion stops the
  continuous redraw — a single capture-phase listener on `pointerdown`,
  `pointerup`, `pointercancel`, `keydown` and `click` covers the lot, since
  every state change here starts as an input. The `game.sel` vs `lastSel`
  comparison in the loop is a second backstop.
- Idle frames are capped at 30fps. Full rate resumes while dragging or tweening.
  `IDLE_MS` is `1000/30 - 4` and the slack is load-bearing: rAF ticks every
  ~16.7ms, so a bare 33.3ms threshold is missed by two ticks (33.4ms) as often
  as not and the loop waits for a third. Measured on a real GPU: 22fps before
  the slack, 28 after.
- **`prefers-reduced-motion` turns the loop fully on-demand.** With the dust,
  the breathing marker, the pulses, the squash, the confetti and the burst all
  gated off, nothing changes between inputs — so `frame()` returns early unless
  a tween or drag is live or `dirtyUntil` is still in the future. Measured
  idle: 28 fps / 419 draws per second normally, **0 / 0** under reduced motion.
  Slides, the win fly-out and the result panel all stay: the player caused
  those, and a block teleporting between cells is worse feedback, not gentler.
- The boot audit is deferred to `requestIdleCallback` **with a `timeout`**. The
  timeout is not optional: this page runs an uninterrupted rAF loop, so the
  browser may never report an idle period and the audit would be starved for the
  whole session. That is exactly what happened on the first attempt, and a
  safety net that silently never runs is worse than no safety net.
- Per-frame allocation is kept at zero in the block loop: the tween tag is
  prebuilt as `userData.tag`, and `dimAmt` snaps to its target so the per-block
  colour write stops once the dim settles.

## Gotchas

- **Grain direction comes from the geometry, not the material.** Block geometry is
  authored horizontal and `boxUV`'d so the grain runs along its length; vertical
  blocks are that same geometry yawed 90 degrees, which carries the UVs round with
  it. Building a separate vertical geometry would run the grain across the block.
- **The well floor's grid is a texture, not geometry.** `boxUV(geo, 1)` puts
  exactly one texture tile on each cell, and the tile has a dark border, so the
  grooves come free at any grid size. The groove is inset a pixel from the canvas
  edge — at the very edge, `RepeatWrapping` plus mipmapping bleeds it across the
  seam.
- **Wood grain waves use integer periods** across the canvas so the texture tiles
  seamlessly in `u`. A 3-long block spans `u` 0..2.88, so a non-tiling grain shows
  a hard seam twice along it.
- `#stage` is a flex slot and the canvas is `position: absolute` inside it, so
  `layout()` can measure the space available without the measurement feeding back
  into itself. This replaces the `innerHeight - 290` constant the older games use;
  prefer it if you touch their layouts.
- Nothing on the board moves unless the player moves it — that is the genre.
  The dust motes exist so the scene still breathes without breaking that rule.
  Don't add an idle bob to the blocks.
