import type { LivePageType } from '@/features/live-seller/services/build-live-pages';
import type {
  ComparisonCriterion,
  ComparisonStatus,
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
    unknownLocation: string;
    photos: {
      noneForListing: string;
      unavailable: string;
      short: string;
      enlarge: (count: number) => string;
      photoOf: (index: number, count: number) => string;
      viewer: string;
      close: string;
      previous: string;
      next: string;
    };
    // « Calculé sur 8 concurrents, dont 6 vus ensemble » : ce sur quoi porte le prix des concurrents.
    priceBasis: {
      advisorOnly: string;
      advisorFrom: (competitors: string) => string;
      calculatedOn: (competitors: string) => string;
      competitors: (count: number, seen: number | null) => string;
    };
    // La grille comparée d'un concurrent, lue du côté du vendeur (correctif M129).
    grid: {
      title: string;
      empty: string;
      criteria: Record<ComparisonCriterion, string>;
      status: Record<ComparisonStatus, string>;
      none: string;
      legend: {
        green: string;
        grey: string;
        orange: string;
        forYou: string;
        equivalent: string;
        forThem: string;
      };
    };
    // Le prix de commercialisation face à l'analyse du conseiller (M116) : le libellé de sa couleur.
    alignment: Record<'green' | 'orange' | 'red', string>;
    // « À 380 000 €, votre bien serait le plus cher des 7 biens comparés. » (M94)
    pricePosition: {
      sentence: (price: string, where: string) => string;
      mostExpensive: (total: number) => string;
      cheapest: (total: number) => string;
      amongMostExpensive: (total: number) => string;
      amongCheapest: (total: number) => string;
      middle: (total: number) => string;
      rank: (rank: number, total: number) => string;
    };
  };
  live: LiveTexts;
  documents: DocumentTexts;
};

