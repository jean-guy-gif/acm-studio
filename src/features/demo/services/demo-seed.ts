import { BUYER_CRITERION_LABELS } from '@/features/buyers/types';
import type { ImportedComparableData } from '@/features/comparable-import/types';
import { DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import type { DemoListing, DemoScenario, DemoScenarioId } from '@/features/demo/data/types';
import {
  demoAddressLine,
  demoImportedData,
  demoSubjectImportedData,
} from '@/features/demo/services/demo-listing-data';
import { DEMO_BUYERS } from '@/features/demo/services/demo-buyers';
import { idealLabel } from '@/features/ideal-properties/services/ideal-label';
import { formatEuro } from '@/lib/format';
import { mapListingToProperty } from '@/features/subject-property-import/services/map-listing-to-property';

// Mission 114 (partie B) — les quatre dossiers de démonstration d'un closer, à quatre étapes,
// décrits ici sans rien écrire : ce que chaque dossier contient, dans les formes que l'outil lit
// (le bien tel que l'import le remplit, les concurrents tels que l'annonce les dit, les réponses
// du Live, la conclusion). L'action `demo-dossiers.ts` les écrit par les mêmes services que
// l'outil. Pur.

// Mission 131 — « direct » : un dossier prêt, réglé en présentation directe, jouable (la démo est
// le miroir du produit, CLAUDE.md).
export const DEMO_STAGES = ['to_prepare', 'ready', 'direct', 'signed', 'follow_up'] as const;
export type DemoStage = (typeof DEMO_STAGES)[number];

export const DEMO_STAGE_LABELS: Record<DemoStage, string> = {
  to_prepare: 'À préparer',
  ready: 'Prêt pour le Live',
  direct: 'Prêt, en présentation directe',
  signed: 'Conclu, mandat signé',
  follow_up: 'À relancer',
};

// Chaque étape a son scénario (M114 B.9) ; « À relancer » reprend celui d'Antibes, conclu.
export const DEMO_STAGE_SCENARIO: Record<DemoStage, DemoScenarioId> = {
  to_prepare: 'antibes',
  ready: 'vence',
  direct: 'vence',
  signed: 'mougins',
  follow_up: 'antibes',
};

export const DEMO_SEED_COMPETITORS = 5;
// Le vendeur du dossier en présentation directe : un autre foyer que celui du Live interactif de
// Vence, pour que les deux dossiers ne se confondent pas dans la liste du Live.
export const DEMO_DIRECT_SELLER = 'M. et Mme Bernard';
export const DEMO_DANGEROUS_REASON = 'better_location';
export const DEMO_READINESS_MISSING = 'Le délai : il voudrait vendre avant l’été.';
export const DEMO_FOLLOW_UP_MOTIVE = 'thinking_price';
export const DEMO_OBJECTIONS = ['price', 'timing'] as const;
export const DEMO_FOLLOW_UP_NOTE = 'Message laissé ; il rappelle après avoir vu sa banque.';
export const DEMO_JUSTIFICATION =
  'Prix retenu à partir des biens comparables en vente dans le secteur, ajusté à l’exposition et à l’étage.';
// Le rendez-vous de démonstration : commencé il y a 50 minutes, fini il y a 9 minutes.
export const DEMO_LIVE_MINUTES = { startedAgo: 50, endedAgo: 9 } as const;
// « À relancer » : rendez-vous d'il y a 9 jours, relance d'il y a 8 jours, prochaine aujourd'hui
// (Mission 130 : la tâche « Relancer » est dans « À faire aujourd'hui »).
// Mission 130 — le téléphone et l'e-mail fictifs du vendeur à relancer (Jean-Guy, 05/11) : un
// numéro de la plage 06 39 98 que l'ARCEP réserve à la fiction, une adresse en example.com.
export const DEMO_FOLLOW_UP_CONTACT = {
  phone: '06 39 98 41 27',
  email: 'famille.martin@example.com',
} as const;
export const DEMO_FOLLOW_UP_DAYS = { meetingAgo: 9, contactAgo: 8, nextIn: 0 } as const;
// « Conclu, mandat signé » : rendez-vous et signature d'il y a un mois calendaire (même jour du mois
// précédent, le dernier jour s'il n'existe pas), pour que le Point marché (M127) dise « depuis notre
// rendez-vous du … » avec un vrai écart (designer, 29/10) et que le premier point, mensuel, soit
// dû aujourd'hui (Mission 130 ; un 29, 30 ou 31, il peut l'être depuis un à trois jours).
export function oneMonthAgo(now: Date): string {
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString();
}

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
  // Mission 127 — les annonces qui disparaîtront après le rendez-vous (une vente probable, un
  // retrait sans vente) prennent la place des derniers choisis qui ne baissent pas.
  const gone = byCloseness.filter(
    (listing) => listing.goneAfterMeeting && !chosen.includes(listing),
  );
  for (const listing of gone) {
    const slot = chosen
      .map((item, index) => ({ item, index }))
      .reverse()
      .find(({ item }) => item !== dropped && !item.goneAfterMeeting);
    if (!slot) break;
    chosen[slot.index] = listing;
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
    // La piscine et l'ascenseur du bien (oui / non / non renseigné) : l'import d'une annonce ne
    // les écrit pas (le conseiller les renseigne, Stream Estate, 05/10) ; la démo pose ceux de son
    // scénario, sans quoi la villa de Mougins montrait « ? Piscine » aux Keller (essai, 25/10).
    has_pool: subject.hasPool,
    has_elevator: subject.hasElevator,
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
    sellerName: stage === 'direct' ? DEMO_DIRECT_SELLER : scenario.sellerName,
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

// Essai de Jean-Guy (25/10) — la sélection des Keller que « Préparer ma démo » retient : un bien
// qui coche tout (le mandat de Mougins), un bon compromis au budget en orange (mou-02, au-dessus
// du plafond, sous +5 %, « à négocier ») et un bien à vérifier ensemble (mou-07, piscine non
// indiquée). Les
// mêmes lignes que « Retenir la sélection » écrirait (M118) ; le mandat est désigné par son dossier,
// que l'action connaît. Pur.
export type DemoSelectionItemPlan = {
  source: 'project' | 'listing';
  listingId: string | null;
  label: string;
  listedPrice: number | null;
  priceSeenOn: string | null;
  category: 'agency' | 'compromise' | 'explore';
  gaps: string[];
  imported: ImportedComparableData | null;
  // Ce que la recherche aurait dit du bien, pour les faits que l'import ne porte pas (le type).
  snapshot: Record<string, unknown> | null;
};

const labelOf = (propertyType: string, data: ImportedComparableData): string =>
  idealLabel({
    propertyType,
    roomsCount: data.roomsCount ?? null,
    surfaceArea: data.surfaceArea ?? null,
    city: data.city ?? null,
  });

export function demoKellerSelectionPlan(now: Date): DemoSelectionItemPlan[] {
  const scenario = DEMO_SCENARIOS.find((item) => item.id === 'mougins')!;
  const keller = DEMO_BUYERS.find((buyer) => buyer.name === 'Famille Keller')!;
  const budgetMax = keller.budgetMax ?? 0;
  const subject = demoSubjectImportedData(scenario, now);
  const signed = demoSeedPlan('signed', now);
  const seenOn = now.toISOString().slice(0, 10);
  const listing = (id: string) => scenario.listings.find((entry) => entry.id === id)!;
  const fromListing = (
    id: string,
    category: DemoSelectionItemPlan['category'],
    gaps: string[],
  ): DemoSelectionItemPlan => {
    const data = demoImportedData(listing(id), now);
    return {
      source: 'listing',
      listingId: id,
      label: labelOf(listing(id).propertyType, data),
      listedPrice: data.price,
      priceSeenOn: seenOn,
      category,
      gaps,
      imported: data,
      snapshot: {
        propertyType: listing(id).propertyType,
        city: data.city ?? null,
        surfaceArea: data.surfaceArea ?? null,
        roomsCount: data.roomsCount ?? null,
      },
    };
  };
  const orange = listing('mou-02');
  return [
    {
      source: 'project',
      listingId: null,
      label: labelOf(scenario.subject.propertyType, subject),
      listedPrice: signed.live?.agreedPrice ?? null,
      priceSeenOn: null,
      category: 'agency',
      gaps: [],
      imported: null,
      snapshot: null,
    },
    fromListing('mou-02', 'compromise', [
      `${formatEuro(orange.price - budgetMax)} au-dessus du budget, à négocier`,
    ]),
    fromListing('mou-07', 'explore', [`À vérifier : ${BUYER_CRITERION_LABELS.pool}`]),
  ];
}
