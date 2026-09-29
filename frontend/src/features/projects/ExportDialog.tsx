import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { projectsApi, type ExportFormat, type ExportOptions } from '../../api/projects';
import { Dialog, DialogFooter } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/cn';
import type { Project } from '../../types/project';
import { AugmentationFields, type Augmentation } from './AugmentationFields';

// Object detection chooses between these; segmentation always exports masks
const DETECTION_FORMATS: { value: ExportFormat; title: string; hint: string }[] = [
  { value: 'YOLO_OBB', title: 'YOLO OBB', hint: 'images/ + labels/*.txt: class and 4 corners (Ultralytics)' },
  { value: 'VOC', title: 'Pascal VOC', hint: 'JPEGImages/ + Annotations/*.xml' },
];

const CHIP_PRESETS = [256, 512, 640, 1024];
const [MIN_CHIP, MAX_CHIP] = [64, 10_000];
type ChipChoice = 'WHOLE' | 'CUSTOM' | number;

// Choose a chip size (and the format for detection), then download the passed tasks as a dataset .zip
export function ExportDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const segmentation = project.type === 'SEGMENTATION';
  const [format, setFormat] = useState<ExportFormat>(segmentation ? 'MASKS' : 'YOLO_OBB');
  const [chip, setChip] = useState<ChipChoice | null>(null); // the admin must choose one
  const [customSize, setCustomSize] = useState('');
  const [mergeClasses, setMergeClasses] = useState(false);
  const [augmentation, setAugmentation] = useState<Augmentation>({ copies: 0, geometric: [], color: [] });
  const summary = useQuery({
    queryKey: ['project', project.id, 'export'],
    queryFn: () => projectsApi.exportSummary(project.id),
  });

  const custom = Number(customSize);
  const customError =
    chip === 'CUSTOM' && customSize !== '' && !(Number.isInteger(custom) && custom >= MIN_CHIP && custom <= MAX_CHIP)
      ? `A whole number from ${MIN_CHIP} to ${MAX_CHIP}`
      : undefined;
  const chipSize = chip === 'WHOLE' ? 0 : chip === 'CUSTOM' ? custom : (chip ?? 0);
  const chipReady = chip !== null && (chip !== 'CUSTOM' || (customSize !== '' && !customError));
  const augmentationReady = augmentation.copies === 0 || augmentation.geometric.length + augmentation.color.length > 0;
  const nothingPassed = summary.data?.passedTaskCount === 0;
  const empty = summary.data?.imageCount === 0;
  const canDownload = !!summary.data && !nothingPassed && !empty && chipReady && augmentationReady;
  const options: ExportOptions = {
    format,
    chipSize,
    mergeClasses,
    augmentCopies: augmentation.copies,
    geometric: augmentation.copies ? augmentation.geometric : [],
    color: augmentation.copies ? augmentation.color : [],
  };

  return (
    <Dialog open onClose={onClose} title={segmentation ? 'Export segmentation masks' : 'Export dataset'} description={project.name} wide>
      <div className="space-y-4">
        {!segmentation && (
          <div className="grid grid-cols-2 gap-2">
            {DETECTION_FORMATS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormat(option.value)}
                className={cn('rounded-lg border p-3 text-left', format === option.value ? 'border-primary bg-primary-light' : 'border-border hover:border-primary/50')}
              >
                <span className="block text-sm font-semibold">{option.title}</span>
                <span className="text-[11px] text-text-secondary">{option.hint}</span>
              </button>
            ))}
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-medium text-text-secondary">Chip size * <span className="font-normal">(images and masks are cut into squares of this size)</span></p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Chip size">
            {(['WHOLE', ...CHIP_PRESETS, 'CUSTOM'] as ChipChoice[]).map((choice) => (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={chip === choice}
                onClick={() => setChip(choice)}
                className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium', chip === choice ? 'border-primary bg-primary-light text-primary' : 'border-border hover:border-primary/50')}
              >
                {choice === 'WHOLE' ? 'Whole images' : choice === 'CUSTOM' ? 'Custom…' : `${choice} px`}
              </button>
            ))}
          </div>
          {chip === 'CUSTOM' && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                min={MIN_CHIP}
                max={MAX_CHIP}
                step={1}
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                placeholder="e.g. 800"
                aria-label="Custom chip size in pixels"
                aria-invalid={!!customError}
                className="w-32 py-1.5"
                autoFocus
              />
              <span className="text-xs text-text-secondary">× the same, in pixels</span>
              {customError && <span role="alert" className="text-xs text-danger">{customError}</span>}
            </div>
          )}
          {chip === null && <p className="mt-1 text-[11px] text-text-secondary">Choose a chip size to download.</p>}
        </div>

        {segmentation && (
          <div className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={mergeClasses} onChange={(e) => setMergeClasses(e.target.checked)} />
              Merge all classes into one mask
            </label>
            <p className="mt-1 pl-6 text-[11px] text-text-secondary">
              {mergeClasses
                ? 'images/ + masks/: one mask per chip, black background, each class in its own colour.'
                : 'images/ + masks/<class>/: one black-and-white mask per chip and class, the class white, everything else black.'}{' '}
              classes.txt lists each class id and name.
            </p>
          </div>
        )}

        <AugmentationFields value={augmentation} onChange={setAugmentation} />

        <div className={cn('rounded-lg p-3 text-xs', nothingPassed ? 'bg-amber-50 text-amber-800' : 'bg-surface-alt text-text-secondary')}>
          {summary.isPending ? 'Counting…' : nothingPassed ? (
            <>No task has passed review yet. Only tasks that passed review can be exported.</>
          ) : empty ? (
            'Nothing to export: the passed tasks have no ready images.'
          ) : (
            <>Only tasks that passed review are exported: <strong>{summary.data?.passedTaskCount}</strong> task(s),{' '}
              <strong>{summary.data?.imageCount}</strong> image(s), <strong>{summary.data?.labelCount}</strong> shape(s).
              {chip !== null && chip !== 'WHOLE' && ' Only chips that contain shapes are included.'}</>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {/* A normal link: the browser downloads the zip itself, even a big one */}
        <a
          href={canDownload ? projectsApi.exportUrl(project.id, options) : undefined}
          aria-disabled={!canDownload}
          className={cn('inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark', !canDownload && 'pointer-events-none opacity-50')}
        >
          <Download size={14} /> Download .zip
        </a>
      </DialogFooter>
    </Dialog>
  );
}
