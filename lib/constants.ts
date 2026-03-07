import { FrameSize } from "@/lib/types";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence"
]);
export const ACCEPTED_FILE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);

export const FRAME_SIZES: FrameSize[] = [
  { id: "4x6", label: "4 x 6 in", widthIn: 4, heightIn: 6 },
  { id: "5x7", label: "5 x 7 in", widthIn: 5, heightIn: 7 },
  { id: "8x10", label: "8 x 10 in", widthIn: 8, heightIn: 10 }
];
