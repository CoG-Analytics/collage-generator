import {
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES
} from "@/lib/constants";

const fileTypeError = "Only JPG, JPEG, and PNG files are supported.";
const fileSizeError = "Each file must be 20MB or less.";

interface FileValidationResult {
  validFiles: File[];
  errors: string[];
}

export const validateFiles = (existingFileNames: string[], files: File[]): FileValidationResult => {
  const errors: string[] = [];
  const usedNames = new Set(existingFileNames.map((name) => name.toLowerCase()));
  const validFiles: File[] = [];

  files.forEach((file) => {
    const normalizedName = file.name.toLowerCase();
    let isValid = true;
    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      errors.push(`${file.name}: ${fileTypeError}`);
      isValid = false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`${file.name}: ${fileSizeError}`);
      isValid = false;
    }
    if (usedNames.has(normalizedName)) {
      errors.push(`${file.name}: A photo with this file name already exists in the gallery.`);
      isValid = false;
    }

    if (isValid) {
      usedNames.add(normalizedName);
      validFiles.push(file);
    }
  });

  return {
    validFiles,
    errors: Array.from(new Set(errors))
  };
};

export const decodeFileToBitmap = async (file: File): Promise<ImageBitmap> => {
  const canCreateBitmap = typeof createImageBitmap === "function";

  if (canCreateBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some browsers (notably Safari variants) reject decode options for valid images.
    }

    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to <img> decoding path.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to decode image."));
      img.src = objectUrl;
    });

    if (!canCreateBitmap) {
      throw new Error("Image decoding is not supported in this browser.");
    }
    return await createImageBitmap(image);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
