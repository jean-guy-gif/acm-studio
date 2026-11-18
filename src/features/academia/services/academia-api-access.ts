import 'server-only';

// Mission 157 — l'accès à l'API de Mon secteur (Academia), décidé au serveur seul, jamais sur un
// paramètre du navigateur (M114).
//
// - **L'agence de démonstration** (repère `is_demo`) : la clé d'essai, `ACADEMIA_API_KEY_DEMO`, qui ne
//   lit que le dossier de démonstration fixe d'Academia (A2). Elle n'envoie que l'adresse fictive de
//   ce dossier, jamais celle d'un bien de la démo. Sans la clé ou sans cette adresse (données par
//   Laurent), la démo garde la carte d'aujourd'hui : aucun lien inventé (Jean-Guy, 16/11).
// - **Une vraie agence** : `ACADEMIA_API_KEY`, seulement si l'agence est ouverte. Mission 161 —
//   l'ouverture se fait en deux temps (Jean-Guy, 18/11) : d'abord une seule agence, Start Academy,
//   puis toutes (`'toutes'`), chaque étape sur son ordre ; la vraie clé est posée par Jean-Guy dans
//   Vercel. Les tests automatiques n'utilisent jamais la vraie clé.
//
// Sans accès : le geste d'aujourd'hui (le lien du mandat à coller, M147 A).

export const START_ACADEMY_AGENCY_ID = '93c038d3-e532-408f-bb6a-d8fac760e811';
export const ACADEMIA_API_AGENCES_OUVERTES: readonly string[] | 'toutes' = [
  START_ACADEMY_AGENCY_ID,
];

// L'adresse fictive du dossier de démonstration fixe d'Academia, donnée par Laurent avec la clé
// d'essai (17/11). Elle dit « démonstration » : elle ne se montre jamais, ni sur la carte du
// conseiller ni dans un document du vendeur (M114 ; décision de Jean-Guy, 17/11).
export const ACADEMIA_DEMO_ADDRESS: string | null =
  '12 Avenue de la Démonstration, 06800 Cagnes-sur-Mer';

export type AcademiaAccess = { key: string; demoAddress: string | null };

export function academiaApiAccess(
  agency: { demo: boolean; agencyId: string | null | undefined },
  env: Record<string, string | undefined> = process.env,
  open: readonly string[] | 'toutes' = ACADEMIA_API_AGENCES_OUVERTES,
  demoAddress: string | null = ACADEMIA_DEMO_ADDRESS,
): AcademiaAccess | null {
  if (agency.demo) {
    const key = env.ACADEMIA_API_KEY_DEMO?.trim();
    const address = demoAddress?.trim();
    return key && address ? { key, demoAddress: address } : null;
  }
  if (!agency.agencyId) return null;
  if (open !== 'toutes' && !open.includes(agency.agencyId)) return null;
  const key = env.ACADEMIA_API_KEY?.trim();
  return key ? { key, demoAddress: null } : null;
}
