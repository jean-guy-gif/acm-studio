// Mission 89 — le Live ne se fige jamais devant le vendeur. Chaque enregistrement ATTENDU par un
// bouton (« Valider et continuer », « Révéler », « Terminer le rendez-vous ») passe par ici :
// quoi qu'il arrive — réseau coupé, serveur injoignable, réponse qui ne vient pas — le bouton
// redevient actif, et un message discret dit quoi faire. Pur, sans React : testable tel quel.

export const CONNECTION_LOST_MESSAGE = 'Connexion perdue — touchez Valider pour réessayer';

// Au-delà, on ne fait plus attendre le vendeur : la tablette a perdu le réseau sans le dire.
export const SAVE_TIMEOUT_MS = 20_000;

export type SaveResult = { ok: boolean; error?: string };

// Un échec de CONNEXION (exception, délai dépassé) — à distinguer d'un refus du serveur, qui
// arrive avec son propre message (« Indiquez le prix… »).
export type ConnectionLost = { ok: false; error: typeof CONNECTION_LOST_MESSAGE; lost: true };

export function isConnectionLost(result: SaveResult): result is ConnectionLost {
  return !result.ok && (result as Partial<ConnectionLost>).lost === true;
}

type GuardOptions = {
  // Appelé avec `true` avant l'enregistrement, et TOUJOURS avec `false` après.
  setBusy: (busy: boolean) => void;
  timeoutMs?: number;
};

export async function guardedSave<T extends SaveResult>(
  save: () => Promise<T>,
  { setBusy, timeoutMs = SAVE_TIMEOUT_MS }: GuardOptions,
): Promise<T | ConnectionLost> {
  const lost: ConnectionLost = { ok: false, error: CONNECTION_LOST_MESSAGE, lost: true };
  let timer: ReturnType<typeof setTimeout> | undefined;
  setBusy(true);
  try {
    return await Promise.race([
      save(),
      new Promise<ConnectionLost>((resolve) => {
        timer = setTimeout(() => resolve(lost), timeoutMs);
      }),
    ]);
  } catch {
    return lost;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    setBusy(false);
  }
}
