'use client';

import { useState, useTransition } from 'react';

import { hintText } from '@/components/ui/styles';
import { setDossierPhoto } from '@/features/buyer-dossier/actions/dossier-links';
import { BuyerGoneNotice } from '@/features/buyer-dossier/components/buyer-gone-notice';

export type DossierPhotoChoice = { id: string; position: string; label: string; hidden: boolean };

// Mission 119 (partie B) — « Sans photo » par bien, comme la synthèse (M113) : décoché par défaut ;
// coché, la photo quitte le document et le lien. Écran du conseiller, jamais imprimé.
export function DossierPhotoChoices({
  buyerId,
  items,
}: {
  buyerId: string;
  items: DossierPhotoChoice[];
}) {
  const [hidden, setHidden] = useState(() => new Map(items.map((item) => [item.id, item.hidden])));
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return null;
  if (gone) return <BuyerGoneNotice />;
  return (
    <fieldset className="flex flex-col gap-2 print:hidden" data-testid="dossier-photo-choices">
      <legend className="text-sm font-semibold text-zinc-800">Photos des biens</legend>
      <p className={hintText}>
        Chaque photo est celle de l’annonce ou du bien, telle que montrée à l’acquéreur. Cochez
        «&nbsp;Sans photo&nbsp;» pour la retirer du document et du lien.
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={hidden.get(item.id) ?? false}
                disabled={pending}
                data-testid="dossier-hide-photo"
                onChange={(event) => {
                  const value = event.target.checked;
                  setError(null);
                  setHidden((current) => new Map(current).set(item.id, value));
                  startTransition(async () => {
                    const result = await setDossierPhoto(buyerId, item.id, value);
                    if (!result.ok) {
                      setHidden((current) => new Map(current).set(item.id, !value));
                      if (result.gone) setGone(true);
                      else setError(result.error);
                    }
                  });
                }}
              />
              Sans photo — Bien {item.position} · {item.label}
            </label>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
