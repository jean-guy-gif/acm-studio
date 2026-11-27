'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { btnSecondary, hintText } from '@/components/ui/styles';

// Mission 161 — le dossier d'adresse en préparation chez Academia (20 à 60 secondes) : la page se
// relit toute seule, toutes les 5 secondes (le plus souvent que Laurent permet), deux minutes au
// plus ; au-delà, « Vérifier maintenant ». La relecture passe par le serveur (`router.refresh`),
// dans la limite de son bloc (M158) : le reste de la page ne l'attend pas.
export const ACADEMIA_REFRESH_EVERY_MS = 5_000;
export const ACADEMIA_REFRESH_MAX = 24;

// La cadence elle-même, sans React : `refresh` toutes les `every` ms, `max` fois au plus, puis
// `onGiveUp`. Rend de quoi l'arrêter.
export function startAcademiaRefresh(input: {
  refresh: () => void;
  onGiveUp: () => void;
  every?: number;
  max?: number;
}): () => void {
  const every = input.every ?? ACADEMIA_REFRESH_EVERY_MS;
  const max = input.max ?? ACADEMIA_REFRESH_MAX;
  let count = 0;
  const timer = setInterval(() => {
    if (count >= max) {
      clearInterval(timer);
      input.onGiveUp();
      return;
    }
    count += 1;
    input.refresh();
  }, every);
  return () => clearInterval(timer);
}

export function AcademiaAutoRefresh({ testId }: { testId: string }) {
  const router = useRouter();
  const [round, setRound] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (gaveUp) return;
    return startAcademiaRefresh({
      refresh: () => router.refresh(),
      onGiveUp: () => setGaveUp(true),
    });
  }, [gaveUp, round, router]);
  if (!gaveUp) return null;
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <p className={hintText}>
        La préparation prend plus de temps que prévu. Revenez sur cette page dans quelques
        minutes&nbsp;: la demande continue chez Academia.
      </p>
      <button
        type="button"
        className={`${btnSecondary} self-start text-sm`}
        onClick={() => {
          setGaveUp(false);
          setRound((value) => value + 1);
          router.refresh();
        }}
      >
        Vérifier maintenant
      </button>
    </div>
  );
}
