import { communeKey } from '@/features/competitor-search/utils/commune-name';

// Mission 86 — pour un acheteur, « Juan-les-Pins » c'est Antibes. Une petite liste d'égalités,
// tenue à la main et complétée pendant le pilote : il n'existe pas de table des quartiers
// (chantier « identifiants de lieu par portail », en suspens). Clés et valeurs sont écrites
// comme communeKey les rend (M71 : sans accent, sans tiret, en minuscules, St → Saint).
const COMMUNE_ALIASES: Record<string, string> = {
  'juan les pins': 'antibes',
  'cap d antibes': 'antibes',
  'golfe juan': 'vallauris',
  'cros de cagnes': 'cagnes sur mer',
  'la bocca': 'cannes',
};

// La commune telle qu'un acheteur l'entend. Un code postal collé au nom (« Antibes 06600 »,
// fréquent sur une annonce) ne fait pas une autre commune.
export function buyerCommuneKey(value: string | null | undefined): string | null {
  const key = communeKey(value?.replace(/\b\d{5}\b/g, ' '));
  if (key == null) {
    return null;
  }
  return COMMUNE_ALIASES[key] ?? key;
}

// « Antibes, Juan-les-Pins ; Vallauris » → les communes demandées, sans doublon.
export function requestedCommuneKeys(text: string | null): string[] {
  if (text == null) {
    return [];
  }
  const keys = text
    .split(/[,;\n]/)
    .map((part) => buyerCommuneKey(part))
    .filter((key): key is string => key != null);
  return [...new Set(keys)];
}
