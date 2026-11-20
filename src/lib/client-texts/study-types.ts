import type { ComparisonCriterion } from '@/features/live-seller/constants';

// Mission 163 A — l'Étude de marché en fil conducteur (maquette M163-fil-conducteur, validée par
// Jean-Guy le 20/11) : une idée par page, la conclusion en titre. Chaque phrase est écrite ici, dans
// la langue du vendeur, et composée depuis les chiffres du dossier ; jamais par une IA, jamais une
// valeur du bien, ni pression ni urgence (M85). Aucune phrase ne nomme le conseiller par un mot qui
// dirait son genre (décision de Jean-Guy, 20/11) : « L'avis de Claire Dumas », « J'en ai retenu… ».

// Le mot du bien : maison (féminin), appartement, ou bien, pour tout autre type.
export type StudyKind = 'maison' | 'appartement' | 'bien';
export type StudyCivility = 'madame' | 'monsieur' | 'both';
export type StudyRange = { from: string; to: string };
export type StudyQuartierPart = 'planning' | 'permits' | 'risks' | 'population' | 'condominium';

export type StudyTexts = {
  kicker: string;
  coverTitle: (kind: StudyKind, commune: string | null) => string;
  coverLand: (area: string) => string;
  preparedFor: string;
  preparedBy: (advisor: string | null, agency: string, day: string) => string;
  footer: (kind: StudyKind, commune: string | null, day: string) => string;
  salutation: (civility: StudyCivility, name: string) => string;
  avisBy: (advisor: string | null) => string;
  and: (items: string[]) => string;
  or: (items: string[]) => string;

  summary: {
    title: (count: number, kind: StudyKind) => string;
    lead: (salutation: string | null, withSales: boolean) => string;
    kpiCompetitors: (count: number, kind: StudyKind) => string;
    kpiSales: (count: number, kind: StudyKind, since: number) => string;
    kpiPlace: string;
    kpiSources: (count: number, page: number) => string;
    page: (page: number) => string;
    howTitle: string;
    how: (competitors: boolean, sales: boolean, quartier: boolean, kind: StudyKind) => string;
    valueTitle: (kind: StudyKind) => string;
    value: (agreed: string | null) => string;
  };

  competitors: {
    title: (inSale: number, kind: StudyKind) => string;
    lead: (inSale: number, kind: StudyKind, prices: StudyRange | null) => string;
    item: (inSale: number, kind: StudyKind, prices: StudyRange | null) => string;
    itemSub: (
      shown: number,
      advantaged: number,
      against: string | null,
      weaker: number,
      strong: string | null,
      kind: StudyKind,
    ) => string;
    avis: (
      shown: number,
      kind: StudyKind,
      advantaged: number,
      against: string | null,
      onlySurface: boolean,
      strengths: string | null,
    ) => string;
    source: (day: string) => string;
    faceTo: (kind: StudyKind) => string;
    youValue: (value: string) => string;
    equivalentOn: (criteria: string) => string;
    equivalentAll: (kind: StudyKind) => string;
    criterion: Record<ComparisonCriterion, string>;
    criterionBare: Record<ComparisonCriterion, string>;
    strength: Record<ComparisonCriterion, (value: string) => string>;
  };

  sales: {
    title: (count: number, kind: StudyKind) => string;
    lead: (
      count: number,
      since: number,
      radius: string | null,
      surface: StudyRange | null,
      prices: StudyRange | null,
    ) => string;
    item: (count: number, kind: StudyKind, surface: StudyRange | null, since: number) => string;
    itemSub: (count: number, kept: number, kind: StudyKind) => string;
    tableTitle: (count: number, kept: number, kind: StudyKind) => string;
    legendKept: (kept: number) => string;
    legendOthers: (others: number) => string;
    readTitle: string;
    read: string[];
    rooms: (values: number[]) => string | null;
    surface: (range: StudyRange) => string;
    avis: (kept: number, kind: StudyKind, rooms: string | null, surface: string | null) => string;
    privacy: string;
  };

  ranking: {
    title: (price: string, cheaper: number, kind: StudyKind) => string;
    lead: (inSale: number, kind: StudyKind) => string;
    itemBefore: string;
    itemAfter: (total: number, cheaper: number, kind: StudyKind) => string;
    itemSub: (price: string, agreed: boolean, cheaper: number, kind: StudyKind) => string;
    avis: (cheaper: number, kind: StudyKind, strengths: string | null) => string;
    verdictNote: string;
    source: (day: string, agreed: boolean, kind: StudyKind) => string;
  };

  quartier: {
    title: (conclusion: string) => string;
    parcelNothing: string;
    parcelCount: (count: number) => string;
    permits: (count: number, radius: string | null) => string;
    risks: string;
    figures: string;
    lead: (parts: StudyQuartierPart[]) => string;
    item: (conclusion: string) => string;
    riskPapers: string;
    risksNote: string;
    residents: string;
    talkTitle: string;
    talk: { lead: string; text: string }[];
    avisPermits: (count: number, dwellings: number | null, radius: string | null) => string;
    avisFlood: string;
    avisRisks: string;
    avisParcel: (count: number) => string;
  };

  next: {
    title: string;
    steps: (kind: StudyKind) => { title: string; text: string }[];
    papersTitle: string;
    papers: (kind: StudyKind) => string[];
    questionsTitle: string;
    contact: string;
    isTitle: string;
    is: (kind: StudyKind, day: string, withSales: boolean, agreed: boolean) => string;
    sourceRows: {
      competitors: string;
      sales: string;
      planning: string;
      risks: string;
      condominium: string;
    };
    competitorsSource: string;
  };
};
