import OlMap from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Zoomify from 'ol/source/Zoomify';
import Projection from 'ol/proj/Projection';
import Point from 'ol/geom/Point';
import { DragPan, Draw, Modify, Select, Translate } from 'ol/interaction';
import type Interaction from 'ol/interaction/Interaction';
import { createBox } from 'ol/interaction/Draw';
import { altKeyOnly, noModifierKeys, primaryAction, singleClick } from 'ol/events/condition';
import { defaults as defaultControls } from 'ol/control/defaults';
import type Polygon from 'ol/geom/Polygon';
import type LineString from 'ol/geom/LineString';
import type { Coordinate } from 'ol/coordinate';
import type { Label, Position, ShapeGeometry, ShapeType } from '../../../types/label';
import type { LabelClass } from '../../../types/project';
import { toOlGeometry, toShapeGeometry, toPixel, straightenBox, isTiny } from './map-geometry';
import { rotatedBoxFromClicks, straightenRotatedBox } from './obb';
import { RotateBoxInteraction } from './rotate-interaction';
import { BrushInteraction } from './brush-interaction';
import { shapeStyle, pendingStyle, sketchStyle, brushStyle } from './map-styles';

// SELECT edits shapes; BBOX, OBB (rotated box) and POLYGON draw; WAND (magic pen) and BRUSH make polygons;
// CUT splits a polygon along a line; MERGE joins polygons that touch
export type Tool = 'SELECT' | 'BBOX' | 'OBB' | 'POLYGON' | 'WAND' | 'BRUSH' | 'CUT' | 'MERGE';
type DrawTool = 'BBOX' | 'OBB' | 'POLYGON';

// [minX, minY, maxX, maxY] in image pixels
export type PixelExtent = [number, number, number, number];

// What the map tells the page. A save that returns false puts the shape back.
export type MapCallbacks = {
  onDrawn: (shapeType: ShapeType, geometry: ShapeGeometry) => Promise<boolean>;
  onChanged: (labelId: string, geometry: ShapeGeometry) => Promise<boolean>;
  onSelect: (labelId: string | null) => void;
  onPointer: (position: { x: number; y: number } | null) => void;
  onWand: (point: Position, view: PixelExtent) => Promise<unknown>;
  onBrush: (stroke: Position[], radius: number, erase: boolean) => Promise<unknown>;
  onCut: (line: Position[]) => Promise<unknown>;
  onPick: (labelId: string | null) => void; // a click with the merge tool
};

type ShapeGeom = Point | Polygon;
type ChangeKind = 'reshape' | 'move' | 'rotate';

// Everything OpenLayers does in the editor, behind a few simple methods.
// The React page calls showImage(), setLabels(), setTool()… and listens to the callbacks.
export class AnnotationMap {
  private map: OlMap;
  private tiles = new TileLayer({ preload: 2 });
  private shapes = new VectorSource<Feature<ShapeGeom>>();
  private pending = new VectorSource();
  private brushSource = new VectorSource();
  private shapeLayer: VectorLayer;
  private select: Select;
  private modify: Modify;
  private translate: Translate;
  private rotate: RotateBoxInteraction;
  private middlePan: DragPan;
  private draw: Draw | null = null;
  private brush: BrushInteraction | null = null;
  private labels = new Map<string, Label>();
  private classes = new Map<string, LabelClass>();
  private before = new Map<string, ShapeGeom>(); // shape geometry before a drag, to straighten boxes
  private selectedId: string | null = null;
  private showNames = false;
  private editable = false;
  private tool: Tool = 'SELECT';
  private brushRadius = 12;
  private brushErase = false;
  private drawing = false; // a polygon or box has been started but not finished

