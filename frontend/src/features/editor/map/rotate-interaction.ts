import PointerInteraction from 'ol/interaction/Pointer';
import type Feature from 'ol/Feature';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type Polygon from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';
import { primaryAction } from 'ol/events/condition';
import { boxCenter, rotationHandle } from './obb';

type Options = {
  target: () => Feature<Polygon> | null; // the selected rotated box, if any
  onStart: (feature: Feature<Polygon>) => void;
  onEnd: (feature: Feature<Polygon>) => void;
};

const GRAB_PX = 9; // how close to the handle a press must be

// Drag the round handle of the selected rotated box to turn it around its centre
export class RotateBoxInteraction extends PointerInteraction {
  private feature: Feature<Polygon> | null = null;
  private original: Polygon | null = null;
  private center: Coordinate = [0, 0];
  private startAngle = 0;
  private overHandle = false;

  constructor(private options: Options) {
    super();
  }

  protected override handleDownEvent(event: MapBrowserEvent): boolean {
    const feature = this.options.target();
    if (!feature || !primaryAction(event) || !this.isOnHandle(event, feature)) return false;
    const geometry = feature.getGeometry()!;
    this.feature = feature;
    this.original = geometry.clone();
    this.center = boxCenter(geometry);
    this.startAngle = this.angleTo(event.coordinate);
    this.options.onStart(feature);
    return true; // the press is ours: the box is not moved or panned
  }

  protected override handleDragEvent(event: MapBrowserEvent) {
    if (!this.feature || !this.original) return;
    const turned = this.original.clone();
    turned.rotate(this.angleTo(event.coordinate) - this.startAngle, this.center);
    this.feature.setGeometry(turned);
  }

  protected override handleUpEvent(): boolean {
    if (this.feature) this.options.onEnd(this.feature);
    this.feature = null;
    this.original = null;
    return false;
  }

  // A grab cursor over the handle
  protected override handleMoveEvent(event: MapBrowserEvent) {
    const feature = this.options.target();
    const over = !!feature && this.isOnHandle(event, feature);
    if (over === this.overHandle) return;
    this.overHandle = over;
    event.map.getViewport().style.cursor = over ? 'grab' : '';
  }

  private isOnHandle(event: MapBrowserEvent, feature: Feature<Polygon>) {
    const resolution = event.map.getView().getResolution() ?? 1;
    const { handle } = rotationHandle(feature.getGeometry()!, resolution);
    const [x, y] = event.map.getPixelFromCoordinate(handle);
    return Math.hypot(x - event.pixel[0], y - event.pixel[1]) <= GRAB_PX;
  }

  private angleTo([x, y]: Coordinate) {
    return Math.atan2(y - this.center[1], x - this.center[0]);
  }
}
