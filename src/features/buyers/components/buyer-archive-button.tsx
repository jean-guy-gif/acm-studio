'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnDanger, btnDangerGhost, errorText, link } from '@/components/ui/styles';
import { archiveBuyer } from '@/features/buyers/actions/buyers';

// Mission 117 — « Archiver » : suppression douce (M93), avec confirmation dans l'écran. La fiche
// disparaît de la liste et ne se rapproche plus ; rien n'est effacé.
export function BuyerArchiveButton({ buyerId, name }: { buyerId: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        className={`${btnDangerGhost} px-3 py-1.5 text-xs`}
        onClick={() => setConfirming(true)}
      >
        Archiver
      </button>
    );
  }

  return (
    <div
      data-testid="buyer-archive-confirm"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-200"
    >
      <span>Archiver la fiche de {name}&#x202f;? Elle disparaîtra de vos listes.</span>
      <button
        type="button"
        disabled={pending}
        className={`${btnDanger} px-3 py-1.5 text-xs`}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await archiveBuyer(buyerId).catch(() => ({
              ok: false as const,
              error:
                'La fiche n’a pas pu être archivée\u00a0: vérifiez la connexion, puis réessayez.',
            }));
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(`/acquereurs?archive=${encodeURIComponent(name)}`);
          });
        }}
      >
        {pending ? 'Archivage…' : 'Archiver'}
      </button>
      <button type="button" className={`${link} text-xs`} onClick={() => setConfirming(false)}>
        Annuler
      </button>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
