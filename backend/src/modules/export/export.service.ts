import path from 'node:path';
import type { Response } from 'express';
import sharp from 'sharp';
import { ZipArchive } from 'archiver';
import type { Project } from '../../db/schema';
import { HttpError } from '../../lib/http-error';
import { SHARP_OPTIONS } from '../images/processing/read-raster';
import { displayFile } from '../images/processing/pyramid';
import { listProjectLabelClasses } from '../projects/projects.service';
import { EXPORT_FORMATS, type ExportFormat, type ExportOptions } from './export.schemas';
import { countPassedTasks, findExportImages, findChipShapes, type ExportImage } from './export.queries';
import { yoloObbLines, yoloDataYaml, vocXml, classesTxt, type ExportChip } from './export.writers';
import { mergedMask, classMask, maskClassesTxt, hexToRgb } from './export.masks';
import { augmentImage, augmentShapes, makePlan, randomFor, type RawImage } from './export.augment';

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

// Where each part of a sample goes in the zip
const LAYOUT = {
  YOLO_OBB: { images: 'images', labels: 'labels' },
  VOC: { images: 'JPEGImages', labels: 'Annotations' },
  MASKS: { images: 'images', labels: 'masks' },
} as const;

// Streams a .zip straight to the browser:
//   YOLO_OBB: images/, labels/*.txt, data.yaml, classes.txt
//   VOC:      JPEGImages/, Annotations/*.xml, ImageSets/Main/trainval.txt, classes.txt
//   MASKS:    images/, masks/ (merged) or masks/<class>/ (one folder per class), classes.txt
// Every chip is followed by its augmented copies (<name>_aug1, <name>_aug2…) when asked.
export async function streamExport(res: Response, project: Project, options: ExportOptions) {
  const formats: readonly ExportFormat[] = EXPORT_FORMATS[project.type];
  const format = options.format ?? formats[0];
  if (!formats.includes(format)) {
    throw new HttpError(400, `A ${project.type.toLowerCase()} project exports as ${formats.join(' or ')}`);
  }
  if ((await countPassedTasks(project.id)) === 0) {
    throw new HttpError(400, 'No task of this project has passed review yet. Only passed tasks can be exported.');
  }
  const exportImages = await findExportImages(project.id);
  if (exportImages.length === 0) throw new HttpError(400, 'Nothing to export: the passed tasks have no ready images');
  const tooLarge = exportImages.find((image) => image.width * image.height > MAX_MASK_PIXELS);
  if (format === 'MASKS' && options.chipSize === 0 && tooLarge) {
    throw new HttpError(400, `${tooLarge.originalName} is too large for a whole-image mask. Choose a chip size.`);
  }
  const classes = await listProjectLabelClasses(project.id);
  const names = uniqueBaseNames(exportImages);
  const folders = uniqueFolders(classes);
  const classIndex = new Map(classes.map((labelClass, index) => [labelClass.id, index]));
  const className = new Map(classes.map((labelClass) => [labelClass.id, labelClass.name]));
  const colorOf = new Map(classes.map((labelClass) => [labelClass.id, hexToRgb(labelClass.color)]));
  const layout = LAYOUT[format];

  const zip = new ZipArchive({ zlib: { level: 6 } });
  zip.on('error', (err) => res.destroy(err));
  res.attachment(`${safeName(project.name)}-${format.toLowerCase()}.zip`);
  zip.pipe(res);
  const sampleNames: string[] = [];

  // One image and its labels (or masks)
  async function addSample(chip: ExportChip, jpeg: Buffer) {
    const base = path.parse(chip.fileName).name;
    sampleNames.push(base);
    zip.append(jpeg, { name: `${layout.images}/${chip.fileName}` });
    if (format === 'YOLO_OBB') zip.append(yoloObbLines(chip, classIndex), { name: `${layout.labels}/${base}.txt` });
    if (format === 'VOC') zip.append(vocXml(chip, className), { name: `${layout.labels}/${base}.xml` });
    if (format === 'MASKS' && options.mergeClasses) zip.append(await mergedMask(chip, colorOf), { name: `${layout.labels}/${base}.png` });
    if (format === 'MASKS' && !options.mergeClasses) {
      for (const labelClass of classes) {
        zip.append(await classMask(chip, labelClass.id), { name: `${layout.labels}/${folders.get(labelClass.id)}/${base}.png` });
      }
    }
  }

  for (const image of exportImages) {
    for (const chip of await cutIntoChips(project.id, image, names.get(image.id)!, options.chipSize)) {
      const pixels = await chipPixels(image, chip);
      await addSample(chip, await sharp(pixels.data, { raw: { width: pixels.width, height: pixels.height, channels: 3 } }).jpeg({ quality: 92 }).toBuffer());

      const base = path.parse(chip.fileName).name;
      for (let copy = 1; copy <= options.augmentCopies; copy++) {
        const plan = makePlan(randomFor(`${base}#${copy}`), options.geometric, options.color);
        const moved = augmentShapes(chip, plan);
        await addSample({ ...moved, fileName: `${base}_aug${copy}.jpg` }, await augmentImage(pixels, plan));
      }
    }
  }

  if (format === 'YOLO_OBB') zip.append(yoloDataYaml(classes), { name: 'data.yaml' });
  if (format === 'VOC') zip.append([...sampleNames, ''].join('\n'), { name: 'ImageSets/Main/trainval.txt' });
  zip.append(format === 'MASKS' ? maskClassesTxt(classes, folders, options.mergeClasses) : classesTxt(classes), { name: 'classes.txt' });
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

// The chip's pixels (8-bit RGB), read once and reused by its augmented copies
async function chipPixels(image: ExportImage, chip: Chip): Promise<RawImage> {
  const { data, info } = await sharp(await displayFile(image.id), SHARP_OPTIONS)
    .extract({ left: chip.x0, top: chip.y0, width: chip.width, height: chip.height })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
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
