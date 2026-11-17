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
import type { AvailabilitySlot, ItemAnswer, NoReason } from '@/features/buyer-deck/types';
import type { BuyerCriterion } from '@/features/buyers/types';
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
    // Mission 148 — le commentaire facultatif s'ouvre sur place, à la demande.
    addComment: string;
    questionMark: string;
    unknownLocation: string;
    // Un lien remis qui ne s'ouvre plus (M127 B) : la personne n'est pas connue, la page dit les deux.
    linkGone: {
      title: string;
      body: (what: string, feminine: boolean) => string;
      what: Record<
        'synthesis' | 'marketUpdate' | 'marketStudy' | 'dossier' | 'offer' | 'voucher',
        string
      >;
    };
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
      // Mission 148 — la pastille compacte : « Surface · pour vous ».
      chipStatus: Record<'competitor_advantage' | 'competitor_weakness', string>;
    };
    // Mission 148 — la réponse du vendeur face au prix affiché d'un concurrent : « Votre réponse :
    // 5,4 % en dessous du prix affiché ». La couleur ne parle jamais seule.
    guessGap: {
      below: (percent: string) => string;
      above: (percent: string) => string;
      equal: string;
      answer: (amount: string) => string;
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
  // Mission 157 B — le lien « Vivre ici » du bien, montré au vendeur (le Live, la synthèse, l'Étude
  // de marché). Jamais le nom du service : seule l'adresse du lien se voit (Jean-Guy, 17/11).
  neighbourhood: {
    title: string;
    subtitle: string;
    heading: string;
    open: string;
    scan: (address: string) => string;
    // Le QR code seul, sans l'adresse du lien à taper.
    scanOnly: string;
    validUntil: (day: string) => string;
  };
  live: LiveTexts;
  documents: DocumentTexts;
  buyer: BuyerTexts;
  // Mission 140 (décision de Jean-Guy, 07/11) — ce que le vendeur reçoit après une visite de son bien.
  sellerVisit: {
    hello: (name: string) => string;
    line: (day: string, opinion: string) => string;
    opinions: Record<'love' | 'interested' | 'mixed' | 'not_for_me', string>;
    liked: (list: string) => string;
    disliked: (list: string) => string;
    closing: string;
    subject: string;
  };
};

