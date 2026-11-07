import type {
  DismissReason,
  VisitNextStep,
  VisitOpinion,
  VisitTag,
} from '@/features/buyer-messages/templates/types';
import { BUYER_CRITERION_LABELS } from '@/features/buyers/types';
import type { ImportedComparableData } from '@/features/comparable-import/types';
import { DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import type { DemoListing, DemoScenario, DemoScenarioId } from '@/features/demo/data/types';
import {
  demoAddressLine,
  demoImportedData,
  demoStreamEstateProperty,
  demoSubjectImportedData,
} from '@/features/demo/services/demo-listing-data';
import { DEMO_BUYERS } from '@/features/demo/services/demo-buyers';
import { toWatchFind, type WatchFind } from '@/features/buyer-watch/services/watch-finds';
import { parseStreamEstateResponse } from '@/features/competitor-search/services/stream-estate';
import { budgetCeiling } from '@/features/ideal-properties/services/ideal-criteria';
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
// Mission 140 — les Bernard préfèrent l'anglais : leur Live et leurs documents sont en anglais
// (décision de Jean-Guy, 06/11).
export const DEMO_DIRECT_SELLER = 'Mr and Mrs Bernard';
export const DEMO_DIRECT_LANGUAGE = 'en' as const;
// Mission 133 — la maison des Bernard a une piscine, celle de Mme Garcia non (décision de Jean-Guy,
// 06/11) : M. et Mme Lambert veulent une piscine (★), le moteur les écarte du bien de Mme Garcia —
// 4 acquéreurs prêts, pas de pastille au Live — et les garde pour les Bernard — 5, la pastille.
export const DEMO_DIRECT_HAS_POOL = true;
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
  email: 'famille.lambert-duval@example.com',
} as const;
// Le vendeur à relancer : un autre foyer que celui du dossier à préparer (M. et Mme Martin, même
// scénario d'Antibes) ; « M. et Mme Rossi » est déjà un acquéreur de la démo (Jean-Guy, 06/11).
export const DEMO_FOLLOW_UP_SELLER = 'M. et Mme Lambert-Duval';
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
  // Mission 140 — la langue du vendeur ; le français pour tous, sauf les Bernard.
  language: 'fr' | 'en';
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
      language: 'fr',
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
    has_pool: stage === 'direct' ? DEMO_DIRECT_HAS_POOL : subject.hasPool,
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
    sellerName:
      stage === 'direct'
        ? DEMO_DIRECT_SELLER
        : stage === 'follow_up'
          ? DEMO_FOLLOW_UP_SELLER
          : scenario.sellerName,
    language: stage === 'direct' ? DEMO_DIRECT_LANGUAGE : 'fr',
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

// Mission 135 — une annonce de la démo, telle qu'une sélection la porte.
function demoListingItem(
  scenarioId: 'vence' | 'mougins' | 'antibes',
  id: string,
  now: Date,
): DemoSelectionItemPlan {
  const scenario = DEMO_SCENARIOS.find((item) => item.id === scenarioId)!;
  const listing = scenario.listings.find((entry) => entry.id === id)!;
  const data = demoImportedData(listing, now);
  return {
    source: 'listing',
    listingId: id,
    label: labelOf(listing.propertyType, data),
    listedPrice: data.price,
    priceSeenOn: now.toISOString().slice(0, 10),
    category: 'compromise',
    gaps: [],
    imported: data,
    snapshot: {
      propertyType: listing.propertyType,
      city: data.city ?? null,
      surfaceArea: data.surfaceArea ?? null,
      roomsCount: data.roomsCount ?? null,
      // Mission 142 — la position de l'annonce, comme Stream Estate la donne : « Vivre ici » en part,
      // arrondie au quartier.
      features: { location: listing.location },
    },
  };
}

