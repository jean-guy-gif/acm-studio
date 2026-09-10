'use server';

import { revalidatePath } from 'next/cache';

import { MAX_BROCHURE_TEXT_BYTES } from '@/features/subject-property-import/constants';
import { mapBrochureToProperty } from '@/features/subject-property-import/services/map-brochure-to-property';
import { parseAgencyBrochure } from '@/features/subject-property-import/services/parse-agency-brochure';
import type { BrochureImport } from '@/features/subject-property-import/types';
import { MAX_PROPERTY_PHOTOS } from '@/features/subject-property-photos/constants';
import {
  loadPropertyPhotosContext,
  writePropertyPhotoPaths,
} from '@/features/subject-property-photos/services/load-property-photos-context';
import {
  depositPropertyPhoto,
  removePropertyPhotos,
} from '@/features/subject-property-photos/services/property-photo-storage';
import { validatePhotoBytes } from '@/features/subject-property-photos/services/validate-photo-upload';
import { getProfile } from '@/lib/auth/get-profile';

export type ParseBrochureResult = { ok: true; data: BrochureImport } | { ok: false; error: string };

export type DepositBrochureResult =
  { ok: true; deposited: number; failed: number } | { ok: false; error: string };

// Since Mission 43 the PDF is read in the advisor's BROWSER; the server receives
// only the extracted TEXT (a few kilobytes). The parser and mapper are unchanged —
// the value of Mission 42 is preserved. Never trust the client: the text is DATA
// (never executed, never re-injected as HTML) and its size is bounded here.
//
// GUARDRAIL (CLAUDE.md): the read price is INFORMATION only — it never lands in a
// field and never pre-fills the advisor's range. Here it is the advisor's own agency
// price, so the temptation is highest.
export async function parseBrochureText(pages: string[]): Promise<ParseBrochureResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  if (!Array.isArray(pages) || pages.length === 0) {
    return { ok: false, error: 'Aucun texte n’a pu être lu dans ce PDF.' };
  }
  const safePages = pages.map((page) => (typeof page === 'string' ? page : ''));
  const totalBytes = safePages.reduce((sum, page) => sum + Buffer.byteLength(page, 'utf8'), 0);
  if (totalBytes > MAX_BROCHURE_TEXT_BYTES) {
    return { ok: false, error: 'Le contenu du PDF est trop volumineux.' };
  }

  const fields = parseAgencyBrochure(safePages);
  const data = mapBrochureToProperty(fields);
  if (data.found.length === 0) {
    return {
      ok: false,
      error:
        'Aucune information reconnue dans ce PDF. L’outil lit les fiches de votre logiciel ; si la vôtre vient d’un autre, envoyez-la nous et on l’ajoute.',
    };
  }
  return { ok: true, data };
}

// PRODUCT DECISION — NE JAMAIS copier les photos automatiquement. Comme pour
// l'import d'annonce (mission 38), la récupération ne se fait qu'au CLIC EXPLICITE
// du conseiller. `projectId` est lié côté serveur.
//
// Depuis la mission 43, les images sont décodées et ré-encodées en JPEG dans le
// navigateur (canvas.toBlob) ; le serveur reçoit des fichiers image. Chaque fichier
// est REVALIDÉ par validatePhotoBytes — octets magiques, format, taille — EXACTEMENT
// comme un téléversement manuel, car on ne fait jamais confiance au client. Les
// photos s'AJOUTENT aux existantes, dans la limite de nombre. Une image qui échoue
// n'interrompt pas les autres ; si l'écriture finale échoue, les fichiers déposés
// sont retirés (aucun orphelin).
export async function depositBrochurePhotos(
  projectId: string,
  formData: FormData,
): Promise<DepositBrochureResult> {
  const context = await loadPropertyPhotosContext(projectId);
  if (!context.ok) {
    return { ok: false, error: context.error };
  }

  const files = formData.getAll('photos').filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return { ok: false, error: 'Aucune photo à récupérer.' };
  }

  const { supabase, agencyId, currentPaths } = context;
  const remaining = MAX_PROPERTY_PHOTOS - currentPaths.length;
  if (remaining <= 0) {
    return { ok: false, error: `Maximum ${MAX_PROPERTY_PHOTOS} photos atteint.` };
  }

  const depositedPaths: string[] = [];
  let failed = 0;
  for (const file of files.slice(0, remaining)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validatePhotoBytes(bytes);
    if (!validation.ok) {
      failed += 1;
      continue;
    }
    const deposit = await depositPropertyPhoto(supabase, {
      agencyId,
      projectId,
      bytes,
      format: validation.format,
    });
    if (deposit.ok) {
      depositedPaths.push(deposit.path);
    } else {
      failed += 1;
    }
  }

  if (depositedPaths.length === 0) {
    return { ok: true, deposited: 0, failed };
  }

  const written = await writePropertyPhotoPaths(supabase, {
    projectId,
    agencyId,
    paths: [...currentPaths, ...depositedPaths],
  });
  if (!written.ok) {
    await removePropertyPhotos(supabase, depositedPaths);
    return { ok: false, error: 'L’enregistrement des photos a échoué.' };
  }

  revalidatePath(`/builder/${projectId}/property`);
  return { ok: true, deposited: depositedPaths.length, failed };
}
