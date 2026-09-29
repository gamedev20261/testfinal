import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Tabs } from '../../components/ui/Tabs';
import { LoadError, Spinner } from '../../components/ui/States';
import { tasksApi } from '../../api/tasks';
import { apiErrorMessage } from '../../api/client';
import type { Label, PolygonGeometry, Position, ShapeGeometry, ShapeType } from '../../types/label';
import type { TaskDetail } from '../../types/task';
import { useTaskDetail, useImageLabels } from './queries';
import { useEditorStore } from './editor-store';
import { editorMode, TOOLS_BY_TYPE } from './editor-mode';
import { useLabelActions } from './use-label-actions';
import { useReviewActions } from './use-review-actions';
import { useCurrentImage } from './use-current-image';
import { useEditorKeys } from './use-editor-keys';
import { EditorToolbar } from './EditorToolbar';
import { Banners } from './Banners';
import { MapView } from './MapView';
import { ImageStrip } from './ImageStrip';
import { CommentDialog } from './CommentDialog';
import { ClassesPanel } from './panel/ClassesPanel';
import { ObjectsPanel } from './panel/ObjectsPanel';
import { ImagesPanel } from './panel/ImagesPanel';
import type { AnnotationMap, PixelExtent, Tool } from './map/annotation-map';

// /tasks/:taskId — loads the task, then shows the editor
export function EditorPage() {
  const { taskId = '' } = useParams();
  const detail = useTaskDetail(taskId);
  if (detail.isPending) return <Spinner />;
  if (detail.isError) return <div className="p-6"><LoadError error={detail.error} onRetry={() => detail.refetch()} /></div>;
  if (detail.data.images.length === 0) return <p className="p-6 text-sm text-text-secondary">This task has no images.</p>;
  return <Editor detail={detail.data} />;
}

type Panel = 'classes' | 'objects' | 'images';
type Asking = { kind: 'label'; id: string } | { kind: 'image' } | { kind: 'task' } | null;

