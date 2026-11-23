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
// Ce qui rapproche les ventes retenues du bien : les critères du choix (le nombre de pièces, puis la
// surface) et leurs valeurs (« 5 pièces », « de 128 à 142 m² »).
export type StudyLikeness = { rooms: boolean; surface: boolean; facts: string | null };
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
    // Correctifs 163 — à la place de « 1 source, citée page 7 » : depuis combien de temps la moitié
    // des biens en vente attendent un acheteur, lu sur leurs fiches (proposition, Jean-Guy 23/11).
    // `approximate` : une durée reconstituée (sans date de publication), dite « environ » (M127).
    kpiDays: (days: number, approximate: boolean) => string;
    kpiDaysLabel: (kind: StudyKind) => string;
    page: (page: number) => string;
    howTitle: string;
    how: (competitors: boolean, sales: boolean, quartier: boolean, kind: StudyKind) => string;
    valueTitle: (kind: StudyKind) => string;
    // Mission 163 C — `proposed` : le prix d'une conclusion qui n'est pas un mandat signé.
    value: (price: string | null, proposed: boolean) => string;
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
    // Correctifs 163 — le vrai critère des ventes retenues : celles qui ressemblent le plus au bien
    // (le nombre de pièces, puis la surface), jamais « les plus proches », qui se lit « les plus près ».
    // `likeness` : ce qui les rapproche (« 5 pièces, de 128 à 142 m² »), null sans pièces ni surface
    // du bien (alors les plus récentes).
    itemSub: (
      count: number,
      kept: number,
      kind: StudyKind,
      likeness: StudyLikeness | null,
    ) => string;
    tableTitle: (count: number, kept: number, kind: StudyKind, likeness: boolean) => string;
    tableNote: (likeness: StudyLikeness) => string;
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
    itemSub: (price: string, proposed: boolean, cheaper: number, kind: StudyKind) => string;
    avis: (cheaper: number, kind: StudyKind, strengths: string | null) => string;
    verdictNote: string;
    source: (day: string, proposed: boolean, kind: StudyKind) => string;
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
    is: (
      kind: StudyKind,
      day: string,
      withSales: boolean,
      price: 'agreed' | 'proposed' | null,
    ) => string;
    sourceRows: {
      competitors: string;
      sales: string;
      planning: string;
      risks: string;
      condominium: string;
      // Correctifs 163 — le libellé suit les blocs réellement présents.
      planningOnly: string;
      permitsOnly: string;
      risksOnly: string;
      peopleOnly: string;
    };
    competitorsSource: string;
  };
};
