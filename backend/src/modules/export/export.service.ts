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
import { EXPORT_FORMATS, type ExportOptions } from './export.schemas';
import { countPassedTasks, findExportImages, findChipShapes, findMapShapes, type ExportImage } from './export.queries';
import { yoloLines, yoloDataYaml, cocoJson, type ExportChip, type YoloMode } from './export.writers';
import { mergedMask, classMask, maskLegend, maskReadme, hexToRgb } from './export.masks';

// A mask is built in memory (3 bytes per pixel when merged): whole-image masks of huge images need chips
const MAX_MASK_PIXELS = 150_000_000;

// What an export would contain, shown before downloading. Only passed tasks are exported.
export async function exportSummary(projectId: string) {
  const [passedTaskCount, exportImages] = await Promise.all([countPassedTasks(projectId), findExportImages(projectId)]);
  return {
    passedTaskCount,
    imageCount: exportImages.length,
    labelCount: exportImages.reduce((sum, image) => sum + image.labelCount, 0),
  };
}

// Streams a .zip straight to the browser:
//   YOLO / YOLO_OBB: images/, labels/, data.yaml
//   COCO:            images/, annotations.json
//   MASKS:           images/, masks/ (merged) or masks/<class>/ (per class), classes.json
//   GEOJSON:         one .geojson per image (+ the original images)
export async function streamExport(res: Response, project: Project, options: ExportOptions) {
  const formats: readonly string[] = EXPORT_FORMATS[project.type];
  if (!formats.includes(options.format)) {
    throw new HttpError(400, `A ${project.type.toLowerCase()} project exports as ${formats.join(', ')}`);
  }
  if ((await countPassedTasks(project.id)) === 0) {
    throw new HttpError(400, 'No task of this project has passed review yet. Only passed tasks can be exported.');
  }
  const exportImages = await findExportImages(project.id);
  if (exportImages.length === 0) throw new HttpError(400, 'Nothing to export: the passed tasks have no ready images');
  const tooLarge = exportImages.find((image) => image.width * image.height > MAX_MASK_PIXELS);
  if (options.format === 'MASKS' && options.chipSize === 0 && tooLarge) {
    throw new HttpError(400, `${tooLarge.originalName} is too large for a whole-image mask. Choose a chip size.`);
  }
  const classes = await listProjectLabelClasses(project.id);
  const names = uniqueBaseNames(exportImages);

  const zip = new ZipArchive({ zlib: { level: 6 } });
  zip.on('error', (err) => res.destroy(err));
  res.attachment(`${safeName(project.name)}-${options.format.toLowerCase()}.zip`);
  zip.pipe(res);

  if (options.format === 'GEOJSON') {
    for (const image of exportImages) {
      const shapes = await findMapShapes(project.id, image.id);
      zip.append(JSON.stringify(featureCollection(image, shapes), null, 1), { name: `${names.get(image.id)}.geojson` });
      const ext = path.extname(image.originalName).toLowerCase();
      if (options.includeImages) zip.file(originalPath(image), { name: `images/${names.get(image.id)}${ext}` });
    }
    await zip.finalize();
    return;
  }

  const chips: ExportChip[] = [];
  const classIndex = new Map(classes.map((labelClass, index) => [labelClass.id, index]));
  const yoloMode: YoloMode = options.format === 'YOLO_OBB' ? 'OBB' : project.type === 'SEGMENTATION' ? 'SEGMENT' : 'BOX';
  const colorOf = new Map(classes.map((labelClass) => [labelClass.id, hexToRgb(labelClass.color)]));
  const folders = uniqueFolders(classes);

  for (const image of exportImages) {
    for (const chip of await cutIntoChips(project.id, image, names.get(image.id)!, options.chipSize)) {
      chips.push(chip);
      const baseName = path.parse(chip.fileName).name;
      if (options.includeImages) zip.append(await chipJpeg(image, chip), { name: `images/${chip.fileName}` });
      if (options.format === 'YOLO' || options.format === 'YOLO_OBB') {
        zip.append(yoloLines(chip, classIndex, yoloMode), { name: `labels/${baseName}.txt` });
      }
      if (options.format === 'MASKS' && options.mergeClasses) {
        zip.append(await mergedMask(chip, colorOf), { name: `masks/${baseName}.png` });
      }
      if (options.format === 'MASKS' && !options.mergeClasses) {
        for (const labelClass of classes) {
          zip.append(await classMask(chip, labelClass.id), { name: `masks/${folders.get(labelClass.id)}/${baseName}.png` });
        }
      }
    }
  }

  if (options.format === 'YOLO' || options.format === 'YOLO_OBB') zip.append(yoloDataYaml(classes), { name: 'data.yaml' });
  if (options.format === 'COCO') zip.append(JSON.stringify(cocoJson(chips, classes)), { name: 'annotations.json' });
  if (options.format === 'MASKS') {
    zip.append(JSON.stringify(maskLegend(classes, folders, options.mergeClasses), null, 2), { name: 'classes.json' });
    zip.append(maskReadme(options.mergeClasses), { name: 'README.txt' });
  }
  await zip.finalize();
}

type Chip = ExportChip & { x0: number; y0: number };

// Whole image = one chip. With a chip size, only chips that contain shapes are kept.
async function cutIntoChips(projectId: string, image: ExportImage, baseName: string, chipSize: number): Promise<Chip[]> {
  const { chipW, chipH, shapes } = await findChipShapes(projectId, image, chipSize);
  if (chipSize === 0) {
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
function uniqueNames<T>(items: T[], idOf: (item: T) => string, nameOf: (item: T) => string) {
  const used = new Map<string, number>();
  const names = new Map<string, string>();
  for (const item of items) {
    const base = safeName(nameOf(item));
    const seen = (used.get(base) ?? 0) + 1;
    used.set(base, seen);
    names.set(idOf(item), seen === 1 ? base : `${base}_${seen}`);
  }
  return names;
}

const uniqueBaseNames = (exportImages: ExportImage[]) =>
  uniqueNames(exportImages, (image) => image.id, (image) => path.parse(image.originalName).name);

// One mask folder per class, e.g. masks/Tree/
const uniqueFolders = (classes: { id: string; name: string }[]) =>
  uniqueNames(classes, (labelClass) => labelClass.id, (labelClass) => labelClass.name);

// Letters, digits, _ . - only, and no leading dots (so a name can't be ".." inside the zip)
const safeName = (name: string) => name.replace(/[^\w.-]+/g, '_').replace(/^\.+/, '') || 'export';
