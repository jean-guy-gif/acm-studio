import { createHash, randomBytes } from 'node:crypto';

// Mission 110 — le jeton du lien de la synthèse : 32 octets aléatoires, en base64url (43
// caractères). Seul son condensat est gardé en base : la base ne permet pas de reconstituer un lien.
export const SYNTHESIS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const SYNTHESIS_LINK_DAYS = 30;

export function newSynthesisToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSynthesisToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function synthesisPath(token: string): string {
  return `/synthese/${token}`;
}
