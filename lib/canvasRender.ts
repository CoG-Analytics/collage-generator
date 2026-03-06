import { getSlotRects } from "@/lib/layout";
import { drawImageInSlot, getFramePixelDimensions } from "@/lib/render";
import { getTemplateById } from "@/lib/templates";
import { ImageAsset, ProjectConfig, SlotState } from "@/lib/types";

interface RenderCollageOptions {
  canvas: HTMLCanvasElement;
  assets: ImageAsset[];
  projectConfig: ProjectConfig;
  slots: SlotState[];
  targetLongestSide?: number;
  overlaysEnabled?: boolean;
}

export const renderCollageToCanvas = ({
  canvas,
  assets,
  projectConfig,
  slots,
  targetLongestSide,
  overlaysEnabled = false
}: RenderCollageOptions) => {
  const template = getTemplateById(projectConfig.templateId);
  if (!template) {
    return;
  }

  const frame = getFramePixelDimensions(
    projectConfig.frameSize,
    projectConfig.orientation,
    projectConfig.dpi
  );

  const scale = targetLongestSide
    ? targetLongestSide / Math.max(frame.width, frame.height)
    : 1;

  const renderWidth = Math.max(1, Math.round(frame.width * scale));
  const renderHeight = Math.max(1, Math.round(frame.height * scale));

  canvas.width = renderWidth;
  canvas.height = renderHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, renderWidth, renderHeight);

  const slotRects = getSlotRects(template.slots, renderWidth, renderHeight, projectConfig.gutterPct);

  slotRects.forEach((slotRect, index) => {
    const slot = slots[index];
    if (!slot?.imageId) {
      ctx.save();
      ctx.fillStyle = "#efefef";
      ctx.fillRect(slotRect.x, slotRect.y, slotRect.width, slotRect.height);
      ctx.restore();
      return;
    }

    const asset = assets.find((a) => a.id === slot.imageId);
    if (!asset) {
      return;
    }

    drawImageInSlot(
      ctx,
      asset.bitmap,
      slotRect,
      slot.fitMode,
      slot.scale,
      slot.offsetX,
      slot.offsetY,
      slot.rotation,
      slot.flipX,
      slot.flipY,
      asset.width,
      asset.height
    );
  });

  if (overlaysEnabled) {
    const safeInset = Math.min(renderWidth, renderHeight) * projectConfig.safeZonePct;

    ctx.strokeStyle = "rgba(20, 20, 20, 0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, renderWidth - 1, renderHeight - 1);

    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "rgba(0, 115, 255, 0.8)";
    ctx.strokeRect(
      safeInset + 0.5,
      safeInset + 0.5,
      renderWidth - safeInset * 2 - 1,
      renderHeight - safeInset * 2 - 1
    );
    ctx.setLineDash([]);
  }

  ctx.restore();
};
