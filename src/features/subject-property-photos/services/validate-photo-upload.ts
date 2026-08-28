import { MAX_PHOTO_BYTES, type ImageFormat } from '@/features/subject-property-photos/constants';

// Pure, deterministic file validation. The image type is decided from the file's
// MAGIC BYTES, never from its name/extension — a `.jpg` that is really a PDF (or
// an SVG carrying a script) is rejected. No I/O here so it is fully unit-tested.

// Detects jpeg / png / webp from the leading bytes. Returns null for anything
// else (gif, bmp, svg, pdf, html, empty…).
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }
  // WEBP: "RIFF" ???? "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

export type PhotoValidation = { ok: true; format: ImageFormat } | { ok: false; error: string };

// Validates a single photo from its raw bytes: non-empty, within the size bound,
// and a supported image format (by magic bytes). The count bound is enforced by
// the caller, which alone knows how many photos the project already holds.
export function validatePhotoBytes(bytes: Uint8Array): PhotoValidation {
  if (bytes.length === 0) {
    return { ok: false, error: 'Fichier vide.' };
  }
  if (bytes.length > MAX_PHOTO_BYTES) {
    const maxMo = Math.floor(MAX_PHOTO_BYTES / (1024 * 1024));
    return { ok: false, error: `Photo trop volumineuse (max ${maxMo} Mo).` };
  }
  const format = sniffImageFormat(bytes);
  if (format === null) {
    return { ok: false, error: 'Format non supporté. Utilisez une image JPEG, PNG ou WebP.' };
  }
  return { ok: true, format };
}
