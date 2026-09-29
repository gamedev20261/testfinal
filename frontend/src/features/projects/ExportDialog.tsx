import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { projectsApi, type ExportOptions } from '../../api/projects';
import { Dialog, DialogFooter } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { FormField } from '../../components/ui/FormField';
import { cn } from '../../lib/cn';
import type { Project } from '../../types/project';

const FORMATS = [
  { value: 'YOLO', title: 'YOLO', hint: 'labels/*.txt + data.yaml' },
  { value: 'COCO', title: 'COCO', hint: 'one annotations.json' },
  { value: 'GEOJSON', title: 'GeoJSON', hint: 'map coordinates, for GIS' },
] as const;

// Choose a format and download the project's shapes as a .zip
export function ExportDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const [options, setOptions] = useState<ExportOptions>({ format: 'YOLO', tasks: 'PASSED', chipSize: 0, includeImages: true });
  const set = (changes: Partial<ExportOptions>) => setOptions({ ...options, ...changes });
  const summary = useQuery({
    queryKey: ['project', project.id, 'export', options.tasks],
    queryFn: () => projectsApi.exportSummary(project.id, options.tasks),
  });
  const empty = summary.data?.imageCount === 0;

  return (
    <Dialog open onClose={onClose} title="Export dataset" description={project.name} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((format) => (
            <button
              key={format.value}
              type="button"
              onClick={() => set({ format: format.value })}
              className={cn('rounded-lg border p-3 text-left', options.format === format.value ? 'border-primary bg-primary-light' : 'border-border hover:border-primary/50')}
            >
              <span className="block text-sm font-semibold">{format.title}</span>
              <span className="text-[11px] text-text-secondary">{format.hint}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Which tasks" htmlFor="export-tasks">
            <Select id="export-tasks" value={options.tasks} onChange={(e) => set({ tasks: e.target.value as ExportOptions['tasks'] })}>
              <option value="PASSED">Passed review only</option>
              <option value="ALL">All tasks (not rejected shapes)</option>
            </Select>
          </FormField>
          {options.format !== 'GEOJSON' && (
            <FormField label="Cut images into chips" htmlFor="export-chips">
              <Select id="export-chips" value={options.chipSize} onChange={(e) => set({ chipSize: Number(e.target.value) })}>
                <option value={0}>No, whole images</option>
                {[256, 512, 640, 1024].map((size) => (
                  <option key={size} value={size}>{size} × {size} px</option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={options.includeImages} onChange={(e) => set({ includeImages: e.target.checked })} />
          Include the images {options.format === 'GEOJSON' ? '(original files)' : '(JPEG)'}
        </label>

        <div className="rounded-lg bg-surface-alt p-3 text-xs text-text-secondary">
          {summary.isPending ? 'Counting…' : empty ? 'Nothing to export yet: no ready images in these tasks.' : (
            <>This export has <strong>{summary.data?.imageCount}</strong> image(s) and <strong>{summary.data?.labelCount}</strong> shape(s).
              {options.format === 'YOLO' && ' Points are not part of YOLO and are left out.'}
              {options.chipSize > 0 && ' Only chips that contain shapes are included.'}</>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {/* A normal link: the browser downloads the zip itself, even a big one */}
        <a
          href={projectsApi.exportUrl(project.id, options)}
          aria-disabled={empty}
          className={cn('inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark', empty && 'pointer-events-none opacity-50')}
        >
          <Download size={14} /> Download .zip
        </a>
      </DialogFooter>
    </Dialog>
  );
}
