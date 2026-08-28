import { describe, expect, it } from 'vitest';

import { MAX_PHOTO_BYTES } from '@/features/subject-property-photos/constants';
import {
  sniffImageFormat,
  validatePhotoBytes,
} from '@/features/subject-property-photos/services/validate-photo-upload';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe('sniffImageFormat', () => {
  it('detects jpeg / png / webp from magic bytes', () => {
    expect(sniffImageFormat(JPEG)).toBe('jpeg');
    expect(sniffImageFormat(PNG)).toBe('png');
    expect(sniffImageFormat(WEBP)).toBe('webp');
  });

  it('rejects unsupported formats (gif, svg, pdf, html, empty)', () => {
    expect(sniffImageFormat(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull(); // GIF8
    expect(sniffImageFormat(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toBeNull(); // <svg
    expect(sniffImageFormat(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // %PDF
    expect(sniffImageFormat(new Uint8Array([0x3c, 0x21, 0x44, 0x4f]))).toBeNull(); // <!DO
    expect(sniffImageFormat(new Uint8Array([]))).toBeNull();
  });

  it('does not trust the extension: bytes decide, not the name', () => {
    // A PDF renamed "photo.jpg" still sniffs as null → refused downstream.
    const fakeJpg = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(sniffImageFormat(fakeJpg)).toBeNull();
  });
});

describe('validatePhotoBytes', () => {
  it('accepts a valid image and returns its format', () => {
    expect(validatePhotoBytes(JPEG)).toEqual({ ok: true, format: 'jpeg' });
    expect(validatePhotoBytes(PNG)).toEqual({ ok: true, format: 'png' });
    expect(validatePhotoBytes(WEBP)).toEqual({ ok: true, format: 'webp' });
  });

  it('refuses an empty file', () => {
    const result = validatePhotoBytes(new Uint8Array([]));
    expect(result.ok).toBe(false);
  });

  it('refuses a file above the size bound', () => {
    const tooBig = new Uint8Array(MAX_PHOTO_BYTES + 1);
    tooBig.set(JPEG, 0); // valid magic bytes, but oversized
    const result = validatePhotoBytes(tooBig);
    expect(result.ok).toBe(false);
  });

  it('refuses an unsupported format', () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const result = validatePhotoBytes(gif);
    expect(result.ok).toBe(false);
  });
});
