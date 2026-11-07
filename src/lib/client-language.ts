// Mission 139 — la langue du client, et Mission 140 — pour tout ce qu'il voit ou reçoit (le Live,
// les documents, les liens, les messages) ; l'interface du conseiller reste en français. Ses textes
// s'écrivent dans sa langue, depuis des modèles écrits et relus, jamais par une IA
// (décision du 23/10). Le français part toujours ; chaque autre langue n'est proposée sur la fiche
// qu'une fois ses modèles relus par un locuteur natif (décision de Jean-Guy, 06/11) — une constante
// par langue, que Jean-Guy allume après relecture (`docs/MODELES_A_RELIRE.md`). Pur.

export const CLIENT_LANGUAGES = ['fr', 'en', 'it', 'de', 'ru'] as const;
export type ClientLanguage = (typeof CLIENT_LANGUAGES)[number];

// Le nom de chaque langue dans la langue elle-même, comme le client la reconnaît.
export const CLIENT_LANGUAGE_LABELS: Record<ClientLanguage, string> = {
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

const OFFERED: Record<ClientLanguage, boolean> = {
  fr: true,
  en: LANGUE_ANGLAIS_PROPOSEE,
  it: LANGUE_ITALIEN_PROPOSEE,
  de: LANGUE_ALLEMAND_PROPOSEE,
  ru: LANGUE_RUSSE_PROPOSEE,
};

export function isClientLanguage(value: unknown): value is ClientLanguage {
  return typeof value === 'string' && (CLIENT_LANGUAGES as readonly string[]).includes(value);
}

// Les langues que la fiche propose ; celle déjà posée sur la fiche reste choisie, même cachée (un
// acquéreur de la démo, ou une langue éteinte après coup) : rien n'est réécrit en silence.
export function offeredLanguages(current?: ClientLanguage | null): ClientLanguage[] {
  return CLIENT_LANGUAGES.filter((language) => OFFERED[language] || language === current);
}

// La langue d'une fiche ou d'un dossier, lue en base : une valeur inconnue vaut le français (M51).
export function clientLanguage(value: unknown): ClientLanguage {
  return isClientLanguage(value) ? value : 'fr';
}

// Mission 140 (décision de Jean-Guy, 07/11) — la langue dans laquelle on écrit vraiment au client :
// la sienne si elle est proposée (relue par un natif), sinon le français. Aucune langue non relue
// n'atteint un client, même si une fiche la porte déjà.
export function spokenLanguage(value: unknown): ClientLanguage {
  const language = clientLanguage(value);
  return OFFERED[language] ? language : 'fr';
}
