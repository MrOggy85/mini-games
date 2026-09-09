# Circuits

## Levels

Hand-authored in the `LEVELS` array. No generator, no procedural fallback — the
game ends after the last one. Each token is `<type><rotation>`: `I` straight,
`C` corner, `T` tee, `B` battery, `L` bulb, `..` empty. The scramble is baked
into the authored rotations, so a level plays identically every time.

Two things will bite you:

- **Every row must be the same length.** `parseLevel` takes the width from
  `rows[0]` only; a short row makes `rows[y][x]` undefined and `tok[0]` throws,
  which blanks the page with no message. Pad with `".."`.
- **Nothing guarantees a level is solvable.** Authoring an unsolvable board is
  easy — the first 5×5 four-bulb level tried during development had 0 solutions
  out of 256. `auditLevels()` brute-forces all 4^n rotations at boot and logs to
  the console; it is silent unless something is wrong. Check the console after
  editing.

The inverse also matters: a loop of straight pieces has so much rotational
symmetry it stops being a puzzle. One 4×4 spiral tried during development was
solved by 262,144 of 1,048,576 rotations. The audit warns above 5%. Shipped
levels sit at 1–8 solutions out of 1024–16384.

Reliable way to author one: grow a random tree from the battery, read each
cell's piece off its degree (2 opposite = `I`, 2 adjacent = `C`, 3 = `T`), make
the leaves bulbs, then scramble. Solvable by construction. Degree 4 is
unrepresentable — there is no 4-way piece.

Adding a piece type is a one-liner: put it in `BASE_CONN` and the geometry
follows, because `buildPiece` does `BASE_CONN[type] || [0]` and builds one arm
per connection.

Batteries and bulbs have exactly one connection each (`connectionsOf` returns
`[rot]` for fixed cells), so a pass-through bulb is not expressible. Multiple
batteries do work — `energizedInfo` seeds every `B` at depth 0.

## Board size ceiling

Tiles foreshorten at the 60° camera tilt. Worst-case vertical tap window with
every cell a wire, measured on an iPhone SE (1st gen): 5×3 → 41px, 6×4 → 34px,
7×5 → 28px. **6×4 is about the practical limit** before targets get
uncomfortable on a phone. Past that, raise `slot.halfX` from 0.84 (costs visible
background) or steepen `PITCH` toward top-down.

## Picking

Tiles are picked by raycasting the plane the pieces lie in and snapping to the
nearest *rotatable* piece — deliberately **not** box colliders. A collider tall
enough to be a comfortable target throws a silhouette up-screen of
`height / tan(pitch)`; at 60° a 1.1-tall box covered 0.64 of the cell behind it
and stole taps meant for the tile above. Snapping to rotatable pieces rather
than the nearest cell widens each target into space no other wire claims, while
two adjacent wires still split at their midpoint.

## Win surge

`energizedInfo` returns hop depth from the battery alongside the live set, and
the win animation walks a front along those depths at ~430ms a hop. So the surge
timing and branching come free from the puzzle graph — nothing is scripted per
level.
