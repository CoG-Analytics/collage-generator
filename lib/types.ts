export type Orientation = "portrait" | "landscape";
export type FitMode = "cover" | "contain";

export type FrameSizeId = "4x6" | "5x7" | "8x10";

export interface FrameSize {
  id: FrameSizeId;
  label: string;
  widthIn: number;
  heightIn: number;
}

export interface TemplateSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateDefinition {
  id: string;
  label: string;
  imageCount: 2 | 3 | 4;
  slots: TemplateSlot[];
}

export interface ImageAsset {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  objectUrl: string;
  bitmap: CanvasImageSource;
  width: number;
  height: number;
}

export interface SlotState {
  slotId: string;
  imageId: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
  fitMode: FitMode;
}

export interface ProjectConfig {
  frameSize: FrameSizeId;
  orientation: Orientation;
  dpi: number;
  templateId: string;
  gutterPct: number;
  safeZonePct: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
