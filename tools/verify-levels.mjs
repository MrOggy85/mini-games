// Proves every Unblock Me level is solvable and that its authored `par` is the
// true optimum.
//
//   make verify        (or: node tools/verify-levels.mjs)
//
// The levels and the solver live inside games/unblock-me/index.html, because
// every game here is a self-contained single HTML file. Rather than duplicate
// either one, this slices the file's "Puzzle model" region — which is written to
// be free of DOM, three.js and `window` — and runs that exact code in node. So
// what CI checks and what the player's device runs cannot drift apart.
//
// Exits non-zero if any level fails, so it is usable as a pre-deploy gate.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(REPO, 'games', 'unblock-me', 'index.html');

const OPEN = /^\/\/ ── Puzzle model ─+$/m;
const CLOSE = /^\/\/ ── \/Puzzle model ─+$/m;

const html = readFileSync(SRC, 'utf8');
const open = html.match(OPEN);
const close = html.match(CLOSE);
if (!open || !close || close.index < open.index) {
  console.error(`could not find the "Puzzle model" region in ${SRC}.`);
  console.error('Both banner comments must survive verbatim — see the note above them.');
  process.exit(2);
}

const region = html.slice(open.index + open[0].length, close.index);
const model = new Function(region + '\nreturn { LEVELS, PACKS, parseLevel, solve, auditLevels, tierOf };')();

const { LEVELS, parseLevel, solve, auditLevels, tierOf } = model;

const broken = auditLevels(LEVELS);

const rows = LEVELS.map((raw) => {
  const lv = parseLevel(raw);
  if (lv.errs && lv.errs.length) return { id: raw.id, name: raw.name, blocks: '?', min: '-', tier: '-' };
  const t0 = Date.now();
  const sol = solve(lv);
  return {
    id: raw.id,
    name: raw.name,
    blocks: lv.blocks.length - 1,
    min: sol ? sol.length : 'UNSOLVABLE',
    tier: sol ? tierOf(sol.length) : '-',
    ms: Date.now() - t0,
  };
});

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('id', 4) + pad('level', 22) + pad('blocks', 8) + pad('min moves', 11) + pad('tier', 14) + 'solve');
for (const r of rows) {
  console.log(pad(r.id, 4) + pad(r.name, 22) + pad(r.blocks, 8) + pad(r.min, 11) + pad(r.tier, 14) + (r.ms === undefined ? '' : r.ms + 'ms'));
}

if (broken.length) {
  console.error('');
  for (const b of broken) console.error(`FAIL level ${b.id} (${b.name}): ${b.errs.join('; ')}`);
  process.exit(1);
}
console.log(`\nOK — ${LEVELS.length} levels solvable, every par matches the solver.`);
