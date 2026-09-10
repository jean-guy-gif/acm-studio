// Mission 42/43 — importing the seller's own commercial brochure (PDF). Since
// Mission 43 the PDF is read in the advisor's BROWSER (pdfjs as a browser library);
// only the extracted text and the re-encoded photos reach the server. These bounds
// guard the browser side before reading, and the server side on what it receives.

// Client-side: refuse an oversized file before handing it to pdfjs. The fixtures
// weigh 3–4 MB / 10–13 pages; the caps leave room for larger sheets without
// inviting a decompression bomb.
export const MAX_BROCHURE_BYTES = 20 * 1024 * 1024; // 20 MiB
export const MAX_BROCHURE_PAGES = 40;

// Server-side: the received text is DATA and must be bounded. A real fiche is a few
// kilobytes of text; this leaves generous room while refusing an abusive payload.
export const MAX_BROCHURE_TEXT_BYTES = 1 * 1024 * 1024; // 1 MiB

// Embedded-image filter. Real photos are ~1024 px; the agency logo is 512 px and
// the DPE/GES vignettes ~311 px, so a 600 px floor on the larger side keeps the
// photos and drops the furniture. The count is bounded by the property photo cap
// (Mission 37) at the deposit step.
export const MIN_BROCHURE_IMAGE_DIMENSION = 600;

// Photos are re-encoded to JPEG in the browser via canvas.toBlob (they are photos
// shown in a full-screen gallery, not screenshots). 0.82 is the usual sweet spot:
// no visible loss, far lighter than a lossless PNG.
export const BROCHURE_JPEG_QUALITY = 0.82;
