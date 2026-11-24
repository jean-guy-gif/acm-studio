// Mission 105 — le dernier résultat PAYÉ d'une recherche Stream Estate, gardé sur le dossier,
// côté serveur (remplace M93, « gardé dans le stockage de l'onglet, le temps de la séance »).
// Il se rouvre sur un autre appareil ou le lendemain sans nouvel appel ; il n'est rendu que si
// l'empreinte — bien vendeur, fourchette, réglages (M99) — n'a pas changé. Pur.

// La borne de la base (`pg_column_size(result) <= 2 000 000`), avec de la marge.
export const KEPT_RESULT_MAX_BYTES = 1_900_000;

export type KeptResult<P = unknown, N = unknown> = { portal: P; note: N };

const isObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

// Ce que l'écran envoie, relu : deux objets, une liste de biens, une taille bornée. Le contenu des
// cartes n'est qu'un affichage de ce que la recherche de l'agence a rendu ; il ne décide de rien.
export function parseKeptResult(raw: unknown): KeptResult | null {
  if (!isObject(raw) || !isObject(raw.portal) || !isObject(raw.note)) {
    return null;
  }
  if (!Array.isArray(raw.portal.candidates)) {
    return null;
  }
  let size: number;
  try {
    size = new TextEncoder().encode(JSON.stringify(raw)).length;
  } catch {
    return null;
  }
  if (size > KEPT_RESULT_MAX_BYTES) {
    return null;
  }
  return { portal: raw.portal, note: raw.note };
}

// Relancer compte de nouveau dans le forfait : on le confirme, sans montant (Lancement, mission 5).
export const RELAUNCH_CONFIRM_TEXT =
  'Nouvelle recherche, comptée dans le forfait du mois. Le résultat actuel sera remplacé.';
