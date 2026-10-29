'use client';

import { useState, useTransition } from 'react';

import { hintText } from '@/components/ui/styles';
import { setSynthesisPhoto } from '@/features/seller-synthesis/actions/set-synthesis-photo';

export type SynthesisPhotoChoice = {
  id: string;
  position: number;
  label: string;
  hidden: boolean;
};

// Mission 113 — sur l'écran du conseiller, jamais imprimé : chaque concurrent qui a une photo porte
// « Sans photo », décoché par défaut. Coché, sa photo quitte le document et le lien.
export function SynthesisPhotoChoices({
  projectId,
  competitors,
  hint,
}: {
  projectId: string;
  competitors: SynthesisPhotoChoice[];
  // Mission 127 — le Point marché lit le même choix, avec sa propre phrase.
  hint?: string;
}) {
  const [hidden, setHidden] = useState(
    () => new Map(competitors.map((item) => [item.id, item.hidden])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (competitors.length === 0) return null;

  const toggle = (id: string, value: boolean) => {
    setError(null);
    setHidden((current) => new Map(current).set(id, value));
    startTransition(async () => {
      const result = await setSynthesisPhoto(projectId, id, value);
      if (!result.ok) {
        setHidden((current) => new Map(current).set(id, !value));
        setError(result.error);
      }
    });
  };

  return (
    <fieldset className="flex flex-col gap-2" data-testid="synthesis-photo-choices">
      <legend className="text-sm font-semibold text-zinc-800">Photos des concurrents</legend>
      <p className={hintText}>
        {hint ??
          'Chaque photo est celle de l’annonce, telle que le vendeur l’a vue pendant le rendez-vous. Elle appartient à son auteur : cochez « Sans photo » pour la retirer du document et du lien.'}
      </p>
      <ul className="flex flex-col gap-1.5">
        {competitors.map((item) => (
          <li key={item.id}>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={hidden.get(item.id) ?? false}
                disabled={pending}
                onChange={(event) => toggle(item.id, event.target.checked)}
                data-testid="synthesis-hide-photo"
              />
              <span>
                Sans photo — Concurrent {item.position} · {item.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </fieldset>
  );
}
