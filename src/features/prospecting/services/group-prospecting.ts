import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';
import { addressKey } from '@/features/prospecting/services/address-key';
import {
  prospectingStatus,
  type ProspectingDates,
} from '@/features/prospecting/services/prospecting-status';
import type {
  ProspectingCard,
  ProspectingEntry,
  ProspectingSeller,
} from '@/features/prospecting/types';

// Mission 98 — une carte par bien. Pur.
//
// Deux concurrents désignent le même bien quand ils partagent l'identité publiée de leur annonce
// (portail + numéro, M47), ou la même adresse CONFIRMÉE une fois normalisée. Une adresse
// seulement proposée ne regroupe rien. Deux appartements d'un même immeuble partagent leur
// adresse sans être le même bien : quand les surfaces (à 2 m² près) ou les pièces, connues des
// deux côtés, diffèrent, l'adresse ne regroupe pas — une fausse fusion est pire qu'un doublon.

const SURFACE_TOLERANCE = 2;

const confirmedAddressKey = (row: ProspectingRow): string | null =>
  row.confirmed ? addressKey(row.address) : null;

export function sameAddressedProperty(a: ProspectingRow, b: ProspectingRow): boolean {
  const key = confirmedAddressKey(a);
  if (key == null || key !== confirmedAddressKey(b)) {
    return false;
  }
  if (
    a.surfaceArea != null &&
    b.surfaceArea != null &&
    Math.abs(a.surfaceArea - b.surfaceArea) > SURFACE_TOLERANCE
  ) {
    return false;
  }
  return a.roomsCount == null || b.roomsCount == null || a.roomsCount === b.roomsCount;
}

const earliest = (values: (string | null)[]): string | null =>
  values.reduce<string | null>(
    (first, value) =>
      value != null && (first == null || Date.parse(value) < Date.parse(first)) ? value : first,
    null,
  );

// Les faits datés d'une carte : un fait posé sur une copie vaut pour toutes. Un mandat rentré
// l'emporte sur un « pas intéressé » resté sur une autre copie.
export function cardDates(rows: ProspectingRow[]): ProspectingDates {
  const mandate = earliest(rows.map((row) => row.mandateAt));
  return {
    prospecting_handed_at: earliest(rows.map((row) => row.handedAt)),
    prospecting_meeting_at: earliest(rows.map((row) => row.meetingAt)),
    prospecting_mandate_at: mandate,
    prospecting_declined_at: mandate == null ? earliest(rows.map((row) => row.declinedAt)) : null,
  };
}

function buildCard(copies: ProspectingEntry[]): ProspectingCard {
  const rows = copies.map((copy) => copy.row);
  const hasConfirmedAddress = (row: ProspectingRow) => row.confirmed && row.address != null;
  // La copie de référence : celle dont l'adresse est confirmée, sinon la première.
  const primary = copies.find((copy) => hasConfirmedAddress(copy.row)) ?? copies[0];
  const dates = cardDates(rows);
  const sellers: ProspectingSeller[] = [];
  for (const { seller } of copies) {
    if (!sellers.some((known) => known.projectId === seller.projectId)) {
      sellers.push(seller);
    }
  }
  return {
    seller: primary.seller,
    sellers,
    copies,
    row: {
      ...primary.row,
      status: prospectingStatus(dates, rows.some(hasConfirmedAddress)),
      handedAt: dates.prospecting_handed_at,
      meetingAt: dates.prospecting_meeting_at,
      mandateAt: dates.prospecting_mandate_at,
      declinedAt: dates.prospecting_declined_at,
      // À qui s'adresser : ce qu'une copie sait vaut pour la carte.
      step: rows.find((row) => row.step !== 'check')?.step ?? 'check',
      opposedOn: earliest(rows.map((row) => row.opposedOn)),
    },
  };
}

export function groupProspecting(entries: ProspectingEntry[]): ProspectingCard[] {
  // Chaque concurrent pointe vers le premier de son groupe.
  const parent = entries.map((_, index) => index);
  const find = (index: number): number => {
    while (parent[index] !== index) {
      index = parent[index];
    }
    return index;
  };
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      const a = entries[i].row;
      const b = entries[j].row;
      const sameListing = a.listingKey != null && a.listingKey === b.listingKey;
      if (sameListing || sameAddressedProperty(a, b)) {
        const [low, high] = [find(i), find(j)].sort((x, y) => x - y);
        parent[high] = low;
      }
    }
  }
  const groups = new Map<number, ProspectingEntry[]>();
  entries.forEach((entry, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), entry]);
  });
  return [...groups.values()].map(buildCard);
}

// La copie d'une carte qui appartient à ce bien vendeur (le courrier compare NOTRE bien au
// sien) ; sans filtre, la copie de référence.
export function cardCopy(card: ProspectingCard, sellerId: string | null): ProspectingEntry {
  const reference = { row: card.row, seller: card.seller };
  if (sellerId == null || card.seller.projectId === sellerId) {
    return reference;
  }
  return card.copies.find((copy) => copy.seller.projectId === sellerId) ?? reference;
}

// « Martin · Vence ; Dupont · Vence »
export function sellersLabel(sellers: ProspectingSeller[]): string {
  return sellers
    .map((seller) => (seller.label ? `${seller.name} · ${seller.label}` : seller.name))
    .join(' ; ');
}
