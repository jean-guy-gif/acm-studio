import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { brandingCssVariables } from '@/features/branding/services/branding-css';
import { brandingFontDeclarations } from '@/features/branding/services/branding-typography';
import { buildBuyerDossier } from '@/features/buyer-dossier/services/build-buyer-dossier';
import { chooseDossierAdvisor } from '@/features/buyer-dossier/services/dossier-advisor';
import type { BuyerDossier } from '@/features/buyer-dossier/types';
import { computeDeck } from '@/features/buyer-deck/queries/load-deck';
import { deckForReading } from '@/features/buyer-deck/services/frozen-deck';
import { toItemResponse } from '@/features/buyer-deck/services/response-row';
import { AVAILABILITY_SLOTS } from '@/features/buyer-deck/types';
import {
  toVisitRequest,
  isPendingVisit,
} from '@/features/buyer-presentation/services/visit-request-row';
import { toBuyer } from '@/features/buyers/services/buyer-row';
import { toSelection } from '@/features/ideal-properties/services/ideal-selection';
import { buildQrCode } from '@/features/contact-card/services/qr-code';
import { buildVCard } from '@/features/contact-card/services/vcard';
import { signPropertyPhotos } from '@/features/subject-property-photos/services/property-photo-storage';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

const BRANDING_BUCKET = 'agency-branding';
const PHOTO_URL_TTL_SECONDS = 60 * 60;

