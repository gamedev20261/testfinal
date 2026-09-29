import { create } from 'zustand';
import { toast } from 'sonner';
import { apiErrorMessage } from '../../api/client';
import type { Tool } from './map/annotation-map';

// One step that can be undone: what to call to undo it, and to do it again
export type HistoryStep = { undo: () => Promise<unknown>; redo: () => Promise<unknown> };

type EditorState = {
  tool: Tool;
  activeClassId: string | null; // class for new shapes
  selectedId: string | null; // selected shape
  showNames: boolean;
  brushRadius: number; // image pixels
  brushErase: boolean;
  wandTolerance: number; // 1-128: how different a colour may be and still belong to the object
  undoStack: HistoryStep[];
  redoStack: HistoryStep[];
  setTool: (tool: Tool) => void;
  setActiveClass: (id: string | null) => void;
  select: (id: string | null) => void;
  toggleNames: () => void;
  setShowNames: (show: boolean) => void;
  setBrush: (changes: Partial<Pick<EditorState, 'brushRadius' | 'brushErase'>>) => void;
  setWandTolerance: (tolerance: number) => void;
  record: (step: HistoryStep) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  resetHistory: () => void;
};

// Editor state shared by the toolbar, the map and the side panel
export const useEditorStore = create<EditorState>((set, get) => ({
  tool: 'SELECT',
  activeClassId: null,
  selectedId: null,
  showNames: false,
  brushRadius: 12,
  brushErase: false,
  wandTolerance: 32,
  undoStack: [],
  redoStack: [],
  setTool: (tool) => set({ tool }),
  setActiveClass: (activeClassId) => set({ activeClassId }),
  select: (selectedId) => set({ selectedId }),
  toggleNames: () => set({ showNames: !get().showNames }),
  setShowNames: (showNames) => set({ showNames }),
  setBrush: (changes) => set(changes),
  setWandTolerance: (wandTolerance) => set({ wandTolerance }),
  record: (step) => set({ undoStack: [...get().undoStack.slice(-49), step], redoStack: [] }),

  undo: async () => {
    const step = get().undoStack.at(-1);
    if (!step) return;
    set({ undoStack: get().undoStack.slice(0, -1) });
    try {
      await step.undo();
      set({ redoStack: [...get().redoStack, step] });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not undo'));
    }
  },

  redo: async () => {
    const step = get().redoStack.at(-1);
    if (!step) return;
    set({ redoStack: get().redoStack.slice(0, -1) });
    try {
      await step.redo();
      set({ undoStack: [...get().undoStack, step] });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not redo'));
    }
  },

  resetHistory: () => set({ undoStack: [], redoStack: [], selectedId: null }),
}));
