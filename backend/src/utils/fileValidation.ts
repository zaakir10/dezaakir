import { randomBytes } from "node:crypto";
import { AppError } from "./AppError.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export type AllowedImageFormat = "png" | "jpeg" | "gif" | "webp" | "avif";

const FORMAT_TO_MIMES: Record<AllowedImageFormat, readonly string[]> = {
  png: ["image/png"],
  jpeg: ["image/jpeg", "image/jpg"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  avif: ["image/avif"],
};

export interface VerifiedImageFile {
  format: AllowedImageFormat;
  mimeType: string;
  bytes: number;
  safeFilename: string;
  width?: number;
  height?: number;
}

/**
 * Inspects the raw magic bytes of a file buffer to determine its true format.
 * Returns null if the signature is not a genuine PNG, JPEG, GIF, WebP, or AVIF image.
 */
export function detectImageSignature(buf: Uint8Array): AllowedImageFormat | null {
  if (buf.length < 12) return null;

  // Reject SVG / XML / HTML / script / executable headers immediately
  const headText = new TextDecoder("utf-8", { fatal: false })
    .decode(buf.subarray(0, Math.min(buf.length, 512)))
    .trimStart()
    .toLowerCase();

  if (
    headText.startsWith("<svg") ||
    headText.includes("<svg") ||
    headText.startsWith("<?xml") ||
    headText.startsWith("<!doctype") ||
    headText.startsWith("<html") ||
    headText.startsWith("<script") ||
    headText.startsWith("<?php") ||
    headText.startsWith("#!")
  ) {
    return null;
  }

  // Windows PE ("MZ") or Linux ELF ("\x7FELF")
  if ((buf[0] === 0x4d && buf[1] === 0x5a) || (buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46)) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpeg";
  }

  // GIF87a or GIF89a
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return "gif";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "webp";
  }

  // AVIF: ISO BMFF "ftypavif" or "ftypavis" at offset 4..11
  if (
    buf[4] === 0x66 &&
    buf[5] === 0x74 &&
    buf[6] === 0x79 &&
    buf[7] === 0x70 &&
    buf[8] === 0x61 &&
    buf[9] === 0x76 &&
    buf[10] === 0x69 &&
    (buf[11] === 0x66 || buf[11] === 0x73)
  ) {
    return "avif";
  }

  return null;
}

/**
 * Validates an uploaded image buffer against size limits, declared MIME type,
 * magic-byte file signature, and embedded script scans.
 */
export function verifyUploadedImage(
  buffer: Uint8Array,
  declaredMimeType?: string,
  maxBytes: number = MAX_IMAGE_BYTES,
): VerifiedImageFile {
  if (!buffer || buffer.byteLength === 0) {
    throw new AppError(400, "INVALID_UPLOAD", "Uploaded file is empty");
  }

  if (buffer.byteLength > maxBytes) {
    throw new AppError(413, "FILE_TOO_LARGE", `Image exceeds maximum size of ${Math.round(maxBytes / 1048576)}MB`);
  }

  const detectedFormat = detectImageSignature(buffer);
  if (!detectedFormat) {
    throw new AppError(
      400,
      "INVALID_FILE_SIGNATURE",
      "Unsupported or unsafe file format. Only genuine PNG, JPEG, WebP, GIF, and AVIF images are allowed.",
    );
  }

  if (declaredMimeType) {
    const normalizedMime = declaredMimeType.trim().toLowerCase();
    const allowedMimes = FORMAT_TO_MIMES[detectedFormat];
    if (!allowedMimes.includes(normalizedMime)) {
      throw new AppError(
        400,
        "MIME_SIGNATURE_MISMATCH",
        "Declared MIME type does not match the actual file signature",
      );
    }
  }

  // Scan the buffer for embedded <script or <?php tags (polyglot defense)
  const sampleText = new TextDecoder("latin1").decode(buffer.subarray(0, Math.min(buffer.byteLength, 65536))).toLowerCase();
  if (sampleText.includes("<script") || sampleText.includes("<?php") || sampleText.includes("<svg")) {
    throw new AppError(400, "UNSAFE_FILE_CONTENT", "File contains disallowed embedded markup or script content");
  }

  let width: number | undefined;
  let height: number | undefined;
  if (detectedFormat === "png" && buffer.byteLength >= 24) {
    const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const w = dv.getUint32(16, false);
    const h = dv.getUint32(20, false);
    if (w > 0 && w <= 20000 && h > 0 && h <= 20000) {
      width = w;
      height = h;
    }
  }

  const randomId = randomBytes(16).toString("hex");
  const safeFilename = `${randomId}.${detectedFormat}`;

  return {
    format: detectedFormat,
    mimeType: FORMAT_TO_MIMES[detectedFormat][0]!,
    bytes: buffer.byteLength,
    safeFilename,
    width,
    height,
  };
}
