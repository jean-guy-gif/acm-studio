import type { LivePageType } from '@/features/live-seller/services/build-live-pages';
import type {
  DangerousReason,
  MarketDurationReason,
  PriceCoherence,
  PropertyConfirmed,
  SeriousCompetitor,
} from '@/features/live-seller/constants';
import type { DpeClass } from '@/features/dpe/services/dpe';
import type {
  Exposure,
  GeneralCondition,
  HeatingType,
  OutdoorSpace,
  ParkingType,
  PropertyType,
} from '@/features/subject-property/constants/property-options';

// Mission 140 — tout ce que voit ou reçoit le client, écrit et relu, jamais par une IA (23/10) : un
// fichier par langue (`fr.ts`, `en.ts`), mêmes clés, ce type écrit à la main. Une clé manquante dans
// une langue échoue au typecheck (jamais de `Partial`) ; un test parcourt toutes les clés. Les
// phrases variables sont des fonctions. L'interface du conseiller reste en français, hors de ces
// fichiers. Pur.

export type ClientTexts = {
  // Les mots des caractéristiques d'un bien, partout où le client les lit.
  labels: {
    propertyType: Record<PropertyType, string>;
    exposure: Record<Exposure, string>;
    condition: Record<GeneralCondition, string>;
    heating: Record<HeatingType, string>;
    outdoor: Record<OutdoorSpace, string>;
    parking: Record<ParkingType, string>;
  };
  // Ce qui se répète partout : le nombre de pièces d'un bien, un bien sans libellé, « Votre réponse ».
  common: {
    rooms: (count: number) => string;
    competitorFallback: string;
    yourAnswer: string;
    commentOptional: string;
    questionMark: string;
  };
  live: LiveTexts;
};

export type LiveTexts = {
  // Le titre de chaque écran, dans la barre de progression.
  titles: Record<LivePageType, string>;
  // La scène : ses boutons, sa barre du bas, la confirmation de sortie, ses messages.
  shell: {
    kicker: string;
    competitorOf: (index: number, total: number) => string;
    stepOf: (step: number, total: number) => string;
    previous: string;
    skip: string;
    validate: string;
    confirm: string;
    revealDuration: string;
    finish: string;
    retry: string;
    saving: string;
    savingPrice: string;
    answerSaved: string;
    noteSaved: string;
    failedSave: string;
    connectionLost: string;
    saveFailed: string;
    analysisFailed: string;
    noteFailed: string;
    durationMissing: string;
    priceGuessMissing: string;
    perceivedMissing: string;
    revisedMissing: string;
    unavailable: string;
    quitTitle: string;
    quitUnsaved: string;
    quitSaved: string;
    stay: string;
    quit: string;
    quitAnyway: string;
    light: string;
    dark: string;
    toLight: string;
    toDark: string;
    fullscreen: string;
    exitFullscreen: string;
  };
  perceived: {
    question: string;
    savedHint: string;
    hint: string;
    label: string;
    confirmHint: string;
  };
  competition: {
    question: string;
    hint: string;
    serious: Record<SeriousCompetitor, string>;
  };
  priceReveal: {
    question: string;
    guessFirst: string;
    hint: string;
    listed: string;
    imagined: string;
    gap: string;
    perSqm: string;
    position: string;
    legend: string;
  };
  duration: {
    question: string;
    revealedHint: string;
    hint: string;
    listed: string;
    perSqm: string;
    serious: string;
    notGiven: string;
    days: (count: number) => string;
    label: string;
    unit: string;
    why: string;
    answerFirst: string;
    observed: string;
    unavailable: string;
    observedSince: (days: number) => string;
    more: (gap: string, guess: string) => string;
    less: (gap: string, guess: string) => string;
    initialPrice: string;
    drop: string;
    noHistory: string;
  };
  quick: {
    guessQuestion: string;
    guessHint: string;
    seriousLegend: string;
    nextScreen: string;
    revealQuestion: string;
    priceOnly: string;
    durationShown: string;
    durationAsk: string;
    durationNote: string;
  };
  direct: {
    question: string;
    hint: string;
  };
  price: {
    question: string;
    savedHint: string;
    hint: string;
    label: string;
    note: string;
  };
  intro: {
    kicker: string;
    title: string;
    start: string;
    count: (count: number) => string;
  };
  property: {
    title: string;
    askHint: string;
    showHint: string;
    fallbackAlt: string;
    stats: {
      type: string;
      surface: string;
      rooms: string;
      bedrooms: string;
      floor: string;
      exposure: string;
      condition: string;
      construction: string;
      heating: string;
      energy: string;
      ges: string;
      outdoor: string;
      parking: string;
      district: string;
      city: string;
      address: string;
    };
    highlights: string;
    question: string;
    confirmed: Record<PropertyConfirmed, string>;
    comment: string;
  };
  dpe: {
    title: string;
    hint: string;
    yours: string;
    noDpe: string;
    competitors: string;
    competitorCount: (count: number) => string;
    // Le repère : la lettre médiane des concurrents ; « devra être en A », « en C ou mieux ».
    unknown: (reference: DpeClass) => string;
    better: string;
    equal: string;
    worse: string;
  };
  revised: {
    question: string;
    savedHint: string;
    hint: string;
    label: string;
    confirmHint: string;
  };
  closest: {
    title: string;
    hint: string;
    badge: string;
  };
  dangerous: {
    question: string;
    hint: string;
    none: string;
    review: string;
    others: string;
    unknownLocation: string;
    imagined: (price: string) => string;
    gap: (amount: string) => string;
    serious: (answer: string) => string;
    notGiven: string;
    why: string;
  };
  answers: {
    coherence: Record<PriceCoherence, string>;
    durationReason: Record<MarketDurationReason, string>;
    dangerousReason: Record<DangerousReason, string>;
  };
};
