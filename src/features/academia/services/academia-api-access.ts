import 'server-only';

// Mission 157 — l'accès à l'API de Mon secteur (Academia), décidé au serveur seul, jamais sur un
// paramètre du navigateur (M114).
//
// - **L'agence de démonstration** (repère `is_demo`) : la clé d'essai, `ACADEMIA_API_KEY_DEMO`, qui ne
//   lit que le dossier de démonstration fixe d'Academia (A2). Elle n'envoie que l'adresse fictive de
//   ce dossier, jamais celle d'un bien de la démo. Sans la clé ou sans cette adresse (données par
//   Laurent), la démo garde la carte d'aujourd'hui : aucun lien inventé (Jean-Guy, 16/11).
// - **Une vraie agence** : `ACADEMIA_API_KEY`, seulement l'interrupteur allumé. Il reste éteint tant
//   que Laurent n'a pas la référence du bien de son côté et que le texte de confidentialité de l'API
//   n'est pas en ligne (Jean-Guy, 16/11) ; l'allumer est un geste à part, sur son ordre.
//
// Sans accès : le geste d'aujourd'hui (le lien du mandat à coller, M147 A).

export const ACADEMIA_API_OUVERT_AGENCES = false;

// L'adresse fictive du dossier de démonstration fixe d'Academia, à recevoir de Laurent (A2).
export const ACADEMIA_DEMO_ADDRESS: string | null = null;

export type AcademiaAccess = { key: string; demoAddress: string | null };

export function academiaApiAccess(
  demo: boolean,
  env: Record<string, string | undefined> = process.env,
  open: boolean = ACADEMIA_API_OUVERT_AGENCES,
  demoAddress: string | null = ACADEMIA_DEMO_ADDRESS,
): AcademiaAccess | null {
  if (demo) {
    const key = env.ACADEMIA_API_KEY_DEMO?.trim();
    const address = demoAddress?.trim();
    return key && address ? { key, demoAddress: address } : null;
  }
  if (!open) return null;
  const key = env.ACADEMIA_API_KEY?.trim();
  return key ? { key, demoAddress: null } : null;
}
