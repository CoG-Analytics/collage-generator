"use client";

import { DragEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ArrowLeft, Download, RotateCcw, RotateCw, Trash2, Undo2, Upload } from "lucide-react";
import { FRAME_SIZES } from "@/lib/constants";
import { renderCollageToCanvas } from "@/lib/canvasRender";
import { getSlotRects } from "@/lib/layout";
import { getTemplateById, TEMPLATES } from "@/lib/templates";
import { selectCanExport, useCollageStore } from "@/store/useCollageStore";

const PREVIEW_LONGEST_SIDE = 1400;
const SHIFT_RELEASE_PAN_FREEZE_MS = 120;

type AxisLock = "x" | "y" | null;

interface PanState {
  active: boolean;
  pointerId: number | null;
  slotId: string | null;
  startX: number;
  startY: number;
  baseOffsetX: number;
  baseOffsetY: number;
  axisLock: AxisLock;
  wasShiftHeld: boolean;
  freezeUntilMs: number;
}

interface SlotClickState {
  pointerId: number | null;
  slotId: string | null;
  startX: number;
  startY: number;
  moved: boolean;
  wasSelectedOnDown: boolean;
}

const toPngBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const getCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height
  };
};

const rotateLeft = (rotation: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 =>
  (((rotation + 270) % 360) as 0 | 90 | 180 | 270);

const rotateRight = (rotation: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 =>
  (((rotation + 90) % 360) as 0 | 90 | 180 | 270);

const FlipHIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path d="M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="m6 9-3 3 3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="m18 9 3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const FlipVIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path d="M12 3v18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="m9 6 3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="m9 18 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export default function Builder() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const clickStateRef = useRef<SlotClickState>({
    pointerId: null,
    slotId: null,
    startX: 0,
    startY: 0,
    moved: false,
    wasSelectedOnDown: false
  });
  const panStateRef = useRef<PanState>({
    active: false,
    pointerId: null,
    slotId: null,
    startX: 0,
    startY: 0,
    baseOffsetX: 0,
    baseOffsetY: 0,
    axisLock: null,
    wasShiftHeld: false,
    freezeUntilMs: 0
  });
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);

  const {
    assets,
    projectConfig,
    slots,
    uiState,
    errors,
    isExporting,
    addFiles,
    removeAsset,
    clearErrors,
    setFrameSize,
    setOrientation,
    setTemplate,
    setSelectedSlot,
    setSlotImage,
    updateSlotTransform,
    resetSlotTransform,
    setOverlaysEnabled,
    setExporting,
    clearProject
  } = useCollageStore();

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.slotId === uiState.selectedSlot) ?? null,
    [slots, uiState.selectedSlot]
  );
  const selectedSlotIndex = useMemo(
    () => (selectedSlot ? slots.findIndex((slot) => slot.slotId === selectedSlot.slotId) : -1),
    [selectedSlot, slots]
  );
  const previewMinHeightClass =
    projectConfig.orientation === "portrait"
      ? "min-h-[320px]"
      : "min-h-[280px]";

  const getCurrentSlotRects = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return [];
    }

    const template = getTemplateById(projectConfig.templateId);
    if (!template) {
      return [];
    }

    return getSlotRects(template.slots, canvas.width, canvas.height, projectConfig.gutterPct);
  }, [projectConfig.gutterPct, projectConfig.templateId]);

  const getSlotIndexAtPoint = useCallback(
    (x: number, y: number) => {
      const slotRects = getCurrentSlotRects();
      return slotRects.findIndex(
        (rect) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
      );
    },
    [getCurrentSlotRects]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      await addFiles(acceptedFiles);
    },
    [addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"]
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    renderCollageToCanvas({
      canvas,
      assets,
      projectConfig,
      slots,
      targetLongestSide: PREVIEW_LONGEST_SIDE,
      overlaysEnabled: uiState.overlaysEnabled
    });

    const template = getTemplateById(projectConfig.templateId);
    const ctx = canvas.getContext("2d");
    if (!template || !ctx) {
      return;
    }

    const slotRects = getSlotRects(template.slots, canvas.width, canvas.height, projectConfig.gutterPct);
    if (uiState.selectedSlot) {
      const selectedIndex = slots.findIndex((slot) => slot.slotId === uiState.selectedSlot);
      if (selectedIndex >= 0) {
        const rect = slotRects[selectedIndex];
        ctx.save();
        ctx.strokeStyle = "rgba(37, 99, 235, 0.35)";
        ctx.lineWidth = 10;
        ctx.strokeRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10);
        ctx.strokeStyle = "#1d4ed8";
        ctx.lineWidth = 4;
        ctx.strokeRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4);
        ctx.restore();
      }
    }

    if (dragOverSlotId) {
      const hoverIndex = slots.findIndex((slot) => slot.slotId === dragOverSlotId);
      if (hoverIndex >= 0) {
        const rect = slotRects[hoverIndex];
        ctx.save();
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 6;
        ctx.setLineDash([10, 6]);
        ctx.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.width - 3, rect.height - 3);
        ctx.restore();
      }
    }
  }, [assets, dragOverSlotId, projectConfig, slots, uiState.overlaysEnabled, uiState.selectedSlot]);

  const exportPng = async () => {
    if (!selectCanExport()) {
      return;
    }

    const exportCanvas = document.createElement("canvas");
    setExporting(true);
    try {
      renderCollageToCanvas({
        canvas: exportCanvas,
        assets,
        projectConfig,
        slots,
        overlaysEnabled: false
      });

      const blob = await toPngBlob(exportCanvas);
      if (!blob) {
        throw new Error("Failed to export image.");
      }

      downloadBlob(
        blob,
        `scrapbook-${projectConfig.frameSize}-${projectConfig.orientation}-${Date.now()}.png`
      );
    } finally {
      setExporting(false);
    }
  };

  const resetPanState = () => {
    panStateRef.current = {
      active: false,
      pointerId: null,
      slotId: null,
      startX: 0,
      startY: 0,
      baseOffsetX: 0,
      baseOffsetY: 0,
      axisLock: null,
      wasShiftHeld: false,
      freezeUntilMs: 0
    };
  };

  const resetClickState = () => {
    clickStateRef.current = {
      pointerId: null,
      slotId: null,
      startX: 0,
      startY: 0,
      moved: false,
      wasSelectedOnDown: false
    };
  };

  const handleCanvasPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    const slotIndex = getSlotIndexAtPoint(point.x, point.y);
    if (slotIndex < 0) {
      return;
    }

    const slot = slots[slotIndex];
    if (!slot) {
      return;
    }

    const wasSelectedOnDown = uiState.selectedSlot === slot.slotId;
    clickStateRef.current = {
      pointerId: event.pointerId,
      slotId: slot.slotId,
      startX: point.x,
      startY: point.y,
      moved: false,
      wasSelectedOnDown
    };

    if (uiState.selectedSlot !== slot.slotId) {
      setSelectedSlot(slot.slotId);
    }

    if (!slot.imageId) {
      return;
    }

    panStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      slotId: slot.slotId,
      startX: point.x,
      startY: point.y,
      baseOffsetX: slot.offsetX,
      baseOffsetY: slot.offsetY,
      axisLock: null,
      wasShiftHeld: event.shiftKey,
      freezeUntilMs: 0
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCanvasPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const panState = panStateRef.current;
    if (!panState.active || panState.pointerId !== event.pointerId || !panState.slotId) {
      return;
    }

    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    const clickState = clickStateRef.current;
    if (clickState.pointerId === event.pointerId) {
      if (Math.abs(point.x - clickState.startX) > 3 || Math.abs(point.y - clickState.startY) > 3) {
        clickState.moved = true;
      }
    }

    const slotIndex = slots.findIndex((slot) => slot.slotId === panState.slotId);
    if (slotIndex < 0) {
      return;
    }

    const slot = slots[slotIndex];
    if (!slot) {
      return;
    }

    const now = performance.now();

    if (panState.wasShiftHeld && !event.shiftKey) {
      panState.freezeUntilMs = now + SHIFT_RELEASE_PAN_FREEZE_MS;
      panState.startX = point.x;
      panState.startY = point.y;
      panState.baseOffsetX = slot.offsetX;
      panState.baseOffsetY = slot.offsetY;
      panState.axisLock = null;
      panState.wasShiftHeld = false;
      return;
    }

    panState.wasShiftHeld = event.shiftKey;

    if (now < panState.freezeUntilMs) {
      return;
    }

    const slotRects = getCurrentSlotRects();
    const slotRect = slotRects[slotIndex];
    if (!slotRect) {
      return;
    }

    let deltaX = (point.x - panState.startX) / slotRect.width;
    let deltaY = (point.y - panState.startY) / slotRect.height;

    if (event.shiftKey) {
      if (!panState.axisLock && (Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01)) {
        panState.axisLock = Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y";
      }
      if (panState.axisLock === "x") {
        deltaY = 0;
      }
      if (panState.axisLock === "y") {
        deltaX = 0;
      }
    } else {
      panState.axisLock = null;
    }

    updateSlotTransform(panState.slotId, {
      offsetX: panState.baseOffsetX + deltaX,
      offsetY: panState.baseOffsetY + deltaY
    });
  };

  const stopPan = (event: PointerEvent<HTMLCanvasElement>) => {
    const clickState = clickStateRef.current;
    if (
      clickState.pointerId === event.pointerId &&
      clickState.slotId &&
      clickState.wasSelectedOnDown &&
      !clickState.moved
    ) {
      setSelectedSlot(clickState.slotId);
    }
    resetClickState();

    const panState = panStateRef.current;
    if (panState.active && panState.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      resetPanState();
    }
  };

  const cancelPan = (event: PointerEvent<HTMLCanvasElement>) => {
    resetClickState();
    const panState = panStateRef.current;
    if (panState.active && panState.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      resetPanState();
    }
  };

  const handleCanvasDragOver = (event: DragEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    const slotIndex = getSlotIndexAtPoint(point.x, point.y);
    setDragOverSlotId(slotIndex >= 0 ? slots[slotIndex]?.slotId ?? null : null);
  };

  const handleCanvasDrop = (event: DragEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const imageId = event.dataTransfer.getData("text/plain");
    if (!canvas || !imageId) {
      setDragOverSlotId(null);
      return;
    }

    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    const slotIndex = getSlotIndexAtPoint(point.x, point.y);
    const slot = slotIndex >= 0 ? slots[slotIndex] : null;
    if (!slot) {
      setDragOverSlotId(null);
      return;
    }

    setSlotImage(slot.slotId, imageId);
    setDragOverSlotId(null);
  };

  const assignAssetToFirstEmptySlot = useCallback(
    (imageId: string) => {
      const firstEmptySlot = slots.find((slot) => !slot.imageId);
      if (!firstEmptySlot) {
        return;
      }
      setSlotImage(firstEmptySlot.slotId, imageId);
    },
    [setSlotImage, slots]
  );

  return (
    <main className="mx-auto grid h-[calc(100vh-2rem)] max-w-7xl grid-cols-1 gap-4 overflow-hidden px-4 py-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">SnapStitch</h1>

        {!selectedSlot && (
          <>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-sm transition ${
                isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
              }`}
              aria-label="Upload photos"
            >
              <input {...getInputProps()} aria-label="Choose image files" />
              <div className="flex items-center gap-3 text-slate-700">
                <Upload className="h-4 w-4" />
                <p>Drag and drop JPG/PNG files here, or click to browse.</p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-red-700">Upload issues</p>
                  <button
                    type="button"
                    onClick={clearErrors}
                    className="text-xs font-medium text-red-700 underline"
                  >
                    Clear
                  </button>
                </div>
                <ul className="list-disc pl-5 text-xs text-red-700">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {assets.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col space-y-2">
                <p className="text-sm font-medium text-slate-800">Photo gallery (drag onto a slot)</p>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-2">
                    {assets.map((asset, index) => (
                      <div
                        key={asset.id}
                        draggable
                        onClick={() => assignAssetToFirstEmptySlot(asset.id)}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", asset.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => setDragOverSlotId(null)}
                        className="group relative cursor-grab rounded-md border border-slate-300 bg-white p-1 active:cursor-grabbing"
                        aria-label={`Gallery image ${index + 1}: ${asset.fileName}`}
                        title={asset.fileName}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeAsset(asset.id);
                          }}
                          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded bg-red-600/85 text-red-50 opacity-0 transition hover:bg-red-700 focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={`Remove ${asset.fileName}`}
                          title="Remove photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <img
                          src={asset.objectUrl}
                          alt={asset.fileName}
                          className="h-20 w-full rounded object-cover"
                          draggable={false}
                        />
                        <p className="mt-1 truncate text-[11px] text-slate-600">{asset.fileName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {selectedSlot && (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <p className="text-sm font-medium text-slate-800">
                Edit Slot {selectedSlotIndex >= 0 ? selectedSlotIndex + 1 : ""}
              </p>
              <button
                type="button"
                onClick={() => resetSlotTransform(selectedSlot.slotId)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-700" htmlFor="slot-image-edit">
                Slot photo
              </label>
              <select
                id="slot-image-edit"
                aria-label="Select photo for current slot"
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-xs"
                value={selectedSlot.imageId ?? ""}
                onChange={(event) => setSlotImage(selectedSlot.slotId, event.target.value || null)}
              >
                <option value="">Unassigned</option>
                {assets.map((asset, assetIndex) => (
                  <option key={asset.id} value={asset.id}>
                    {assetIndex + 1}. {asset.fileName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <span className="text-xs text-slate-700">Fit mode</span>
              <div className="grid grid-cols-2 gap-1">
                {(["cover", "contain"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      updateSlotTransform(selectedSlot.slotId, {
                        fitMode: mode,
                        scale: 1,
                        offsetX: 0,
                        offsetY: 0
                      })
                    }
                    className={`rounded-md border px-2 py-1 text-xs capitalize ${
                      selectedSlot.fitMode === mode
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                    aria-label={`Set fit mode to ${mode}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <label className="text-xs text-slate-700" htmlFor="scale">
                Zoom
              </label>
              <input
                id="scale"
                type="range"
                min={0.2}
                max={3}
                step={0.01}
                value={selectedSlot.scale}
                onChange={(event) =>
                  updateSlotTransform(selectedSlot.slotId, { scale: Number(event.target.value) })
                }
              />

              <label className="text-xs text-slate-700" htmlFor="offset-x">
                Pan X
              </label>
              <input
                id="offset-x"
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={selectedSlot.offsetX}
                onChange={(event) =>
                  updateSlotTransform(selectedSlot.slotId, { offsetX: Number(event.target.value) })
                }
              />

              <label className="text-xs text-slate-700" htmlFor="offset-y">
                Pan Y
              </label>
              <input
                id="offset-y"
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={selectedSlot.offsetY}
                onChange={(event) =>
                  updateSlotTransform(selectedSlot.slotId, { offsetY: Number(event.target.value) })
                }
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => updateSlotTransform(selectedSlot.slotId, { flipX: !selectedSlot.flipX })}
                className={`rounded-md border px-2 py-2 text-xs ${
                  selectedSlot.flipX
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 text-slate-700"
                }`}
                aria-label="Flip horizontal"
                title="Flip horizontal"
              >
                <span className="inline-flex items-center justify-center">
                  <FlipHIcon />
                </span>
              </button>
              <button
                type="button"
                onClick={() => updateSlotTransform(selectedSlot.slotId, { flipY: !selectedSlot.flipY })}
                className={`rounded-md border px-2 py-2 text-xs ${
                  selectedSlot.flipY
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 text-slate-700"
                }`}
                aria-label="Flip vertical"
                title="Flip vertical"
              >
                <span className="inline-flex items-center justify-center">
                  <FlipVIcon />
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  updateSlotTransform(selectedSlot.slotId, { rotation: rotateLeft(selectedSlot.rotation) })
                }
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-2 py-2 text-slate-700"
                aria-label="Rotate left 90 degrees"
                title="Rotate left"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  updateSlotTransform(selectedSlot.slotId, { rotation: rotateRight(selectedSlot.rotation) })
                }
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-2 py-2 text-slate-700"
                aria-label="Rotate right 90 degrees"
                title="Rotate right"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {!selectedSlot && (
          <p className="text-xs text-slate-600">
            Select a slot in the preview to edit it.
          </p>
        )}

        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={exportPng}
            disabled={!selectCanExport() || isExporting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export PNG"}
          </button>
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                "Clear project? This removes all uploaded images and resets the collage."
              );
              if (confirmed) {
                clearProject();
              }
            }}
            className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            <Trash2 className="h-4 w-4" />
            Clear project
          </button>
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr] xl:items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="frame-size">
              Frame size
            </label>
            <select
              id="frame-size"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={projectConfig.frameSize}
              onChange={(event) => setFrameSize(event.target.value as typeof projectConfig.frameSize)}
            >
              {FRAME_SIZES.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-700">Orientation</span>
            <div className="grid grid-cols-2 gap-2">
              {(["landscape", "portrait"] as const).map((orientation) => (
                <button
                  key={orientation}
                  type="button"
                  onClick={() => setOrientation(orientation)}
                  className={`rounded-md border px-3 py-2 text-sm capitalize ${
                    projectConfig.orientation === orientation
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  {orientation}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="template">
              Layout
            </label>
            <select
              id="template"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={projectConfig.templateId}
              onChange={(event) => setTemplate(event.target.value)}
            >
              {TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-slate-800">Preview</h2>
            <p className="text-xs text-slate-600">
              {assets.length} image(s) loaded
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-700" htmlFor="overlay-toggle">
            <input
              id="overlay-toggle"
              type="checkbox"
              checked={uiState.overlaysEnabled}
              onChange={(event) => setOverlaysEnabled(event.target.checked)}
            />
            Show safe zone
          </label>
        </div>

        <div className={`flex flex-1 items-center justify-center rounded-lg bg-slate-100 p-3 ${previewMinHeightClass}`}>
          <canvas
            ref={canvasRef}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={stopPan}
            onPointerCancel={cancelPan}
            onDragOver={handleCanvasDragOver}
            onDragLeave={() => setDragOverSlotId(null)}
            onDrop={handleCanvasDrop}
            className="h-auto max-h-full w-auto max-w-full rounded border border-slate-300 bg-white"
          />
        </div>
      </section>
    </main>
  );
}
