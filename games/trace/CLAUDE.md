# Trace

Read the root `CLAUDE.md` **3D / three.js** section first; this file is only
what's specific to this game.

## Levels

Procedural, variable board size from the `SIZES` schedule (3×3 up to 6×6). A
Warnsdorff-ordered DFS looks for a Hamiltonian path from a random start; if it
fails, `genLevel` falls back to a **fixed snake path**.

That fallback is common on odd-area boards, because an R×C grid with R·C odd has
no Hamiltonian path between two same-parity cells, so a random start often has
none at all. Measured over 400 generations each:

| Board | lands on the snake |
|---|---|
| 3×3 | 43% |
| 5×5 | 48% |
| everything else | 0–1% |

So roughly half of all 3×3 and 5×5 levels are the *same* board. Pre-existing
behaviour, not introduced by the 3D work. Fixing it means retrying with a
different start rather than giving up — the DFS is cheap (≤13ms worst case).

## The path tube

Rebuilt from scratch on every drag step (`rebuildTube`), ~1ms each, which is
fine — don't bother incrementalising it.

**Corners must be pre-chamfered.** Feeding raw grid centres to a centripetal
Catmull-Rom spline bulges the tube **0.14 of a cell past each turn**; inserting
quarter-arc points first drops that to **0.005**. `CHAMFER` is that inset.
Without it the tube visibly leaks out of its cells on tight turns.

## Picking

A ray against a plane at tile mid-height, rounded to the nearest cell — not
colliders. Verified: all 36 cells of a 6×6 round-trip correctly, worst parallax
error from a raised tile is 0.074 of a cell.

## Settings and music must stay a classic script

The settings panel uses inline `onclick="toggleSettings()"` handlers, which need
those functions on `window`. A module script won't provide them. The file
therefore has **three** script tags: the module (game), a classic one
(audio/settings/SW), and a classic one-liner that initialises the toggle. Don't
consolidate them.

## Colour

Board neutrals were raised for the 3D version: the old 2D values fell to 2.8:1
against the page background once the light rig scaled them, under the 3:1 floor
in the root `CLAUDE.md`.
