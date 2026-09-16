// Builds vendor/three.*.min.js from the installed three package.
//
//   make vendor        (bump THREE_VERSION in the Makefile first)
//
// This used to be two `cp` lines. It isn't any more because **three stopped
// publishing minified builds in r186** — `build/` now contains only
// `three.module.js` and `three.core.js`. Shipping those raw would take the
// engine from 188 KB to 419 KB gzipped, and these two files are CORE assets in
// sw.js: every device downloads them before the PWA can work offline. So we
// minify them ourselves.
//
// Doing it in node rather than as shell in the Makefile is deliberate: the
// import-specifier rewrite below needs an in-place edit, and `sed -i` takes an
// argument on BSD/macOS that it rejects on GNU/Linux. This runs the same
// everywhere node does.
import { transform } from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(REPO, 'node_modules', 'three');
const OUT = join(REPO, 'vendor');

// Downlevelled rather than left at esnext. r184+ uses ES2022 class static
// blocks, which Safari only parses from 16.4 — on anything older the module
// throws a SyntaxError and the page never renders at all. Upstream won't fix
// this (mrdoob/three.js#34134, "Won't fix"), so it is ours to handle. Measured
// cost of lowering them: 70 bytes gzipped. Cheap enough not to think about.
const TARGET = 'safari15';

// `inline` keeps three's `/** @license */` banner where the official minified
// builds had it. The MIT notice ships with the code, not just in three.LICENSE.
const OPTS = { minify: true, target: TARGET, format: 'esm', legalComments: 'inline', loader: 'js' };

const kb = (n) => (n / 1024).toFixed(0) + 'K';

async function build(name, edit) {
  const src = readFileSync(join(SRC, 'build', name + '.js'), 'utf8');
  const out = await transform(edit ? edit(src) : src, OPTS);
  const dest = join(OUT, name + '.min.js');
  writeFileSync(dest, out.code);
  return { dest, raw: statSync(dest).size, gz: gzipSync(out.code).length };
}

const results = {};

// three.module.js imports './three.core.js' by relative path, but we write the
// core build under a .min.js name, so the specifier has to follow it or the
// browser 404s on an import the page can't recover from.
results.module = await build('three.module', (src) => {
  const before = src.match(/(['"])\.\/three\.core\.js\1/g);
  if (!before || before.length === 0) {
    console.error('three.module.js no longer imports ./three.core.js — check what changed upstream.');
    process.exit(1);
  }
  return src.replace(/(['"])\.\/three\.core\.js\1/g, '$1./three.core.min.js$1');
});
results.core = await build('three.core');

copyFileSync(join(SRC, 'LICENSE'), join(OUT, 'three.LICENSE'));

// Cheap assertions, because every failure mode here is silent at build time and
// only shows up as a blank page on a device.
const moduleCode = readFileSync(results.module.dest, 'utf8');
const coreCode = readFileSync(results.core.dest, 'utf8');
const problems = [];
if (!moduleCode.includes('./three.core.min.js')) problems.push('module build does not import ./three.core.min.js');
if (/static\s*{/.test(coreCode)) problems.push('class static blocks survived — target ' + TARGET + ' did not lower them');
if (!moduleCode.includes('@license')) problems.push('three license banner was stripped');
if (problems.length) {
  for (const p of problems) console.error('FAIL ' + p);
  process.exit(1);
}

const version = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).version;
let totalGz = 0;
for (const [k, r] of Object.entries(results)) {
  totalGz += r.gz;
  console.log(`three.${k}.min.js  ${kb(r.raw)}  (${kb(r.gz)} gzipped)`);
}
console.log(`\nthree ${version}, target ${TARGET} — ${kb(totalGz)} gzipped total.`);
