import type { ClientLanguage } from '@/lib/client-language';
import { ENGLISH_TEXTS } from '@/lib/client-texts/en';
import { FRENCH_TEXTS } from '@/lib/client-texts/fr';
import type { ClientTexts } from '@/lib/client-texts/types';

// Mission 140 — les textes du client dans sa langue. Le français et l'anglais sont écrits ;
// l'italien, l'allemand et le russe viendront un par un, après relecture d'un natif (décision de
// Jean-Guy, 06/11) : d'ici là, une langue sans textes se lit en français, jamais un mélange.
export type TextLanguage = 'fr' | 'en';

export const CLIENT_TEXTS: Record<TextLanguage, ClientTexts> = {
  fr: FRENCH_TEXTS,
  en: ENGLISH_TEXTS,
};

export function textLanguage(language: ClientLanguage | null | undefined): TextLanguage {
  return language === 'en' ? 'en' : 'fr';
}

export function clientTexts(language: ClientLanguage | null | undefined): ClientTexts {
  return CLIENT_TEXTS[textLanguage(language)];
}

// « Maison », « House » : le type tel que la fiche l'écrit (le libellé français, M77) ou sa valeur
// canonique (« house »), dans la langue ; un texte inconnu est rendu tel quel.
export function propertyTypeIn(
  value: string | null | undefined,
  texts: ClientTexts,
): string | null {
  const text = value?.trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  const key = (
    Object.keys(FRENCH_TEXTS.labels.propertyType) as (keyof ClientTexts['labels']['propertyType'])[]
  ).find(
    (candidate) =>
      candidate === lower || FRENCH_TEXTS.labels.propertyType[candidate].toLowerCase() === lower,
  );
  return key ? texts.labels.propertyType[key] : text;
}
