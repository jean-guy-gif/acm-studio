'use server';

import { revalidatePath } from 'next/cache';

import { extractPdfImages } from '@/features/subject-property-import/services/extract-pdf-images';
import { extractPdfText } from '@/features/subject-property-import/services/extract-pdf-text';
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

function readBrochureFile(formData: FormData): File | null {
  const entry = formData.get('brochure');
  return entry instanceof File && entry.size > 0 ? entry : null;
}

// Reads the seller's own commercial brochure (PDF) and returns the pre-fill for the
// property / diagnostics / condominium forms. The PDF is DATA — parsed, never
// executed — and the read price is INFORMATION only (it never lands in a field and
// never pre-fills the advisor's range: CLAUDE.md, and here it is the advisor's own
// agency price). Requires a signed-in advisor; writes nothing.
export async function parseBrochurePdf(formData: FormData): Promise<ParseBrochureResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const file = readBrochureFile(formData);
  if (!file) {
    return { ok: false, error: 'Choisissez un fichier PDF.' };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = await extractPdfText(bytes);
  if (!text.ok) {
    return { ok: false, error: text.error };
  }

  const fields = parseAgencyBrochure(text.pages);
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
// l'import d'annonce (mission 38), la récupération des images de la fiche ne se
// fait qu'au CLIC EXPLICITE du conseiller. `projectId` est lié côté serveur.
//
// Les images du PDF sont décodées puis ré-encodées en PNG et déposées via
// depositPropertyPhoto (mission 37), avec EXACTEMENT les mêmes validations qu'un
// téléversement manuel. Elles s'AJOUTENT aux photos existantes, dans la limite de
// nombre. Une image qui échoue n'interrompt pas les autres ; si l'écriture finale
// échoue, les fichiers déposés sont retirés (aucun orphelin).
export async function depositBrochurePhotos(
  projectId: string,
  formData: FormData,
): Promise<DepositBrochureResult> {
  const context = await loadPropertyPhotosContext(projectId);
  if (!context.ok) {
    return { ok: false, error: context.error };
  }
  const file = readBrochureFile(formData);
  if (!file) {
    return { ok: false, error: 'Choisissez un fichier PDF.' };
  }

  const { supabase, agencyId, currentPaths } = context;
  const remaining = MAX_PROPERTY_PHOTOS - currentPaths.length;
  if (remaining <= 0) {
    return { ok: false, error: `Maximum ${MAX_PROPERTY_PHOTOS} photos atteint.` };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extracted = await extractPdfImages(bytes);
  if (!extracted.ok) {
    return { ok: false, error: extracted.error };
  }

  const depositedPaths: string[] = [];
  let failed = 0;
  for (const image of extracted.images.slice(0, remaining)) {
    const validation = validatePhotoBytes(image.bytes);
    if (!validation.ok) {
      failed += 1;
      continue;
    }
    const deposit = await depositPropertyPhoto(supabase, {
      agencyId,
      projectId,
      bytes: image.bytes,
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
