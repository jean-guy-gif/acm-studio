import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { addDays } from '@/features/meeting-conclusion/services/suivi-tasks';
import { propertyPhrase } from '@/features/buyers/services/loop-properties';
import {
  anyStarContradicted,
  starsFilled,
  type BuyerLoopProperty,
} from '@/features/buyers/services/property-buyers';
import type { Buyer } from '@/features/buyers/types';

// Mission 135 — « Un lien sans réponse devient une relance ». Pur.
//   • Sa sélection la plus récente est « envoyée » à sa première proposition notée (M134) ou à son
//     premier partage noté (Copier, SMS, WhatsApp, E-mail sur la page du dossier) : un lien
//     seulement créé n'envoie rien (décision du 06/11).
//   • Sans réponse 48 heures après l'envoi (une réponse sur un bien de cette sélection, sa
//     présentation, ses créneaux par le lien), une relance est due ; « J'ai relancé » la note ; une
//     2e relance est due 5 jours après la 1re ; après la 2e, plus rien (le « Reprendre contact » de
//     la 132 prend le relais à 30 jours).
//   • Un lien expiré (30 jours) ne fait pas naître de tâche : la relance due propose « Envoyer un
//     nouveau lien ».

export const RELAUNCH_AFTER_HOURS = 48;
export const SECOND_RELAUNCH_AFTER_DAYS = 5;
export const MAX_RELAUNCHES = 2;

export type RelaunchFacts = {
  buyerId: string;
  status: Buyer['status'];
  selectionId: string;
  // La date d'envoi de la sélection (null : jamais envoyée).
  sentAt: string | null;
  answered: boolean;
  // Les relances notées sur cette sélection, la plus ancienne d'abord.
  relaunches: string[];
  // Un lien de la sélection encore valable.
  linkActive: boolean;
};

export type RelaunchDue = {
  dueOn: string;
  // 1 ou 2 : la relance que la tâche propose.
  rank: number;
  sentOn: string;
  expired: boolean;
};

const ACTIVE = new Set(['searching', 'visiting']);

export function relaunchDue(facts: RelaunchFacts, now: Date): RelaunchDue | null {
  if (!ACTIVE.has(facts.status) || facts.sentAt == null || facts.answered) return null;
  if (facts.relaunches.length >= MAX_RELAUNCHES) return null;
  const sentOn = parisDay(new Date(facts.sentAt));
  const today = parisDay(now);
  if (facts.relaunches.length === 0) {
    const threshold = new Date(new Date(facts.sentAt).getTime() + RELAUNCH_AFTER_HOURS * 3_600_000);
    if (now < threshold) return null;
    return { dueOn: parisDay(threshold), rank: 1, sentOn, expired: !facts.linkActive };
  }
  const dueOn = addDays(
    parisDay(new Date(facts.relaunches[facts.relaunches.length - 1]!)),
    SECOND_RELAUNCH_AFTER_DAYS,
  );
  if (dueOn > today) return null;
  return { dueOn, rank: 2, sentOn, expired: !facts.linkActive };
}

// Le bien de la sélection qui coche le plus de ses ★ (à égalité, l'ordre de la sélection), et s'il
// « coche ce qu'il cherche » : au moins une ★ remplie, aucune contredite — toutes ses ★, commune,
// type, pièces, surface et budget compris. Un prix inconnu (vendeur
// à relancer, M119) ne remplit jamais la ★ du budget.
export function bestBien<T extends { property: BuyerLoopProperty; price: number | null }>(
  buyer: Buyer,
  biens: T[],
): { bien: T; fits: boolean } | null {
  let best: { bien: T; fits: boolean } | null = null;
  let bestCount = -1;
  for (const bien of biens) {
    const price = bien.price ?? Number.NaN;
    const count = starsFilled(buyer, bien.property, price).length;
    if (count > bestCount) {
      best = { bien, fits: count > 0 && !anyStarContradicted(buyer, bien.property, price) };
      bestCount = count;
    }
  }
  return best;
}

const dayLabel = (day: string): string => {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
};

// Le message de relance : court ; le bien qui coche le plus de ses ★, ce qu'il a de ce qu'il cherche,
// jamais « disponible » (M118 : l'outil ne le sait pas), jamais un prix ; le lien ; la signature.
export function relaunchMessage(input: {
  buyer: Pick<Buyer, 'name' | 'pool' | 'outdoor' | 'parking' | 'elevator'>;
  bien: { property: BuyerLoopProperty } | null;
  // Le bien coche-t-il vraiment ce qu'il cherche (une ★ remplie, aucune contredite) ?
  fits?: boolean;
  sentOn: string;
  url: string;
  advisorFirstName: string | null;
}): string {
  const lines = [`Bonjour ${input.buyer.name},`];
  const ask = `Avez-vous pu regarder la sélection envoyée le ${dayLabel(input.sentOn)} ?`;
  if (input.bien && input.fits) {
    const p = input.bien.property;
    const noun = propertyPhrase({ propertyType: p.propertyType, city: null });
    const has: string[] = [];
    if (input.buyer.pool === true && p.hasPool === true) has.push('la piscine que vous vouliez');
    if (input.buyer.outdoor === true && p.outdoorSpaces.length > 0) has.push('un extérieur');
    if (input.buyer.parking === true && p.parkingTypes.length > 0) has.push('un stationnement');
    if (input.buyer.elevator === true && p.hasElevator === true) has.push('un ascenseur');
    const what = [
      noun === 'le bien' ? 'Le bien' : noun.charAt(0).toUpperCase() + noun.slice(1),
      p.city?.trim() ? `à ${p.city.trim()}` : null,
      has.length > 0 ? `avec ${has.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    lines.push(
      `${ask} ${what} coche ce que vous cherchez : voulez-vous le visiter samedi ?`.replace(
        /le visiter samedi/,
        noun === 'la maison' ? 'la visiter samedi' : 'le visiter samedi',
      ),
    );
  } else {
    lines.push(`${ask} Dites-moi quels biens vous voulez visiter.`);
  }
  lines.push(`Votre sélection : ${input.url}`);
  if (input.advisorFirstName?.trim()) lines.push(input.advisorFirstName.trim());
  return lines.join('\n');
}

export const RELAUNCH_FAILED = 'La relance n’a pas pu être préparée. Réessayez.';
export const RELAUNCH_NOT_DUE = 'Pas de relance due pour cet acquéreur.';
