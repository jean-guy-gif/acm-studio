import type { LocatorState } from '@/features/competitor-locator/types';

// Mission 75 — ce que la carte d'un concurrent propose, d'après ce que le Localisateur a rendu.
// Aucun seuil ici : `confirmed` et l'état décident, jamais le texte de l'étiquette.
//   confirmed → l'adresse est retenue en silence ;
//   find      → « Trouver l'adresse » : ouvrir l'annonce, le Localisateur l'analyse seul ;
//   pending   → analyse en cours, ACM redemande ;
//   locate    → « Localiser moi-même » : le Localisateur n'est pas certain ;
//   none      → rien à proposer (saisie manuelle, ou jamais demandé).
export type LocationAction = 'confirmed' | 'find' | 'pending' | 'locate' | 'none';

export type StoredLocation = {
  listing_url: string | null;
  locator_state: string | null;
  locator_confirmed: boolean | null;
};

export function hasListingUrl(listingUrl: string | null): listingUrl is string {
  return listingUrl != null && listingUrl.trim() !== '';
}

export function locationAction(competitor: StoredLocation): LocationAction {
  if (!hasListingUrl(competitor.listing_url)) {
    return 'none';
  }
  if (competitor.locator_confirmed === true) {
    return 'confirmed';
  }
  switch (competitor.locator_state as LocatorState | null) {
    case 'inconnu':
    case 'fiche':
      return 'find';
    case 'en-cours':
      return 'pending';
    case 'pret':
      return 'locate';
    default:
      return 'none';
  }
}

// Une adresse confirmée ne se redemande plus ; un concurrent sans annonce n'a rien à demander.
export function needsLocatorQuery(competitor: StoredLocation): boolean {
  return hasListingUrl(competitor.listing_url) && competitor.locator_confirmed !== true;
}
