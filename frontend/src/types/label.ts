import type { ReviewStatus } from './task';

export type ShapeType = 'BBOX' | 'POLYGON' | 'POINT';

// GeoJSON in image pixels: x to the right, y down from the top-left corner
export type Position = [number, number];
export type ShapeGeometry = { type: 'Point'; coordinates: Position } | { type: 'Polygon'; coordinates: Position[][] };

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