// Mission 140 B — ce que voit ou reçoit l'acquéreur, dans sa langue : ses messages (proposition,
// relance, lien, réponse à son offre), la présentation, son dossier et son lien.
export type BuyerTexts = {
  // Le déroulé de sa recherche (M122) : la grille, ses critères bien par bien, ses mots.
  deck: {
    count: {
      rooms: (n: number) => string;
      bedrooms: (n: number) => string;
      days: (n: number) => string;
    };
    ordinal: (n: number) => string;
    criteria: Record<BuyerCriterion, string>;
    nouns: Record<BuyerCriterion, string>;
    and: (items: string[]) => string;
    row: {
      house: string;
      apartment: string;
      or: string;
      budget: (amount: string) => string;
      andMore: (text: string) => string;
      groundFloorAccepted: string;
      floor: (n: number) => string;
      energy: (letter: string) => string;
      noWorks: string;
    };
    judge: {
      check: (label: string) => string;
      aHouse: string;
      anApartment: string;
      houseNotFlat: string;
      flatNotHouse: string;
      inCity: (city: string) => string;
      outsideCities: (city: string) => string;
      priceToConfirm: string;
      priceToCheck: string;
      inBudgetMargin: (amount: string) => string;
      inBudget: string;
      overNegotiable: (amount: string) => string;
      overBudget: (amount: string) => string;
      asAsked: (said: string) => string;
      insteadOf: (said: string, wanted: string) => string;
      floorInsteadOf: (said: string, min: number) => string;
      noOutdoor: string;
      noParking: string;
      aPool: string;
      noPool: string;
      groundFloor: string;
      floor: (n: number) => string;
      anElevator: string;
      noElevator: string;
      dpe: (letter: string) => string;
      dpeBeyond: (letter: string, max: string) => string;
      worksNeeded: string;
      noWorksAnnounced: string;
    };
    words: {
      house: (rooms: number | null) => string;
      rooms: (rooms: number) => string;
      apartment: string;
      property: string;
      where: (cities: string[]) => string;
      bedrooms: (n: number) => string;
      surface: (area: string) => string;
      outdoor: string;
      parking: string;
      pool: string;
      floor: (n: number) => string;
      elevator: string;
      energy: (letter: string) => string;
      noWorks: string;
      budget: (amount: string) => string;
    };
    pitch: {
      pool: string;
      garden: string;
      terrace: string;
      garage: string;
      at: (city: string) => string;
      margin: (amount: string) => string;
      fallback: (ok: number, total: number, nouns: string, many: boolean) => string;
    };
    dated: {
      listedToday: string;
      listedFor: (days: number) => string;
      drop: (amount: string, days: number | null) => string;
    };
    lead: {
      several: (letters: string[]) => string;
      full: (letter: string) => string;
      most: (letter: string, ok: number, total: number) => string;
    };
    priceLine: (amount: string) => string;
    seenOn: (day: string) => string;
    criteriaCount: (ok: number, total: number) => string;
  };
  // La présentation (M122), le lien sur téléphone et le PDF du dossier acquéreur (M122 B).
  screens: {
    answers: Record<ItemAnswer, string>;
    gridAnswers: Record<ItemAnswer, string>;
    reasons: Record<NoReason, string>;
    slots: Record<AvailabilitySlot, string>;
    mustHave: string;
    legendMarks: string;
    wordsTitle: string;
    pitchTitle: string;
    nextTitle: string;
    connectionLost: string;
    kickerSelection: (count: number) => string;
    kickerCriteria: string;
    kickerItem: (letter: string, count: string) => string;
    kickerAnswer: string;
    finishedOn: (day: string) => string;
    meetingLabel: string;
    noAnswer: string;
    visit: (count: number, letters: string) => string;
    when: string;
    hesitate: (count: number, letters: string) => string;
    notForYou: (letter: string) => string;
    nextStep: (count: number, letters: string) => string;
    letters: (letters: string[]) => string;
    unanswered: (letters: string[], verb: 'finish' | 'send') => string;
    cancel: string;
    finishAnyway: string;
    sendAnyway: string;
    close: string;
    finish: string;
    previous: string;
    next: string;
    backToGrid: string;
    gridShort: string;
    toAvailability: string;
    availabilityShort: string;
    quitTitle: string;
    quitSaved: string;
    seeItem: (letter: string) => string;
    why: string;
    // Le lien sur téléphone et le PDF.
    yourSlots: (slots: string) => string;
    reasonsSuffix: (reasons: string) => string;
    propertiesForYou: (count: number) => string;
    advisorLabel: string;
    propertiesCount: (count: number) => string;
    answeredTitle: string;
    seenTogether: (count: number, letters: string) => string;
    hereIsWhat: string;
    selectionOf: (day: string) => string;
    forYou: string;
    seeSelection: string;
    notYetAnswered: string;
    sending: string;
    send: string;
    noAnswerYet: string;
    thanks: string;
    seenTogetherTitle: string;
    // Mission 147 — le lien client « Vivre ici » d'Academia, sous un bien de l'agence.
    livingHereLink: string;
    livingHereLinkHint: string;
    download: string;
    presented: string;
    alreadyAnswered: string;
    expired: string;
    sendFailed: string;
    confidential: string;
    criterion: string;
    choicesTitle: string;
    disclaimer: string;
    tabTitle: string;
    propertyFallback: string;
  };
  messages: {
    hello: (name: string) => string;
    // « la maison de Vence », « the house in Vence » : le bien dans une phrase.
    phrase: (kind: 'house' | 'apartment' | 'other', city: string | null) => string;
    propertyAt: (address: string) => string;
    has: { pool: string; outdoor: string; parking: string; elevator: string };
    withList: (items: string[]) => string;
    at: (city: string) => string;
    selection: (url: string) => string;
    proposal: {
      noun: { house: string; apartment: string };
      margin: (amount: string) => string;
      line: (what: string, margin: string | null) => string;
      ask: string;
      subject: string;
    };
    relaunch: {
      ask: (day: string) => string;
      subjectNoun: { house: string; apartment: string; other: string };
      fits: (ask: string, what: string, feminine: boolean) => string;
      noFit: (ask: string) => string;
      subject: string;
    };
    share: { message: (url: string) => string; subject: string };
    offer: {
      accepted: (property: string, day: string, url: string | null) => string[];
      refused: (property: string) => string[];
      subject: string;
    };
    // Mission 142 — « Confirmer la visite » : le jour, l'heure, et le lien vers sa sélection.
    visitConfirm: {
      // Mission 147 — le lien client « Vivre ici » d'Academia du bien, s'il est collé sur le mandat.
      lines: (
        property: string,
        day: string,
        time: string,
        url: string,
        livingHereUrl: string | null,
      ) => string[];
      subject: string;
    };
  };
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
    // Mission 148 B (Jean-Guy, 09/11) — le « Prix des concurrents » dit sur quels concurrents il porte,
    // sans dire quand il a été fixé (une décision reste modifiable jusqu'à la conclusion) ; la
    // position du prix convenu dit face à combien de concurrents vus.
    basisCalculated: (count: number, seen: number | null) => string;
    basisAdvisor: (count: number, seen: number | null) => string;
    positionAmongSeen: {
      mostExpensive: string;
      cheapest: string;
      amongMostExpensive: string;
      amongCheapest: string;
      middle: string;
      rank: (rank: number) => string;
      sentence: (where: string, seen: number) => string;
    };
    // « Concurrent 1 · pas un concurrent pour vous » : sa ligne, sans barre, dans les prix au m².
    notConsideredRow: (label: string) => string;
    thePrice: string;
    youImagined: string;
    listedShort: string;
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
    print: string;
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
    connectionLostTouch: (button: string, isRetry: boolean) => string;
    saveFailedTouch: (button: string, isRetry: boolean) => string;
    sessionExpired: string;
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
    // Mission 148 — en trois boutons côte à côte (rythme accéléré).
    seriousShort: Record<SeriousCompetitor, string>;
  };
  priceReveal: {
    question: string;
    guessFirst: string;
    hint: string;
    listed: string;
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
    // La durée observée, révélée : « 1 200 jours » (toujours au pluriel, comme avant la mission).
    observedDays: (count: number) => string;
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
  // Mission 152 — « Voir l'annonce », une fois le prix dévoilé : le portail dans un nouvel onglet,
  // ou, quand l'annonce n'est plus en ligne, la copie enregistrée (le prix et ses dates, les
  // photos, les caractéristiques ; jamais le texte de l'annonce).
  listing: {
    open: string;
    opening: string;
    failed: (button: string) => string;
    title: string;
    close: string;
    listed: string;
    recorded: (
      portal: string | null,
      day: string,
      atImport: boolean,
      price: string | null,
    ) => string;
    recordedAsIs: string;
    lastCheck: (day: string, price: string, unchanged: boolean) => string;
    drop: (from: string, to: string, day: string) => string;
    gone: (day: string | null) => string;
    bedrooms: (count: number) => string;
    land: (area: string) => string;
    dpe: (rating: string) => string;
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
    thanksTab: string;
    resume: string;
  };
  answers: {
    coherence: Record<PriceCoherence, string>;
    // Mission 148 — les libellés courts des choix, devant le vendeur.
    coherenceShort: Record<PriceCoherence, string>;
    dangerousReasonShort: Record<DangerousReason, string>;
    durationReason: Record<MarketDurationReason, string>;
    dangerousReason: Record<DangerousReason, string>;
  };
};
