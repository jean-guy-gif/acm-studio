import type { LivePresentationMode } from '@/features/live-seller/services/presentation-mode';
import { dpeClass } from '@/features/dpe/services/dpe';
import {
  buildLivePages,
  type LivePage,
  type LivePageType,
  type LiveRhythm,
} from '@/features/live-seller/services/build-live-pages';

// Mission 91 — « Ce que verra le vendeur » : le déroulé du Live de CE dossier, compté sur
// le moteur du Live lui-même (`buildLivePages`) — jamais sur une liste recopiée, qui
// dériverait à la première modification du Live. Pur et déterministe.

// MISSION 95 — LA FORMULE DE L'ESTIMATION, à recaler sur les durées réelles (le Live relève
// désormais son heure de début et de fin) :
//
//     minutes = nombre d'écrans du Live × MINUTES_PER_SCREEN, arrondi à la minute
//
// Le nombre d'écrans est celui du moteur du Live pour ce dossier et ce rythme : les écrans
// communs (introduction, votre bien, valeur perçue, DPE, concurrent le plus dangereux, prix
// reformulé, analyse, prix de commercialisation, question de 1 à 10), plus, par concurrent,
// 4 écrans (3 sans durée connue) — ou 2 à partir du 4e concurrent en rythme accéléré.
// 1,475 est le milieu de la fourchette 1,25 – 1,7 utilisée jusqu'à la mission 94.
export const MINUTES_PER_SCREEN = 1.475;

export type SequenceCompetitor = {
  id: string;
  energyRating: string | null;
  // Mission 92 — sans durée ni historique de prix, le Live saute l'étape « Durée ».
  durationKnown?: boolean;
};

// Au-delà, le Live devient trop long : l'écran le dit au conseiller, sans rien bloquer.
export const ADVISED_MAX_COMPETITORS = 6;

export type SequencePart = { key: string; label: string; screenCount: number };

export type LiveSequence = {
  parts: SequencePart[];
  rhythm: LiveRhythm;
  totalScreens: number;
  // « environ N min » : une estimation, pas une mesure.
  estimatedMinutes: number;
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
  'comparable_quick_guess',
  'comparable_quick_reveal',
  'comparable_direct',
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
      { type: 'advisor_closest', label: 'Le concurrent le plus proche' },
      { type: 'seller_revised_price', label: 'Votre prix après le marché' },
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

export function estimateLiveMinutes(screenCount: number): number {
  return Math.max(1, Math.round(screenCount * MINUTES_PER_SCREEN));
}

function screenTitle(page: LivePage): string {
  return page.comparableIndex == null
    ? page.title
    : `Concurrent ${page.comparableIndex} — ${page.title}`;
}

export function buildLiveSequence(
  competitors: readonly SequenceCompetitor[],
  hasSubjectProperty: boolean,
  rhythm: LiveRhythm = 'complete',
  // Mission 131 — en présentation directe, le déroulé n'a aucun écran qui demande au vendeur.
  mode: LivePresentationMode = 'interactive',
): LiveSequence {
  // Aucune réponse du vendeur : le parcours entier, dans le rythme choisi.
  const pages = buildLivePages(
    {
      comparables: competitors.map((competitor) => ({
        id: competitor.id,
        response: null,
        energyRating: competitor.energyRating,
        durationKnown: competitor.durationKnown,
      })),
    },
    hasSubjectProperty,
    rhythm,
    mode,
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
    rhythm,
    totalScreens: pages.length,
    estimatedMinutes: estimateLiveMinutes(pages.length),
    screenTitles: pages.map(screenTitle),
    competitorsWithoutDpe: hasDpeScreen
      ? competitors.filter((competitor) => dpeClass(competitor.energyRating) == null).length
      : 0,
  };
}

// « environ 40 min »
export function durationLabel(sequence: Pick<LiveSequence, 'estimatedMinutes'>): string {
  return `environ ${sequence.estimatedMinutes}\u00A0min`;
}

export const RHYTHM_LABELS: Record<LiveRhythm, string> = {
  accelerated: 'Accéléré à partir du 4e concurrent',
  complete: 'Complet pour tous les concurrents',
};
const RHYTHM_SHORT: Record<LiveRhythm, string> = { accelerated: 'Accéléré', complete: 'Complet' };

// « Accéléré : environ 40 min · Complet : environ 49 min » — les deux estimations, côte à côte.
export function bothRhythmsLabel(
  accelerated: Pick<LiveSequence, 'estimatedMinutes'>,
  complete: Pick<LiveSequence, 'estimatedMinutes'>,
): string {
  return `${RHYTHM_SHORT.accelerated} : ${durationLabel(accelerated)} · ${RHYTHM_SHORT.complete} : ${durationLabel(complete)}`;
}

// Mission 92 — « 7 concurrents : environ 46 minutes de Live. Nous conseillons 6 au plus. »
// Mission 95 — la durée est celle du rythme choisi ; null tant qu'on reste dans le conseil.
export function tooManyCompetitorsNote(
  sequence: Pick<LiveSequence, 'estimatedMinutes'>,
  competitorCount: number,
): string | null {
  if (competitorCount <= ADVISED_MAX_COMPETITORS) {
    return null;
  }
  return `${competitorCount} concurrents : environ ${sequence.estimatedMinutes} minutes de Live. Nous conseillons ${ADVISED_MAX_COMPETITORS} au plus.`;
}
