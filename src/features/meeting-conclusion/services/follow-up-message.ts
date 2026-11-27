import type { FollowUpMotive, Objection } from '@/features/meeting-conclusion/types';
import { formatEuro } from '@/lib/format';

// Mission 96 — le message de relance : un texte court, prêt à copier pour un SMS ou un e-mail.
// Pur. Il reprend ce que le vendeur a dit LUI-MÊME pendant le Live et s'adapte au motif choisi.
// Le ton reste factuel : aucune formule de pression, aucune urgence inventée (M85).
//
// Ce qui peut y entrer est une liste fermée : les prix du VENDEUR, sa propre réponse, la date du
// rendez-vous et un NOMBRE de concurrents ayant baissé. Aucun concurrent n'y est nommé, aucune
// adresse ni aucun prix de concurrent n'y figure — le type d'entrée ne les reçoit pas.
// L'outil n'envoie rien : le conseiller copie, corrige et envoie lui-même.
export type FollowUpMessageInput = {
  motive: FollowUpMotive | null;
  // La date du rendez-vous, déjà formulée (« 3 octobre ») ; null si elle manque.
  meetingDate: string | null;
  sellerPerceivedPrice: number | null;
  sellerRevisedPrice: number | null;
  commercializationPrice: number | null;
  // Ce qui lui manquait pour être à 10 (M85) : sa réponse, telle qu'il l'a donnée.
  launchReadinessMissing: string | null;
  // Mission 110 — ce qui freine le vendeur, coché à la conclusion : le message en part.
  objections?: Objection[];
  // Combien des concurrents vus ensemble ont baissé leur prix depuis (prix révélé → prix actuel).
  priceDropsSinceMeeting: number;
  // Mission 145 — les acquéreurs prêts à visiter qui correspondent à son bien : un nombre, jamais un
  // nom, un budget ni une commune (le type ne peut rien porter d'autre ; décision du 07/11).
  readyBuyers?: number;
  advisorFirstName: string | null;
  // « Nom sur les documents » (M87), sinon le nom de l'agence.
  agencyName: string | null;
};

function sellerWords(input: FollowUpMessageInput): string[] {
  const lines: string[] = [];
  if (input.sellerRevisedPrice != null) {
    lines.push(
      `Vous m’aviez dit qu’après avoir vu le marché, ${formatEuro(input.sellerRevisedPrice)} vous semblait cohérent.`,
    );
  } else if (input.sellerPerceivedPrice != null) {
    lines.push(
      `Vous m’aviez dit en début de rendez-vous que vous imaginiez votre bien à ${formatEuro(input.sellerPerceivedPrice)}.`,
    );
  }
  // Mission 130 — sa réponse garde ses mots, sans le point final qui doublerait celui de la phrase.
  const missing = input.launchReadinessMissing
    ?.replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '');
  if (missing) {
    lines.push(
      `Vous m’aviez aussi indiqué ce qui vous manquait pour lancer la vente\u00a0: «\u00a0${missing}\u00a0».`,
    );
  }
  return lines;
}

// Mission 110 — une phrase par frein coché, factuelle, sans pression ni urgence (M85, M96). La
// ligne libre du conseiller n'y entre pas : c'est sa note de travail.
const OBJECTION_LINES: Record<Objection, string> = {
  price:
    'Sur le prix, je peux reprendre avec vous les biens que nous avons vus ensemble, à tête reposée.',
  exclusivity:
    'Si l’exclusivité vous fait hésiter, je peux vous expliquer ce qu’elle change concrètement pour la vente de votre bien.',
  timing: 'Pour le calendrier, nous pouvons caler la mise en vente sur votre projet.',
  other_agency:
    'Si vous rencontrez d’autres agences, je reste disponible pour répondre à vos questions.',
  not_ready: 'Rien ne presse\u00a0: je reste à votre disposition quand votre projet sera prêt.',
};

function objectionLines(objections: Objection[] | undefined): string[] {
  return (objections ?? []).map((objection) => OBJECTION_LINES[objection]);
}

// « Depuis notre rendez-vous, un acquéreur prêt à visiter cherche un bien comme le vôtre. »
export function readyBuyersLine(count: number | undefined): string | null {
  if (!count || count < 1) return null;
  return count === 1
    ? 'Depuis notre rendez-vous, un acquéreur prêt à visiter cherche un bien comme le vôtre.'
    : `Depuis notre rendez-vous, ${count} acquéreurs prêts à visiter cherchent un bien comme le vôtre.`;
}

function priceDropsLine(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count === 1
    ? 'Depuis notre rendez-vous, un des biens que nous avions vus a baissé son prix.'
    : `Depuis notre rendez-vous, ${count} des biens que nous avions vus ont baissé leur prix.`;
}

function motiveLine(input: FollowUpMessageInput): string {
  switch (input.motive) {
    case 'price_accepted':
      return input.commercializationPrice != null
        ? `Nous étions convenus d’un prix de ${formatEuro(input.commercializationPrice)}. Quand souhaitez-vous que nous signions le mandat\u202f?`
        : 'Nous étions d’accord sur le prix. Quand souhaitez-vous que nous signions le mandat\u202f?';
    case 'thinking_price':
      return 'Où en est votre réflexion sur le prix\u202f? Je reste disponible pour en reparler.';
    case 'consulting_relative':
      return 'Avez-vous pu en parler autour de vous\u202f? Je peux reprendre les éléments avec vous et vos proches si vous le souhaitez.';
    case 'awaiting_estimate':
      return 'Avez-vous reçu l’autre avis de valeur que vous attendiez\u202f? Je suis disponible pour le regarder avec vous.';
    case 'undated_project':
      return 'Votre projet de vente a-t-il avancé\u202f? Je reste à votre disposition quand vous le souhaiterez.';
    default:
      return 'Où en êtes-vous de votre projet\u202f? Je reste à votre disposition.';
  }
}

export function buildFollowUpMessage(input: FollowUpMessageInput): string {
  const opening = input.meetingDate
    ? `Je reviens vers vous après notre rendez-vous du ${input.meetingDate} au sujet de votre bien.`
    : 'Je reviens vers vous après notre rendez-vous au sujet de votre bien.';
  const body = [
    opening,
    ...sellerWords(input),
    ...objectionLines(input.objections),
    priceDropsLine(input.priceDropsSinceMeeting),
    readyBuyersLine(input.readyBuyers),
    motiveLine(input),
  ].filter((line): line is string => Boolean(line));
  const signature = [input.advisorFirstName?.trim(), input.agencyName?.trim()].filter(Boolean);

  return ['Bonjour,', body.join(' '), ['Bien cordialement,', ...signature].join('\n')].join('\n\n');
}
