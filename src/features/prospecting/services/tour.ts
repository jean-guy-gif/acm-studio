import {
  displayCommune,
  readArrondissementName,
} from '@/features/competitor-search/utils/arrondissements';
import { normalizeCommuneName } from '@/features/competitor-search/utils/commune-name';
import { addressLines } from '@/features/prospecting-file/services/addressee-lines';
import { addressKey } from '@/features/prospecting/services/address-key';
import type { ProspectingCard } from '@/features/prospecting/types';

// Mission 98 — « Imprimer ma tournée ». Pur.
//
// La tournée ne garde que les portes où sonner : les propriétaires à adresse confirmée, ni en
// rendez-vous, ni en mandat, ni « pas intéressés », ni sur la liste « Ne plus solliciter ». Les
// confrères (exclusivité) ne se visitent pas : ils sont listés à part, à appeler. Un concurrent
// « à vérifier » reste avec les propriétaires (M86) : sa ligne le dit.
// Les adresses se suivent par commune, puis par rue, puis par numéro. Aucun calcul d'itinéraire.
// Mission 99 — à Paris, Lyon et Marseille, la « commune » est l'arrondissement : « Paris 15e »,
// lu dans le code postal de l'adresse, et les arrondissements se suivent dans l'ordre (2e avant 10e).

export const TOUR_SCOPES = ['mine', 'agency'] as const;
export type TourScope = (typeof TOUR_SCOPES)[number];

export const TOUR_SCOPE_LABELS: Record<TourScope, string> = {
  mine: 'Mes dossiers',
  agency: 'Toute l’agence',
};

// Par défaut, les dossiers du conseiller connecté.
export function parseTourScope(raw: string | undefined): TourScope {
  return raw === 'agency' ? 'agency' : 'mine';
}

export function filterByScope(
  cards: ProspectingCard[],
  scope: TourScope,
  advisorId: string,
): ProspectingCard[] {
  return scope === 'agency'
    ? cards
    : cards.filter((card) => card.sellers.some((seller) => seller.advisorId === advisorId));
}

export type TourAddress = { commune: string | null; street: string; number: number | null };

// « 8 bis avenue Docteur Hochet, 06160 Antibes · 2e étage »
//   → Antibes · avenue Docteur Hochet · 8
export function parseTourAddress(address: string, fallbackCity: string | null): TourAddress {
  const [way = '', rest = ''] = addressLines(address);
  const numbered = /^(\d+)\s*(?:bis|ter|quater)?\b[\s,]*(.*)$/i.exec(way);
  const postalCode = /^\d{5}\b/.exec(rest)?.[0] ?? null;
  const commune =
    rest
      .replace(/^\d{5}\s*/, '')
      .split(/\s+[·-]\s+|,/)[0]
      .trim() || null;
  return {
    commune: displayCommune(commune, postalCode) ?? fallbackCity,
    street: (numbered ? numbered[2] : way).trim(),
    number: numbered ? Number(numbered[1]) : null,
  };
}

// La clé de tri d'une commune : « paris 02 » avant « paris 10 », et « paris 15 » avant « pau ».
export function communeSortKey(commune: string | null): string {
  const named = readArrondissementName(commune);
  if (named?.arrondissement != null) {
    return `${named.city} ${String(named.arrondissement.number).padStart(2, '0')}`;
  }
  return normalizeCommuneName(commune ?? '');
}

export type TourStop = { card: ProspectingCard; commune: string | null };

export type Tour = {
  // Les portes où sonner, dans l'ordre de la tournée.
  owners: TourStop[];
  // Les confrères à appeler, hors tournée.
  colleagues: ProspectingCard[];
};

const VISITABLE = ['ready', 'handed'];
const CALLABLE = ['to_confirm', 'ready', 'handed'];

export function buildTour(cards: ProspectingCard[]): Tour {
  const open = cards.filter((card) => card.row.opposedOn == null);
  const owners = open
    .filter(
      ({ row }) =>
        row.step !== 'colleague' &&
        row.confirmed &&
        row.address != null &&
        VISITABLE.includes(row.status),
    )
    .map((card) => ({ card, address: parseTourAddress(card.row.address ?? '', card.row.city) }))
    .sort(
      (a, b) =>
        communeSortKey(a.address.commune).localeCompare(communeSortKey(b.address.commune)) ||
        (addressKey(a.address.street) ?? '').localeCompare(addressKey(b.address.street) ?? '') ||
        (a.address.number ?? 0) - (b.address.number ?? 0),
    )
    .map(({ card, address }) => ({ card, commune: address.commune }));
  const colleagues = open.filter(
    ({ row }) => row.step === 'colleague' && CALLABLE.includes(row.status),
  );
  return { owners, colleagues };
}
