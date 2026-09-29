import PointerInteraction from 'ol/interaction/Pointer';
import Feature from 'ol/Feature';
import CircleGeometry from 'ol/geom/Circle';
import LineString from 'ol/geom/LineString';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type VectorSource from 'ol/source/Vector';
import type { Coordinate } from 'ol/coordinate';
import { primaryAction } from 'ol/events/condition';

type Options = {
  source: VectorSource; // where the brush circle and the painted stroke are shown
  radius: () => number; // in image pixels
  erase: () => boolean; // erase mode chosen in the toolbar (Shift flips it)
  onStroke: (points: Coordinate[], radius: number, erase: boolean) => Promise<unknown>;
};

// Paint with a round brush: press, drag, release. The stroke is sent when the button is released.
export class BrushInteraction extends PointerInteraction {
  private points: Coordinate[] | null = null;
  private erase = false;
  private cursor = new Feature({ kind: 'cursor' });
  private stroke: Feature | null = null;

  constructor(private options: Options) {
    super();
  }

  protected override handleDownEvent(event: MapBrowserEvent): boolean {
    if (!primaryAction(event)) return false;
    this.erase = this.options.erase() !== (event.originalEvent as PointerEvent).shiftKey;
    this.points = [event.coordinate.slice()];
    this.stroke = new Feature({ kind: 'stroke', erase: this.erase, radius: this.options.radius() });
    this.options.source.addFeature(this.stroke);
    this.drawStroke();
    return true;
  }

  protected override handleDragEvent(event: MapBrowserEvent) {
    this.moveCursor(event.coordinate);
    if (!this.points) return;
    const [x, y] = this.points[this.points.length - 1];
    // A new point every third of the radius is smooth enough and keeps the request small
    if (Math.hypot(event.coordinate[0] - x, event.coordinate[1] - y) < this.options.radius() / 3) return;
    this.points.push(event.coordinate.slice());
    this.drawStroke();
  }

  protected override handleUpEvent(): boolean {
    const [points, stroke] = [this.points, this.stroke];
    this.points = null;
    this.stroke = null;
    if (points && stroke) {
      // The painted stroke stays visible until the shape is saved
      void this.options.onStroke(points, this.options.radius(), this.erase).finally(() => {
        if (this.options.source.hasFeature(stroke)) this.options.source.removeFeature(stroke);
      });
    }
    return false;
  }

  protected override handleMoveEvent(event: MapBrowserEvent) {
    this.moveCursor(event.coordinate);
  }

  hideCursor() {
    if (this.options.source.hasFeature(this.cursor)) this.options.source.removeFeature(this.cursor);
  }

  private moveCursor(center: Coordinate) {
    this.cursor.setGeometry(new CircleGeometry(center, this.options.radius()));
    this.cursor.set('erase', this.options.erase());
    if (!this.options.source.hasFeature(this.cursor)) this.options.source.addFeature(this.cursor);
  }

  private drawStroke() {
    const points = this.points!;
    this.stroke!.setGeometry(points.length === 1 ? new CircleGeometry(points[0], this.options.radius()) : new LineString(points));
  }
}
