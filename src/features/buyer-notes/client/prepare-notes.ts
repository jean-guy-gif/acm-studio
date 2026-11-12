'use client';

import { readBrochurePages } from '@/features/subject-property-import/services/read-brochure-pdf';

// Mission 151 — ce que le navigateur prépare avant la lecture, pour que rien de trop lourd ne
// parte (Vercel refuse un corps de plus de 4,5 Mo) et que le serveur reçoive ce que le modèle lit :
//   - une photo ou une capture : réduite à 1 600 px, en JPEG ; une photo d'iPhone (HEIC) est
//     convertie ici quand le navigateur sait la lire (Safari, sur iPhone, iPad et Mac) ;
//   - un PDF : son texte, lu ici (M43) ; s'il n'en a pas (PDF scanné), ses pages en images ;
//   - 3 images au plus (décision de Jean-Guy, 12/11).
// Rien n'est gardé : les fichiers vivent dans la mémoire de l'onglet le temps de la lecture.

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.85;
export const MAX_NOTE_IMAGES = 3;
const MIN_PDF_TEXT = 40;

export type PreparedNotes =
  | { ok: true; kind: 'photo' | 'file' | 'text'; text: string | null; images: Blob[] }
  | { ok: false; reason: 'heic' | 'unsupported' | 'too_many' | 'empty' };

const looksHeic = (file: File) => /hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type);

async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', JPEG_QUALITY),
  );
}

function scaledCanvas(width: number, height: number): HTMLCanvasElement {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  return canvas;
}

// Une image → un JPEG réduit ; les métadonnées (EXIF, position) ne passent pas le canevas.
async function imageToJpeg(file: File): Promise<Blob | 'heic' | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return looksHeic(file) ? 'heic' : null;
  }
  const canvas = scaledCanvas(bitmap.width, bitmap.height);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToJpeg(canvas);
}

async function pdfPagesToJpeg(file: File): Promise<Blob[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    isEvalSupported: false,
  }).promise;
  try {
    const images: Blob[] = [];
    for (let number = 1; number <= Math.min(doc.numPages, MAX_NOTE_IMAGES); number += 1) {
      const page = await doc.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const scale = MAX_SIDE / Math.max(base.width, base.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) continue;
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await canvasToJpeg(canvas);
      if (blob) images.push(blob);
      page.cleanup();
    }
    return images;
  } finally {
    await doc.destroy();
  }
}

export async function prepareFiles(kind: 'photo' | 'file', files: File[]): Promise<PreparedNotes> {
  if (files.length === 0) return { ok: false, reason: 'empty' };
  const pdfs = files.filter((file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
  if (pdfs.length > 0) {
    if (files.length > 1) return { ok: false, reason: 'too_many' };
    try {
      const text = (await readBrochurePages(pdfs[0])).join('\n\n').trim();
      if (text.length >= MIN_PDF_TEXT) return { ok: true, kind, text, images: [] };
      const images = await pdfPagesToJpeg(pdfs[0]);
      return images.length > 0
        ? { ok: true, kind, text: null, images }
        : { ok: false, reason: 'unsupported' };
    } catch {
      return { ok: false, reason: 'unsupported' };
    }
  }
  if (files.length > MAX_NOTE_IMAGES) return { ok: false, reason: 'too_many' };
  const images: Blob[] = [];
  for (const file of files) {
    const jpeg = await imageToJpeg(file);
    if (jpeg === 'heic') return { ok: false, reason: 'heic' };
    if (!jpeg) return { ok: false, reason: 'unsupported' };
    images.push(jpeg);
  }
  return { ok: true, kind, text: null, images };
}
