import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';

// Mission 138 — l'offre acceptée (ou refusée) : la réponse du vendeur fait naître sa tâche dans « À
// faire aujourd'hui », en tête, jusqu'au « Fait » du conseiller ; ses messages prêts, à l'acquéreur
// et au notaire ; le badge daté qui la dit sur la fiche, la visite et le dossier vendeur. Pur.

export type OfferDecision = 'accepted' | 'refused';

export type AnsweredOffer = {
  offerId: string;
  buyerId: string;
  buyerName: string | null;
  // La visite d'où l'offre est née (« Faire une nouvelle offre » y repart).
  visitId: string | null;
  decision: OfferDecision;
  // L'heure de la base (ISO).
  decidedAt: string;
  done: boolean;
};

export function offerAnswerTasks(offers: AnsweredOffer[]): SuiviTask[] {
  return offers
    .filter((offer) => !offer.done)
    .map((offer) => ({
      kind: 'offer_answer' as const,
      projectId: '',
      sellerName: '',
      dueOn: parisDay(new Date(offer.decidedAt)),
      buyerId: offer.buyerId,
      buyerName: offer.buyerName,
      offerId: offer.offerId,
      decision: offer.decision,
      visitId: offer.visitId ?? undefined,
    }));
}

// « des Keller » pour « Famille Keller », sinon « de M. et Mme Lambert » (« de l'acquéreur » sans nom).
export function offerOwner(name: string | null | undefined): string {
  const value = name?.trim();
  if (!value) return 'de l’acquéreur';
  const family = /^famille\s+(.+)$/i.exec(value);
  return family ? `des ${family[1]}` : `de ${value}`;
}

// « la famille Keller » pour « Famille Keller ».
function inSentence(name: string | null | undefined): string {
  const value = name?.trim();
  if (!value) return 'l’acquéreur';
  const family = /^famille\s+(.+)$/i.exec(value);
  return family ? `la famille ${family[1]}` : value;
}

export function offerAnswerTitle(decision: OfferDecision, buyerName: string | null): string {
  return decision === 'accepted'
    ? `Le vendeur a accepté l’offre de ${inSentence(buyerName)}`
    : `L’offre ${offerOwner(buyerName)} est refusée`;
}

// « 06/11 » depuis l'heure de la base, à Paris.
export function decidedDayLabel(decidedAt: string): string {
  const day = parisDay(new Date(decidedAt));
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

export function offerAnswerBadge(decision: OfferDecision, decidedAt: string): string {
  return `${decision === 'accepted' ? 'Offre acceptée' : 'Offre refusée'} le ${decidedDayLabel(decidedAt)}`;
}

// À l'acquéreur. Acceptée : la bonne nouvelle, la date, le lien de sa copie signée par les deux
// parties, la suite chez le notaire. Refusée : le fait, sans motif (aucun n'est enregistré), sans
// prix, sans pression. Jamais le nom du vendeur, un prix, « vente conclue » ni « définitif » (le
// délai de rétractation viendra au compromis).
export function offerAnswerBuyerMessage(input: {
  decision: OfferDecision;
  buyerName: string;
  property: string;
  decidedAt: string;
  url: string | null;
  advisorFirstName: string | null;
  // Mission 140 — dans la langue de l'acquéreur (le français par défaut).
  language?: TextLanguage;
}): string {
  const t = clientTexts(input.language ?? 'fr').buyer.messages;
  const lines = [
    t.hello(input.buyerName),
    ...(input.decision === 'accepted'
      ? t.offer.accepted(input.property, decidedDayLabel(input.decidedAt), input.url)
      : t.offer.refused(input.property)),
  ];
  return [...lines, input.advisorFirstName?.trim() ?? ''].filter(Boolean).join('\n');
}

// Au notaire : l'offre acceptée en lien, le bien par son adresse exacte, le n° de mandat, le
// conseiller qui écrit. Jamais le budget de l'acquéreur, ses notes, ni rien du Live.
export function offerNotaryMessage(input: {
  propertyAddress: string;
  mandateNumber: string | null;
  url: string;
  advisor: { name: string; phone: string | null };
  agencyName: string | null;
}): string {
  return [
    'Maître,',
    `Veuillez trouver l’offre d’achat acceptée par le vendeur pour le bien situé ${input.propertyAddress}${input.mandateNumber ? `, mandat n° ${input.mandateNumber}` : ''} : ${input.url}`,
    'Le document porte l’identité des offrants et les signatures des deux parties.',
    'Je reste à votre disposition pour la suite.',
    [input.advisor.name, input.agencyName, input.advisor.phone].filter(Boolean).join(' · '),
  ]
    .filter(Boolean)
    .join('\n');
}

export const newOfferHref = (buyerId: string, visitId: string | null | undefined): string =>
  `/acquereurs/${buyerId}/offre${visitId ? `?visite=${visitId}` : ''}`;
