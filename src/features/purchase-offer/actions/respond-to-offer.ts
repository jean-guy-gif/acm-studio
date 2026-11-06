'use server';

import { randomUUID } from 'node:crypto';

import { findOfferByToken } from '@/features/purchase-offer/queries/load-offer';
import { offerResponseSchema } from '@/features/purchase-offer/services/offer-input';
import { parisDateLabel } from '@/features/visit-voucher/services/voucher-fields';
import { decodeSignature } from '@/features/visit-voucher/services/voucher-input';
import { SIGNATURE_BUCKET } from '@/features/visit-voucher/services/voucher-link';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type RespondToOfferResult = { ok: true } | { ok: false; error: string };

const GONE = 'Ce lien n’est plus valable.';
const FAILED = 'Votre réponse n’a pas pu être enregistrée. Réessayez.';

const parisToday = (): string => {
  const [day, month, year] = parisDateLabel(new Date()).split('/');
  return `${year}-${month}-${day}`;
};

// Mission 137 (partie B) — le vendeur répond à l'offre, par SON lien, sans compte : « Bon pour
// acceptation », signé au doigt par chaque propriétaire (deux au plus), ou « Je refuse ». Le jeton est
// relu ici (forme, condensat, 30 jours, lien du vendeur), l'offre doit être encore valable (jour de
// Paris) et sans réponse ; la base date la réponse et n'en accepte qu'une.
export async function respondToOffer(token: unknown, raw: unknown): Promise<RespondToOfferResult> {
  if (typeof token !== 'string') return { ok: false, error: GONE };
  const admin = createServiceRoleClient();
  const found = await findOfferByToken(admin, token);
  if (!found || found.audience !== 'seller') return { ok: false, error: GONE };
  const { offer } = found;
  if (offer.answer) return { ok: false, error: 'Une réponse a déjà été donnée à cette offre.' };
  if (offer.validUntil < parisToday()) {
    return { ok: false, error: 'Cette offre n’est plus valable : sa date de validité est passée.' };
  }
  const parsed = offerResponseSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: 'Indiquez le nom de chaque signataire et signez.' };
  const response = parsed.data;
  if (response.decision === 'refused') {
    const { error } = await admin.from('buyer_document_acceptances').insert({
      agency_id: offer.agencyId,
      document_id: offer.id,
      decision: 'refused',
    });
    if (error) {
      await reportServerError('respondToOffer', error);
      return { ok: false, error: FAILED };
    }
    return { ok: true };
  }
  if (response.signatures.length !== response.signers.length) {
    return { ok: false, error: 'Chaque signataire signe : une signature par nom.' };
  }
  const signatures = response.signatures.map(decodeSignature);
  if (signatures.some((bytes) => bytes == null)) {
    return { ok: false, error: 'Une signature n’a pas pu être lue : signez de nouveau.' };
  }
  const folder = randomUUID();
  const paths = signatures.map(
    (_, index) => `${offer.agencyId}/${offer.id}/vendeur-${folder}-${index + 1}.png`,
  );
  for (const [index, bytes] of signatures.entries()) {
    const { error } = await admin.storage
      .from(SIGNATURE_BUCKET)
      .upload(paths[index]!, bytes!, { contentType: 'image/png', upsert: false });
    if (error) {
      await reportServerError('respondToOffer', error);
      await admin.storage.from(SIGNATURE_BUCKET).remove(paths.slice(0, index));
      return { ok: false, error: FAILED };
    }
  }
  const { error } = await admin.from('buyer_document_acceptances').insert({
    agency_id: offer.agencyId,
    document_id: offer.id,
    decision: 'accepted',
    signer_names: response.signers,
    signature_paths: paths,
  });
  if (error) {
    await reportServerError('respondToOffer', error);
    await admin.storage.from(SIGNATURE_BUCKET).remove(paths);
    return { ok: false, error: FAILED };
  }
  return { ok: true };
}
