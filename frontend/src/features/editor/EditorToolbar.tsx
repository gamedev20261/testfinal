import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, Combine, Eraser, Hexagon, MousePointer2, Paintbrush, Redo2, Scissors, Square, Undo2, Type, WandSparkles } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Select } from '../../components/ui/Select';
import { TaskStatusBadge } from '../../components/task/TaskStatus';
import type { TaskDetail } from '../../types/task';
import { useEditorStore } from './editor-store';
import { TOOLS_BY_TYPE, TOOL_INFO, type EditorMode } from './editor-mode';
import { WorkflowButtons } from './WorkflowButtons';
import type { Tool } from './map/annotation-map';

// The rotated box is a turned square
const RotatedSquare = ({ size }: { size: number }) => <Square size={size} className="rotate-[25deg]" />;
const TOOL_ICON: Record<Tool, React.ComponentType<{ size: number }>> = {
  SELECT: MousePointer2,
  BBOX: Square,
  OBB: RotatedSquare,
  POLYGON: Hexagon,
  WAND: WandSparkles,
  BRUSH: Paintbrush,
  CUT: Scissors,
  MERGE: Combine,
};

type Props = {
  detail: TaskDetail;
  mode: EditorMode;
  imageIndex: number;
  onImage: (index: number) => void;
  onRejectImage: () => void;
  onFailTask: () => void;
  onUndo: () => void; // takes back the last point while drawing, else the last change
};

export function EditorToolbar({ detail, mode, imageIndex, onImage, onRejectImage, onFailTask, onUndo }: Props) {
  const { tool, setTool, activeClassId, setActiveClass, redoStack, redo, showNames, toggleNames } = useEditorStore();
  const { brushRadius, brushErase, setBrush, wandTolerance, setWandTolerance } = useEditorStore();
  const tools: Tool[] = ['SELECT', ...TOOLS_BY_TYPE[detail.project.type]];
  const count = detail.images.length;

  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-border bg-white px-4 py-2">
      <div className="min-w-0">
        <Link to="/tasks" className="block truncate text-[11px] text-text-secondary hover:text-primary">{detail.project.name}</Link>
        <span className="block truncate text-sm font-bold">{detail.task.name}</span>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border px-1 py-0.5 text-xs">
        <button onClick={() => onImage(imageIndex - 1)} disabled={imageIndex === 0} className="rounded p-1 hover:bg-surface-alt disabled:opacity-30" aria-label="Previous image ([)"><ChevronLeft size={15} /></button>
        <span className="px-1 font-medium">Image {imageIndex + 1} / {count}</span>
        <button onClick={() => onImage(imageIndex + 1)} disabled={imageIndex >= count - 1} className="rounded p-1 hover:bg-surface-alt disabled:opacity-30" aria-label="Next image (])"><ChevronRight size={15} /></button>
      </div>

      {mode.canEdit && (
        <>
          <div className="flex rounded-lg border border-border p-0.5">
            {tools.map((t) => {
              const Icon = TOOL_ICON[t];
              return (
                <button
                  key={t}
                  onClick={() => setTool(t)}
                  title={`${TOOL_INFO[t].name} (${TOOL_INFO[t].key}): ${TOOL_INFO[t].hint}`}
                  aria-label={`${TOOL_INFO[t].name} tool`}
                  aria-pressed={tool === t}
                  className={cn('rounded-md p-1.5', tool === t ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-alt')}
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
          {tool === 'BRUSH' && (
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5" title="Brush size in image pixels">
                Size
                <input type="range" min={2} max={150} value={brushRadius} onChange={(e) => setBrush({ brushRadius: Number(e.target.value) })} className="w-20" aria-label="Brush size" />
                <span className="w-7 font-mono text-[11px] text-text-secondary">{brushRadius}</span>
              </label>
              <div className="flex rounded-lg border border-border p-0.5" title="Hold Shift to switch while painting">
                <button onClick={() => setBrush({ brushErase: false })} aria-pressed={!brushErase} className={cn('rounded-md p-1', !brushErase ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-alt')} aria-label="Paint"><Paintbrush size={13} /></button>
                <button onClick={() => setBrush({ brushErase: true })} aria-pressed={brushErase} className={cn('rounded-md p-1', brushErase ? 'bg-danger text-white' : 'text-text-secondary hover:bg-surface-alt')} aria-label="Erase from the selected shape"><Eraser size={13} /></button>
              </div>
            </div>
          )}
          {tool === 'WAND' && (
            <label className="flex items-center gap-1.5 text-xs" title="How different a colour may be and still belong to the object">
              Tolerance
              <input type="range" min={4} max={128} value={wandTolerance} onChange={(e) => setWandTolerance(Number(e.target.value))} className="w-20" aria-label="Magic pen tolerance" />
              <span className="w-7 font-mono text-[11px] text-text-secondary">{wandTolerance}</span>
            </label>
          )}
          <div className="flex">
            <button onClick={onUndo} className="rounded p-1.5 text-text-secondary hover:bg-surface-alt disabled:opacity-30" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
            <button onClick={() => redo()} disabled={!redoStack.length} className="rounded p-1.5 text-text-secondary hover:bg-surface-alt disabled:opacity-30" aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)"><Redo2 size={15} /></button>
          </div>
          <Select aria-label="Class for new shapes" value={activeClassId ?? ''} onChange={(e) => setActiveClass(e.target.value)} className="w-44 py-1 text-xs">
            {detail.labelClasses.map((c, i) => (
              <option key={c.id} value={c.id}>{i < 9 ? `${i + 1}. ` : ''}{c.name}</option>
            ))}
          </Select>
        </>
      )}

      <button
        onClick={toggleNames}
        aria-pressed={showNames}
        title="Show class names on the map (L)"
        className={cn('rounded p-1.5', showNames ? 'bg-primary-light text-primary' : 'text-text-secondary hover:bg-surface-alt')}
        aria-label="Show class names"
      >
        <Type size={15} />
      </button>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <TaskStatusBadge status={detail.task.status} />
        <WorkflowButtons detail={detail} mode={mode} onRejectImage={onRejectImage} onFailTask={onFailTask} />
      </div>
    </div>
  );
}
