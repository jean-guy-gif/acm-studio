// Mission 42 — importing the seller's own commercial brochure (PDF). Bounds are
// applied BEFORE the file is parsed: a serverless function must never be handed an
// unbounded document. The fixtures weigh 3–4 MB / 10–13 pages; the caps leave room
// for larger agency sheets without inviting a decompression bomb.
export const MAX_BROCHURE_BYTES = 20 * 1024 * 1024; // 20 MiB
export const MAX_BROCHURE_PAGES = 40;

// Embedded-image filter (Mission 42). Real photos are ~1024 px; the agency logo is
// 512 px and the DPE/GES vignettes ~311 px, so a 600 px floor on the larger side
// keeps the photos and drops the furniture. The count is bounded by the property
// photo cap (Mission 37) at the deposit step.
export const MIN_BROCHURE_IMAGE_DIMENSION = 600;

// Recovered brochure photos are re-encoded to JPEG (they are photos, shown in a
// full-screen gallery, not screenshots). 82 is the usual sweet spot: no visible
// loss, ~10× lighter than a lossless PNG.
export const BROCHURE_JPEG_QUALITY = 82;

// A PDF starts with "%PDF-" (25 50 44 46 2D). Checked on the raw bytes before we
// hand anything to the parser — the file is DATA, never an instruction.
export const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
