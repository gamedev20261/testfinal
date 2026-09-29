import { cn } from '../../lib/cn';
import type { ColorAugmentation, GeometricAugmentation } from '../../api/projects';

export type Augmentation = { copies: number; geometric: GeometricAugmentation[]; color: ColorAugmentation[] };

const GEOMETRIC: { value: GeometricAugmentation; label: string; hint: string }[] = [
  { value: 'FLIP_H', label: 'Flip left–right', hint: 'Mirror image' },
  { value: 'FLIP_V', label: 'Flip top–bottom', hint: 'Mirror upside down' },
  { value: 'ROTATE_90', label: 'Rotate 90° / 180° / 270°', hint: 'Aerial images have no "up"' },
  { value: 'ROTATE', label: 'Small rotation ±15°', hint: 'Corners filled black' },
  { value: 'ZOOM', label: 'Zoom in 5–30 %', hint: 'Crops around the centre' },
];

const COLOR: { value: ColorAugmentation; label: string; hint: string }[] = [
  { value: 'BRIGHTNESS', label: 'Brightness ±25 %', hint: 'Sun, time of day' },
  { value: 'CONTRAST', label: 'Contrast ±25 %', hint: 'Haze, sensor' },
  { value: 'SATURATION', label: 'Saturation ±35 %', hint: 'Season, sensor' },
  { value: 'HUE', label: 'Hue ±20°', hint: 'Colour cast' },
  { value: 'BLUR', label: 'Blur', hint: 'Out of focus, low resolution' },
  { value: 'SHARPEN', label: 'Sharpen', hint: 'Crisper edges' },
  { value: 'NOISE', label: 'Noise', hint: 'Sensor grain' },
  { value: 'GRAYSCALE', label: 'Grayscale', hint: 'Panchromatic look' },
];

// Extra augmented copies of every chip. Geometric ones move the masks/boxes with the image.
export function AugmentationFields({ value, onChange }: { value: Augmentation; onChange: (value: Augmentation) => void }) {
  const toggle = <T extends string>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const chosen = value.geometric.length + value.color.length;
  const group = <T extends GeometricAugmentation | ColorAugmentation>(
    title: string,
    options: { value: T; label: string; hint: string }[],
    selected: T[],
    set: (next: T[]) => void,
  ) => (
    <div>
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">{title}</p>
      <div className="space-y-1">
        {options.map((option) => (
          <label key={option.value} className={cn('flex items-start gap-2 text-xs', value.copies === 0 && 'opacity-50')}>
            <input type="checkbox" className="mt-0.5" checked={selected.includes(option.value)} disabled={value.copies === 0} onChange={() => set(toggle(selected, option.value))} />
            <span><span className="font-medium">{option.label}</span> <span className="text-text-secondary">· {option.hint}</span></span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Augmentation</span>
        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          extra copies of every chip
          <select
            value={value.copies}
            onChange={(e) => onChange({ ...value, copies: Number(e.target.value) })}
            className="rounded border border-border px-1.5 py-0.5 text-xs text-text-primary"
            aria-label="Augmented copies per chip"
          >
            {[0, 1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n === 0 ? 'none' : `${n} (dataset × ${n + 1})`}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {group('Geometric', GEOMETRIC, value.geometric, (geometric) => onChange({ ...value, geometric }))}
        {group('Colour', COLOR, value.color, (color) => onChange({ ...value, color }))}
      </div>
      <p className={cn('mt-2 text-[11px]', value.copies > 0 && chosen === 0 ? 'text-danger' : 'text-text-secondary')}>
        {value.copies === 0
          ? 'Choose a number of copies to add augmented images.'
          : chosen === 0
            ? 'Choose at least one augmentation.'
            : 'Each copy stacks the chosen augmentations with random strengths. Geometric ones move the masks and boxes with the image.'}
      </p>
    </div>
  );
}
