// Raccourci « vérifier l'ancienneté d'une annonce ».
//
// Trois portails sur cinq (Belles Demeures, Green Acres, Maisons et Appartements)
// ne publient aucune date de mise en ligne : mesuré le 19/08 sur des pages
// complètes, pas sur des captures ratées. Le délai s'y saisit donc à la main.
//
// Ce module ne fait que préparer un lien. C'est le CONSEILLER qui ouvre le site,
// dans SON navigateur, avec SON adresse IP, comme n'importe quel visiteur. Nos
// serveurs n'interrogent rien : interroger un tel service en série depuis le
// nôtre serait à la fois interdit par ses conditions et vite bloqué.

export const LISTING_AGE_TOOL_NAME = 'L’Acquéreur';
export const LISTING_AGE_TOOL_HOME = 'https://lacquereur.fr/';

// Adresse à ouvrir. Aujourd'hui la page d'accueil, où le conseiller colle
// l'adresse de l'annonce — elle est déjà dans son presse-papiers.
//
// L'adresse de l'annonce n'est volontairement PAS passée en paramètre : on ne
// connaît pas le format attendu par le service (fabriquer un lien au hasard
// donnerait une page d'erreur au conseiller), et une adresse de travail n'a
// rien à faire dans la barre d'adresse d'un tiers. Le jour où ce format sera
// connu, il n'y a que cette fonction à changer — et ses tests.
export function listingAgeLookupUrl(): string {
  return LISTING_AGE_TOOL_HOME;
}

// L'adresse est-elle exploitable par un outil d'ancienneté ? Inutile d'ouvrir
// un onglet pour une saisie vide ou un texte qui n'est pas une adresse web.
export function canLookUpListingAge(listingUrl: string | null | undefined): boolean {
  if (listingUrl == null || listingUrl.trim() === '') {
    return false;
  }
  try {
    const { protocol } = new URL(listingUrl.trim());
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
