import type { StreamEstateFacts } from '@/features/competitor-search/types';

// ESSAI STREAM ESTATE — l'import relit l'annonce d'ORIGINE avec l'import existant (prix, photos,
// caractéristiques à jour). Ce qui reste propre à l'essai : dire pourquoi une annonce n'entre pas.

// Une page d'ANNONCE se reconnaît au chemin (même règle que l'extension, page-readiness.js).
const LISTING_PATH = /\/annonces?\/|\/properties\/|\/ads\/|ficheannonce/i;

// Le portail a renvoyé ailleurs que sur une annonce (liste de résultats, accueil) : c'est ainsi
// qu'une annonce retirée se présente souvent. Une redirection vers une AUTRE adresse d'annonce
// (forme courte → forme longue) n'en est pas une.
export function redirectedAwayFromListing(requestedUrl: string, finalUrl: string): boolean {
  try {
    const requested = new URL(requestedUrl);
    const final = new URL(finalUrl);
    const samePage =
      requested.hostname === final.hostname &&
      requested.pathname.replace(/\/$/, '') === final.pathname.replace(/\/$/, '');
    return !samePage && !LISTING_PATH.test(final.pathname);
  } catch {
    return false;
  }
}

export function formatFrenchDate(iso: string | null): string | null {
  if (iso == null) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' }).format(date);
}

export function withdrawnReason(facts: StreamEstateFacts): string {
  const seen = formatFrenchDate(facts.lastSeenAt);
  return `annonce retirée depuis le dernier passage de Stream Estate${
    seen ? ` (vue en ligne le ${seen})` : ''
  } : la page d’origine sur ${facts.originSite} ne la montre plus — non importée`;
}

export function notImportableReason(facts: StreamEstateFacts): string {
  return `l’annonce d’origine est sur ${facts.originSite}, que l’extension ne relit pas — ouvrez-la pour la saisir à la main`;
}
