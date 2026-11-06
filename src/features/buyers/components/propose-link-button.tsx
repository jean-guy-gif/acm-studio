'use client';

import { useState, useTransition } from 'react';

import { btnSecondary, hintText, link as linkStyle } from '@/components/ui/styles';
import { DossierLinkShare } from '@/features/buyer-dossier/components/dossier-link-button';
import { proposeProjectToBuyer } from '@/features/buyers/actions/propose-project';

// Mission 133 — « Envoyer le lien » : le dossier acquéreur avec ce bien en tête. Une confirmation
// dans l'écran d'abord (une nouvelle sélection, son lien actuel remplacé, M122 B), puis le lien et
// ses boutons de partage ; l'outil n'envoie rien.
export function ProposeLinkButton({
  buyerId,
  buyerName,
  projectId,
  advisorFirstName,
}: {
  buyerId: string;
  buyerName: string;
  projectId: string;
  advisorFirstName: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (url) {
    return (
      <div className="w-full" data-testid="propose-link-share">
        <DossierLinkShare url={url} advisorFirstName={advisorFirstName} />
      </div>
    );
  }
  if (confirming) {
    return (
      <div
        className="flex w-full flex-col gap-2 rounded-xl bg-zinc-50 p-3 stage:bg-white/5"
        data-testid="propose-link-confirm"
      >
        <p className="text-sm text-zinc-700 stage:text-white/80">
          Une nouvelle sélection pour {buyerName}, avec ce bien en tête et deux biens de sa
          sélection actuelle. Son lien actuel, s’il en a un, cesse de marcher ; ses réponses
          restent.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={btnSecondary}
            disabled={pending}
            autoFocus
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await proposeProjectToBuyer(buyerId, projectId);
                if (result.ok) setUrl(result.url);
                else setError(result.error);
              })
            }
          >
            {pending ? '…' : 'Créer le lien'}
          </button>
          <button
            type="button"
            className={linkStyle}
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Annuler
          </button>
        </div>
        {error ? (
          <p role="alert" className={hintText}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={btnSecondary}
      onClick={() => setConfirming(true)}
      data-testid="propose-link"
    >
      Envoyer le lien
    </button>
  );
}
