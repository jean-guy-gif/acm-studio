// Subject-property photos — shared constants. The seller's own photos are real
// FILES uploaded to a PRIVATE Supabase Storage bucket (the first upload of the
// repo). Competitor photos, by contrast, are remote portal URLs — a different
// mechanism entirely, not reused here.

export const PROPERTY_PHOTO_BUCKET = 'project-photos';

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export const ALLOWED_IMAGE_FORMATS: readonly ImageFormat[] = ['jpeg', 'png', 'webp'];

// The stored file extension per detected format (detected from bytes, never from
// the uploaded file name).
export const IMAGE_EXTENSION: Record<ImageFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

export const IMAGE_CONTENT_TYPE: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

// Hard bounds. A photo above the size, or a project above the count, is refused.
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MiB per photo
export const MAX_PROPERTY_PHOTOS = 20;

// Short-lived signed URLs, regenerated server-side at every render.
export const SIGNED_URL_TTL_SECONDS = 60 * 30; // 30 minutes
