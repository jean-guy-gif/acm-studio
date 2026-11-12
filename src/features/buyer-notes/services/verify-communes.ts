import { readArrondissementName } from '@/features/competitor-search/utils/arrondissements';
import { normalizeCommuneName } from '@/features/competitor-search/utils/commune-name';
import { COMMUNE_ALIASES } from '@/features/meeting-conclusion/services/commune-alias';
import type { CommuneCheck } from '@/features/buyer-notes/types';

// Mission 151 — les communes lues se vérifient contre la liste officielle (règle de Jean-Guy,
// 12/11). Pur : la liste est donnée par l'appelant (les départements de l'agence, par la porte de
// la M114). La recherche par nom de geo.api.gouv.fr ne suffit pas : elle ne trouve ni
// « Châteauneuf-de-Grasse » ni « St-Laurent-du-Var » (mesuré le 12/11).
//
//   1. le nom normalisé comme partout (M71 : accents, tirets, St / Ste) ;
//   2. puis sans les petits mots (de, du, la, le, les, sur…) : « Châteauneuf-de-Grasse » →
//      Châteauneuf-Grasse ;
//   3. un nom d'usage (Juan-les-Pins, M86) ou un arrondissement (M99) est gardé tel que lu ;
//   4. une seule commune : son nom officiel (« lu : … » si l'écriture diffère) ; aucune ou
//      plusieurs : le champ reste au conseiller, jamais deviné (M38, M103) ; liste illisible :
//      la commune telle que lue, « non vérifiée » (M104), jamais « aucune » (M98).

export type OfficialCommune = { nom: string; code: string };

const SMALL_WORDS = new Set([
  'de',
  'du',
  'des',
  'la',
  'le',
  'les',
  'sur',
  'en',
  'd',
  'l',
  'au',
  'aux',
]);

const loose = (value: string): string =>
  normalizeCommuneName(value)
    .split(' ')
    .filter((word) => word && !SMALL_WORDS.has(word))
    .join(' ');

export function verifyCommune(read: string, official: OfficialCommune[] | null): CommuneCheck {
  const key = normalizeCommuneName(read);
  if (COMMUNE_ALIASES[key] || readArrondissementName(read)) {
    return { read, status: 'usage', name: read };
  }
  if (official == null) return { read, status: 'unverified', name: read };

  const exact = official.filter((commune) => normalizeCommuneName(commune.nom) === key);
  const matches = exact.length > 0 ? exact : official.filter((c) => loose(c.nom) === loose(read));
  const names = [...new Set(matches.map((commune) => commune.nom))];
  if (names.length === 0) return { read, status: 'unknown', name: null };
  if (names.length > 1) return { read, status: 'ambiguous', name: null };
  const [name] = names;
  return name === read ? { read, status: 'official', name } : { read, status: 'corrected', name };
}

export function verifyCommunes(read: string[], official: OfficialCommune[] | null): CommuneCheck[] {
  return read.map((city) => verifyCommune(city, official));
}

// Les communes que la fiche proposera : le nom officiel ou d'usage ; une commune inconnue ou
// ambiguë n'est pas proposée (le conseiller la tape).
export function proposedCities(checks: CommuneCheck[]): string[] {
  return [...new Set(checks.flatMap((check) => (check.name ? [check.name] : [])))];
}
