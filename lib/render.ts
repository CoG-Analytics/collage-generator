import { FRAME_SIZES } from "@/lib/constants";
import { FitMode, FrameSizeId, Orientation, Rect } from "@/lib/types";

export const getFramePixelDimensions = (
  frameSizeId: FrameSizeId,
  orientation: Orientation,
  dpi: number
) => {
  const frameSize = FRAME_SIZES.find((size) => size.id === frameSizeId);
  if (!frameSize) {
    throw new Error(`Unknown frame size: ${frameSizeId}`);
  }

  const isPortrait = orientation === "portrait";
  const widthIn = isPortrait ? frameSize.widthIn : frameSize.heightIn;
  const heightIn = isPortrait ? frameSize.heightIn : frameSize.widthIn;

  return {
    width: Math.round(widthIn * dpi),
    height: Math.round(heightIn * dpi)
  };
};

export const computeFitScale = (
  imageWidth: number,
  imageHeight: number,
  slotWidth: number,
  slotHeight: number,
  fitMode: FitMode
): number => {
  const xRatio = slotWidth / imageWidth;
  const yRatio = slotHeight / imageHeight;
  return fitMode === "cover" ? Math.max(xRatio, yRatio) : Math.min(xRatio, yRatio);
};

export const drawImageInSlot = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  slotRect: Rect,
  fitMode: FitMode,
  scaleAdjustment: number,
  offsetX: number,
  offsetY: number,
  rotation: 0 | 90 | 180 | 270,
  flipX: boolean,
  flipY: boolean,
  sourceWidth: number,
  sourceHeight: number
) => {
  const rotated = rotation === 90 || rotation === 270;
  const fittedWidth = rotated ? sourceHeight : sourceWidth;
  const fittedHeight = rotated ? sourceWidth : sourceHeight;

  const baseScale = computeFitScale(
    fittedWidth,
    fittedHeight,
    slotRect.width,
    slotRect.height,
    fitMode
  );

  const finalScale = Math.max(0.1, baseScale * scaleAdjustment);
  // Keep the image's intrinsic aspect ratio while rotation is handled by the canvas transform.
  const targetWidth = sourceWidth * finalScale;
  const targetHeight = sourceHeight * finalScale;

  const centerX = slotRect.x + slotRect.width / 2 + offsetX * slotRect.width;
  const centerY = slotRect.y + slotRect.height / 2 + offsetY * slotRect.height;

  ctx.save();
  ctx.beginPath();
  ctx.rect(slotRect.x, slotRect.y, slotRect.width, slotRect.height);
  ctx.clip();

  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(image, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  ctx.restore();
};
