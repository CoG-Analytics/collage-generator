import {
  ACCEPTED_FILE_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES
} from "@/lib/constants";

const fileTypeError = "Only JPG, JPEG, PNG, HEIC, and HEIF files are supported.";
const fileSizeError = "Each file must be 50MB or less.";

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
    const extension = normalizedName.includes(".")
      ? `.${normalizedName.split(".").pop()}`
      : "";
    let isValid = true;
    const hasAcceptedMime = !!file.type && ACCEPTED_MIME_TYPES.has(file.type.toLowerCase());
    const hasAcceptedExtension = ACCEPTED_FILE_EXTENSIONS.has(extension);
    if (!hasAcceptedMime && !hasAcceptedExtension) {
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

    try {
      return await createImageBitmap(image);
    } catch {
      // Final fallback: draw into a canvas first, then create bitmap from pixels.
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) {
        throw new Error("Unable to decode image.");
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to decode image.");
      }
      ctx.drawImage(image, 0, 0, width, height);
      return await createImageBitmap(canvas);
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
