// Mission 144 — les enregistrements de fond du Live partent dans l'ordre, l'un après l'autre :
// « Votre bien », la valeur perçue, « Un sérieux concurrent ? »… Avant une révélation, la file est
// SOLDÉE : on attend qu'elle se vide, on relance une fois ce qui a échoué, et l'écran sait ce qui
// manque encore en base (il retient la révélation si c'est le prix du vendeur, M82). Un enregistrement qui ne répond pas est compté en échec après un délai : la
// file ne reste jamais bloquée (M89, le Live ne se fige jamais). Pur, sans React.
export type BackgroundResult = { ok: boolean; error?: string };

// Vider la file puis relancer tient ainsi dans le délai d'un enregistrement attendu (20 s, M89).
export const BACKGROUND_SAVE_TIMEOUT_MS = 8_000;
export const BACKGROUND_TIMEOUT_ERROR = 'Réseau indisponible.';

export type SaveChain = {
  // Ajoute un enregistrement à la file ; il part quand ceux d'avant sont terminés. Une nouvelle
  // demande sous la même clé remplace l'ancienne dans le compte des échecs.
  run(key: string, save: () => Promise<BackgroundResult>): Promise<BackgroundResult>;
  // Avant une révélation : la file vidée, ce qui a échoué relancé une fois ; ce qui manque encore.
  settle(): Promise<SettledFailure[]>;
};

export type SettledFailure = { key: string; error?: string };

export function createSaveChain({
  timeoutMs = BACKGROUND_SAVE_TIMEOUT_MS,
  onStart,
  onResult,
}: {
  timeoutMs?: number;
  // Chaque départ et chaque résultat, relance comprise : l'écran tient son suivi (« Relancer »,
  // M92) à jour.
  onStart?: (key: string) => void;
  onResult?: (key: string, result: BackgroundResult) => void;
} = {}): SaveChain {
  let tail: Promise<unknown> = Promise.resolve();
  const failed = new Map<string, { save: () => Promise<BackgroundResult>; error?: string }>();

  const bounded = (save: () => Promise<BackgroundResult>): Promise<BackgroundResult> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
      save().catch(() => ({ ok: false, error: BACKGROUND_TIMEOUT_ERROR })),
      new Promise<BackgroundResult>((resolve) => {
        timer = setTimeout(
          () => resolve({ ok: false, error: BACKGROUND_TIMEOUT_ERROR }),
          timeoutMs,
        );
      }),
    ]).finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    });
  };

  const run: SaveChain['run'] = (key, save) => {
    // Le compte des échecs est tenu DANS la file : quand elle est vide, il est à jour.
    onStart?.(key);
    const done = tail
      .then(() => bounded(save))
      .then((result) => {
        if (result.ok) failed.delete(key);
        else failed.set(key, { save, error: result.error });
        onResult?.(key, result);
        return result;
      });
    tail = done.catch(() => undefined);
    return done;
  };

  const idle = () => tail.then(() => undefined);

  return {
    run,
    async settle() {
      await idle();
      if (failed.size > 0) {
        await Promise.all([...failed].map(([key, { save }]) => run(key, save)));
      }
      return [...failed].map(([key, { error }]) => ({ key, error }));
    },
  };
}
