import { createHash, randomBytes } from 'node:crypto';

// Mission 119 (partie B) — le jeton du lien du dossier acquéreur, comme celui de la synthèse (M110) :
// 32 octets aléatoires en base64url (43 caractères) ; seul son condensat est gardé en base.
export const DOSSIER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const DOSSIER_LINK_DAYS = 30;

export function newDossierToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashDossierToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function dossierPath(token: string): string {
  return `/dossier/${token}`;
}
