import { fromFile } from 'geotiff';

// Where a GeoTIFF sits on the map, as a GDAL "geotransform" + EPSG code:
//   mapX = gt[0] + px * gt[1] + py * gt[2]
//   mapY = gt[3] + px * gt[4] + py * gt[5]
export type Georeference = { geoTransform: number[]; srid: number | null };

const USER_DEFINED = 32767;

export async function readGeoreference(file: string): Promise<Georeference | null> {
  const tiff = await fromFile(file);
  try {
    const image = await tiff.getImage();
    const geoKeys = image.getGeoKeys() ?? {};
    const matrix = image.fileDirectory.getValue('ModelTransformation') as number[] | undefined;

    let gt: number[];
    if (matrix) {
      gt = [matrix[3], matrix[0], matrix[1], matrix[7], matrix[4], matrix[5]];
    } else if (image.fileDirectory.hasTag('ModelTiepoint') && image.fileDirectory.hasTag('ModelPixelScale')) {
      const [originX, originY] = image.getOrigin();
      const [resX, resY] = image.getResolution(); // resY is negative: rows go south
      gt = [originX, resX, 0, originY, 0, resY];
    } else {
      return null; // a plain TIFF
    }

    // "Pixel is point" files give the pixel centre; move to its top-left corner
    if (geoKeys.GTRasterTypeGeoKey === 2) {
      gt[0] -= 0.5 * gt[1] + 0.5 * gt[2];
      gt[3] -= 0.5 * gt[4] + 0.5 * gt[5];
    }

    const epsg = [geoKeys.ProjectedCSTypeGeoKey, geoKeys.GeographicTypeGeoKey].find(
      (code) => typeof code === 'number' && code > 0 && code !== USER_DEFINED,
    );
    return { geoTransform: gt, srid: epsg ?? null };
  } finally {
    await tiff.close();
  }
}

// The image corners in map coordinates, as a closed ring (WKT polygon)
export function footprintWkt(gt: number[], width: number, height: number) {
  const corners = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
    [0, 0],
  ];
  const points = corners.map(([px, py]) => `${gt[0] + px * gt[1] + py * gt[2]} ${gt[3] + px * gt[4] + py * gt[5]}`);
  return `POLYGON((${points.join(', ')}))`;
}
