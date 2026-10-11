import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';
import type { ProspectingEntry, ProspectingSeller } from '@/features/prospecting/types';

// Mission 98 — de quoi écrire les tests du regroupement, de l'opposition et de la tournée.

export function seller(projectId: string, advisorId: string | null = null): ProspectingSeller {
  return { projectId, name: `Vendeur ${projectId}`, label: 'Appartement · Vence', advisorId };
}

export function row(id: string, overrides: Partial<ProspectingRow> = {}): ProspectingRow {
  return {
    id,
    title: null,
    address: null,
    label: null,
    confirmed: false,
    canAcceptAddress: false,
    confirmedByAdvisor: false,
    price: 300000,
    surfaceArea: 62,
    roomsCount: 3,
    onlineSince: null,
    priceDrop: null,
    listingUrl: null,
    listingKey: null,
    listingNumber: null,
    opposedOn: null,
    propertyType: 'Appartement',
    city: 'Vence',
    portal: null,
    status: 'to_confirm',
    handedAt: null,
    meetingAt: null,
    mandateAt: null,
    declinedAt: null,
    step: 'owner',
    mandate: {
      id,
      project_id: 'p',
      sold_by: null,
      sold_by_source: null,
      exclusivity: null,
      exclusivity_source: null,
    },
    ...overrides,
  };
}

// Un concurrent à adresse confirmée, donc « prêt » tant que rien n'est daté.
export function addressed(
  id: string,
  address: string,
  overrides: Partial<ProspectingRow> = {},
): ProspectingRow {
  return row(id, { address, confirmed: true, status: 'ready', ...overrides });
}

export function entry(
  sellerId: string,
  competitor: ProspectingRow,
  advisorId: string | null = null,
): ProspectingEntry {
  return { seller: seller(sellerId, advisorId), row: competitor };
}
