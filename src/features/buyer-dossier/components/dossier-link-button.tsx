'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnSecondary, hintText, link as linkStyle } from '@/components/ui/styles';
import {
  createDossierLink,
  removeDossierLink,
} from '@/features/buyer-dossier/actions/dossier-links';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';

export type DossierLinkView = { id: string; createdAt: string; expiresAt: string };

// Mission 119 (partie B) — « Créer un lien pour l'acquéreur » : valable 30 jours, jamais indexé ; le
// lien ne s'affiche qu'une fois, à copier ; rien n'est envoyé par l'outil. « Retirer le lien » le
// rend inutilisable tout de suite.
export function DossierLinkButton({
  buyerId,
  links,
}: {
  buyerId: string;
  links: DossierLinkView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ url: string; linkId: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 print:hidden" data-testid="dossier-links">
      <button
        type="button"
        className={`${btnSecondary} self-start`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await createDossierLink(buyerId);
            if (result.ok) {
              setCreated({ url: result.url, linkId: result.linkId });
              router.refresh();
            } else {
              setMessage(result.error);
            }
          })
        }
      >
        {pending ? '…' : 'Créer un lien pour l’acquéreur (30 jours)'}
      </button>
      {created ? (
        <>
          <p className="text-sm break-all" data-testid="dossier-link">
            {created.url}
          </p>
          <p className={hintText}>
            Copiez ce lien pour l’envoyer à l’acquéreur : il ne s’affichera plus. Il expire dans 30
            jours ; l’outil n’envoie rien. Sur ce lien, l’acquéreur répond depuis son téléphone, une
            seule fois : sa réponse arrive sur sa fiche et sur Visites.
          </p>
        </>
      ) : null}
      {links.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {links.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3">
              <span>
                Lien créé le {buyerDateLabel(item.createdAt)}, valable jusqu’au{' '}
                {buyerDateLabel(item.expiresAt)}
              </span>
              <button
                type="button"
                className={linkStyle}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setMessage(null);
                    const result = await removeDossierLink(buyerId, item.id);
                    if (result.ok) {
                      if (created?.linkId === item.id) setCreated(null);
                      setMessage('Lien retiré : il ne s’ouvre plus.');
                      router.refresh();
                    } else {
                      setMessage(result.error);
                    }
                  })
                }
              >
                Retirer le lien
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
