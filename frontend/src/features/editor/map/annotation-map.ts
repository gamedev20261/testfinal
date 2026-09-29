import OlMap from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Zoomify from 'ol/source/Zoomify';
import Projection from 'ol/proj/Projection';
import { Draw, Modify, Select, Translate } from 'ol/interaction';
import { createBox } from 'ol/interaction/Draw';
import { defaults as defaultControls } from 'ol/control/defaults';
import type Point from 'ol/geom/Point';
import type Polygon from 'ol/geom/Polygon';
import type { Label, ShapeGeometry, ShapeType } from '../../../types/label';
import type { LabelClass } from '../../../types/project';
import { toOlGeometry, toShapeGeometry, straightenBox, isTiny } from './map-geometry';
import { shapeStyle, pendingStyle } from './map-styles';

export type Tool = 'SELECT' | ShapeType;

// What the map tells the page. A save that returns false puts the shape back.
export type MapCallbacks = {
  onDrawn: (shapeType: ShapeType, geometry: ShapeGeometry) => Promise<boolean>;
  onChanged: (labelId: string, geometry: ShapeGeometry) => Promise<boolean>;
  onSelect: (labelId: string | null) => void;
  onPointer: (position: { x: number; y: number } | null) => void;
};

type ShapeGeom = Point | Polygon;

// Everything OpenLayers does in the editor, behind a few simple methods.
// The React page calls showImage(), setLabels(), setTool()… and listens to the callbacks.
export class AnnotationMap {
  private map: OlMap;
  private tiles = new TileLayer({ preload: 2 });
  private shapes = new VectorSource<Feature<ShapeGeom>>();
  private pending = new VectorSource();
  private shapeLayer: VectorLayer;
  private select: Select;
  private modify: Modify;
  private translate: Translate;
  private draw: Draw | null = null;
  private labels = new Map<string, Label>();
  private classes = new Map<string, LabelClass>();
  private before = new Map<string, ShapeGeom>(); // shape geometry before a drag, to straighten boxes
  private selectedId: string | null = null;
  private showNames = false;
  private editable = false;
  private tool: Tool = 'SELECT';
  private drawing = false; // a polygon or box has been started but not finished

  constructor(target: HTMLElement, private callbacks: MapCallbacks) {
    this.shapeLayer = new VectorLayer({
      source: this.shapes,
      style: (feature) =>
        shapeStyle(feature, {
          colorOf: (id) => this.classes.get(id)?.color ?? '#718096',
          nameOf: (id) => this.classes.get(id)?.name ?? '',
          selectedId: this.selectedId,
          showNames: this.showNames,
        }),
    });
    this.map = new OlMap({
      target,
      layers: [this.tiles, this.shapeLayer, new VectorLayer({ source: this.pending, style: pendingStyle })],
      controls: defaultControls({ zoom: false, attribution: false, rotate: false }), // our own zoom buttons are in MapView
    });

    // Click a shape to select it (style: null keeps our own "selected" look)
    this.select = new Select({ layers: [this.shapeLayer], style: null, hitTolerance: 5 });
    this.select.on('select', () => {
      const feature = this.select.getFeatures().item(0);
      this.setSelected((feature?.getId() as string | undefined) ?? null);
      this.callbacks.onSelect(this.selectedId);
    });

    // Drag a corner to reshape, drag the inside to move. New corners only on polygons.
    this.modify = new Modify({
      features: this.select.getFeatures(),
      insertVertexCondition: () => this.labels.get(this.selectedId ?? '')?.shapeType === 'POLYGON',
    });
    this.translate = new Translate({ features: this.select.getFeatures() });
    this.modify.on('modifystart', (event) => this.rememberBefore(event.features.getArray() as Feature<ShapeGeom>[]));
    this.translate.on('translatestart', (event) => this.rememberBefore(event.features.getArray() as Feature<ShapeGeom>[]));
    this.modify.on('modifyend', (event) => event.features.forEach((f) => void this.saveChange(f as Feature<ShapeGeom>)));
    this.translate.on('translateend', (event) => event.features.forEach((f) => void this.saveChange(f as Feature<ShapeGeom>)));

    this.map.addInteraction(this.select);
    this.map.addInteraction(this.translate);
    this.map.addInteraction(this.modify);
    this.setEditable(false);

    // Pixel under the mouse, shown under the map
    this.map.on('pointermove', (event) => {
      const [x, y] = event.coordinate;
      this.callbacks.onPointer({ x: Math.round(x), y: Math.round(-y) });
    });
    this.map.getViewport().addEventListener('mouseleave', () => this.callbacks.onPointer(null));
  }

  // Loads an image's Zoomify tiles and fits it on screen
  showImage(tilesUrl: string, width: number, height: number) {
    const probe = new Zoomify({ url: tilesUrl, size: [width, height] });
    const extent = probe.getTileGrid()!.getExtent();
    const projection = new Projection({ code: 'image-pixels', units: 'pixels', extent });
    this.tiles.setSource(new Zoomify({ url: tilesUrl, size: [width, height], projection, zDirection: -1 }));

    const coarsest = probe.getTileGrid()!.getResolutions()[0];
    const view = new View({ projection, extent, constrainOnlyCenter: true, maxResolution: coarsest * 2, minResolution: 0.125 });
    this.map.setView(view);
    this.map.updateSize(); // the page layout may have changed since the map was created
    view.fit(extent, { size: this.map.getSize(), padding: [24, 24, 24, 24] });
    this.shapes.clear();
    this.labels.clear();
  }

