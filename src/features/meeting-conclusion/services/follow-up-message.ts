import type { FollowUpMotive } from '@/features/meeting-conclusion/types';
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
  // Combien des concurrents vus ensemble ont baissé leur prix depuis (prix révélé → prix actuel).
  priceDropsSinceMeeting: number;
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
  const missing = input.launchReadinessMissing?.replace(/\s+/g, ' ').trim();
  if (missing) {
    lines.push(
      `Vous m’aviez aussi indiqué ce qui vous manquait pour lancer la vente : « ${missing} ».`,
    );
  }
  return lines;
}

function priceDropsLine(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count === 1
    ? 'Depuis notre rendez-vous, 1 des biens que nous avions vus a baissé son prix.'
    : `Depuis notre rendez-vous, ${count} des biens que nous avions vus ont baissé leur prix.`;
}

function motiveLine(input: FollowUpMessageInput): string {
  switch (input.motive) {
    case 'price_accepted':
      return input.commercializationPrice != null
        ? `Nous étions convenus d’un prix de ${formatEuro(input.commercializationPrice)}. Quand souhaitez-vous que nous signions le mandat ?`
        : 'Nous étions d’accord sur le prix. Quand souhaitez-vous que nous signions le mandat ?';
    case 'thinking_price':
      return 'Où en est votre réflexion sur le prix ? Je reste disponible pour en reparler.';
    case 'consulting_relative':
      return 'Avez-vous pu en parler autour de vous ? Je peux reprendre les éléments avec vous et vos proches si vous le souhaitez.';
    case 'awaiting_estimate':
      return 'Avez-vous reçu l’autre avis de valeur que vous attendiez ? Je suis disponible pour le regarder avec vous.';
    case 'undated_project':
      return 'Votre projet de vente a-t-il avancé ? Je reste à votre disposition quand vous le souhaiterez.';
    default:
      return 'Où en êtes-vous de votre projet ? Je reste à votre disposition.';
  }
}

export function buildFollowUpMessage(input: FollowUpMessageInput): string {
  const opening = input.meetingDate
    ? `Je reviens vers vous après notre rendez-vous du ${input.meetingDate} au sujet de votre bien.`
    : 'Je reviens vers vous après notre rendez-vous au sujet de votre bien.';
  const body = [
    opening,
    ...sellerWords(input),
    priceDropsLine(input.priceDropsSinceMeeting),
    motiveLine(input),
  ].filter((line): line is string => Boolean(line));
  const signature = [input.advisorFirstName?.trim(), input.agencyName?.trim()].filter(Boolean);

  return ['Bonjour,', body.join(' '), ['Bien cordialement,', ...signature].join('\n')].join('\n\n');
}
