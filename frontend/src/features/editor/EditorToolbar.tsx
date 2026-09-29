import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, Circle, Hexagon, MousePointer2, Redo2, Square, Undo2, Type } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Select } from '../../components/ui/Select';
import { TaskStatusBadge } from '../../components/task/TaskStatus';
import type { TaskDetail } from '../../types/task';
import type { ShapeType } from '../../types/label';
import { useEditorStore } from './editor-store';
import { TOOLS_BY_TYPE, SHAPE_NAME, type EditorMode } from './editor-mode';
import { WorkflowButtons } from './WorkflowButtons';
import type { Tool } from './map/annotation-map';

const TOOL_ICON = { SELECT: MousePointer2, BBOX: Square, POLYGON: Hexagon, POINT: Circle };
export const TOOL_KEY: Record<Tool, string> = { SELECT: 'V', BBOX: 'B', POLYGON: 'P', POINT: 'O' };

type Props = {
  detail: TaskDetail;
  mode: EditorMode;
  imageIndex: number;
  onImage: (index: number) => void;
  onRejectImage: () => void;
  onFailTask: () => void;
};

export function EditorToolbar({ detail, mode, imageIndex, onImage, onRejectImage, onFailTask }: Props) {
  const { tool, setTool, activeClassId, setActiveClass, undoStack, redoStack, undo, redo, showNames, toggleNames } = useEditorStore();
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
                  title={`${t === 'SELECT' ? 'Select / edit' : SHAPE_NAME[t as ShapeType]} (${TOOL_KEY[t]})`}
                  aria-label={t === 'SELECT' ? 'Select tool' : `${SHAPE_NAME[t as ShapeType]} tool`}
                  aria-pressed={tool === t}
                  className={cn('rounded-md p-1.5', tool === t ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-alt')}
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
          <div className="flex">
            <button onClick={() => undo()} disabled={!undoStack.length} className="rounded p-1.5 text-text-secondary hover:bg-surface-alt disabled:opacity-30" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
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
