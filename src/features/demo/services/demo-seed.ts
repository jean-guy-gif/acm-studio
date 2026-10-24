import type { ImportedComparableData } from '@/features/comparable-import/types';
import { DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import type { DemoListing, DemoScenario, DemoScenarioId } from '@/features/demo/data/types';
import {
  demoAddressLine,
  demoImportedData,
  demoSubjectImportedData,
} from '@/features/demo/services/demo-listing-data';
import { mapListingToProperty } from '@/features/subject-property-import/services/map-listing-to-property';

// Mission 114 (partie B) — les quatre dossiers de démonstration d'un closer, à quatre étapes,
// décrits ici sans rien écrire : ce que chaque dossier contient, dans les formes que l'outil lit
// (le bien tel que l'import le remplit, les concurrents tels que l'annonce les dit, les réponses
// du Live, la conclusion). L'action `demo-dossiers.ts` les écrit par les mêmes services que
// l'outil. Pur.

export const DEMO_STAGES = ['to_prepare', 'ready', 'signed', 'follow_up'] as const;
export type DemoStage = (typeof DEMO_STAGES)[number];

export const DEMO_STAGE_LABELS: Record<DemoStage, string> = {
  to_prepare: 'À préparer',
  ready: 'Prêt pour le Live',
  signed: 'Conclu, mandat signé',
  follow_up: 'À relancer',
};

// Chaque étape a son scénario (M114 B.9) ; « À relancer » reprend celui d'Antibes, conclu.
export const DEMO_STAGE_SCENARIO: Record<DemoStage, DemoScenarioId> = {
  to_prepare: 'antibes',
  ready: 'vence',
  signed: 'mougins',
  follow_up: 'antibes',
};

export const DEMO_SEED_COMPETITORS = 5;
export const DEMO_DANGEROUS_REASON = 'better_location';
export const DEMO_READINESS_MISSING = 'Le délai : il voudrait vendre avant l’été.';
export const DEMO_FOLLOW_UP_MOTIVE = 'thinking_price';
export const DEMO_OBJECTIONS = ['price', 'timing'] as const;
export const DEMO_FOLLOW_UP_NOTE = 'Message laissé ; il rappelle après avoir vu sa banque.';
export const DEMO_JUSTIFICATION =
  'Prix retenu à partir des biens comparables en vente dans le secteur, ajusté à l’exposition et à l’étage.';
// Le rendez-vous de démonstration : commencé il y a 50 minutes, fini il y a 9 minutes.
export const DEMO_LIVE_MINUTES = { startedAgo: 50, endedAgo: 9 } as const;
// « À relancer » : rendez-vous d'il y a 9 jours, relance d'il y a 8 jours, prochaine dans 22 jours.
export const DEMO_FOLLOW_UP_DAYS = { meetingAgo: 9, contactAgo: 8, nextIn: 22 } as const;

export type DemoSeedCompetitor = {
  listing: DemoListing;
  data: ImportedComparableData;
  // La devinette du vendeur, au Live : un peu sous le prix affiché.
  guess: number;
};

export type DemoSeedLive = {
  perceivedPrice: number;
  revisedPrice: number;
  agreedPrice: number;
  daysGuess: number;
  dangerousIndex: number;
  readinessFirst: number;
  readinessLast: number;
};

export type DemoSeedPlan = {
  stage: DemoStage;
  scenario: DemoScenario;
  sellerName: string;
  // Le bien vendeur, tel que l'import d'annonce le remplit (M38 : jamais le prix), plus la
  // fourchette du conseiller, les atouts et les montants de la fiche.
  property: Record<string, unknown> | null;
  photoFiles: string[];
  competitors: DemoSeedCompetitor[];
  live: DemoSeedLive | null;
  conclusion:
    | { outcome: 'signed'; mandateType: 'exclusive' }
    | { outcome: 'follow_up'; motive: string; objections: string[] }
    | null;
  // « À relancer » : le concurrent qui a baissé depuis le rendez-vous, et son nouveau prix.
  priceDrop: { index: number; price: number } | null;
  // « Mandat signé » : l'adresse inscrite « Ne plus solliciter ».
  opposedAddress: string | null;
};

const round500 = (value: number): number => Math.round(value / 500) * 500;

// Les concurrents retenus : les plus proches du prix de l'annonce du bien, un bien qui baissera
// après le rendez-vous toujours parmi eux (il fait la démonstration de « Mettre à jour les prix »).
export function demoSeedCompetitors(scenario: DemoScenario): DemoListing[] {
  const byCloseness = [...scenario.listings].sort(
    (a, b) =>
      Math.abs(a.price - scenario.subject.listedPrice) -
        Math.abs(b.price - scenario.subject.listedPrice) || a.id.localeCompare(b.id),
  );
  const chosen = byCloseness.slice(0, DEMO_SEED_COMPETITORS);
  const dropped = byCloseness.find(
    (listing) => listing.priceAfterMeeting != null && listing.priceAfterMeeting < listing.price,
  );
  if (dropped && !chosen.includes(dropped)) {
    chosen[chosen.length - 1] = dropped;
  }
  return chosen;
}

export function demoSeedPlan(stage: DemoStage, now: Date): DemoSeedPlan {
  const scenario = DEMO_SCENARIOS.find((item) => item.id === DEMO_STAGE_SCENARIO[stage])!;
  const { subject } = scenario;
  if (stage === 'to_prepare') {
    return {
      stage,
      scenario,
      sellerName: scenario.sellerName,
      property: null,
      photoFiles: [],
      competitors: [],
      live: null,
      conclusion: null,
      priceDrop: null,
      opposedAddress: null,
    };
  }
  const imported = mapListingToProperty(demoSubjectImportedData(scenario, now));
  const property: Record<string, unknown> = {
    ...imported.prefill,
    advisor_price_min: subject.advisorRange.min,
    advisor_price_max: subject.advisorRange.max,
    strengths: [...subject.strengths],
    monthly_charges: subject.monthlyCharges,
    property_tax: subject.propertyTax,
    fields_to_verify: [],
  };
  const competitors = demoSeedCompetitors(scenario).map((listing) => ({
    listing,
    data: demoImportedData(listing, now),
    guess: listing.price - 8_000,
  }));
  const concluded = stage === 'signed' || stage === 'follow_up';
  const live: DemoSeedLive | null = concluded
    ? {
        perceivedPrice: round500(subject.listedPrice * 1.05),
        revisedPrice: subject.listedPrice,
        agreedPrice: round500(subject.listedPrice * 0.97),
        daysGuess: 60,
        dangerousIndex: 0,
        readinessFirst: 7,
        readinessLast: 10,
      }
    : null;
  const droppedIndex = competitors.findIndex(
    ({ listing }) => listing.priceAfterMeeting != null && listing.priceAfterMeeting < listing.price,
  );
  return {
    stage,
    scenario,
    sellerName: scenario.sellerName,
    property,
    photoFiles: subject.photos.slice(0, 3),
    competitors,
    live,
    conclusion:
      stage === 'signed'
        ? { outcome: 'signed', mandateType: 'exclusive' }
        : stage === 'follow_up'
          ? {
              outcome: 'follow_up',
              motive: DEMO_FOLLOW_UP_MOTIVE,
              objections: [...DEMO_OBJECTIONS],
            }
          : null,
    priceDrop:
      stage === 'follow_up' && droppedIndex >= 0
        ? {
            index: droppedIndex,
            price: competitors[droppedIndex].listing.priceAfterMeeting as number,
          }
        : null,
    opposedAddress:
      stage === 'signed' ? demoAddressLine(competitors[competitors.length - 1].listing) : null,
  };
}