// Mission 142 — Mr and Mrs Wilson (anglophones) : une sélection d'un appartement d'Antibes, et une
// visite demandée sur lui ; sa fiche « Vivre ici » part du quartier de l'annonce.
export const DEMO_WILSON_SELECTED_DAYS_AGO = 4;
export const DEMO_WILSON_PRIORITIES = ['shops_on_foot', 'schools'] as const;
export function demoWilsonSelectionPlan(now: Date): DemoSelectionItemPlan[] {
  return [demoListingItem('antibes', 'ant-01', now)];
}

// Mission 135 — les Lambert : une sélection partagée il y a 3 jours, sans réponse (la relance de
// leur lien est due). Deux maisons de Vence, dont celle à la piscine qu'ils veulent.
export const DEMO_LAMBERT_SHARED_DAYS_AGO = 3;
export function demoLambertSelectionPlan(now: Date): DemoSelectionItemPlan[] {
  return [demoListingItem('vence', 'ven-02', now), demoListingItem('vence', 'ven-04', now)];
}

// Mission 135 — les Keller : une sélection présentée il y a 21 jours, deux biens refusés pour « Le
// prix » (l'ajustement de leur recherche apparaît sur leur fiche, la règle de la 122).
export const DEMO_KELLER_REFUSALS_DAYS_AGO = 21;
export function demoKellerRefusalsPlan(now: Date): DemoSelectionItemPlan[] {
  return [demoListingItem('mougins', 'mou-06', now), demoListingItem('mougins', 'mou-01', now)];
}

// Mission 136 — la veille des Keller : un passage d'il y a 2 jours, deux maisons à piscine arrivées
// sur le marché depuis, dans leurs communes et sous leur plafond + 5 %, que l'agence ne connaît pas
// (ni concurrent d'un dossier, ni dans leurs sélections, refus compris, ni nouveau venu du Point
// marché de Mougins). Les autres acquéreurs prêts ont leur passage, sans rien trouvé : la démo est le
// miroir du produit (aucun appel, M114).
export const DEMO_WATCH_DAYS_AGO = 2;
const KELLER_KNOWN = ['mou-01', 'mou-02', 'mou-03', 'mou-06', 'mou-07'];

export function demoKellerWatchListings(): DemoListing[] {
  const scenario = DEMO_SCENARIOS.find((item) => item.id === 'mougins')!;
  const keller = DEMO_BUYERS.find((buyer) => buyer.name === 'Famille Keller')!;
  const ceiling = budgetCeiling(keller.budgetMax ?? null) ?? Infinity;
  const competitors = new Set(demoSeedCompetitors(scenario).map((listing) => listing.id));
  return scenario.listings
    .filter(
      (listing) =>
        listing.propertyType === 'house' &&
        listing.hasPool === true &&
        listing.price <= ceiling &&
        !competitors.has(listing.id) &&
        !KELLER_KNOWN.includes(listing.id),
    )
    .slice(0, 2);
}

export function demoKellerWatchFinds(now: Date): WatchFind[] {
  const arrived = demoKellerWatchListings().map((listing) =>
    demoStreamEstateProperty(listing, now, new Date(now.getTime() - 3_600_000).toISOString()),
  );
  const parsed = parseStreamEstateResponse(
    { 'hydra:totalItems': arrived.length, 'hydra:member': arrived },
    now,
  );
  return (parsed?.candidates ?? [])
    .map(toWatchFind)
    .filter((find): find is WatchFind => find != null);
}

// Mission 137 — le bon de visite de la démo : la visite des Keller au mandat de Mougins, demandée
// il y a 2 jours, faite et signée aujourd'hui, « Offre envisagée » ; un visiteur et une adresse inventés, un n° de mandat au format
// d'un registre des mandats.
export const DEMO_VOUCHER_DAYS_AGO = 2;
export const DEMO_VOUCHER_VISITOR = 'Paul Keller';
export const DEMO_VOUCHER_VISITOR_ADDRESS = '5 chemin des Figurants, 69006 Lyon';
export const DEMO_VOUCHER_MANDATE = 'M-2026-0142';
export const DEMO_VOUCHER_FEEDBACK = 'Une offre se prépare ; le prix reste leur question.';