// Mission 140 — les documents remis au vendeur : la synthèse (M113), le Point marché (M127, M129),
// l'Étude de marché (M131), leurs liens et leurs messages. Les mentions légales de l'agence (carte
// professionnelle, garantie, « Ne peut recevoir aucun fonds ») restent en français jusqu'à la
// décision du juriste (Jean-Guy, 06/11) : elles ne sont pas ici.
export type DocumentTexts = {
  common: {
    confidential: string;
    advisor: string;
    contactCard: string;
    disclaimer: string;
    yours: (value: string) => string;
    days: (days: string) => string;
    since: string;
    onMarketFor: (days: string) => string;
    livingArea: string;
    land: string;
    roomsBedrooms: string;
    bedrooms: (count: number) => string;
    bedroomsShort: (count: number) => string;
    outdoor: string;
    parking: string;
    energy: string;
    energyLetter: (kind: 'dpe' | 'ges', letter: string) => string;
    floor: string;
    floorOrdinal: (floor: number) => string;
    floorOf: (total: number) => string;
    // Le bilan des devinettes, à la 2e personne (M96, M113).
    guesses: {
      under: (count: number, total: number, percent: string) => string;
      over: (count: number, total: number, percent: string) => string;
      exact: (count: number) => string;
    };
  };
  synthesis: {
    seriousShort: Record<'yes' | 'unsure' | 'no', string>;
    seriousQuestion: string;
    notConsidered: string;
    thePrice: string;
    youImagined: string;
    listedShort: string;
    gapVsAnswer: (percent: string) => string;
    durationTitle: string;
    knownDrop: (amount: string) => string;
    listed: string;
    whyYou: string;
    agreedPrice: string;
    agreedTogether: string;
    afterSeeing: string;
    agreedTogetherHint: string;
    badge: string;
    coverTitle: string;
    titleDay: (day: string) => string;
    forSeller: (name: string) => string;
    propertyTitle: string;
    propertyHint: string;
    strengths: string;
    perceivedAtStart: string;
    competitorsTitle: string;
    competitorsHint: string;
    dpeHint: string;
    dpeProperties: (count: number) => string;
    dpeReference: (letter: string) => string;
    dangerousTitle: string;
    analysisTitle: string;
    analysisHint: string;
    bandTitle: string;
    keyPoint: string;
    medianAge: string;
    perSqmTitle: string;
    median: string;
    pathTitle: string;
    pathHint: string;
    answersTitle: string;
    agreedPerSqm: string;
    amongCompared: string;
    stepsBand: string;
  };
  // Le Point marché (M127, M129) et son classement « Où en est votre prix ».
  marketUpdate: {
    download: string;
    badge: string;
    coverTitle: string;
    titleDay: (day: string) => string;
    sinceMeeting: (day: string) => string;
    forSeller: (name: string) => string;
    agreedPrice: string;
    followed: string;
    newcomersCount: string;
    competitorsTitle: string;
    competitorsHint: string;
    newcomersTitle: string;
    newcomersHint: (since: string | null, from: string | null) => string;
    earlierTitle: string;
    earlierHint: string;
    rankingTitle: string;
    noRanking: string;
    readingTitle: string;
    reading: string;
    dangerousToday: string;
    dangerousYours: string;
    beforeMeeting: string;
    newcomer: string;
    meetingChoice: string;
    notShown: string;
    features: string;
    newcomerPriceTitle: string;
    seenSince: string;
    notYetListed: string;
    newcomerNote: string;
    priceTitle: string;
    atMeeting: string;
    unread: string;
    unreadHint: string;
    meetingPriceHint: string;
    todayPrice: string;
    today: string;
    removed: (day: string | null, after: string | null) => string;
    lastPrice: (price: string) => string;
    droppedSeen: (day: string) => string;
    raisedSeen: (day: string) => string;
    readOn: (day: string) => string;
    conclusion: string;
    gap: string;
    noConclusion: string;
    unchanged: string;
    gapAmount: (amount: string, lower: boolean) => string;
    noGap: string;
    likelySale: (min: string, max: string) => string;
    likelySaleNote: string;
    withdrawnNote: string;
    stillListed: string;
    sinceDays: (days: string) => string;
    perSqmToday: (value: string) => string;
    days: (days: number, approximate: boolean) => string;
    withdrawnLabel: string;
    probableSaleLabel: (min: number, max: number) => string;
    ranking: {
      words: Record<'green' | 'orange' | 'red', string>;
      legend: Record<'green' | 'orange' | 'red', string>;
      // « 1<sup>er</sup> tiers : » : le chiffre, son exposant, la suite (deux-points compris).
      legendTiers: { number: string; sup: string; rest: string }[];
      youAre: (word: string) => string;
      ordinal: (rank: number) => string;
      of: (total: number) => string;
      atMeeting: string;
      today: string;
      withNewcomers: string;
      meetingUnread: string;
      noNewcomer: string;
      searched: (min: string, max: string) => string;
      newBadge: string;
      dangerousToday: string;
      dangerous: string;
      yourProperty: string;
      agreedTogether: string;
      atMeetingPrice: (price: string) => string;
      todayPrice: (price: string) => string;
      tableTitle: string;
      tableMeeting: string;
      tableToday: string;
      meetingChoice: string;
      arrivedOn: (day: string) => string;
      arrivedAfter: string;
      droppedBy: (percent: string) => string;
      onMarketFor: (days: number, approximate: boolean) => string;
      noDrop: string;
      drops: (count: number) => string;
      gone: (count: number) => string;
      cheaperNewcomers: (count: number) => string;
      but: string;
      and: string;
      below: (amount: string) => string;
      above: (amount: string) => string;
      atYourPrice: string;
      newDangerous: (newcomer: boolean, label: string, price: string, where: string) => string;
      shortRooms: (label: string) => string;
    };
    share: {
      message: (url: string, since: string | null) => string;
      subject: (day: string | null) => string;
    };
  };
  // L'Étude de marché (M131).
  marketStudy: {
    badge: string;
    coverTitle: string;
    byAdvisor: (name: string) => string;
    competitorsTitle: string;
    competitorsHint: string;
    noCompetitors: string;
    priceToday: string;
    listing: string;
    removedOn: (day: string) => string;
    notRanked: string;
    alreadyDropped: string;
    advisorProposed: string;
    surface: string;
    rooms: string;
    studied: string;
    cheapest: string;
    priciest: string;
    cheaperCount: (count: number) => string;
    atPrice: (price: string, rest: string) => string;
    noReference: string;
    share: {
      message: (url: string) => string;
      subject: (day: string | null) => string;
    };
  };
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
    imagined: (price: string) => string;
    gap: (amount: string) => string;
    serious: (answer: string) => string;
    notGiven: string;
    why: string;
  };
  analysis: {
    title: string;
    pendingHint: string;
    readyHint: string;
    goTo: string;
    showAnalysis: string;
    pendingPerceived: string;
    pendingCompetitor: (index: number, label: string) => string;
    hintWithPrice: string;
    hintDirect: string;
    pathStart: (price: string) => string;
    pathAfter: (price: string) => string;
    perceived: string;
    competitorPrice: string;
    advisor: string;
    listed: string;
    range: (low: string, high: string) => string;
    median: string;
    dropped: string;
    droppedValue: (count: number, total: number) => string;
    medianDays: string;
    medianDaysValue: (days: string, count: number) => string;
    gaps: string;
    gapSellerMarket: string;
    gapSellerAdvisor: string;
    gapMarketAdvisor: string;
    band: {
      title: string;
      start: string;
      revised: string;
      dangerous: string;
      competitors: string;
      dot: string;
      marker: (label: string, price: string) => string;
    };
  };
  conclusion: {
    title: string;
    hint: string;
    perceived: string;
    competitorPrice: string;
    advisor: string;
    closestLine: string;
    dangerousLine: string;
    notSelected: string;
    justification: string;
    closestCard: string;
    dangerousCard: string;
    sentence: string;
    priceQuestion: string;
    priceHint: string;
    saving: string;
    save: string;
    saved: string;
  };
  closing: {
    question: (hasAgreedPrice: boolean) => string;
    scale: string;
    scoreGroup: string;
    launch: string;
    missing: string;
    answerOptional: string;
    agreedPrice: string;
  };
  // « Revoir » : la fiche d'un concurrent en plein écran (M113).
  competitorReview: {
    competitor: (position: number) => string;
    close: string;
    listed: string;
    perSqm: string;
    since: string;
    days: (days: string) => string;
  };
  // Mission 133 — « Montrer au vendeur » : les acquéreurs prêts de l'agence, anonymes.
  buyers: {
    phrase: string;
    promise: string;
    financing: string;
    back: string;
    since: (weeks: number) => string;
    budget: (low: number, high: number) => string;
  };
  // Les écrans neutres qui suspendent ou ferment le Live (M92).
  neutral: {
    pause: string;
    thanks: string;
    resume: string;
  };
  answers: {
    coherence: Record<PriceCoherence, string>;
    durationReason: Record<MarketDurationReason, string>;
    dangerousReason: Record<DangerousReason, string>;
  };
};
