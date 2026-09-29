import { useEffect, useRef } from 'react';
import type { Tool } from './map/annotation-map';

type Handlers = {
  tools: Tool[];
  onTool: (tool: Tool) => void;
  onClassKey: (index: number) => void;
  onDelete: () => void;
  onEscape: () => void;
  onBackspace: () => boolean; // true when it removed a polygon point
  onUndo: () => void;
  onRedo: () => void;
  onImageStep: (step: number) => void;
  onApprove: () => void;
  onReject: () => void;
  onToggleNames: () => void;
};

const TOOL_KEYS: Record<string, Tool> = { v: 'SELECT', b: 'BBOX', p: 'POLYGON', o: 'POINT' };

// Keyboard shortcuts of the editor (ignored while typing in a text field)
export function useEditorKeys(handlers: Handlers) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;
      if (document.querySelector('[role="dialog"]')) return;
      const h = latest.current;
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;

      if (ctrl && key === 'z') return run(event, event.shiftKey ? h.onRedo : h.onUndo);
      if (ctrl && key === 'y') return run(event, h.onRedo);
      if (ctrl) return;
      if (TOOL_KEYS[key] && h.tools.includes(TOOL_KEYS[key])) return run(event, () => h.onTool(TOOL_KEYS[key]));
      if (/^[1-9]$/.test(key)) return run(event, () => h.onClassKey(Number(key) - 1));
      if (key === 'delete') return run(event, h.onDelete);
      if (key === 'backspace') return run(event, () => h.onBackspace() || h.onDelete());
      if (key === 'escape') return run(event, h.onEscape);
      if (key === '[') return run(event, () => h.onImageStep(-1));
      if (key === ']') return run(event, () => h.onImageStep(1));
      if (key === 'a') return run(event, h.onApprove);
      if (key === 'r') return run(event, h.onReject);
      if (key === 'l') return run(event, h.onToggleNames);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

function run(event: KeyboardEvent, action: () => void) {
  event.preventDefault();
  action();
}
