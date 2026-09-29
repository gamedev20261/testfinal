import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import MultiPoint from 'ol/geom/MultiPoint';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import type Polygon from 'ol/geom/Polygon';
import type { FeatureLike } from 'ol/Feature';
import { rotationHandle } from './obb';

export type StyleOptions = {
  colorOf: (labelClassId: string) => string;
  nameOf: (labelClassId: string) => string;
  selectedId: string | null;
  showNames: boolean;
  editing: boolean; // the select tool can drag: show corner handles (and the turning knob of a rotated box)
};

const REJECTED = '#e53e3e';
const DRAWING = '#1b6ef3';

// Hex colour + transparency: ('#ff0000', 0.2) → '#ff000033'
const alpha = (hex: string, amount: number) => hex + Math.round(amount * 255).toString(16).padStart(2, '0');

// How each shape looks: a thin line in its class colour, a bit thicker when selected, dashed red when rejected
export function shapeStyle(feature: FeatureLike, resolution: number, options: StyleOptions): Style[] {
  const classId = feature.get('labelClassId') as string;
  const selected = feature.getId() === options.selectedId;
  const rejected = feature.get('reviewStatus') === 'REJECTED';
  const color = options.colorOf(classId);
  const stroke = new Stroke({ color: rejected ? REJECTED : color, width: selected ? 2 : 1, lineDash: rejected ? [6, 4] : undefined });
  const text = options.showNames
    ? new Text({
        text: options.nameOf(classId),
        font: '600 11px Inter Variable, sans-serif',
        fill: new Fill({ color: '#fff' }),
        backgroundFill: new Fill({ color: alpha(color, 0.85) }),
        padding: [1, 3, 1, 3],
        offsetY: -14,
        overflow: true,
      })
    : undefined;

  if (feature.getGeometry()?.getType() === 'Point') {
    return [
      new Style({
        image: new Circle({ radius: selected ? 6 : 5, fill: new Fill({ color }), stroke: new Stroke({ color: rejected ? REJECTED : '#fff', width: 1.5 }) }),
        text,
      }),
    ];
  }

  const styles = [new Style({ stroke, fill: new Fill({ color: alpha(color, selected ? 0.25 : 0.12) }), text })];
  if (selected && options.editing) {
    // Small white dots on the corners: the handles you can drag
    styles.push(
      new Style({
        image: new Circle({ radius: 3, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color, width: 1.5 }) }),
        geometry: (f) => new MultiPoint((f.getGeometry() as Polygon).getCoordinates()[0]),
      }),
    );
  }
  if (selected && options.editing && feature.get('shapeType') === 'OBB') {
    // A stick with a round knob: drag the knob to turn the box
    const { middle, handle } = rotationHandle(feature.getGeometry() as Polygon, resolution);
    styles.push(
      new Style({ stroke: new Stroke({ color, width: 1 }), geometry: new LineString([middle, handle]) }),
      new Style({ image: new Circle({ radius: 5, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color, width: 1.5 }) }), geometry: new Point(handle) }),
    );
  }
  return styles;
}

// The shape while it is being drawn (replaces OpenLayers' thick default)
export const sketchStyle = [
  new Style({
    stroke: new Stroke({ color: DRAWING, width: 1.25 }),
    fill: new Fill({ color: 'rgba(27, 110, 243, 0.08)' }),
    image: new Circle({ radius: 3, fill: new Fill({ color: DRAWING }), stroke: new Stroke({ color: '#fff', width: 1 }) }),
  }),
];

// The shape drawn and not saved yet
export const pendingStyle = new Style({
  stroke: new Stroke({ color: DRAWING, width: 1, lineDash: [4, 4] }),
  fill: new Fill({ color: 'rgba(27, 110, 243, 0.1)' }),
  image: new Circle({ radius: 5, stroke: new Stroke({ color: DRAWING, width: 1.5 }), fill: new Fill({ color: 'rgba(255, 255, 255, 0.6)' }) }),
});

// Brush: the round cursor, and the stroke being painted (as wide as the brush at any zoom)
export function brushStyle(feature: FeatureLike, resolution: number): Style {
  const erase = feature.get('erase') as boolean;
  const color = erase ? '229, 62, 62' : '27, 110, 243';
  if (feature.get('kind') === 'cursor') {
    return new Style({ stroke: new Stroke({ color: `rgba(${color}, 0.9)`, width: 1 }), fill: new Fill({ color: `rgba(${color}, 0.08)` }) });
  }
  const fill = new Fill({ color: `rgba(${color}, 0.35)` });
  if (feature.getGeometry()?.getType() === 'Circle') return new Style({ fill }); // a single dab
  const width = (2 * (feature.get('radius') as number)) / resolution;
  return new Style({ stroke: new Stroke({ color: `rgba(${color}, 0.35)`, width, lineCap: 'round', lineJoin: 'round' }) });
}
