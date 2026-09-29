import sharp from 'sharp';
import type { Position, PolygonGeometry } from '../../db/schema';
import type { ChipShape } from './export.queries';
import type { ColorAugmentation, GeometricAugmentation } from './export.schemas';

// Data augmentation: extra, slightly changed copies of every chip, so a model sees more variety.
//   Geometric (pixels move, so the shapes move with them):
//     FLIP_H / FLIP_V   mirror left-right / top-bottom (each with 50 % chance)
//     ROTATE_90         turn by 90°, 180° or 270°
//     ROTATE            turn by a small angle (±15°)
//     ZOOM              zoom in 5–30 % around the centre
//   Colour (shapes stay where they are):
//     BRIGHTNESS ±25 %, CONTRAST ±25 %, SATURATION ±35 %, HUE ±20°,
//     BLUR, SHARPEN, NOISE (grain), GRAYSCALE
// Each copy applies the chosen augmentations with random strengths, like Roboflow or Albumentations.

export type Plan = {
  angle: number; // degrees, clockwise
  zoom: number; // 1 = none
  flipH: boolean;
  flipV: boolean;
  quarterTurns: number; // clockwise, 0-3
  brightness: number; // 1 = none
  contrast: number;
  saturation: number;
  hue: number; // degrees
  blur: number; // sigma, 0 = none
  sharpen: boolean;
  noise: number; // standard deviation in 0-255 levels, 0 = none
  grayscale: boolean;
};

export type Sample = { width: number; height: number; shapes: ChipShape[] };
export type RawImage = { data: Buffer; width: number; height: number };