// Mission 119 (partie B) — le dossier acquéreur, lu par LISTES DE COLONNES AUTORISÉES, cadré sur la
// fiche ET son agence ; les biens passent par le chargement de la présentation (M119 A : ni titre,
// ni adresse, ni lien, ni vendeur ; le prix d'un bien de l'agence selon la règle du 24/10). Sert à
// l'écran du conseiller (son client, RLS) et à la page publique du lien (clé de service, après
// vérification du jeton, sur la sélection du lien). null : fiche archivée, d'une autre agence, ou
// sans sélection. Mission 122 (partie B) — le dossier suit le déroulé de la présentation (M122 A).
// Le conseiller imprimé est celui de la fiche ; s'il est un membre retiré, c'est le
// conseiller connecté — ou, sur le lien, celui qui l'a créé — (décision de Jean-Guy, 25/10).
export async function loadBuyerDossier(
  supabase: Client,
  buyerId: string,
  agencyId: string,
  selectionId: string | null = null,
  connectedAdvisorId: string | null = null,
): Promise<BuyerDossier | null> {
  const { data: buyerRow } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', buyerId)
    .eq('agency_id', agencyId)
    .is('archived_at', null)
    .maybeSingle();
  if (!buyerRow) return null;
  const buyer = toBuyer(buyerRow);

  let selectionQuery = supabase
    .from('buyer_selections')
    .select('*')
    .eq('buyer_id', buyerId)
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (selectionId) selectionQuery = selectionQuery.eq('id', selectionId);
  const { data: selectionRow } = await selectionQuery.maybeSingle();
  if (!selectionRow) return null;
  const { data: itemRows } = await supabase
    .from('buyer_selection_items')
    .select('*')
    .eq('selection_id', selectionRow.id)
    .eq('agency_id', agencyId)
    .order('position');
  const selection = toSelection(selectionRow, itemRows ?? []);
  if (selection.items.length === 0) return null;

  const advisorIds = [
    ...new Set([buyer.advisorId, connectedAdvisorId].filter(Boolean)),
  ] as string[];
  const itemIds = selection.items.map((item) => item.id);
  const [computed, { data: requestRows }, { data: responseRows }, agency, branding, advisorRows] =
    await Promise.all([
      computeDeck(supabase, buyer, selection, agencyId),
      supabase
        .from('buyer_visit_requests')
        .select('*')
        .eq('agency_id', agencyId)
        .in('buyer_selection_item_id', itemIds),
      supabase
        .from('buyer_item_responses')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('answered_during', 'dossier')
        .in('selection_item_id', itemIds),
      supabase.from('agencies').select('name').eq('id', agencyId).maybeSingle(),
      supabase
        .from('agency_branding')
        .select(
          'brand, brand_deep, brand_soft, brand_darker, brand_darkest, on_brand_text, font_family, validated_at, logo_light_path, postal_address, professional_card, professional_card_issuer, financial_guarantee, document_name',
        )
        .eq('agency_id', agencyId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, email, photo_path, removed_at')
        .eq('agency_id', agencyId)
        .in('id', advisorIds),
    ]);
  const profiles = advisorRows.data ?? [];
  const advisor = {
    data: chooseDossierAdvisor(
      profiles.find((row) => row.id === buyer.advisorId) ?? null,
      profiles.find((row) => row.id === connectedAdvisorId) ?? null,
    ),
  };
  const hidden = new Map((itemRows ?? []).map((row) => [row.id, row.dossier_hide_photo]));
  // Mission 122 (partie B) — le déroulé tel qu'affiché : figé à « Terminer » s'il l'a été (M122 A).
  const deck = deckForReading({
    presentedAt: selection.presentedAt,
    presentedDeck: selection.presentedDeck,
    computed,
  });
  // Sa réponse déjà envoyée depuis le lien, et les créneaux portés par ses demandes vivantes.
  const answers = (responseRows ?? []).map(toItemResponse);
  const toVisit = new Set(
    answers.filter((answer) => answer.answer === 'visit').map((answer) => answer.itemId),
  );
  const availability = AVAILABILITY_SLOTS.filter((slot) =>
    (requestRows ?? [])
      .map(toVisitRequest)
      .filter((request) => isPendingVisit(request) && toVisit.has(request.itemId))
      .some((request) => request.availability.includes(slot)),
  );

  const advisorPhotoPath = advisor.data?.photo_path?.startsWith(`${agencyId}/`)
    ? advisor.data.photo_path
    : null;
  const advisorPhoto = advisorPhotoPath
    ? await signPropertyPhotos(supabase, [advisorPhotoPath], PHOTO_URL_TTL_SECONDS)
    : [];
  const brand = branding.data;
  const agencyName = brand?.document_name?.trim() || agency.data?.name || '';
  const advisorName =
    [advisor.data?.first_name, advisor.data?.last_name].filter(Boolean).join(' ').trim() || null;
  const logoPath = brand?.logo_light_path ?? null;

  return buildBuyerDossier({
    buyerId: buyer.id,
    selectionId: selection.id,
    selectedAt: selection.createdAt,
    sector: buyer.cities.join(', '),
    deck,
    hidden,
    answers,
    availability,
    agency: {
      name: agencyName,
      logoUrl: logoPath
        ? supabase.storage.from(BRANDING_BUCKET).getPublicUrl(logoPath).data.publicUrl
        : null,
      postalAddress: brand?.postal_address ?? null,
      professionalCard: brand?.professional_card ?? null,
      professionalCardIssuer: brand?.professional_card_issuer ?? null,
      financialGuarantee: brand?.financial_guarantee ?? null,
      advisorName,
      advisorPhone: advisor.data?.phone ?? null,
      advisorEmail: advisor.data?.email ?? null,
      advisorPhotoUrl: advisorPhoto[0]?.url ?? null,
      advisorQr:
        advisor.data?.email && advisorName
          ? buildQrCode(
              buildVCard({
                firstName: advisor.data.first_name ?? '',
                lastName: advisor.data.last_name ?? '',
                agencyName,
                phone: advisor.data.phone ?? null,
                email: advisor.data.email,
              }),
            )
          : null,
    },
    brandDeclarations: brand?.validated_at
      ? `${brandingCssVariables({
          brand: brand.brand,
          brandDeep: brand.brand_deep,
          brandSoft: brand.brand_soft,
          brandDarker: brand.brand_darker,
          brandDarkest: brand.brand_darkest,
          onBrandText: brand.on_brand_text,
        })} ${brandingFontDeclarations(brand.font_family)}`.trim()
      : '',
  });
}
