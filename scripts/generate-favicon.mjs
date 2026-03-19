// Generates a pixel character SVG favicon using the same algorithm as the app.
// Run: node scripts/generate-favicon.mjs

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRID_SIZE = 16;

// Seeded pseudo-random for reproducibility
function createRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateCharacter(rnd) {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  const halfWidth = Math.ceil(GRID_SIZE / 2);

  const headWidth = 4 + Math.floor(rnd() * 3);
  const headHeight = 4 + Math.floor(rnd() * 3);
  const headStartY = 1 + Math.floor(rnd() * 2);

  const bodyWidth = 3 + Math.floor(rnd() * 4);
  const bodyHeight = 4 + Math.floor(rnd() * 4);
  const bodyStartY = headStartY + headHeight + (rnd() < 0.4 ? 1 : 0);

  for (let y = headStartY; y < headStartY + headHeight; y++)
    for (let x = halfWidth - headWidth; x < halfWidth; x++)
      grid[y][x] = true;

  for (let y = bodyStartY; y < bodyStartY + bodyHeight; y++)
    for (let x = halfWidth - bodyWidth; x < halfWidth; x++)
      grid[y][x] = true;

  let eyeSizeW = rnd() < 0.5 ? 2 : 1;
  let eyeSizeH = rnd() < 0.5 ? 2 : 1;
  if (eyeSizeW === 2 && eyeSizeH === 2) {
    if (rnd() < 0.5) eyeSizeW = 1; else eyeSizeH = 1;
  }
  const eyeY = headStartY + 1 + Math.floor(rnd() * (headHeight - 2));
  const eyeX = halfWidth - 2 - Math.floor(rnd() * (headWidth - 3));
  for (let ey = 0; ey < eyeSizeH; ey++)
    for (let ex = 0; ex < eyeSizeW; ex++) {
      const cy = eyeY + ey, cx = eyeX - ex;
      if (cy < GRID_SIZE && cx >= 0) grid[cy][cx] = false;
    }

  const legType = Math.floor(rnd() * 5);
  const bodyEndY = bodyStartY + bodyHeight;
  const legHeight = 2 + Math.floor(rnd() * 3);
  for (let y = bodyEndY; y < Math.min(bodyEndY + legHeight, GRID_SIZE); y++) {
    if (legType === 0) { grid[y][halfWidth - bodyWidth + 1] = true; grid[y][halfWidth - 2] = true; }
    else if (legType === 1) for (let x = halfWidth - bodyWidth + 1; x < halfWidth - 1; x++) grid[y][x] = true;
    else if (legType === 2) grid[y][halfWidth - bodyWidth + 1 + (y - bodyEndY)] = true;
    else if (legType === 3) grid[y][halfWidth - 1] = true;
    else { grid[y][halfWidth - bodyWidth] = true; grid[y][halfWidth - 2] = true; }
  }

  const sideDetailType = Math.floor(rnd() * 6);
  if (sideDetailType > 0) {
    const sideY = bodyStartY + 1;
    const startX = halfWidth - Math.max(headWidth, bodyWidth) - 1;
    if (sideDetailType === 1) { grid[headStartY][halfWidth - headWidth - 1] = true; if (headStartY - 1 >= 0) grid[headStartY - 1][halfWidth - headWidth - 1] = true; }
    else if (sideDetailType === 2) { for (let x = startX; x > startX - 2; x--) if (x >= 0) grid[sideY + 1][x] = true; }
    else if (sideDetailType === 3) { for (let dy = 0; dy < 3; dy++) if (startX >= 0) grid[sideY + dy][startX] = true; }
    else if (sideDetailType === 4) { if (startX >= 0) { grid[sideY][startX] = true; grid[sideY + 2][startX] = true; } }
    else if (sideDetailType === 5) { grid[bodyStartY][halfWidth - bodyWidth - 1] = true; }
  }

  if (rnd() < 0.4) {
    const topX = halfWidth - headWidth + 1;
    if (headStartY - 1 >= 0) {
      grid[headStartY - 1][topX] = true;
      if (rnd() < 0.5 && headStartY - 2 >= 0)
        grid[headStartY - 2][topX - 1 >= 0 ? topX - 1 : topX] = true;
    }
  }

  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = halfWidth; x < GRID_SIZE; x++)
      grid[y][x] = grid[y][GRID_SIZE - 1 - x];

  return grid;
}

// Pick a random seed based on current date for variety
const seed = Date.now() & 0xffffffff;
const rnd = createRng(seed);
const grid = generateCharacter(rnd);

// Pick a vivid color
const hue = Math.floor(rnd() * 360);
const color = `hsl(${hue}, 80%, 65%)`;

// Build SVG — 16×16 viewBox, dark background
const cells = [];
for (let y = 0; y < GRID_SIZE; y++)
  for (let x = 0; x < GRID_SIZE; x++)
    if (grid[y][x])
      cells.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges">
  <rect width="16" height="16" fill="#1a1a1a"/>
  ${cells.join('\n  ')}
</svg>`;

const publicDir = join(__dirname, '..', 'public');
mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, 'favicon.svg'), svg);
console.log(`✓ favicon.svg generated (seed: ${seed}, color: ${color})`);
console.log(`  → public/favicon.svg`);
