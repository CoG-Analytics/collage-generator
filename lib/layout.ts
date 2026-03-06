import { Rect, TemplateSlot } from "@/lib/types";

const clampNonNegative = (value: number) => Math.max(0, value);

export const normalizedToPixelRect = (
  slot: TemplateSlot,
  canvasWidth: number,
  canvasHeight: number
): Rect => ({
  x: slot.x * canvasWidth,
  y: slot.y * canvasHeight,
  width: slot.width * canvasWidth,
  height: slot.height * canvasHeight
});

export const applyGutterToRect = (
  rect: Rect,
  gutterPx: number,
  canvasWidth: number,
  canvasHeight: number
): Rect => {
  const left = rect.x <= 0 ? 0 : gutterPx / 2;
  const top = rect.y <= 0 ? 0 : gutterPx / 2;
  const right = rect.x + rect.width >= canvasWidth ? 0 : gutterPx / 2;
  const bottom = rect.y + rect.height >= canvasHeight ? 0 : gutterPx / 2;

  return {
    x: rect.x + left,
    y: rect.y + top,
    width: clampNonNegative(rect.width - left - right),
    height: clampNonNegative(rect.height - top - bottom)
  };
};

export const getSlotRects = (
  slots: TemplateSlot[],
  canvasWidth: number,
  canvasHeight: number,
  gutterPct: number
): Rect[] => {
  const gutterPx = Math.min(canvasWidth, canvasHeight) * gutterPct;
  return slots.map((slot) => {
    const baseRect = normalizedToPixelRect(slot, canvasWidth, canvasHeight);
    return applyGutterToRect(baseRect, gutterPx, canvasWidth, canvasHeight);
  });
};
