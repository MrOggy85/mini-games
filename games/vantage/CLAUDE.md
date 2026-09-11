# Vantage

Read the root `CLAUDE.md` **3D / three.js** section first; this file is only
what's specific to this game.

## Lighting must stay vertical-only

The game is colour matching, so the same colour has to look the same on the
target and on a candidate. All four side faces share the same `|normal.y|`, so a
light coming from **straight overhead** shades them identically. That is the
only reason the rig is `AmbientLight` + a `DirectionalLight` at `(0, 1, 0)`.

Do not add a side light, an env map, or per-face shading of any kind — two
identical colours would render differently between the oblique target view and
the overhead candidate view, and the puzzle silently breaks. Depth comes from
the edge cage, the base plate and the fake contact shadow instead.

## Puzzle fairness

The target camera is placed so **exactly the West (`left`) and South (`bottom`)
faces are visible** — `top` and `right` are never seen until the reveal. So a
decoy that matches the solution on both visible faces is indistinguishable and
the level is unsolvable. `auditLevels()` checks that at boot and is silent
unless something is wrong.

Design note the audit deliberately doesn't flag: 9 of the 10 shipped decoys
differ in **both** visible faces, so one glance at either face eliminates them.
Decoys that differ in only one visible face (level 1's second) are the more
interesting kind. Worth aiming for when adding levels.

## Camera

Driven from spherical coords — `POLAR_VIEW` 68° (measured from straight up, so
0 is overhead), `AZIM_VIEW` 135°. `placeSpherical` derives `up` analytically
rather than leaving it to `lookAt`, which degenerates when the camera passes
over the pole during the reveal.

`SWAY` is ±8°. Verified that across ±16° only West and South stay visible; the
third face starts leaking not far beyond that, so don't raise it without
re-checking.

The reveal tweens polar 68° → 0° and azimuth 135° → 90°, which lands on exactly
the candidate camera pose — the target *becomes* the diagram the player picked.
Azimuth 90° at polar 0 is what puts North at the top of the frame.

Face winding is `apex → B → A` so normals point outward. Reverse it and the
faces light from the inside.

## Rendering: one canvas, four framed views

There is a single full-viewport canvas and **no per-view canvases**. DOM
elements define the rects — `#target-slot` and the three `.cand-btn`s, all
transparent — and the render loop scissors a viewport to each rect in turn:

1. background pass, no scissor
2. for each region: `setViewport`/`setScissor`, `clearDepth()`, recolour the
   **single shared pyramid**, render

So one pyramid mesh serves all four views; only its four face materials change
between passes. `renderer.autoClear` is off because the regions are composited
by hand. DOM rects are top-left origin and GL viewports are bottom-left, hence
the `innerHeight - rect.bottom` flip in `useRegion`.

This is why the candidate buttons must stay `background: transparent` — their 3D
content is rendered *behind* them. They keep the border, the letter label and
the hit target.
