/** Natural dimensions of an input image (aspect ratio source) */
export interface PenduImageData {
  width: number;
  height: number;
}

/** Computed position and size for a placed frame */
export interface FrameLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

/** A placed frame = original image data + computed layout */
export type PlacedFrame = PenduImageData & FrameLayout;

/** Configuration for the layout engine */
export interface LayoutOptions {
  gap?: number;
  minScale?: number;
  padding?: number;
  seed?: number;
  containerWidth?: number;
  containerHeight?: number;
  minItemWidth?: number;
  maxItemWidth?: number;
}

/** Internal resolved options (all fields required) */
export interface ResolvedOptions {
  gap: number;
  minScale: number;
  padding: number;
  seed: number;
  containerWidth: number;
  containerHeight: number;
  minItemWidth: number;
  maxItemWidth: number;
}

/** Bounding box of the entire layout cluster */
export interface LayoutBounds {
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Statistics about the layout computation */
export interface LayoutStats {
  placed: number;
  failed: number;
  avgScale: number;
}

/** Complete layout result */
export interface LayoutResult {
  frames: PlacedFrame[];
  bounds: LayoutBounds;
  stats: LayoutStats;
}

/** Edge contact measurement result */
export interface EdgeContactResult {
  contacts: number;
  contactLength: number;
}
