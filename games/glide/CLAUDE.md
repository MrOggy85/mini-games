# Glide

Reference implementation for the three.js conversion (issue #63). Read the root
`CLAUDE.md` **3D / three.js** section first; this file is only what's specific
to this game.

## Known bug: block picking

`HIT_GEO` is a box `BLOCK_H + 0.5` = **1.12 tall** at a 51° pitch, so its
silhouette encroaches **0.91 of a cell up-screen**. Since the raycaster returns
the nearest hit, a block steals taps meant for the block directly above it.

This is not rare. Measured over 300 generated level-20 boards: **88% have at
least one vertically adjacent pair**, and **45% of individual blocks have a
vertical neighbour**.

Fix is the approach `circuits` uses — raycast the plane the blocks sit in and
snap to the nearest block, no colliders. See `games/circuits/CLAUDE.md`.

## Levels

Fully procedural, no hand-authored data. `genLevel` rejects candidates with a
BFS solver in the loop, so every level is solvable by construction:

- 200 attempts at a board solvable within `numBlocks(lvl) + 2` taps
- then 100 attempts at anything solvable, with the budget relaxed to `min + 2`
- then a hard-coded 3-block fallback

Generation is fast — ≤2ms per level at every difficulty, so the retry loop is
not worth optimising.

**`initLevel(20)` at the bottom is deliberate**, not leftover debugging. It
skips the trivial early boards.

## Palette

The block colours are the Okabe-Ito colourblind-safe set (added in #61 —
distinguishable under protanopia, deuteranopia and tritanopia). Don't
"improve" them without checking that.

Arrows on the blocks are **charcoal, not white**: every palette colour is light,
so white-on-block reads as mud. The 2D version needed a black text outline for
the same reason.

Board neutrals are picked for ≥3:1 against the near-black page, allowing for
the ~0.85 factor the light rig applies to a fully lit top face — so the hex in
the source is brighter than the number you're aiming at on screen.
