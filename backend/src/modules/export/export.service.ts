import path from 'node:path';
import type { Response } from 'express';
import sharp from 'sharp';
import { ZipArchive } from 'archiver';
import type { Project } from '../../db/schema';
import { HttpError } from '../../lib/http-error';
import { imageFile, DISPLAY_FILE } from '../../lib/storage';
import { SHARP_OPTIONS } from '../images/processing/read-raster';
import { originalPath } from '../images/processing/process-image';
import { listProjectLabelClasses } from '../projects/projects.service';
import type { ExportOptions } from './export.schemas';
import { findExportImages, findChipShapes, findMapShapes, type ExportImage } from './export.queries';
import { yoloLines, yoloDataYaml, cocoJson, type ExportChip } from './export.writers';

// What an export would contain, shown before downloading
export async function exportSummary(projectId: string, options: Pick<ExportOptions, 'tasks'>) {
  const exportImages = await findExportImages(projectId, options);
  return {
    imageCount: exportImages.length,
    labelCount: exportImages.reduce((sum, image) => sum + image.labelCount, 0),
  };
}

// Streams a .zip straight to the browser:
//   YOLO:    images/, labels/, data.yaml
//   COCO:    images/, annotations.json
//   GEOJSON: one .geojson per image (+ the original images)
export async function streamExport(res: Response, project: Project, options: ExportOptions) {
  const exportImages = await findExportImages(project.id, options);
  if (exportImages.length === 0) throw new HttpError(400, 'Nothing to export: no ready images in the chosen tasks');
  const classes = await listProjectLabelClasses(project.id);
  const names = uniqueBaseNames(exportImages);

  const zip = new ZipArchive({ zlib: { level: 6 } });
  zip.on('error', (err) => res.destroy(err));
  res.attachment(`${safeName(project.name)}-${options.format.toLowerCase()}.zip`);
  zip.pipe(res);

  if (options.format === 'GEOJSON') {
    for (const image of exportImages) {
      const shapes = await findMapShapes(project.id, image.id, options);
      zip.append(JSON.stringify(featureCollection(image, shapes), null, 1), { name: `${names.get(image.id)}.geojson` });
      const ext = path.extname(image.originalName).toLowerCase();
      if (options.includeImages) zip.file(originalPath(image), { name: `images/${names.get(image.id)}${ext}` });
    }
  } else {
    const chips: ExportChip[] = [];
    const classIndex = new Map(classes.map((labelClass, index) => [labelClass.id, index]));
    for (const image of exportImages) {
      for (const chip of await cutIntoChips(project.id, image, names.get(image.id)!, options)) {
        chips.push(chip);
        if (options.includeImages) zip.append(await chipJpeg(image, chip), { name: `images/${chip.fileName}` });
        if (options.format === 'YOLO') {
          const text = yoloLines(chip, classIndex, project.type === 'SEGMENTATION');
          zip.append(text, { name: `labels/${path.parse(chip.fileName).name}.txt` });
        }
      }
    }
    if (options.format === 'YOLO') zip.append(yoloDataYaml(classes), { name: 'data.yaml' });
    if (options.format === 'COCO') zip.append(JSON.stringify(cocoJson(chips, classes)), { name: 'annotations.json' });
  }

  await zip.finalize();
}

type Chip = ExportChip & { x0: number; y0: number };

// Whole image = one chip. With a chip size, only chips that contain shapes are kept.
async function cutIntoChips(projectId: string, image: ExportImage, baseName: string, options: ExportOptions): Promise<Chip[]> {
  const { chipW, chipH, shapes } = await findChipShapes(projectId, image, options);
  if (options.chipSize === 0) {
    return [{ fileName: `${baseName}.jpg`, width: chipW, height: chipH, x0: 0, y0: 0, shapes }];
  }
  const chips = new Map<string, Chip>();
  for (const shape of shapes) {
    const key = `${shape.x0}_${shape.y0}`;
    if (!chips.has(key)) {
      chips.set(key, { fileName: `${baseName}_${key}.jpg`, width: chipW, height: chipH, x0: shape.x0, y0: shape.y0, shapes: [] });
    }
    chips.get(key)!.shapes.push(shape);
  }
  return [...chips.values()];
}

function chipJpeg(image: ExportImage, chip: Chip) {
  return sharp(imageFile(image.id, DISPLAY_FILE), SHARP_OPTIONS)
    .extract({ left: chip.x0, top: chip.y0, width: chip.width, height: chip.height })
    .jpeg({ quality: 92 })
    .toBuffer();
}

function featureCollection(image: ExportImage, shapes: Awaited<ReturnType<typeof findMapShapes>>) {
  return {
    type: 'FeatureCollection',
    name: image.originalName,
    features: shapes.map(({ geometry, id, ...properties }) => ({ type: 'Feature', id, geometry, properties })),
  };
}

// "a b.tif" → "a_b"; the same name twice → "a_b", "a_b_2"
function uniqueBaseNames(exportImages: ExportImage[]) {
  const used = new Map<string, number>();
  const names = new Map<string, string>();
  for (const image of exportImages) {
    const base = safeName(path.parse(image.originalName).name);
    const seen = (used.get(base) ?? 0) + 1;
    used.set(base, seen);
    names.set(image.id, seen === 1 ? base : `${base}_${seen}`);
  }
  return names;
}

const safeName = (name: string) => name.replace(/[^\w.-]+/g, '_') || 'export';
