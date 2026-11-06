// Mission 139 — la langue du client : ses messages (compte rendu de visite, point de la semaine,
// point proposé) s'écrivent dans sa langue, depuis des modèles écrits et relus, jamais par une IA
// (décision du 23/10). Le français part toujours ; chaque autre langue n'est proposée sur la fiche
// qu'une fois ses modèles relus par un locuteur natif (décision de Jean-Guy, 06/11) — une constante
// par langue, que Jean-Guy allume après relecture (`docs/MODELES_A_RELIRE.md`). Pur.

export const BUYER_LANGUAGES = ['fr', 'en', 'it', 'de', 'ru'] as const;
export type BuyerLanguage = (typeof BUYER_LANGUAGES)[number];

// Le nom de chaque langue dans la langue elle-même, comme le client la reconnaît.
export const BUYER_LANGUAGE_LABELS: Record<BuyerLanguage, string> = {
  fr: 'Français',
  en: 'English',
  it: 'Italiano',
  de: 'Deutsch',
  ru: 'Русский',
};

// Proposées sur la fiche : relues. Les autres sont écrites et testées, mais cachées.
export const LANGUE_ANGLAIS_PROPOSEE = true;
export const LANGUE_ITALIEN_PROPOSEE = false;
export const LANGUE_ALLEMAND_PROPOSEE = false;
export const LANGUE_RUSSE_PROPOSEE = false;

const OFFERED: Record<BuyerLanguage, boolean> = {
  fr: true,
  en: LANGUE_ANGLAIS_PROPOSEE,
  it: LANGUE_ITALIEN_PROPOSEE,
  de: LANGUE_ALLEMAND_PROPOSEE,
  ru: LANGUE_RUSSE_PROPOSEE,
};

export function isBuyerLanguage(value: unknown): value is BuyerLanguage {
  return typeof value === 'string' && (BUYER_LANGUAGES as readonly string[]).includes(value);
}

// Les langues que la fiche propose ; celle déjà posée sur la fiche reste choisie, même cachée (un
// acquéreur de la démo, ou une langue éteinte après coup) : rien n'est réécrit en silence.
export function offeredLanguages(current?: BuyerLanguage | null): BuyerLanguage[] {
  return BUYER_LANGUAGES.filter((language) => OFFERED[language] || language === current);
}

// La langue d'une fiche, lue en base : une valeur inconnue vaut le français (M51).
export function buyerLanguage(value: unknown): BuyerLanguage {
  return isBuyerLanguage(value) ? value : 'fr';
}