  constructor(target: HTMLElement, private callbacks: MapCallbacks) {
    this.shapeLayer = new VectorLayer({
      source: this.shapes,
      style: (feature, resolution) =>
        shapeStyle(feature, resolution, {
          colorOf: (id) => this.classes.get(id)?.color ?? '#718096',
          nameOf: (id) => this.classes.get(id)?.name ?? '',
          selectedId: this.selectedId,
          showNames: this.showNames,
          editing: this.activeTool() === 'SELECT' && this.editable,
        }),
    });
    this.map = new OlMap({
      target,
      layers: [
        this.tiles,
        this.shapeLayer,
        new VectorLayer({ source: this.pending, style: pendingStyle }),
        new VectorLayer({ source: this.brushSource, style: brushStyle }),
      ],
      controls: defaultControls({ zoom: false, attribution: false, rotate: false }), // our own zoom buttons are in MapView
    });

    // Click a shape to select it (style: null keeps our own "selected" look)
    this.select = new Select({ layers: [this.shapeLayer], style: null, hitTolerance: 5 });
    this.select.on('select', () => {
      const feature = this.select.getFeatures().item(0);
      this.setSelected((feature?.getId() as string | undefined) ?? null);
      this.callbacks.onSelect(this.selectedId);
    });

    // Drag a corner to reshape, drag the inside to move, drag the knob of a rotated box to turn it.
    // New corners only on polygons.
    this.modify = new Modify({
      features: this.select.getFeatures(),
      insertVertexCondition: () => this.selectedIsPolygon(),
      // Alt+click a corner of a polygon to delete it (right-click too, see below). A polygon keeps at least 3.
      deleteCondition: (event) => this.selectedIsPolygon() && altKeyOnly(event) && singleClick(event),
    });
    this.translate = new Translate({ features: this.select.getFeatures() });
    this.rotate = new RotateBoxInteraction({
      target: () => {
        const feature = this.selectedId ? this.shapes.getFeatureById(this.selectedId) : null;
        return feature && this.labels.get(this.selectedId!)?.shapeType === 'OBB' ? (feature as Feature<Polygon>) : null;
      },
      onStart: (feature) => this.rememberBefore([feature]),
      onEnd: (feature) => void this.saveChange(feature, 'rotate'),
    });
    this.modify.on('modifystart', (event) => this.rememberBefore(event.features.getArray() as Feature<ShapeGeom>[]));
    this.translate.on('translatestart', (event) => this.rememberBefore(event.features.getArray() as Feature<ShapeGeom>[]));
    this.modify.on('modifyend', (event) => event.features.forEach((f) => void this.saveChange(f as Feature<ShapeGeom>, 'reshape')));
    this.translate.on('translateend', (event) => event.features.forEach((f) => void this.saveChange(f as Feature<ShapeGeom>, 'move')));

    this.map.addInteraction(this.select);
    this.map.addInteraction(this.translate);
    this.map.addInteraction(this.modify);
    this.map.addInteraction(this.rotate);

    // Hold the middle mouse button to drag the image, whatever the tool. It is the last interaction,
    // so it sees the press first, and it keeps it: drawing tools don't add a point or start a box.
    this.middlePan = new DragPan({ condition: (event) => (event.originalEvent as PointerEvent).button === 1 });
    this.middlePan.stopDown = (handled) => handled;
    this.map.addInteraction(this.middlePan);
    const viewport = this.map.getViewport();
    viewport.addEventListener('mousedown', (event) => event.button === 1 && event.preventDefault()); // no browser auto-scroll
    // Right-click on a corner of the selected polygon deletes it (instead of the browser menu)
    viewport.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (this.activeTool() === 'SELECT' && this.editable && this.selectedIsPolygon()) {
        this.modify.removePoint(this.map.getEventCoordinate(event));
      }
    });

    // Magic pen: a click asks the server for the object's outline
    this.map.on('click', (event) => {
      if (this.activeTool() === 'WAND') void this.useWand(event.coordinate);
      if (this.activeTool() === 'MERGE') {
        const feature = this.map.forEachFeatureAtPixel(event.pixel, (f) => f, { layerFilter: (layer) => layer === this.shapeLayer, hitTolerance: 5 });
        this.callbacks.onPick((feature?.getId() as string | undefined) ?? null);
      }
    });

    // Pixel under the mouse, shown under the map
    this.map.on('pointermove', (event) => {
      const [x, y] = event.coordinate;
      this.callbacks.onPointer({ x: Math.round(x), y: Math.round(-y) });
    });
    viewport.addEventListener('mouseleave', () => {
      this.callbacks.onPointer(null);
      this.brush?.hideCursor();
    });
    this.applyTool();
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
      const properties = { labelClassId: label.labelClassId, reviewStatus: label.reviewStatus, shapeType: label.shapeType };
      if (!feature) {
        const created = new Feature<ShapeGeom>(toOlGeometry(label.geometry));
        created.setId(label.id);
        created.setProperties(properties);
        this.shapes.addFeature(created);
      } else if (old?.updatedAt !== label.updatedAt || old.reviewStatus !== label.reviewStatus) {
        feature.setGeometry(toOlGeometry(label.geometry));
        feature.setProperties(properties);
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

  // Annotators may draw, move and reshape; everyone else only looks
  setEditable(editable: boolean) {
    this.editable = editable;
    this.applyTool();
  }

  setTool(tool: Tool) {
    this.tool = tool;
    this.applyTool();
  }

  // Brush size (image pixels) and whether strokes erase
  setBrush(radius: number, erase: boolean) {
    this.brushRadius = radius;
    this.brushErase = erase;
    this.brushSource.changed();
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

  private selectedIsPolygon() {
    return this.labels.get(this.selectedId ?? '')?.shapeType === 'POLYGON';
  }

  private activeTool(): Tool {
    return this.editable ? this.tool : 'SELECT';
  }

  // Turns the interactions of the chosen tool on, and the others off
  private applyTool() {
    for (const interaction of [this.draw, this.brush]) if (interaction) this.map.removeInteraction(interaction);
    this.draw = null;
    this.brush = null;
    this.drawing = false;
    this.brushSource.clear();

    const tool = this.activeTool();
    const editing = this.editable && tool === 'SELECT';
    this.modify.setActive(editing);
    this.translate.setActive(editing);
    this.rotate.setActive(editing);
    this.select.setActive(tool === 'SELECT');
    this.map.getViewport().style.cursor = tool === 'SELECT' ? '' : 'crosshair';
    this.shapeLayer.changed(); // corner handles and the turning knob only show while editing

    if (tool === 'BBOX' || tool === 'OBB' || tool === 'POLYGON') {
      this.setSelected(null);
      const draw = this.createDraw(tool);
      draw.on('drawstart', () => (this.drawing = true));
      draw.on('drawabort', () => (this.drawing = false));
      draw.on('drawend', (event) => {
        this.drawing = false;
        void this.saveDrawing(tool, event.feature as Feature<Polygon>);
      });
      this.draw = draw;
      this.addBelowPan(draw);
    }
    if (tool === 'CUT') {
      // Click points across the shape, double-click to finish the cut
      const cut = new Draw({ type: 'LineString', style: sketchStyle, condition: noModifierKeysLeftButton });
      cut.on('drawstart', () => (this.drawing = true));
      cut.on('drawabort', () => (this.drawing = false));
      cut.on('drawend', (event) => {
        this.drawing = false;
        const line = (event.feature.getGeometry() as LineString).getCoordinates().map(toPixel);
        void this.callbacks.onCut(line);
      });
      this.draw = cut;
      this.addBelowPan(cut);
    }
    if (tool === 'BRUSH') {
      // The selected polygon stays selected: strokes are added to it (or erased from it)
      this.brush = new BrushInteraction({
        source: this.brushSource,
        radius: () => this.brushRadius,
        erase: () => this.brushErase,
        onStroke: (points, radius, erase) => this.callbacks.onBrush(points.map(toPixel), radius, erase),
      });
      this.addBelowPan(this.brush);
    }
  }

  private createDraw(tool: DrawTool) {
    // Left button only: the middle one pans
    const common = { style: sketchStyle, condition: noModifierKeysLeftButton };
    if (tool === 'BBOX') return new Draw({ ...common, type: 'Circle', geometryFunction: createBox(), freehand: true }); // press, drag, release
    if (tool === 'OBB') return new Draw({ ...common, type: 'LineString', maxPoints: 3, geometryFunction: rotatedBoxFromClicks }); // 3 clicks
    return new Draw({ ...common, type: 'Polygon' }); // click points, double-click to finish
  }

  // Keeps the middle-button pan the last interaction, so it always goes first
  private addBelowPan(interaction: Interaction) {
    const interactions = this.map.getInteractions();
    interactions.insertAt(interactions.getArray().indexOf(this.middlePan), interaction);
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

  private async saveDrawing(shapeType: DrawTool, feature: Feature<Polygon>) {
    const geometry = toShapeGeometry(feature.getGeometry()!);
    if (isTiny(geometry)) return;
    this.pending.addFeature(feature); // shown dashed until the server answers
    const saved = await this.callbacks.onDrawn(shapeType, geometry);
    if (!saved) this.pending.clear();
  }

  private async useWand(coordinate: Coordinate) {
    const marker = new Feature(new Point(coordinate)); // a ring where the magic pen is looking
    this.pending.addFeature(marker);
    const [minX, minY, maxX, maxY] = this.map.getView().calculateExtent(this.map.getSize());
    try {
      await this.callbacks.onWand(toPixel(coordinate), [minX, -maxY, maxX, -minY]);
    } finally {
      if (this.pending.hasFeature(marker)) this.pending.removeFeature(marker);
    }
  }

  private async saveChange(feature: Feature<ShapeGeom>, kind: ChangeKind) {
    const id = feature.getId() as string;
    const label = this.labels.get(id);
    const before = this.before.get(id);
    if (!label || !before) return;
    // Dragging one corner bends a box: make it a rectangle again
    if (kind === 'reshape' && label.shapeType === 'BBOX') {
      feature.setGeometry(straightenBox(before as Polygon, feature.getGeometry() as Polygon));
    }
    if (kind === 'reshape' && label.shapeType === 'OBB') {
      feature.setGeometry(straightenRotatedBox(before as Polygon, feature.getGeometry() as Polygon));
    }

    const saved = await this.callbacks.onChanged(id, toShapeGeometry(feature.getGeometry()!));
    if (!saved) feature.setGeometry(toOlGeometry(label.geometry)); // put it back
  }
}

const noModifierKeysLeftButton = (event: Parameters<typeof primaryAction>[0]) => noModifierKeys(event) && primaryAction(event);
