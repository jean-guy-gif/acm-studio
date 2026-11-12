import type { Buyer, BuyerInput } from '@/features/buyers/types';
import { BUYER_STATUS_LABELS } from '@/features/buyers/types';
import { readArrondissementName } from '@/features/competitor-search/utils/arrondissements';
import { communeKey } from '@/features/competitor-search/utils/commune-name';
import type { BuyerCriteria } from '@/features/meeting-conclusion/services/buyer-match';
import { PROPERTY_TYPE_LABELS } from '@/features/subject-property/constants/property-options';
import { formatEuro, formatSquareMeters } from '@/lib/format';
import type { TextLanguage } from '@/lib/client-texts';
import { formatDay } from '@/lib/format';

// Mission 117 — la fiche nourrit le rapprochement de M86, qui ne change pas : ses critères sont
// ceux de son formulaire. Un seul type décide (deux types = pas de filtre de type, M54) ; les
// communes vont ensemble, séparées par des virgules, telles que le rapprochement les lit (alias
// M86, arrondissements M99) ; les pièces et la surface sont les minimums ; le budget plafond est
// le budget max du rapprochement, qui lui applique sa marge de 5 % (M86) — une seule fois.
export function buyerToCriteria(buyer: BuyerInput): BuyerCriteria {
  return {
    propertyType:
      buyer.propertyTypes.length === 1 ? PROPERTY_TYPE_LABELS[buyer.propertyTypes[0]!] : null,
    roomsCount: buyer.roomsMin,
    surfaceArea: buyer.surfaceMin,
    budgetMin: null,
    budgetMax: buyer.budgetMax,
    city: buyer.cities.length > 0 ? buyer.cities.join(', ') : null,
    // Mission 151 — la copropriété suit la fiche jusqu'au rapprochement.
    condominiumAccepted: buyer.condominiumAccepted ?? null,
    condominiumMustHave: buyer.condominiumMustHave === true,
  };
}

// Du rapprochement jetable vers une fiche : « Enregistrer cette recherche » (M86 reste jetable,
// la fiche naît du formulaire, avec un nom).
export function criteriaToBuyerDraft(criteria: BuyerCriteria): Partial<BuyerInput> {
  const type = criteria.propertyType?.trim().toLowerCase();
  const propertyTypes: BuyerInput['propertyTypes'] =
    type === 'appartement' || type === 'apartment'
      ? ['apartment']
      : type === 'maison' || type === 'house'
        ? ['house']
        : [];
  return {
    propertyTypes,
    cities: splitCities(criteria.city),
    roomsMin: criteria.roomsCount,
    surfaceMin: criteria.surfaceArea,
    budgetMax: criteria.budgetMax,
    condominiumAccepted: criteria.condominiumAccepted ?? null,
    condominiumMustHave: criteria.condominiumMustHave === true,
  };
}

// La clé qui dédoublonne les communes tapées : la normalisation de M71 (accents, tirets, St) et
// l'arrondissement de M99 (« Paris 15e » = « 75015 Paris ») — SANS les alias de M86 : Juan-les-Pins
// vaut Antibes au rapprochement, mais le conseiller a bien tapé deux noms, la fiche les garde.
export function cityDedupKey(value: string): string | null {
  const named = readArrondissementName(value);
  if (named != null) {
    return named.arrondissement ? `${named.city} ${named.arrondissement.number}` : named.city;
  }
  return communeKey(value.replace(/\b\d{5}\b/g, ' '));
}

// « Antibes, Juan-les-Pins ; Vallauris » → les communes tapées, sans doublon (par leur clé),
// sans ce qui ne fait pas une commune.
export function splitCities(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const cities: string[] = [];
  for (const part of text.split(/[,;\n]/)) {
    const trimmed = part.trim().replace(/\s+/g, ' ');
    const key = trimmed ? cityDedupKey(trimmed) : null;
    if (!trimmed || key == null || seen.has(key)) continue;
    seen.add(key);
    cities.push(trimmed);
  }
  return cities;
}

// Les mots de la liste : type, communes, budget, pièces — un champ absent est omis, jamais « — ».
export function buyerTypesLabel(buyer: Pick<BuyerInput, 'propertyTypes'>): string | null {
  const labels = buyer.propertyTypes.map((type) => PROPERTY_TYPE_LABELS[type]);
  if (labels.length === 0) return null;
  return labels.length === 1 ? labels[0]! : `${labels[0]} ou ${labels[1]!.toLowerCase()}`;
}

export function buyerCitiesLabel(buyer: Pick<BuyerInput, 'cities'>): string {
  return buyer.cities.join(' · ');
}

export function buyerBudgetLabel(
  buyer: Pick<BuyerInput, 'budgetIdeal' | 'budgetMax'>,
): string | null {
  if (buyer.budgetIdeal != null && buyer.budgetMax != null) {
    return buyer.budgetIdeal === buyer.budgetMax
      ? formatEuro(buyer.budgetMax)
      : `${formatEuro(buyer.budgetIdeal)} – ${formatEuro(buyer.budgetMax)}`;
  }
  if (buyer.budgetMax != null) return `jusqu’à ${formatEuro(buyer.budgetMax)}`;
  if (buyer.budgetIdeal != null) return `idéal ${formatEuro(buyer.budgetIdeal)}`;
  return null;
}

export function buyerRoomsLabel(buyer: Pick<BuyerInput, 'roomsMin'>): string | null {
  if (buyer.roomsMin == null) return null;
  return buyer.roomsMin === 1 ? '1 pièce ou plus' : `${buyer.roomsMin} pièces ou plus`;
}

export function buyerSurfaceLabel(buyer: Pick<BuyerInput, 'surfaceMin'>): string | null {
  return buyer.surfaceMin == null ? null : `${formatSquareMeters(buyer.surfaceMin)} ou plus`;
}

export function buyerStatusLabel(buyer: Pick<Buyer, 'status'>): string {
  return BUYER_STATUS_LABELS[buyer.status];
}

// « 24/10/2026 » — le jour vu de l'agence.
export function buyerDateLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Paris',
      }).format(date);
}

// Mission 132 — les villes proposées au pouce dans la saisie rapide : celles qui reviennent le
// plus dans l'agence (biens vendeurs, fiches acquéreur), dédoublonnées par leur clé, la plus
// fréquente d'abord, à égalité par ordre alphabétique. Pur.
export const QUICK_CITIES_MAX = 8;
export function suggestedCities(names: (string | null | undefined)[]): string[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const raw of names) {
    const name = raw?.trim().replace(/\s+/g, ' ');
    if (!name) continue;
    const key = cityDedupKey(name);
    if (key == null) continue;
    const known = counts.get(key);
    if (known) known.count += 1;
    else counts.set(key, { name, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'))
    .slice(0, QUICK_CITIES_MAX)
    .map((item) => item.name);
}

// Mission 140 — la date d'un écran de l'acquéreur, dans sa langue : « 06/11/2026 » en français (comme
// avant), « 6 November 2026 » en anglais.
export function buyerDateIn(iso: string, language: TextLanguage): string {
  if (language === 'fr') return buyerDateLabel(iso);
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatDay(date.toISOString(), language);
}