// Mission 139 — le compte rendu de la visite des Keller (la fiche de la mission) : « Intéressé ·
// aimé : piscine, extérieur · gêné : prix », la suite « Offre envisagée ».
export const DEMO_KELLER_VISIT_REPORT = {
  opinion: 'interested',
  liked: ['outdoor', 'pool'],
  disliked: ['price'],
  next_step: 'offer',
} as const satisfies {
  opinion: VisitOpinion;
  liked: VisitTag[];
  disliked: VisitTag[];
  next_step: VisitNextStep;
};

// Mission 139 — les six biens écartés pour les Lambert la semaine écoulée : des villas de Mougins,
// hors de leur secteur et de leur budget (« 3 pour le prix, 2 pour le secteur, 1 pour le
// stationnement »).
export function demoLambertDismissalPlan(): { listingId: string; reason: DismissReason }[] {
  return [
    { listingId: 'mou-04', reason: 'over_budget' },
    { listingId: 'mou-05', reason: 'over_budget' },
    { listingId: 'mou-06', reason: 'over_budget' },
    { listingId: 'mou-08', reason: 'sector' },
    { listingId: 'mou-10', reason: 'sector' },
    { listingId: 'mou-11', reason: 'parking' },
  ];
}

// Mission 137 B — l'offre d'achat des Keller : deux offrants inventés (aucune donnée d'un modèle
// d'origine), sans prêt, au prix de commercialisation moins 3 %, au millier ; honoraires de 4 % à la
// charge du vendeur, au millier ; acompte de 5 % ; valable jusqu'à demain, avant-contrat sous 45 jours
// (jours de Paris). Le cadastre et la contenance sont inventés, au format d'un relevé.
const parisIsoDay = (date: Date): string => {
  const [day, month, year] = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(date)
    .split('/');
  return `${year}-${month}-${day}`;
};
const frenchFromIso = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};
const thousand = (value: number): number => Math.round(value / 1000) * 1000;

export function demoKellerOfferPlan(price: number, now: Date) {
  const offered = thousand(price * 0.97);
  const validUntil = parisIsoDay(new Date(now.getTime() + 86_400_000));
  const contractDeadline = parisIsoDay(new Date(now.getTime() + 45 * 86_400_000));
  const offrants = [
    {
      civility: 'M.' as const,
      lastName: 'Keller',
      firstNames: 'Paul Antoine',
      birthDate: '1978-04-12',
      birthPlace: 'Strasbourg (67)',
      nationality: 'française',
      profession: 'ingénieur',
    },
    {
      civility: 'Mme' as const,
      lastName: 'Keller',
      firstNames: 'Anna Marie',
      birthDate: '1980-09-03',
      birthPlace: 'Colmar (68)',
      nationality: 'française',
      profession: 'architecte',
    },
  ];
  return {
    offrants,
    validUntil,
    text: {
      offrants: offrants.map((offrant) => ({
        ...offrant,
        birthDate: frenchFromIso(offrant.birthDate),
      })),
      address: DEMO_VOUCHER_VISITOR_ADDRESS,
      matrimonial:
        'mariés sous le régime de la communauté réduite aux acquêts, le 14/06/2008 à Strasbourg (67)',
      fiscalResidenceFrance: true,
      mandateNumber: DEMO_VOUCHER_MANDATE,
      agent: null,
      condominium: false,
      parcels: [
        { prefix: '', section: 'AB', number: '214', lieudit: 'Les Restanques', area: '18 a 40 ca' },
      ],
      totalArea: '18 a 40 ca',
      lots: [],
      price: offered,
      feesPaidBy: 'seller' as const,
      fees: thousand(offered * 0.04),
      financing: 'cash' as const,
      loan: null,
      validUntil: frenchFromIso(validUntil),
      contractDeadline: frenchFromIso(contractDeadline),
      deposit: thousand(offered * 0.05),
    },
  };
}
