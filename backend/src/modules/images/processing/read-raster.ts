import sharp, { type Sharp } from 'sharp';
import { fromFile, type GeoTIFFImage } from 'geotiff';

// Satellite images are often 16-bit or have 4+ bands (e.g. red, green, blue, near-infrared).
// Browsers show 8-bit RGB, so every upload is turned into 8-bit RGB here.

export const SHARP_OPTIONS = { limitInputPixels: false, failOn: 'none' } as const;

const MAX_STRETCH_PIXELS = 150_000_000; // ~12 000 × 12 000; the RGB buffer then needs ~450 MB
const STRIP_ROWS = 512; // rows read from the file at a time
const SAMPLES_PER_BAND = 1_000_000; // pixels looked at to choose the contrast stretch

// Opens a file as an 8-bit RGB sharp image
export async function openAsRgb(file: string): Promise<Sharp> {
  const meta = await sharp(file, SHARP_OPTIONS).metadata();
  const plain8bit = meta.depth === 'uchar' && (meta.format !== 'tiff' || meta.space === 'srgb' || meta.space === 'b-w');
  if (plain8bit) {
    return sharp(file, SHARP_OPTIONS).removeAlpha().toColourspace('srgb');
  }
  if (meta.format === 'tiff') {
    return stretchTiff(file);
  }
  // e.g. a 16-bit PNG
  return sharp(file, SHARP_OPTIONS).removeAlpha().normalise({ lower: 1, upper: 99 }).toColourspace('srgb');
}

// Reads bands 1-3 (or band 1 for single-band images) and maps each to 0-255
async function stretchTiff(file: string): Promise<Sharp> {
  const tiff = await fromFile(file);
  try {
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    if (width * height > MAX_STRETCH_PIXELS) {
      throw new Error(
        `This ${image.getBitsPerSample()}-bit image is too large (${width} × ${height}). Convert it to 8-bit RGB before uploading.`,
      );
    }

    const bands = image.getSamplesPerPixel() >= 3 ? [0, 1, 2] : [0];
    const noData = image.getGDALNoData();
    const is8bit = image.getBitsPerSample() === 8;
    const ranges = is8bit ? bands.map(() => ({ low: 0, high: 255 })) : await findStretch(image, bands, noData);

    // Uint8ClampedArray rounds and clamps values to 0-255 for us
    const rgb = new Uint8ClampedArray(width * height * 3);
    await forEachStrip(image, bands, (strip, y0, rows) => {
      const start = y0 * width * 3;
      for (let c = 0; c < 3; c++) {
        const band = bands.length === 1 ? 0 : c;
        const values = strip[band];
        const { low, high } = ranges[band];
        const scale = 255 / (high - low || 1);
        for (let i = 0; i < width * rows; i++) {
          const v = values[i];
          rgb[start + i * 3 + c] = v === noData ? 0 : (v - low) * scale;
        }
      }
    });
    return sharp(rgb, { raw: { width, height, channels: 3 }, limitInputPixels: false });
  } finally {
    await tiff.close();
  }
}

type Strip = ArrayLike<number>[];

async function forEachStrip(image: GeoTIFFImage, bands: number[], use: (strip: Strip, y0: number, rows: number) => void) {
  const width = image.getWidth();
  const height = image.getHeight();
  for (let y0 = 0; y0 < height; y0 += STRIP_ROWS) {
    const rows = Math.min(STRIP_ROWS, height - y0);
    const strip = await image.readRasters({ window: [0, y0, width, y0 + rows], samples: bands, interleave: false });
    use(strip as unknown as Strip, y0, rows);
  }
}

// Per band: the values at 2% and 98% of the sorted pixels, so a few very bright
// or dark pixels don't wash out the picture. Zero and "no data" pixels are skipped.
async function findStretch(image: GeoTIFFImage, bands: number[], noData: number | null) {
  const step = Math.max(1, Math.floor((image.getWidth() * image.getHeight()) / SAMPLES_PER_BAND));
  const samples: number[][] = bands.map(() => []);

  await forEachStrip(image, bands, (strip) => {
    strip.forEach((values, band) => {
      for (let i = 0; i < values.length; i += step) {
        const v = values[i];
        if (v !== 0 && v !== noData && Number.isFinite(v)) samples[band].push(v);
      }
    });
  });

  return samples.map((values) => {
    if (values.length === 0) return { low: 0, high: 1 };
    const sorted = Float64Array.from(values).sort();
    const at = (fraction: number) => sorted[Math.floor(fraction * (sorted.length - 1))];
    return { low: at(0.02), high: at(0.98) };
  });
}
