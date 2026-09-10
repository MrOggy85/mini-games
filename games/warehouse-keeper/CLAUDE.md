# Warehouse Keeper

Read the root `CLAUDE.md` **3D / three.js** section first; this file is only
what's specific to this game.

## Levels

Eight hand-authored Sokoban boards in `LEVELS`, standard text format
(`#` wall, `$` crate, `.` goal, `@` player, `*` crate on goal, `+` player on
goal). No generator, no procedural fallback.

**Nothing validates them.** Level 8 shipped **unsolvable** — exhaustive BFS over
all 507,049 reachable states found no solution, best achievable 4 of 5 crates.
Fixed by moving one crate to `(5,5)`, beside the corridor goal.

There is no boot-time audit here, unlike `circuits`. If you edit or add a level,
verify it by hand: BFS over `(player, sorted crates)` with an index-pointer
queue — **not** `Array.shift()`, which made the level-8 search O(n²) and looked
like a timeout rather than a proof. Current state, all verified solvable:

| Level | Shortest solution |
|---|---|
| 1–6 | 1, 15, 20, 8, 26, 12 moves |
| 7 | 34 moves (119k states) |
| 8 | 36 moves (295k states) |

## Clouds are below the board on purpose

At the 66° pitch the horizon is never in frame, so a sky would never be visible.
The clouds drift *under* the board over the hills instead — which is also
structurally safe: a downward ray hits the board plane before the cloud layer,
so a cloud **can never occlude play**. Keep them below the board bottom and that
invariant holds for free.

## Layout constants

`KEEPER_Y = TILE_H + 0.05` — the keeper's shoes hang 0.05 below his group
origin, so placing him at `y = 0` sinks him through the floor. Every write to
`keeper.position.y` has to use it (there are five, including the idle bob).

Green haze fog starts past the board so the platform stays crisp while the
landscape recedes; the far edge of the visible ground sits at roughly 36% fog.
Dim, but green rather than grey.

## Animation

Tweens are **tagged per entity** and a new tween cancels the old one for that
tag. That's what stops hammering the d-pad from stranding a crate or the keeper
between two cells. Keep passing the tag when you add movement.

## Gotchas

- Hills, trees and cloud puffs are instanced. As individual meshes the landscape
  alone came to ~200 draw calls, more than the rest of the scene combined.
- `.wrapper` and `#board-slot` are `pointer-events: none` with the controls
  re-enabled. Swipe-to-move is a canvas gesture, so without that any swipe
  starting over the board was swallowed.
- `ctx.roundRect` only exists from iOS 16.4; `roundRectPath` is the fallback. A
  throw inside a texture builder takes the whole module down.
