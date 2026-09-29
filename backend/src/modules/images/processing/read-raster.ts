import sharp from 'sharp';
import { fromFile, type GeoTIFFImage } from 'geotiff';
import { RgbTiffWriter } from './rgb-tiff-writer';

// Satellite images are often 16-bit or have 4+ bands (e.g. red, green, blue, near-infrared).
// Browsers show 8-bit RGB. Everything here streams: a 100 GB image is never loaded whole.

export const SHARP_OPTIONS = { limitInputPixels: false, failOn: 'none' } as const;

const MAX_STRIP_BYTES = 64 * 1024 * 1024; // how much of the source is read at a time
const SAMPLE_GRID = 8; // the contrast stretch looks at 8 × 8 windows spread over the image…
const SAMPLE_SIZE = 256; // …of 256 × 256 pixels, not at the whole image

export type RasterInfo = {
  width: number;
  height: number;
  bits: number;
  samples: number;
  tiled: boolean;
  overviews: number; // reduced-resolution copies inside the file
  compression: number;
};

export async function describeTiff(file: string): Promise<RasterInfo> {
  const tiff = await fromFile(file);
  try {
    const image = await tiff.getImage();
    let overviews = 0;
    for (let i = 1; i < (await tiff.getImageCount()); i++) {
      const subfile = ((await tiff.getImage(i)).fileDirectory.getValue('NewSubfileType') as number | undefined) ?? 0;
      if (!(subfile & 4)) overviews++; // 4 = a transparency mask, not an overview
    }
    return {
      width: image.getWidth(),
      height: image.getHeight(),
      bits: image.getBitsPerSample(),
      samples: image.getSamplesPerPixel(),
      tiled: image.isTiled,
      overviews,
      compression: (image.fileDirectory.getValue('Compression') as number | undefined) ?? 1,
    };
  } finally {
    await tiff.close();
  }
}

// Can libvips read it straight as RGB (8-bit grey, RGB or RGB + alpha)? Then no stretch is needed.
export const isPlain8bit = (info: RasterInfo) => info.bits === 8 && [1, 3, 4].includes(info.samples);

// Already a COG we can serve as it is: 8-bit, tiled, with overviews, in a compression libvips reads
export const isServableCog = (info: RasterInfo) =>
  isPlain8bit(info) && info.tiled && (info.overviews > 0 || Math.max(info.width, info.height) <= 4096) &&
  [1, 5, 7, 8, 32946].includes(info.compression); // none, LZW, JPEG, Deflate

// A pipeline that gives 8-bit RGB from a plain 8-bit file
export const rgbPipeline = (file: string) =>
  sharp(file, { ...SHARP_OPTIONS, sequentialRead: true }).removeAlpha().toColourspace('srgb');

// 16-bit (or 32-bit) with 1-4 bands: libvips maps bands 1-3 (or band 1) to 0-255 with a 2-98 % stretch,
// streaming. The stretch goes to 0-65535 first; the 16-bit → sRGB conversion then divides by 257.
export async function stretchedPipeline(file: string, info: RasterInfo) {
  const tiff = await fromFile(file);
  let ranges: { low: number; high: number }[];
  try {
    const image = await tiff.getImage();
    ranges = await findStretch(image, info.samples >= 3 ? [0, 1, 2] : [0], image.getGDALNoData());
  } finally {
    await tiff.close();
  }
  const scale = ranges.map(({ low, high }) => 65535 / (high - low || 1));
  const offset = ranges.map(({ low }, band) => -low * scale[band]);
  return sharp(file, { ...SHARP_OPTIONS, sequentialRead: true }).removeAlpha().linear(scale, offset).toColourspace('srgb');
}

// 5 or more bands (libvips can't pick bands 1-3): the same stretch in JavaScript, slower,
// written strip by strip into an uncompressed 8-bit RGB TIFF
export async function writeStretchedRgb(file: string, out: string) {
  const tiff = await fromFile(file);
  try {
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const bands = image.getSamplesPerPixel() >= 3 ? [0, 1, 2] : [0];
    const noData = image.getGDALNoData();
    const ranges = image.getBitsPerSample() === 8 ? bands.map(() => ({ low: 0, high: 255 })) : await findStretch(image, bands, noData);
    const bytesPerRow = width * image.getSamplesPerPixel() * Math.ceil(image.getBitsPerSample() / 8);
    const rowsPerStrip = Math.max(1, Math.min(512, Math.floor(MAX_STRIP_BYTES / bytesPerRow)));

    const writer = await RgbTiffWriter.create(out, width, height, rowsPerStrip);
    try {
      for (let y0 = 0; y0 < height; y0 += rowsPerStrip) {
        const rows = Math.min(rowsPerStrip, height - y0);
        const strip = (await image.readRasters({ window: [0, y0, width, y0 + rows], samples: bands, interleave: false })) as unknown as ArrayLike<number>[];
        const rgb = new Uint8ClampedArray(width * rows * 3); // rounds and clamps to 0-255 for us
        for (let c = 0; c < 3; c++) {
          const band = bands.length === 1 ? 0 : c;
          const values = strip[band];
          const { low, high } = ranges[band];
          const scale = 255 / (high - low || 1);
          for (let i = 0; i < width * rows; i++) {
            const v = values[i];
            rgb[i * 3 + c] = v === noData ? 0 : (v - low) * scale;
          }
        }
        await writer.write(new Uint8Array(rgb.buffer));
      }
    } finally {
      await writer.close();
    }
  } finally {
    await tiff.close();
  }
}

// Per band: the values at 2 % and 98 % of pixels sampled from windows spread over the image,
// so a few very bright or dark pixels don't wash out the picture. Zero and "no data" are skipped.
async function findStretch(image: GeoTIFFImage, bands: number[], noData: number | null) {
  const width = image.getWidth();
  const height = image.getHeight();
  const size = Math.min(SAMPLE_SIZE, width, height);
  const samples: number[][] = bands.map(() => []);
  for (let gy = 0; gy < SAMPLE_GRID; gy++) {
    for (let gx = 0; gx < SAMPLE_GRID; gx++) {
      const x = Math.round(((width - size) * (gx + 0.5)) / SAMPLE_GRID);
      const y = Math.round(((height - size) * (gy + 0.5)) / SAMPLE_GRID);
      const window = (await image.readRasters({ window: [x, y, x + size, y + size], samples: bands, interleave: false })) as unknown as ArrayLike<number>[];
      window.forEach((values, band) => {
        for (let i = 0; i < values.length; i += 4) {
          const v = values[i];
          if (v !== 0 && v !== noData && Number.isFinite(v)) samples[band].push(v);
        }
      });
    }
  }
  return samples.map((values) => {
    if (values.length === 0) return { low: 0, high: 1 };
    const sorted = Float64Array.from(values).sort();
    const at = (fraction: number) => sorted[Math.floor(fraction * (sorted.length - 1))];
    return { low: at(0.02), high: at(0.98) };
  });
}
