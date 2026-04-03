export interface MetadataField {
  key: string;
  label: string;
  value: string;
  category: "location" | "device" | "timestamp" | "technical" | "other";
}

export interface FileMetadata {
  fields: MetadataField[];
  hasMetadata: boolean;
  fieldCount: number;
}

export type FileStatus = "idle" | "inspecting" | "ready" | "cleaning" | "clean" | "error";

export interface ManagedFile {
  id: string;
  file: File;
  status: FileStatus;
  metadata: FileMetadata | null;
  cleanedBlob: Blob | null;
  error: string | null;
  originalSize: number;
  cleanedSize: number | null;
}

const CATEGORY_MAP: Record<string, MetadataField["category"]> = {
  GPSLatitude: "location",
  GPSLongitude: "location",
  GPSAltitude: "location",
  GPSLatitudeRef: "location",
  GPSLongitudeRef: "location",
  GPSImgDirection: "location",
  GPSSpeed: "location",
  Make: "device",
  Model: "device",
  Software: "device",
  LensMake: "device",
  LensModel: "device",
  DateTime: "timestamp",
  DateTimeOriginal: "timestamp",
  DateTimeDigitized: "timestamp",
  CreateDate: "timestamp",
  ModifyDate: "timestamp",
  ExposureTime: "technical",
  FNumber: "technical",
  ISO: "technical",
  FocalLength: "technical",
  Flash: "technical",
  WhiteBalance: "technical",
  ExposureMode: "technical",
  MeteringMode: "technical",
  ColorSpace: "technical",
  PixelXDimension: "technical",
  PixelYDimension: "technical",
};

const FRIENDLY_LABELS: Record<string, string> = {
  GPSLatitude: "Latitude",
  GPSLongitude: "Longitude",
  GPSAltitude: "Altitude",
  GPSImgDirection: "Direction",
  GPSSpeed: "Speed",
  Make: "Camera Brand",
  Model: "Camera Model",
  Software: "Software",
  LensModel: "Lens",
  DateTime: "Date Modified",
  DateTimeOriginal: "Date Taken",
  DateTimeDigitized: "Date Digitized",
  ExposureTime: "Exposure",
  FNumber: "Aperture",
  ISO: "ISO",
  FocalLength: "Focal Length",
  Flash: "Flash",
  WhiteBalance: "White Balance",
  ExposureMode: "Exposure Mode",
  MeteringMode: "Metering",
  ColorSpace: "Color Space",
  PixelXDimension: "Width (px)",
  PixelYDimension: "Height (px)",
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";

  if (key === "ExposureTime" && typeof value === "number") {
    return value < 1 ? `1/${Math.round(1 / value)}s` : `${value}s`;
  }
  if (key === "FNumber" && typeof value === "number") {
    return `f/${value}`;
  }
  if (key === "FocalLength" && typeof value === "number") {
    return `${value}mm`;
  }
  if (
    (key === "GPSLatitude" || key === "GPSLongitude") &&
    typeof value === "number"
  ) {
    return value.toFixed(6) + "°";
  }
  if (key === "GPSAltitude" && typeof value === "number") {
    return `${value.toFixed(1)}m`;
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}

export async function inspectFile(file: File): Promise<FileMetadata> {
  const isImage = file.type.startsWith("image/");

  if (!isImage) {
    return { fields: [], hasMetadata: false, fieldCount: 0 };
  }

  try {
    const exifr = (await import("exifr")).default;
    const raw = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      iptc: false,
      xmp: false,
      icc: false,
      jfif: false,
      ihdr: false,
      reviveValues: true,
      translateKeys: true,
      translateValues: true,
      mergeOutput: true,
    });

    if (!raw || Object.keys(raw).length === 0) {
      return { fields: [], hasMetadata: false, fieldCount: 0 };
    }

    const fields: MetadataField[] = Object.entries(raw)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([key, value]) => ({
        key,
        label: FRIENDLY_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").trim(),
        value: formatValue(key, value),
        category: CATEGORY_MAP[key] ?? "other",
      }))
      .slice(0, 40);

    return {
      fields,
      hasMetadata: fields.length > 0,
      fieldCount: fields.length,
    };
  } catch {
    return { fields: [], hasMetadata: false, fieldCount: 0 };
  }
}

export async function cleanFile(file: File): Promise<Blob> {
  const isJpeg =
    file.type === "image/jpeg" || file.type === "image/jpg" ||
    file.name.toLowerCase().endsWith(".jpg") ||
    file.name.toLowerCase().endsWith(".jpeg");

  const isPng = file.type === "image/png";

  if (isJpeg) {
    return cleanJpeg(file);
  } else if (isPng) {
    return cleanPng(file);
  } else {
    // For other file types, return as-is (best effort)
    return new Blob([await file.arrayBuffer()], { type: file.type });
  }
}

async function cleanJpeg(file: File): Promise<Blob> {
  try {
    const piexif = (await import("piexifjs")).default;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const dataUrl = "data:image/jpeg;base64," + btoa(binary);
    const cleaned = piexif.remove(dataUrl);
    const cleanedBase64 = cleaned.split(",")[1];
    const cleanedBinary = atob(cleanedBase64);
    const cleanedBytes = new Uint8Array(cleanedBinary.length);
    for (let i = 0; i < cleanedBinary.length; i++) {
      cleanedBytes[i] = cleanedBinary.charCodeAt(i);
    }
    return new Blob([cleanedBytes], { type: "image/jpeg" });
  } catch {
    // Fallback: strip JPEG APP1 segments manually
    return stripJpegSegments(file);
  }
}

async function stripJpegSegments(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const result: number[] = [];
  let i = 0;

  // JPEG SOI
  result.push(view.getUint8(i++), view.getUint8(i++));

  while (i < view.byteLength - 1) {
    if (view.getUint8(i) !== 0xff) break;
    const marker = view.getUint8(i + 1);
    // Skip APP0-APP15 (EXIF lives in APP1 = 0xE1)
    if (marker >= 0xe0 && marker <= 0xef) {
      const len = view.getUint16(i + 2);
      // Keep APP0 (JFIF), remove others
      if (marker === 0xe0) {
        for (let j = 0; j < len + 2; j++) result.push(view.getUint8(i + j));
      }
      i += 2 + len;
    } else {
      break;
    }
  }

  // Copy rest of file
  while (i < view.byteLength) result.push(view.getUint8(i++));

  return new Blob([new Uint8Array(result)], { type: "image/jpeg" });
}

async function cleanPng(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const result: number[] = [];

  // PNG signature (8 bytes)
  for (let i = 0; i < 8; i++) result.push(view.getUint8(i));

  let offset = 8;
  const KEEP_CHUNKS = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "sBIT", "bKGD", "hIST", "pHYs", "sPLT", "tIME"]);

  while (offset < view.byteLength) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );

    if (KEEP_CHUNKS.has(type)) {
      const chunkEnd = offset + 12 + length;
      for (let i = offset; i < chunkEnd && i < view.byteLength; i++) {
        result.push(view.getUint8(i));
      }
    }
    // Skip tEXt, iTXt, zTXt, eXIf, etc.

    offset += 12 + length;
    if (type === "IEND") break;
  }

  return new Blob([new Uint8Array(result)], { type: "image/png" });
}

export function generateCleanName(originalName: string): string {
  const lastDot = originalName.lastIndexOf(".");
  if (lastDot === -1) return `${originalName}-clean`;
  const name = originalName.slice(0, lastDot);
  const ext = originalName.slice(lastDot);
  return `${name}-clean${ext}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
