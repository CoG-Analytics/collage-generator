"use client";

import { create } from "zustand";
import { getTemplateById } from "@/lib/templates";
import { decodeFileToBitmap, hasValidImageCount, makeId, validateFiles } from "@/lib/image";
import { ImageAsset, Orientation, ProjectConfig, SlotState } from "@/lib/types";

interface UiState {
  selectedSlot: string | null;
  overlaysEnabled: boolean;
}

interface CollageState {
  assets: ImageAsset[];
  projectConfig: ProjectConfig;
  slots: SlotState[];
  uiState: UiState;
  errors: string[];
  isExporting: boolean;
  addFiles: (files: File[]) => Promise<void>;
  removeAsset: (assetId: string) => void;
  setFrameSize: (frameSize: ProjectConfig["frameSize"]) => void;
  setOrientation: (orientation: Orientation) => void;
  setTemplate: (templateId: string) => void;
  setSelectedSlot: (slotId: string | null) => void;
  setSlotImage: (slotId: string, imageId: string | null) => void;
  updateSlotTransform: (
    slotId: string,
    patch: Partial<
      Pick<SlotState, "fitMode" | "rotation" | "scale" | "offsetX" | "offsetY" | "flipX" | "flipY">
    >
  ) => void;
  resetSlotTransform: (slotId: string) => void;
  setOverlaysEnabled: (enabled: boolean) => void;
  setExporting: (exporting: boolean) => void;
  clearErrors: () => void;
  clearProject: () => void;
}

const defaultTemplateId = "two-vertical-split";

const makeDefaultSlots = (templateId: string, imageIds: string[], existingSlots: SlotState[] = []): SlotState[] => {
  const template = getTemplateById(templateId);
  if (!template) {
    return [];
  }

  const usedImageIds = new Set<string>();
  const existingBySlotId = new Map(existingSlots.map((slot) => [slot.slotId, slot]));
  const nextSlots = template.slots.map((slot) => {
    const existing = existingBySlotId.get(slot.id);
    if (existing && existing.imageId && imageIds.includes(existing.imageId)) {
      usedImageIds.add(existing.imageId);
      return existing;
    }
    return {
      slotId: slot.id,
      imageId: null,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0 as const,
      flipX: false,
      flipY: false,
      fitMode: "cover" as const
    };
  });

  const remainingImageIds = imageIds.filter((imageId) => !usedImageIds.has(imageId));
  nextSlots.forEach((slot) => {
    if (!slot.imageId && remainingImageIds.length > 0) {
      slot.imageId = remainingImageIds.shift() ?? null;
    }
  });

  return nextSlots;
};

