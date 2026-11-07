'use server';

import { spokenLanguage } from '@/lib/client-language';
import { clientTexts, textLanguage } from '@/lib/client-texts';
import {
  TEMPLATES,
  propertyKind,
  visitBuyerMessage,
  visitSellerMessage,
} from '@/features/buyer-messages/messages';
import { toVisitRequest } from '@/features/buyer-presentation/services/visit-request-row';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 139 — après « Visite faite », les deux messages prêts, modifiables à l'écran : à
// l'acquéreur, dans sa langue (aux coordonnées de sa fiche) ; au vendeur, pour un bien de l'agence
// seulement, en français (aux coordonnées du dossier), sans le nom de l'acquéreur. L'outil n'envoie
// rien ; tout est relu ici, dans l'agence de l'appelant.

export type VisitMessage = {
  message: string;
  phone: string | null;
  email: string | null;
  // L'objet de l'e-mail, dans la langue du destinataire.
  subject: string;
};
export type PreparedVisitMessages =
  { ok: true; buyer: VisitMessage; seller: VisitMessage | null } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Le libellé neutre (« Maison · 5 pièces · 140 m² · Mougins ») : le type en tête, la commune en
// dernier — jamais un titre ni une adresse (M107).
function propertyOfLabel(label: string): {
  kind: ReturnType<typeof propertyKind>;
  city: string | null;
} {
  const parts = label
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
  const last = parts.length > 1 ? parts[parts.length - 1]! : null;
  return {
    kind: propertyKind(parts[0]),
    // Une commune ne commence pas par un chiffre (« 140 m² », « 5 pièces »).
    city: last && !/^\d/.test(last) ? last : null,
  };
}

export async function prepareVisitMessages(requestId: unknown): Promise<PreparedVisitMessages> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (typeof requestId !== 'string' || !UUID.test(requestId)) {
    return { ok: false, error: 'Visite introuvable.' };
  }
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from('buyer_visit_requests')
    .select(
      '*, buyers!inner(name, language, phone, email, archived_at), buyer_selection_items!inner(label, source, reference)',
    )
    .eq('id', requestId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!data) return { ok: false, error: 'Visite introuvable.' };
  const visit = toVisitRequest(data);
  const buyer = data.buyers as unknown as {
    name: string;
    language: string;
    phone: string | null;
    email: string | null;
    archived_at: string | null;
  };
  const item = data.buyer_selection_items as unknown as {
    label: string;
    source: string;
    reference: string;
  };
  if (buyer.archived_at || !visit.visitedAt || !visit.report || !visit.report.nextStep) {
    return { ok: false, error: 'Le compte rendu de cette visite n’est pas encore noté.' };
  }
  const report = { ...visit.report, nextStep: visit.report.nextStep };
  const buyerMessage: VisitMessage = {
    message: visitBuyerMessage({
      language: spokenLanguage(buyer.language),
      buyerName: buyer.name,
      property: propertyOfLabel(item.label),
      visitedAt: visit.visitedAt,
      report,
      advisorFirstName: profile.first_name,
    }),
    phone: buyer.phone,
    email: buyer.email,
    subject: TEMPLATES[spokenLanguage(buyer.language)].subjects.visit,
  };
  // Le vendeur : un bien de l'agence (son dossier), jamais un concurrent ni une annonce.
  let seller: VisitMessage | null = null;
  if (item.source === 'project' && UUID.test(item.reference)) {
    const { data: project } = await admin
      .from('projects')
      .select('seller_name, seller_phone, seller_email, language')
      .eq('id', item.reference)
      .eq('agency_id', profile.agency_id)
      // Un dossier supprimé (archivé, M93) ne reçoit plus rien.
      .neq('status', 'archived')
      .maybeSingle();
    if (project) {
      seller = {
        message: visitSellerMessage({
          sellerName: project.seller_name,
          visitedAt: visit.visitedAt,
          report,
          advisorFirstName: profile.first_name,
          language: textLanguage(spokenLanguage(project.language)),
        }),
        phone: project.seller_phone,
        email: project.seller_email,
        subject: clientTexts(spokenLanguage(project.language)).sellerVisit.subject,
      };
    }
  }
  return { ok: true, buyer: buyerMessage, seller };
}