// A repeatable random number generator (mulberry32), so the same export gives the same dataset
export function randomFor(text: string) {
  let seed = [...text].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makePlan(random: () => number, geometric: GeometricAugmentation[], color: ColorAugmentation[]): Plan {
  const has = (name: GeometricAugmentation | ColorAugmentation) =>
    (geometric as string[]).includes(name) || (color as string[]).includes(name);
  const between = (low: number, high: number) => low + random() * (high - low);
  const coin = (chance = 0.5) => random() < chance;
  const plan: Plan = {
    angle: has('ROTATE') ? between(-15, 15) : 0,
    zoom: has('ZOOM') ? between(1.05, 1.3) : 1,
    flipH: has('FLIP_H') && coin(),
    flipV: has('FLIP_V') && coin(),
    quarterTurns: has('ROTATE_90') ? 1 + Math.floor(random() * 3) : 0,
    brightness: has('BRIGHTNESS') ? between(0.75, 1.25) : 1,
    contrast: has('CONTRAST') ? between(0.75, 1.25) : 1,
    saturation: has('SATURATION') ? between(0.65, 1.35) : 1,
    hue: has('HUE') ? between(-20, 20) : 0,
    blur: has('BLUR') && coin() ? between(0.4, 1.4) : 0,
    sharpen: has('SHARPEN') && coin(),
    noise: has('NOISE') && coin() ? between(3, 12) : 0,
    grayscale: has('GRAYSCALE') && coin(0.3),
  };
  // A copy must differ from the original: when every coin said "no", apply one chosen augmentation for sure
  const unchanged =
    !plan.angle && plan.zoom === 1 && !plan.flipH && !plan.flipV && !plan.quarterTurns && plan.brightness === 1 &&
    plan.contrast === 1 && plan.saturation === 1 && !plan.hue && !plan.blur && !plan.sharpen && !plan.noise && !plan.grayscale;
  if (unchanged) {
    const forced = [...geometric, ...color][Math.floor(random() * (geometric.length + color.length))];
    if (forced === 'FLIP_H') plan.flipH = true;
    if (forced === 'FLIP_V') plan.flipV = true;
    if (forced === 'BLUR') plan.blur = 1;
    if (forced === 'SHARPEN') plan.sharpen = true;
    if (forced === 'NOISE') plan.noise = 8;
    if (forced === 'GRAYSCALE') plan.grayscale = true;
  }
  return plan;
}

// ── Image ──

export async function augmentImage(image: RawImage, plan: Plan) {
  const raw = (data: Buffer, width: number, height: number) => sharp(data, { raw: { width, height, channels: 3 } });
  let current = image;

  // Small turn and zoom around the centre, keeping the chip size (new corners are black)
  if (plan.angle || plan.zoom !== 1) {
    const turned = await raw(current.data, current.width, current.height)
      .rotate(plan.angle, { background: '#000000' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const [w, h] = [Math.round(turned.info.width * plan.zoom), Math.round(turned.info.height * plan.zoom)];
    const { data } = await raw(turned.data, turned.info.width, turned.info.height)
      .resize(w, h)
      .extract({ left: Math.round((w - image.width) / 2), top: Math.round((h - image.height) / 2), width: image.width, height: image.height })
      .raw()
      .toBuffer({ resolveWithObject: true });
    current = { data, width: image.width, height: image.height };
  }

  // Mirrors happen before the quarter turn (sharp's own order, and the order of transformPoint)
  const pipeline = raw(current.data, current.width, current.height);
  if (plan.flipH) pipeline.flop();
  if (plan.flipV) pipeline.flip();
  if (plan.quarterTurns) pipeline.rotate(90 * plan.quarterTurns);
  if (plan.brightness !== 1 || plan.saturation !== 1 || plan.hue) {
    pipeline.modulate({ brightness: plan.brightness, saturation: plan.saturation, hue: Math.round(plan.hue) });
  }
  if (plan.contrast !== 1) pipeline.linear(plan.contrast, 128 * (1 - plan.contrast));
  if (plan.blur) pipeline.blur(plan.blur);
  if (plan.sharpen) pipeline.sharpen();
  if (plan.grayscale) pipeline.grayscale().toColourspace('srgb');
  const out = await pipeline.raw().toBuffer({ resolveWithObject: true });

  let pixels = out.data;
  if (plan.noise) pixels = addNoise(pixels, plan.noise, randomFor(`${plan.noise}:${pixels.length}`));
  return sharp(pixels, { raw: { width: out.info.width, height: out.info.height, channels: out.info.channels } }).jpeg({ quality: 92 }).toBuffer();
}

// Film-grain noise: every channel moves by a roughly normal amount (sum of 3 uniform numbers)
function addNoise(pixels: Buffer, deviation: number, random: () => number) {
  const out = Buffer.from(pixels);
  const scale = deviation * 2; // (sum of 3 uniforms − 1.5) has a deviation of 0.5
  for (let i = 0; i < out.length; i++) {
    const value = out[i] + (random() + random() + random() - 1.5) * scale;
    out[i] = value < 0 ? 0 : value > 255 ? 255 : value;
  }
  return out;
}

// ── Shapes ──

// Where a pixel position of the original chip ends up in the augmented one
function transformPoint(plan: Plan, width: number, height: number) {
  const [cx, cy] = [width / 2, height / 2];
  const [cos, sin] = [Math.cos((plan.angle * Math.PI) / 180), Math.sin((plan.angle * Math.PI) / 180)];
  return ([x, y]: Position): Position => {
    // Turn (clockwise on screen, y down) and zoom around the centre
    let [px, py] = [cx + plan.zoom * ((x - cx) * cos - (y - cy) * sin), cy + plan.zoom * ((x - cx) * sin + (y - cy) * cos)];
    if (plan.flipH) px = width - px;
    if (plan.flipV) py = height - py;
    let [w, h] = [width, height];
    for (let i = 0; i < plan.quarterTurns; i++) {
      [px, py] = [h - py, px]; // 90° clockwise
      [w, h] = [h, w];
    }
    return [px, py];
  };
}

// The shapes of a chip after the augmentation, cut to the chip (a small turn or a zoom pushes some out)
export function augmentShapes(sample: Sample, plan: Plan): Sample {
  const move = transformPoint(plan, sample.width, sample.height);
  const [width, height] = plan.quarterTurns % 2 ? [sample.height, sample.width] : [sample.width, sample.height];
  const shapes: ChipShape[] = [];
  for (const shape of sample.shapes) {
    if (shape.geometry.type !== 'Polygon') continue;
    const ring = clipToRectangle(shape.geometry.coordinates[0].slice(0, -1).map(move), width, height);
    if (ring.length < 3 || ringArea(ring) < 1) continue;
    // The direction of a rotated box's first side moves like any other vector
    const [a, b] = [move([0, 0]), move([Math.cos(shape.angle), Math.sin(shape.angle)])];
    const geometry: PolygonGeometry = { type: 'Polygon', coordinates: [[...ring, ring[0]]] };
    shapes.push({ ...shape, angle: Math.atan2(b[1] - a[1], b[0] - a[0]), geometry });
  }
  return { width, height, shapes };
}

// Sutherland–Hodgman: the part of a polygon inside [0, width] × [0, height]
function clipToRectangle(points: Position[], width: number, height: number) {
  const edges: [(p: Position) => boolean, (a: Position, b: Position) => Position][] = [
    [([x]) => x >= 0, (a, b) => cross(a, b, (a[0] - 0) / (a[0] - b[0]))],
    [([x]) => x <= width, (a, b) => cross(a, b, (a[0] - width) / (a[0] - b[0]))],
    [([, y]) => y >= 0, (a, b) => cross(a, b, (a[1] - 0) / (a[1] - b[1]))],
    [([, y]) => y <= height, (a, b) => cross(a, b, (a[1] - height) / (a[1] - b[1]))],
  ];
  let result = points;
  for (const [inside, intersect] of edges) {
    const input = result;
    result = [];
    input.forEach((current, i) => {
      const previous = input[(i + input.length - 1) % input.length];
      if (inside(current)) {
        if (!inside(previous)) result.push(intersect(previous, current));
        result.push(current);
      } else if (inside(previous)) {
        result.push(intersect(previous, current));
      }
    });
  }
  return result;
}

const cross = (a: Position, b: Position, t: number): Position => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const ringArea = (ring: Position[]) =>
  Math.abs(ring.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length];
    return sum + x1 * y2 - x2 * y1;
  }, 0)) / 2;
