import { dpeClass } from '@/features/dpe/services/dpe';
import {
  buildLivePages,
  type LivePage,
  type LivePageType,
} from '@/features/live-seller/services/build-live-pages';

// Mission 91 — « Ce que verra le vendeur » : le déroulé du Live de CE dossier, compté sur
// le moteur du Live lui-même (`buildLivePages`) — jamais sur une liste recopiée, qui
// dériverait à la première modification du Live. Pur et déterministe.

// Estimation, à recaler sur les vrais rendez-vous : de 1,25 à 1,7 minute par écran.
export const MINUTES_PER_SCREEN_LOW = 1.25;
export const MINUTES_PER_SCREEN_HIGH = 1.7;
const DURATION_STEP_MINUTES = 5;

export type SequenceCompetitor = { id: string; energyRating: string | null };

export type SequencePart = { key: string; label: string; screenCount: number };

export type LiveSequence = {
  parts: SequencePart[];
  totalScreens: number;
  durationLowMinutes: number;
  durationHighMinutes: number;
  // Les titres des écrans, dans l'ordre, sans aucun montant.
  screenTitles: string[];
  // Concurrents retenus sans classe DPE, quand l'écran DPE existe : ils n'y figurent pas (M80).
  competitorsWithoutDpe: number;
};

const COMPETITOR_TYPES: readonly LivePageType[] = [
  'comparable_competition',
  'comparable_price',
  'comparable_price_reveal',
  'comparable_duration',
];

// Les parties, dans l'ordre du Live. Un libellé ne nomme que les écrans présents.
const PARTS: { key: string; members: { type: LivePageType; label: string }[] }[] = [
  {
    key: 'opening',
    members: [
      { type: 'intro', label: 'Introduction' },
      { type: 'subject_property', label: 'Votre bien' },
    ],
  },
  { key: 'perceived', members: [{ type: 'seller_perceived_price', label: 'Votre valeur perçue' }] },
  { key: 'dpe', members: [{ type: 'dpe_market', label: 'Le DPE face au marché' }] },
  {
    key: 'market',
    members: [
      { type: 'dangerous_competitor', label: 'Le concurrent le plus dangereux' },
      { type: 'price_analysis', label: 'Analyse des prix' },
    ],
  },
  {
    key: 'closing',
    members: [
      { type: 'conclusion', label: 'Prix de commercialisation' },
      { type: 'closing_question', label: 'Question de 1 à 10' },
    ],
  },
];

function roundToStep(minutes: number): number {
  return Math.max(
    DURATION_STEP_MINUTES,
    Math.round(minutes / DURATION_STEP_MINUTES) * DURATION_STEP_MINUTES,
  );
}

function screenTitle(page: LivePage): string {
  return page.comparableIndex == null
    ? page.title
    : `Concurrent ${page.comparableIndex} — ${page.title}`;
}

export function buildLiveSequence(
  competitors: readonly SequenceCompetitor[],
  hasSubjectProperty: boolean,
): LiveSequence {
  // Aucune réponse du vendeur : le parcours complet, quatre écrans par concurrent.
  const pages = buildLivePages(
    {
      comparables: competitors.map((competitor) => ({
        id: competitor.id,
        response: null,
        energyRating: competitor.energyRating,
      })),
    },
    hasSubjectProperty,
  );
  const count = (types: readonly LivePageType[]) =>
    pages.filter((page) => types.includes(page.type)).length;

  const parts: SequencePart[] = [];
  for (const part of PARTS) {
    const present = part.members.filter((member) => count([member.type]) > 0);
    if (present.length > 0) {
      parts.push({
        key: part.key,
        label: present.map((member) => member.label).join(' · '),
        screenCount: count(present.map((member) => member.type)),
      });
    }
    // Les concurrents viennent juste après la valeur perçue (M82).
    if (part.key === 'perceived' && competitors.length > 0) {
      parts.push({
        key: 'competitors',
        label:
          competitors.length === 1
            ? '1 concurrent'
            : `${competitors.length} concurrents, un à la fois`,
        screenCount: count(COMPETITOR_TYPES),
      });
    }
  }

  const hasDpeScreen = pages.some((page) => page.type === 'dpe_market');
  return {
    parts,
    totalScreens: pages.length,
    durationLowMinutes: roundToStep(pages.length * MINUTES_PER_SCREEN_LOW),
    durationHighMinutes: roundToStep(pages.length * MINUTES_PER_SCREEN_HIGH),
    screenTitles: pages.map(screenTitle),
    competitorsWithoutDpe: hasDpeScreen
      ? competitors.filter((competitor) => dpeClass(competitor.energyRating) == null).length
      : 0,
  };
}

export function durationLabel(sequence: LiveSequence): string {
  return sequence.durationLowMinutes === sequence.durationHighMinutes
    ? `${sequence.durationLowMinutes} min environ`
    : `${sequence.durationLowMinutes} à ${sequence.durationHighMinutes} min environ`;
}
