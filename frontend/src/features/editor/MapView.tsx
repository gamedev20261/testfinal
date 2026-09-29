import { useEffect, useRef, useState } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';
import 'ol/ol.css';
import { imagesApi } from '../../api/images';
import type { Label, ShapeGeometry, ShapeType } from '../../types/label';
import type { LabelClass } from '../../types/project';
import type { TaskImage } from '../../types/task';
import { AnnotationMap, type Tool } from './map/annotation-map';

type Props = {
  image: TaskImage;
  labels: Label[];
  classes: LabelClass[];
  tool: Tool;
  editable: boolean;
  showNames: boolean;
  selectedId: string | null;
  zoomToSelected: number; // changes when the objects list asks to zoom
  onDrawn: (shapeType: ShapeType, geometry: ShapeGeometry) => Promise<boolean>;
  onChanged: (labelId: string, geometry: ShapeGeometry) => Promise<boolean>;
  onSelect: (labelId: string | null) => void;
  mapRef: React.RefObject<AnnotationMap | null>;
};

// The React side of the map: creates AnnotationMap once, then passes every change of props to it
export function MapView(props: Props) {
  const { image, labels, classes, tool, editable, showNames, selectedId, zoomToSelected, mapRef } = props;
  const target = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const map = new AnnotationMap(target.current!, {
      onDrawn: (...args) => callbacks.current.onDrawn(...args),
      onChanged: (...args) => callbacks.current.onChanged(...args),
      onSelect: (id) => callbacks.current.onSelect(id),
      onPointer: setPointer,
    });
    mapRef.current = map;
    return () => {
      map.destroy();
      mapRef.current = null;
    };
  }, [mapRef]);

  const ready = image.status === 'READY' && image.width && image.height;
  useEffect(() => {
    if (ready) mapRef.current?.showImage(imagesApi.tilesUrl(image.id), image.width!, image.height!);
  }, [image.id, ready, image.width, image.height, mapRef]);

  useEffect(() => mapRef.current?.setLabels(labels), [labels, image.id, mapRef]);
  useEffect(() => mapRef.current?.setClasses(classes), [classes, mapRef]);
  useEffect(() => mapRef.current?.setEditable(editable), [editable, mapRef]);
  useEffect(() => mapRef.current?.setTool(tool), [tool, editable, mapRef]);
  useEffect(() => mapRef.current?.setShowNames(showNames), [showNames, mapRef]);
  useEffect(() => mapRef.current?.selectLabel(selectedId), [selectedId, mapRef]);
  useEffect(() => {
    if (zoomToSelected) mapRef.current?.selectLabel(callbacks.current.selectedId, true);
  }, [zoomToSelected, mapRef]);

  return (
    <div className="relative h-full w-full bg-slate-800">
      <div ref={target} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-sm text-slate-300">
          {image.status === 'FAILED' ? 'This image could not be processed.' : 'This image is still being processed…'}
        </div>
      )}
      <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-lg border border-border bg-white shadow">
        <button onClick={() => mapRef.current?.zoomBy(1)} className="p-2 hover:bg-surface-alt" aria-label="Zoom in"><Plus size={15} /></button>
        <button onClick={() => mapRef.current?.zoomBy(-1)} className="border-t border-border p-2 hover:bg-surface-alt" aria-label="Zoom out"><Minus size={15} /></button>
        <button onClick={() => mapRef.current?.fitImage()} className="border-t border-border p-2 hover:bg-surface-alt" aria-label="Fit image"><Maximize size={15} /></button>
      </div>
      <div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 font-mono text-[11px] text-white">
        {image.width} × {image.height} px{pointer && ` · x ${pointer.x}, y ${pointer.y}`}
      </div>
    </div>
  );
}
