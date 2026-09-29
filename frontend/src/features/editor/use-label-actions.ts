import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi, type NewLabel } from '../../api/tasks';
import { labelsApi } from '../../api/labels';
import { apiErrorMessage } from '../../api/client';
import type { Label, PolygonGeometry, ShapeGeometry } from '../../types/label';
import { useEditorStore } from './editor-store';
import { labelsKey, taskKey } from './queries';

// The annotator's changes to shapes. Each one saves on the server,
// updates the cached list (so the map redraws) and records how to undo it.
export function useLabelActions(taskId: string, imageId: string) {
  const queryClient = useQueryClient();
  const record = useEditorStore((s) => s.record);
  const key = labelsKey(taskId, imageId);

  // Adds or replaces a shape in the list, kept in drawing order (an undone delete returns to its place)
  const put = (label: Label) =>
    queryClient.setQueryData<Label[]>(key, (old = []) =>
      [...old.filter((l) => l.id !== label.id), label].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  const drop = (id: string) => queryClient.setQueryData<Label[]>(key, (old = []) => old.filter((l) => l.id !== id));
  const current = (id: string) => queryClient.getQueryData<Label[]>(key)?.find((l) => l.id === id);
  // Counts and status (e.g. "Not started" → "In progress") live in the task detail
  const refreshTask = () => queryClient.invalidateQueries({ queryKey: taskKey(taskId), exact: true });

  const update = async (id: string, changes: { labelClassId?: string; geometry?: ShapeGeometry }) => {
    put(await labelsApi.update(id, changes));
    refreshTask();
  };
  const remove = async (id: string) => {
    await labelsApi.remove(id);
    drop(id);
    refreshTask();
  };
  const restore = async (id: string) => {
    put(await labelsApi.restore(id));
    refreshTask();
  };

  // Returns false when the server said no (the message is shown as a toast)
  async function attempt(action: () => Promise<void>) {
    return (await attemptTo(action)) !== null;
  }
  async function attemptTo<T>(action: () => Promise<T>): Promise<T | null> {
    try {
      return await action();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save the shape'));
      return null;
    }
  }

  return {
    // The saved shape, or null
    create: (input: NewLabel) =>
      attemptTo(async () => {
        const label = await tasksApi.createLabel(taskId, imageId, input);
        put(label);
        refreshTask();
        record({ undo: () => remove(label.id), redo: () => restore(label.id) });
        return label;
      }),

    changeGeometry: (id: string, geometry: ShapeGeometry) =>
      attempt(async () => {
        const before = current(id)!.geometry;
        await update(id, { geometry });
        record({ undo: () => update(id, { geometry: before }), redo: () => update(id, { geometry }) });
      }),

    changeClass: (id: string, labelClassId: string) =>
      attempt(async () => {
        const before = current(id)!.labelClassId;
        await update(id, { labelClassId });
        record({ undo: () => update(id, { labelClassId: before }), redo: () => update(id, { labelClassId }) });
      }),

    // Cut: the shape becomes the first piece, the other pieces are new shapes of the same class. One undo step.
    split: (id: string, pieces: PolygonGeometry[]) =>
      attempt(async () => {
        const before = current(id)!;
        const [first, ...rest] = pieces;
        await update(id, { geometry: first });
        const created: Label[] = [];
        try {
          for (const geometry of rest) {
            const label = await tasksApi.createLabel(taskId, imageId, { labelClassId: before.labelClassId, shapeType: 'POLYGON', geometry });
            put(label);
            created.push(label);
          }
        } catch (error) {
          for (const label of created) await remove(label.id);
          await update(id, { geometry: before.geometry });
          throw error;
        }
        refreshTask();
        record({
          undo: async () => {
            for (const label of created) await remove(label.id);
            await update(id, { geometry: before.geometry });
          },
          redo: async () => {
            await update(id, { geometry: first });
            for (const label of created) await restore(label.id);
          },
        });
      }),

    // Merge: the other shape is deleted first (else the joined shape would "contain" it), then the target grows
    merge: (targetId: string, otherId: string, geometry: PolygonGeometry) =>
      attempt(async () => {
        const before = current(targetId)!.geometry;
        await remove(otherId);
        try {
          await update(targetId, { geometry });
        } catch (error) {
          await restore(otherId);
          throw error;
        }
        record({
          undo: async () => {
            await update(targetId, { geometry: before });
            await restore(otherId);
          },
          redo: async () => {
            await remove(otherId);
            await update(targetId, { geometry });
          },
        });
      }),

    remove: (id: string) =>
      attempt(async () => {
        await remove(id);
        record({ undo: () => restore(id), redo: () => remove(id) });
      }),
  };
}
