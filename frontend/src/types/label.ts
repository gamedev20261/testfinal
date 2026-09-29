import type { ReviewStatus } from './task';

// OBB = oriented (rotated) box. Points can no longer be drawn; old ones are still shown.
export type ShapeType = 'BBOX' | 'OBB' | 'POLYGON' | 'POINT';

// GeoJSON in image pixels: x to the right, y down from the top-left corner
export type Position = [number, number];
export type PolygonGeometry = { type: 'Polygon'; coordinates: Position[][] };
export type ShapeGeometry = { type: 'Point'; coordinates: Position } | PolygonGeometry;

export type Label = {
  id: string;
  imageId: string;
  labelClassId: string;
  shapeType: ShapeType;
  geometry: ShapeGeometry;
  reviewStatus: ReviewStatus;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
};