  fitImage() {
    const view = this.map.getView();
    view.fit(view.getProjection().getExtent(), { size: this.map.getSize(), padding: [24, 24, 24, 24], duration: 200 });
  }

  zoomBy(delta: number) {
    const view = this.map.getView();
    view.animate({ zoom: (view.getZoom() ?? 0) + delta, duration: 150 });
  }

  // Makes the map show exactly these shapes (only changed ones are redrawn)
  setLabels(labels: Label[]) {
    this.pending.clear();
    const keep = new Set(labels.map((label) => label.id));
    for (const feature of this.shapes.getFeatures()) {
      if (!keep.has(feature.getId() as string)) this.shapes.removeFeature(feature);
    }
    for (const label of labels) {
      const old = this.labels.get(label.id);
      const feature = this.shapes.getFeatureById(label.id) as Feature<ShapeGeom> | null;
      if (!feature) {
        const created = new Feature<ShapeGeom>(toOlGeometry(label.geometry));
        created.setId(label.id);
        created.setProperties({ labelClassId: label.labelClassId, reviewStatus: label.reviewStatus });
        this.shapes.addFeature(created);
      } else if (old?.updatedAt !== label.updatedAt || old.reviewStatus !== label.reviewStatus) {
        feature.setGeometry(toOlGeometry(label.geometry));
        feature.setProperties({ labelClassId: label.labelClassId, reviewStatus: label.reviewStatus });
      }
    }
    this.labels = new Map(labels.map((label) => [label.id, label]));
    if (this.selectedId && !keep.has(this.selectedId)) this.setSelected(null);
  }

  setClasses(classes: LabelClass[]) {
    this.classes = new Map(classes.map((labelClass) => [labelClass.id, labelClass]));
    this.shapeLayer.changed();
  }

  setShowNames(show: boolean) {
    this.showNames = show;
    this.shapeLayer.changed();
  }

  // Annotators may move and reshape; everyone else only looks
  setEditable(editable: boolean) {
    this.editable = editable;
    this.modify.setActive(editable);
    this.translate.setActive(editable);
    this.setTool(editable ? this.tool : 'SELECT');
  }

  setTool(tool: Tool) {
    this.tool = tool;
    if (this.draw) this.map.removeInteraction(this.draw);
    this.draw = null;
    const drawing = tool !== 'SELECT' && this.editable;
    this.select.setActive(!drawing);
    if (!drawing) return;

    this.setSelected(null);
    this.draw =
      tool === 'BBOX'
        ? new Draw({ type: 'Circle', geometryFunction: createBox(), freehand: true }) // press, drag, release
        : new Draw({ type: tool === 'POLYGON' ? 'Polygon' : 'Point' }); // polygon: click points, double-click to finish
    this.draw.on('drawstart', () => (this.drawing = true));
    this.draw.on('drawabort', () => (this.drawing = false));
    this.draw.on('drawend', (event) => {
      this.drawing = false;
      void this.saveDrawing(tool as ShapeType, event.feature as Feature<ShapeGeom>);
    });
    this.map.addInteraction(this.draw);
  }

  // Escape and Backspace while drawing. They return false when nothing was being drawn.
  cancelDrawing() {
    if (!this.drawing) return false;
    this.draw?.abortDrawing();
    return true;
  }
  removeLastPoint() {
    if (!this.drawing) return false;
    this.draw?.removeLastPoint();
    return true;
  }

  // Selects a shape from outside (e.g. the objects list) and optionally zooms to it
  selectLabel(labelId: string | null, zoom = false) {
    this.setSelected(labelId);
    const feature = labelId ? this.shapes.getFeatureById(labelId) : null;
    if (zoom && feature) {
      this.map.getView().fit(feature.getGeometry()!.getExtent(), { padding: [120, 120, 120, 120], minResolution: 0.5, duration: 250 });
    }
  }

  destroy() {
    this.map.setTarget(undefined);
  }

  private setSelected(labelId: string | null) {
    this.selectedId = labelId;
    const selected = this.select.getFeatures();
    selected.clear();
    const feature = labelId ? this.shapes.getFeatureById(labelId) : null;
    if (feature) selected.push(feature);
    this.shapeLayer.changed();
  }

  private rememberBefore(features: Feature<ShapeGeom>[]) {
    for (const feature of features) this.before.set(feature.getId() as string, feature.getGeometry()!.clone() as ShapeGeom);
  }

  private async saveDrawing(shapeType: ShapeType, feature: Feature<ShapeGeom>) {
    const geometry = toShapeGeometry(feature.getGeometry()!);
    if (isTiny(geometry)) return;
    this.pending.addFeature(feature); // shown dashed until the server answers
    const saved = await this.callbacks.onDrawn(shapeType, geometry);
    if (!saved) this.pending.clear();
  }

  private async saveChange(feature: Feature<ShapeGeom>) {
    const id = feature.getId() as string;
    const label = this.labels.get(id);
    const before = this.before.get(id);
    if (!label || !before) return;
    if (label.shapeType === 'BBOX') feature.setGeometry(straightenBox(before as Polygon, feature.getGeometry() as Polygon));

    const saved = await this.callbacks.onChanged(id, toShapeGeometry(feature.getGeometry()!));
    if (!saved) feature.setGeometry(toOlGeometry(label.geometry)); // put it back
  }
}