export const useCollageStore = create<CollageState>((set, get) => ({
  assets: [],
  projectConfig: {
    frameSize: "4x6",
    orientation: "landscape",
    dpi: 300,
    templateId: defaultTemplateId,
    gutterPct: 0.015,
    safeZonePct: 0.04
  },
  slots: makeDefaultSlots(defaultTemplateId, []),
  uiState: {
    selectedSlot: null,
    overlaysEnabled: true
  },
  errors: [],
  isExporting: false,

  addFiles: async (files) => {
    const state = get();
    const validationResult = validateFiles(
      state.assets.map((asset) => asset.fileName),
      files
    );
    if (validationResult.errors.length > 0) {
      set((prev) => ({
        errors: Array.from(new Set([...prev.errors, ...validationResult.errors]))
      }));
    }
    if (validationResult.validFiles.length === 0) {
      return;
    }

    const decodedAssets: ImageAsset[] = [];
    for (const file of validationResult.validFiles) {
      try {
        const bitmap = await decodeFileToBitmap(file);
        const objectUrl = URL.createObjectURL(file);
        decodedAssets.push({
          id: makeId(),
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          objectUrl,
          bitmap,
          width: bitmap.width,
          height: bitmap.height
        });
      } catch {
        set((prev) => ({ errors: [...prev.errors, `${file.name}: Unable to decode image.`] }));
      }
    }

    if (decodedAssets.length === 0) {
      return;
    }

    const nextAssets = [...state.assets, ...decodedAssets];
    const nextImageIds = nextAssets.map((asset) => asset.id);
    const slots = makeDefaultSlots(state.projectConfig.templateId, nextImageIds, state.slots);

    set({
      assets: nextAssets,
      slots,
      errors: validationResult.errors
    });
  },

  removeAsset: (assetId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (asset) {
      URL.revokeObjectURL(asset.objectUrl);
      asset.bitmap.close();
    }

    const nextAssets = state.assets.filter((a) => a.id !== assetId);
    set({
      assets: nextAssets,
      slots: state.slots.map((slot) =>
        slot.imageId === assetId ? { ...slot, imageId: null } : slot
      )
    });
  },

  setFrameSize: (frameSize) =>
    set((state) => ({ projectConfig: { ...state.projectConfig, frameSize } })),

  setOrientation: (orientation) =>
    set((state) => ({ projectConfig: { ...state.projectConfig, orientation } })),

  setTemplate: (templateId) =>
    set((state) => {
      const template = getTemplateById(templateId);
      if (!template) {
        return state;
      }
      return {
        projectConfig: { ...state.projectConfig, templateId },
        slots: makeDefaultSlots(
          templateId,
          state.assets.map((asset) => asset.id),
          state.slots
        ),
        uiState: { ...state.uiState, selectedSlot: null }
      };
    }),

  setSelectedSlot: (slotId) =>
    set((state) => ({
      uiState: {
        ...state.uiState,
        selectedSlot: state.uiState.selectedSlot === slotId ? null : slotId
      }
    })),

  setSlotImage: (slotId, imageId) =>
    set((state) => ({
      slots: state.slots.map((slot) =>
        slot.slotId === slotId
          ? {
              ...slot,
              imageId,
              scale: 1,
              offsetX: 0,
              offsetY: 0,
              rotation: 0,
              flipX: false,
              flipY: false
            }
          : slot
      )
    })),

  updateSlotTransform: (slotId, patch) =>
    set((state) => ({
      slots: state.slots.map((slot) =>
        slot.slotId === slotId
          ? {
              ...slot,
              ...patch,
              scale: Math.max(0.2, Math.min(3, patch.scale ?? slot.scale)),
              offsetX: Math.max(-1, Math.min(1, patch.offsetX ?? slot.offsetX)),
              offsetY: Math.max(-1, Math.min(1, patch.offsetY ?? slot.offsetY))
            }
          : slot
      )
    })),

  resetSlotTransform: (slotId) =>
    set((state) => ({
      slots: state.slots.map((slot) =>
        slot.slotId === slotId
          ? {
              ...slot,
              scale: 1,
              offsetX: 0,
              offsetY: 0,
              rotation: 0,
              flipX: false,
              flipY: false,
              fitMode: "cover"
            }
          : slot
      )
    })),

  setOverlaysEnabled: (enabled) =>
    set((state) => ({ uiState: { ...state.uiState, overlaysEnabled: enabled } })),

  setExporting: (exporting) => set({ isExporting: exporting }),

  clearErrors: () => set({ errors: [] }),

  clearProject: () => {
    const state = get();
    state.assets.forEach((asset) => {
      URL.revokeObjectURL(asset.objectUrl);
      asset.bitmap.close();
    });

    set({
      assets: [],
      projectConfig: {
        frameSize: "4x6",
        orientation: "landscape",
        dpi: 300,
        templateId: defaultTemplateId,
        gutterPct: 0.015,
        safeZonePct: 0.04
      },
      slots: makeDefaultSlots(defaultTemplateId, []),
      uiState: { selectedSlot: null, overlaysEnabled: true },
      errors: [],
      isExporting: false
    });
  }
}));

export const selectCanExport = () => {
  const state = useCollageStore.getState();
  return hasValidImageCount(state.assets.length);
};
