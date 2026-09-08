// Rasterizes each icon.svg into the PNGs iOS/Android need for the home screen.
// iOS ignores SVG apple-touch-icons, so the PNGs are required, not an optimization.
//
// Run after editing any icon.svg:  make icons
//
// Output per page: apple-touch-icon.png (180, iOS) + icon-192.png + icon-512.png (manifest).
// PNGs are flattened onto black — iOS composites alpha against black anyway, and
// every icon.svg is full-bleed so no transparency should reach the edge.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const OUTPUTS = [
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
];

const DIRS = ['', ...fs.readdirSync(path.join(REPO, 'games')).map((g) => path.join('games', g))];

async function main() {
  for (const dir of DIRS) {
    const src = path.join(REPO, dir, 'icon.svg');
    if (!fs.existsSync(src)) {
      console.error(`no icon.svg in /${dir}`);
      process.exitCode = 1;
      continue;
    }
    for (const { size, name } of OUTPUTS) {
      // High density first, then downscale: renders curves at full precision.
      await sharp(src, { density: 2400 })
        .resize(size, size)
        .flatten({ background: '#000000' })
        .png({ compressionLevel: 9, palette: true })
        .toFile(path.join(REPO, dir, name));
    }
    console.log(`${dir || '.'}: ${OUTPUTS.map((o) => o.name).join(' ')}`);
  }
}

main();
