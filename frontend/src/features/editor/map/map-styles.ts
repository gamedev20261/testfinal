import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import MultiPoint from 'ol/geom/MultiPoint';
import Polygon from 'ol/geom/Polygon';
import type { FeatureLike } from 'ol/Feature';

export type StyleOptions = {
  colorOf: (labelClassId: string) => string;
  nameOf: (labelClassId: string) => string;
  selectedId: string | null;
  showNames: boolean;
};

const REJECTED = '#e53e3e';

// Hex colour + transparency: ('#ff0000', 0.2) → '#ff000033'
const alpha = (hex: string, amount: number) => hex + Math.round(amount * 255).toString(16).padStart(2, '0');

// How each shape looks: its class colour, thicker when selected, dashed red when rejected
export function shapeStyle(feature: FeatureLike, options: StyleOptions): Style[] {
  const classId = feature.get('labelClassId') as string;
  const selected = feature.getId() === options.selectedId;
  const rejected = feature.get('reviewStatus') === 'REJECTED';
  const color = options.colorOf(classId);
  const stroke = new Stroke({ color: rejected ? REJECTED : color, width: selected ? 3 : 2, lineDash: rejected ? [6, 4] : undefined });
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
        image: new Circle({ radius: selected ? 8 : 6, fill: new Fill({ color }), stroke: new Stroke({ color: rejected ? REJECTED : '#fff', width: 2 }) }),
        text,
      }),
    ];
  }

  const styles = [new Style({ stroke, fill: new Fill({ color: alpha(color, selected ? 0.3 : 0.15) }), text })];
  if (selected) {
    // White dots on the corners: the handles you can drag
    styles.push(
      new Style({
        image: new Circle({ radius: 4, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color, width: 2 }) }),
        geometry: (f) => new MultiPoint((f.getGeometry() as Polygon).getCoordinates()[0]),
      }),
    );
  }
  return styles;
}

// The shape being drawn and not saved yet
export const pendingStyle = new Style({
  stroke: new Stroke({ color: '#1b6ef3', width: 2, lineDash: [4, 4] }),
  fill: new Fill({ color: 'rgba(27, 110, 243, 0.1)' }),
  image: new Circle({ radius: 6, fill: new Fill({ color: '#1b6ef3' }) }),
});
