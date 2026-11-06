'use server';

import { revalidatePath } from 'next/cache';

import { propertyPhrase } from '@/features/buyers/services/loop-properties';
import { hashDossierToken, newDossierToken } from '@/features/buyer-dossier/services/dossier-token';
import {
  offerAnswerBuyerMessage,
  offerNotaryMessage,
  type OfferDecision,
} from '@/features/purchase-offer/services/offer-answer';
import { readOfferFields } from '@/features/purchase-offer/services/offer-input';
import { offerPath } from '@/features/purchase-offer/services/offer-link';
import { getProfile } from '@/lib/auth/get-profile';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 138 — donner suite à la réponse du vendeur, depuis « À faire aujourd'hui » : le message à
// l'acquéreur (acceptée : avec un lien neuf vers sa copie, qui montre l'acceptation), le message au
// notaire (acceptée seulement : le troisième lien, à part, qui ne remplace jamais ceux des offrants
// et du vendeur), et « Fait », qui ferme la tâche. L'outil n'envoie rien ; chaque appel relit
// l'offre, son agence et sa réponse au serveur.

export type PreparedOfferMessage =
  | { ok: true; message: string; phone: string | null; email: string | null }
  | { ok: false; error: string };

const GONE = 'Offre introuvable.';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Admin = ReturnType<typeof createServiceRoleClient>;

async function readAnsweredOffer(admin: Admin, agencyId: string, documentId: unknown) {
  if (typeof documentId !== 'string' || !UUID.test(documentId)) return null;
  const { data } = await admin
    .from('buyer_documents')
    .select(
      'id, fields, buyers(name, email, phone, archived_at), buyer_document_acceptances(decision, decided_at)',
    )
    .eq('id', documentId)
    .eq('agency_id', agencyId)
    .eq('kind', 'purchase_offer')
    .maybeSingle();
  if (!data) return null;
  const answers = data.buyer_document_acceptances as unknown as
    { decision: string; decided_at: string }[] | { decision: string; decided_at: string } | null;
  const answer = Array.isArray(answers) ? answers[0] : answers;
  if (!answer || (answer.decision !== 'accepted' && answer.decision !== 'refused')) return null;
  const fields = readOfferFields(data.fields);
  if (!fields) return null;
  const buyer = data.buyers as unknown as {
    name: string;
    email: string | null;
    phone: string | null;
    archived_at: string | null;
  } | null;
  return {
    id: data.id,
    fields,
    buyer: buyer && !buyer.archived_at ? buyer : null,
    decision: answer.decision as OfferDecision,
    decidedAt: answer.decided_at,
  };
}

async function createLink(
  admin: Admin,
  agencyId: string,
  documentId: string,
  createdBy: string,
  audience: 'visitor' | 'notary',
): Promise<string | null> {
  const token = newDossierToken();
  const { error } = await admin.from('buyer_document_links').insert({
    agency_id: agencyId,
    document_id: documentId,
    created_by: createdBy,
    token_hash: hashDossierToken(token),
    audience,
  });
  if (error) {
    await reportServerError('offerAnswerLink', error);
    return null;
  }
  return offerPath(token);
}

// « la maison de Mougins », lu sur le bien vendeur du dossier ; sinon l'adresse de l'offre.
async function propertyOf(
  admin: Admin,
  agencyId: string,
  projectId: string,
  propertyAddress: string,
): Promise<string> {
  const { data } = await admin
    .from('subject_properties')
    .select('property_type, city')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!data) return `le bien situé ${propertyAddress}`;
  return propertyPhrase({ propertyType: data.property_type, city: data.city });
}

export async function prepareOfferBuyerMessage(
  documentId: unknown,
  origin: unknown,
): Promise<PreparedOfferMessage> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  const admin = createServiceRoleClient();
  const offer = await readAnsweredOffer(admin, profile.agency_id, documentId);
  if (!offer || !offer.buyer) return { ok: false, error: GONE };
  let url: string | null = null;
  if (offer.decision === 'accepted') {
    const path = await createLink(admin, profile.agency_id, offer.id, profile.id, 'visitor');
    if (!path) return { ok: false, error: 'Le lien n’a pas pu être créé. Réessayez.' };
    url = `${typeof origin === 'string' && /^https?:\/\/[^/\s]+$/.test(origin) ? origin : ''}${path}`;
  }
  return {
    ok: true,
    message: offerAnswerBuyerMessage({
      decision: offer.decision,
      buyerName: offer.buyer.name,
      property: await propertyOf(
        admin,
        profile.agency_id,
        offer.fields.projectId,
        offer.fields.propertyAddress,
      ),
      decidedAt: offer.decidedAt,
      url,
      advisorFirstName: profile.first_name,
    }),
    phone: offer.buyer.phone,
    email: offer.buyer.email,
  };
}

export async function prepareOfferNotaryMessage(
  documentId: unknown,
  origin: unknown,
): Promise<PreparedOfferMessage> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  const admin = createServiceRoleClient();
  const offer = await readAnsweredOffer(admin, profile.agency_id, documentId);
  if (!offer || !offer.buyer) return { ok: false, error: GONE };
  if (offer.decision !== 'accepted') {
    return { ok: false, error: 'Seule une offre acceptée se transmet au notaire.' };
  }
  const path = await createLink(admin, profile.agency_id, offer.id, profile.id, 'notary');
  if (!path) return { ok: false, error: 'Le lien n’a pas pu être créé. Réessayez.' };
  const base = typeof origin === 'string' && /^https?:\/\/[^/\s]+$/.test(origin) ? origin : '';
  return {
    ok: true,
    message: offerNotaryMessage({
      propertyAddress: offer.fields.propertyAddress,
      mandateNumber: offer.fields.mandateNumber || null,
      url: `${base}${path}`,
      advisor: {
        name: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
        phone: profile.phone,
      },
      agencyName: offer.fields.cover.agencyName || null,
    }),
    // Le notaire n'est pas connu de l'outil : ni numéro ni adresse.
    phone: null,
    email: null,
  };
}

export type MarkOfferAnswerDoneResult = { ok: true } | { ok: false; error: string };

export async function markOfferAnswerDone(documentId: unknown): Promise<MarkOfferAnswerDoneResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  const admin = createServiceRoleClient();
  const offer = await readAnsweredOffer(admin, profile.agency_id, documentId);
  if (!offer) return { ok: false, error: GONE };
  const { error } = await admin.from('buyer_offer_follow_ups').insert({
    agency_id: profile.agency_id,
    document_id: offer.id,
    done_by: profile.id,
  });
  // Déjà fait (un second clic, un collègue) : la tâche est fermée, c'est ce qui était demandé.
  if (error && error.code !== '23505') {
    await reportServerError('markOfferAnswerDone', error);
    return { ok: false, error: 'Ce n’a pas pu être noté. Réessayez.' };
  }
  revalidatePath('/suivi');
  return { ok: true };
}
