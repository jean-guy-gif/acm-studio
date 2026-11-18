import type { AcademiaKeyCheck } from '@/features/academia/services/academia-api';

// Mission 161 — la ligne « Clé Academia » des opérateurs (`/erreurs`) : ce que `GET /etat` dit de
// chaque clé posée dans Vercel, jamais la clé elle-même. La clé des agences doit être la vraie
// (« ok », sans « essai ») ; celle de la démo, la clé d'essai. Pur.
export type AcademiaKeyKind = 'agencies' | 'demo';
export type AcademiaKeyStatus = AcademiaKeyCheck | 'missing';

export function academiaKeyLine(
  kind: AcademiaKeyKind,
  status: AcademiaKeyStatus,
): { label: string; text: string; good: boolean } {
  const label =
    kind === 'agencies'
      ? 'Clé Academia des agences (ACADEMIA_API_KEY)'
      : 'Clé Academia de la démo (ACADEMIA_API_KEY_DEMO)';
  const expected: AcademiaKeyCheck = kind === 'agencies' ? 'real' : 'trial';
  const text: Record<AcademiaKeyStatus, string> = {
    real: 'vraie clé',
    trial: 'clé d’essai',
    refused: 'refusée par Academia',
    unavailable: 'Academia ne répond pas',
    missing: 'absente de Vercel',
  };
  const good = status === expected;
  return {
    label,
    text: `${text[status]}${good ? ' ✓' : status === 'unavailable' ? '' : ' ✗'}`,
    good,
  };
}