function Editor({ detail }: { detail: TaskDetail }) {
  const { task, labelClasses: classes } = detail;
  const mode = editorMode(detail);
  const image = useCurrentImage(detail);
  const imageIndex = detail.images.indexOf(image);
  const [, setParams] = useSearchParams();
  const labels = useImageLabels(task.id, image.id).data ?? [];
  const store = useEditorStore();
  const actions = useLabelActions(task.id, image.id);
  const review = useReviewActions(task.id, image.id);
  const mapRef = useRef<AnnotationMap | null>(null);
  const [panel, setPanel] = useState<Panel>('objects');
  const [asking, setAsking] = useState<Asking>(null);
  const [zoomToken, setZoomToken] = useState(0);
  const tools: Tool[] = ['SELECT', ...TOOLS_BY_TYPE[detail.project.type]];

  // A new task or image starts clean: no selection, no undo history, first class chosen
  useEffect(() => store.resetHistory(), [image.id]);
  useEffect(() => {
    if (!classes.some((c) => c.id === store.activeClassId)) store.setActiveClass(classes[0]?.id ?? null);
    if (!tools.includes(store.tool)) store.setTool('SELECT');
    // Segmentation shows each object's class name on it (L hides them)
    store.setShowNames(detail.project.type === 'SEGMENTATION');
  }, [task.id]);

  const openImage = (index: number) => {
    const next = detail.images[Math.max(0, Math.min(detail.images.length - 1, index))];
    setParams({ image: next.id }, { replace: true });
  };

  async function onDrawn(shapeType: ShapeType, geometry: ShapeGeometry) {
    if (!store.activeClassId) {
      toast.error('Choose a label class first');
      return false;
    }
    return !!(await actions.create({ labelClassId: store.activeClassId, shapeType, geometry }));
  }

  // A polygon from the magic pen or the brush, saved with the active class
  const createPolygon = (geometry: ShapeGeometry) =>
    actions.create({ labelClassId: store.activeClassId!, shapeType: 'POLYGON', geometry });

  async function onWand(point: Position, view: PixelExtent) {
    if (!store.activeClassId) return void toast.error('Choose a label class first');
    try {
      const geometry = await tasksApi.magicWand(task.id, image.id, { x: point[0], y: point[1], tolerance: store.wandTolerance, view });
      await createPolygon(geometry);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'The magic pen could not find an object here'));
    }
  }

  async function onBrush(stroke: Position[], radius: number, erase: boolean) {
    const selected = labels.find((l) => l.id === store.selectedId && l.shapeType === 'POLYGON');
    if (erase && !selected) return void toast.error('Select a shape first: erasing trims the selected shape');
    if (!selected && !store.activeClassId) return void toast.error('Choose a label class first');
    try {
      const result = await tasksApi.brush(task.id, image.id, { stroke, radius, erase, base: selected?.geometry as PolygonGeometry | undefined });
      if (result.action === 'create') {
        // Selected, so the next strokes join it (Esc starts a new shape)
        const label = await createPolygon(result.geometry);
        if (label) store.select(label.id);
      }
      if (result.action === 'update') await actions.changeGeometry(selected!.id, result.geometry);
      if (result.action === 'delete' && (await actions.remove(selected!.id))) store.select(null);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not paint the shape'));
    }
  }

  // Cut: the selected polygon, or every polygon the line crosses, is split along the line
  async function onCut(line: Position[]) {
    const [xs, ys] = [line.map(([x]) => x), line.map(([, y]) => y)];
    const crosses = (l: Label) => {
      const ring = l.geometry.type === 'Polygon' ? l.geometry.coordinates[0] : [];
      return ring.some(([x]) => x >= Math.min(...xs)) && ring.some(([x]) => x <= Math.max(...xs)) &&
        ring.some(([, y]) => y >= Math.min(...ys)) && ring.some(([, y]) => y <= Math.max(...ys));
    };
    const selected = labels.find((l) => l.id === store.selectedId && l.shapeType === 'POLYGON');
    const targets = selected ? [selected] : labels.filter((l) => l.shapeType === 'POLYGON' && crosses(l));
    let cut = 0;
    let lastError: unknown = null;
    for (const target of targets) {
      try {
        const pieces = await tasksApi.split(task.id, image.id, target.geometry as PolygonGeometry, line);
        if (await actions.split(target.id, pieces)) cut++;
      } catch (error) {
        lastError = error; // this shape was not crossed from side to side
      }
    }
    if (cut === 0) toast.error(apiErrorMessage(lastError, 'Draw the cut all the way across a shape'));
  }

  // Merge: the first clicked shape is the target; each next shape that touches it joins it
  async function onPick(labelId: string | null) {
    const picked = labels.find((l) => l.id === labelId && l.shapeType === 'POLYGON');
    const target = labels.find((l) => l.id === store.selectedId && l.shapeType === 'POLYGON');
    if (!picked) return;
    if (!target || target.id === picked.id) return store.select(picked.id);
    try {
      const geometry = await tasksApi.merge(task.id, image.id, [target.geometry, picked.geometry] as PolygonGeometry[]);
      await actions.merge(target.id, picked.id, geometry);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not merge these shapes'));
    }
  }

  // 1-9 or a click in the classes list: change the selected shape, or the class for new shapes
  function pickClass(classId: string) {
    store.setActiveClass(classId);
    const selected = labels.find((l) => l.id === store.selectedId);
    if (mode.canEdit && selected && selected.labelClassId !== classId) void actions.changeClass(selected.id, classId);
  }

  function deleteSelected() {
    if (mode.canEdit && store.selectedId) void actions.remove(store.selectedId);
  }

  function selectFromList(id: string) {
    store.select(id);
    setZoomToken((n) => n + 1);
  }

  // While a polygon, rotated box or cut line is being drawn, undo takes back its last point;
  // otherwise it undoes the last saved change
  const undo = () => {
    if (mode.canEdit && !mapRef.current?.removeLastPoint()) void store.undo();
  };

  useEditorKeys({
    tools: mode.canEdit ? tools : [],
    onTool: store.setTool,
    onClassKey: (index) => classes[index] && pickClass(classes[index].id),
    onDelete: deleteSelected,
    onEscape: () => mapRef.current?.cancelDrawing() || store.select(null),
    onBackspace: () => mapRef.current?.removeLastPoint() ?? false,
    onUndo: undo,
    onRedo: () => mode.canEdit && void store.redo(),
    onImageStep: (step) => openImage(imageIndex + step),
    onApprove: () => mode.canReview && store.selectedId && review.reviewLabel.mutate({ id: store.selectedId, status: 'APPROVED' }),
    onReject: () => mode.canReview && store.selectedId && setAsking({ kind: 'label', id: store.selectedId }),
    onToggleNames: store.toggleNames,
  });

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar
        detail={detail}
        mode={mode}
        imageIndex={imageIndex}
        onImage={openImage}
        onRejectImage={() => setAsking({ kind: 'image' })}
        onFailTask={() => setAsking({ kind: 'task' })}
        onUndo={undo}
      />
      <Banners detail={detail} mode={mode} labels={labels} />

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <MapView
            image={image}
            labels={labels}
            classes={classes}
            tool={mode.canEdit ? store.tool : 'SELECT'}
            editable={mode.canEdit}
            showNames={store.showNames}
            selectedId={store.selectedId}
            zoomToSelected={zoomToken}
            brushRadius={store.brushRadius}
            brushErase={store.brushErase}
            onDrawn={onDrawn}
            onChanged={actions.changeGeometry}
            onSelect={store.select}
            onWand={onWand}
            onBrush={onBrush}
            onCut={onCut}
            onPick={(id) => void onPick(id)}
            mapRef={mapRef}
          />
        </div>

        <aside className="flex w-72 flex-shrink-0 flex-col border-l border-border bg-white">
          <Tabs
            className="flex-shrink-0 gap-4 px-3"
            active={panel}
            onChange={setPanel}
            tabs={[
              { key: 'classes', label: 'Classes' },
              { key: 'objects', label: `Objects (${labels.length})` },
              { key: 'images', label: `Images (${detail.images.length})` },
            ]}
          />
          <div className="flex-1 overflow-y-auto">
            {panel === 'classes' && (
              <ClassesPanel classes={classes} labels={labels} activeClassId={store.activeClassId} onPick={pickClass} instructions={task.description} />
            )}
            {panel === 'objects' && (
              <ObjectsPanel
                labels={labels}
                classes={classes}
                mode={mode}
                selectedId={store.selectedId}
                onSelect={selectFromList}
                onChangeClass={(id, classId) => void actions.changeClass(id, classId)}
                onDelete={(id) => void actions.remove(id)}
                onApprove={(id) => review.reviewLabel.mutate({ id, status: 'APPROVED' })}
                onReject={(id) => setAsking({ kind: 'label', id })}
                onApproveAll={() => review.approveAll.mutate()}
              />
            )}
            {panel === 'images' && <ImagesPanel images={detail.images} currentId={image.id} onOpen={openImage} />}
          </div>
        </aside>
      </div>

      <ImageStrip images={detail.images} currentId={image.id} onOpen={openImage} />

      {asking?.kind === 'label' && (
        <CommentDialog
          title="Reject this shape"
          confirmLabel="Reject shape"
          required={false}
          onSubmit={(comment) => review.reviewLabel.mutate({ id: asking.id, status: 'REJECTED', comment })}
          onClose={() => setAsking(null)}
        />
      )}
      {asking?.kind === 'image' && (
        <CommentDialog
          title={`Reject ${image.originalName}`}
          description="When every image has a verdict, the task passes or goes back to the annotator."
          confirmLabel="Reject image"
          onSubmit={(comment) => review.reviewImage.mutate({ result: 'REJECTED', comment })}
          onClose={() => setAsking(null)}
        />
      )}
      {asking?.kind === 'task' && (
        <CommentDialog
          title="Fail the task"
          description="The task goes back to the annotator with your reason."
          confirmLabel="Fail task"
          onSubmit={(comment) => review.reviewTask.mutate({ result: 'FAILED', comment })}
          onClose={() => setAsking(null)}
        />
      )}
    </div>
  );
}
