import type { Position } from '../../db/schema';

// Pixel work of the magic pen, on a raw RGB(A) buffer. Masks are 1 (inside) / 0, one byte per pixel.

// The pixels connected to the seed (left, right, up, down) whose colour is close to the seed colour:
// every channel within `tolerance` (0-255) of the average colour around the seed.
export function growRegion(
  pixels: Uint8Array,
  width: number,
  height: number,
  channels: number,
  seedX: number,
  seedY: number,
  tolerance: number,
) {
  const seed = averageColour(pixels, width, height, channels, seedX, seedY);
  const isClose = (i: number) => {
    const p = i * channels;
    return (
      Math.abs(pixels[p] - seed[0]) <= tolerance &&
      Math.abs(pixels[p + 1] - seed[1]) <= tolerance &&
      Math.abs(pixels[p + 2] - seed[2]) <= tolerance
    );
  };
  return floodFill(width, height, seedY * width + seedX, isClose);
}

// Removes 1-pixel bridges and spurs (erode, then dilate), then keeps the part that holds the seed.
// This stops the region from leaking into the background through a thin gap.
// Objects too thin to survive (e.g. a 2-pixel line) are returned unchanged.
export function openRegion(mask: Uint8Array, width: number, height: number, seedX: number, seedY: number) {
  const eroded = new Uint8Array(mask.length);
  forEachPixel(width, height, (i, x, y) => {
    eroded[i] =
      mask[i] && x > 0 && mask[i - 1] && x < width - 1 && mask[i + 1] && y > 0 && mask[i - width] && y < height - 1 && mask[i + width]
        ? 1
        : 0;
  });
  const opened = new Uint8Array(mask.length);
  forEachPixel(width, height, (i, x, y) => {
    opened[i] =
      eroded[i] ||
      (x > 0 && eroded[i - 1]) ||
      (x < width - 1 && eroded[i + 1]) ||
      (y > 0 && eroded[i - width]) ||
      (y < height - 1 && eroded[i + width])
        ? 1
        : 0;
  });
  const seed = seedY * width + seedX;
  if (!opened[seed]) return mask;
  return floodFill(width, height, seed, (i) => opened[i] === 1);
}

// The outer outline of the region, along pixel edges, as the corners of a closed polygon.
// Walks clockwise (y down) with the region on its right, starting at the top-left pixel.
export function traceOutline(mask: Uint8Array, width: number, height: number): Position[] {
  const start = mask.indexOf(1);
  if (start < 0) return [];
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;

  // Directions E, S, W, N. Around the corner point (x, y) lie the pixels
  // top-left (x-1, y-1), top-right (x, y-1), bottom-left (x-1, y) and bottom-right (x, y).
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];
  // The pixel ahead on the left and ahead on the right, for each direction
  const aheadLeft = (x: number, y: number, dir: number) => [[x, y - 1], [x, y], [x - 1, y], [x - 1, y - 1]][dir];
  const aheadRight = (x: number, y: number, dir: number) => [[x, y], [x - 1, y], [x - 1, y - 1], [x, y - 1]][dir];

  const sx = start % width;
  const sy = Math.floor(start / width);
  // The first pixel's left edge is walked upwards last, so we "arrive" at its top-left corner going north
  let [x, y, dir] = [sx, sy, 3];
  const corners: Position[] = [];
  let steps = 4 * (width + 1) * (height + 1); // every pixel edge at most once
  do {
    const [rx, ry] = aheadRight(x, y, dir);
    const [lx, ly] = aheadLeft(x, y, dir);
    let next = dir;
    if (!inside(rx, ry)) next = (dir + 1) % 4; // turn right
    else if (inside(lx, ly)) next = (dir + 3) % 4; // turn left
    if (next !== dir) corners.push([x, y]);
    dir = next;
    x += DX[dir];
    y += DY[dir];
  } while ((x !== sx || y !== sy || dir !== 3) && --steps > 0);
  return [...corners, corners[0]];
}

export const countInside = (mask: Uint8Array) => mask.reduce((sum, value) => sum + value, 0);

function floodFill(width: number, height: number, start: number, belongs: (i: number) => boolean) {
  const mask = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let [head, tail] = [0, 0];
  mask[start] = 1;
  queue[tail++] = start;
  const visit = (i: number) => {
    if (!mask[i] && belongs(i)) {
      mask[i] = 1;
      queue[tail++] = i;
    }
  };
  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    if (x > 0) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i < width * (height - 1)) visit(i + width);
  }
  return mask;
}

// Mean colour of the 3 × 3 pixels around (x, y), so one noisy pixel doesn't decide
function averageColour(pixels: Uint8Array, width: number, height: number, channels: number, x: number, y: number) {
  const sum = [0, 0, 0];
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const [px, py] = [x + dx, y + dy];
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const p = (py * width + px) * channels;
      for (let c = 0; c < 3; c++) sum[c] += pixels[p + c];
      count++;
    }
  }
  return sum.map((value) => value / count);
}

function forEachPixel(width: number, height: number, use: (i: number, x: number, y: number) => void) {
  for (let y = 0, i = 0; y < height; y++) {
    for (let x = 0; x < width; x++, i++) use(i, x, y);
  }
}
