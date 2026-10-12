import {
  arrondissementLabel,
  readArrondissementName,
} from '@/features/competitor-search/utils/arrondissements';
import { communeKey } from '@/features/competitor-search/utils/commune-name';

// Mission 86 — pour un acheteur, « Juan-les-Pins » c'est Antibes. Une petite liste d'égalités,
// tenue à la main et complétée pendant le pilote : il n'existe pas de table des quartiers
// (chantier « identifiants de lieu par portail », en suspens). Clés et valeurs sont écrites
// comme communeKey les rend (M71 : sans accent, sans tiret, en minuscules, St → Saint).
export const COMMUNE_ALIASES: Record<string, string> = {
  'juan les pins': 'antibes',
  'cap d antibes': 'antibes',
  'golfe juan': 'vallauris',
  'cros de cagnes': 'cagnes sur mer',
  'la bocca': 'cannes',
};

// La commune telle qu'un acheteur l'entend. Un code postal collé au nom (« Antibes 06600 »,
// fréquent sur une annonce) ne fait pas une autre commune.
//
// Mission 99 — Paris, Lyon, Marseille : « Paris 15e » (ou « Paris 75015 ») est la clé de
// l'arrondissement, « paris 15 » ; « Paris » seul est la clé de la ville, « paris », qui couvre
// tous ses arrondissements (communeCovered).
export function buyerCommuneKey(value: string | null | undefined): string | null {
  const named = readArrondissementName(value);
  if (named != null) {
    return named.arrondissement ? `${named.city} ${named.arrondissement.number}` : named.city;
  }
  const key = communeKey(value?.replace(/\b\d{5}\b/g, ' '));
  if (key == null) {
    return null;
  }
  return COMMUNE_ALIASES[key] ?? key;
}

// La commune d'un bien est-elle l'une des communes demandées ? « Paris » chez l'acquéreur couvre
// tous les arrondissements ; « Paris 15e » ne couvre que le 15e — un bien dont on ne connaît que
// « Paris » n'y entre pas.
export function communeCovered(requested: string[], commune: string): boolean {
  return requested.some((wanted) => {
    if (wanted === commune) return true;
    const named = readArrondissementName(wanted);
    return named != null && named.arrondissement == null && commune.startsWith(`${wanted} `);
  });
}

// Le bien est-il dans la bonne ville, sans qu'on sache dans quel arrondissement ?
export function missingArrondissement(requested: string[], cityText: string | null): boolean {
  const named = readArrondissementName(cityText);
  return (
    named != null &&
    named.arrondissement == null &&
    requested.some((wanted) => wanted.startsWith(`${named.city} `))
  );
}

// « Paris 15e » tel qu'un écart le nomme ; le texte du bien sinon.
export function communeDisplay(cityText: string | null | undefined): string {
  const named = readArrondissementName(cityText);
  return named?.arrondissement
    ? arrondissementLabel(named.arrondissement)
    : (cityText?.trim() ?? '');
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
