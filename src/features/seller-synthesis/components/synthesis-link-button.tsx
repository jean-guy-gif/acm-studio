'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnSecondary, hintText, link as linkStyle } from '@/components/ui/styles';
import { createSynthesisLink } from '@/features/seller-synthesis/actions/create-synthesis-link';
import { removeSynthesisLink } from '@/features/seller-synthesis/actions/remove-synthesis-link';

export type SynthesisLinkView = { id: string; createdAt: string; expiresAt: string };

const day = (value: string): string =>
  new Date(value).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

// Mission 110 — « Créer un lien pour le vendeur » : valable 30 jours, jamais indexé ; le lien ne
// s'affiche qu'une fois, à copier ; rien n'est envoyé par l'outil. « Retirer le lien » le rend
// inutilisable tout de suite.
export function SynthesisLinkButton({
  projectId,
  links,
}: {
  projectId: string;
  links: SynthesisLinkView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ url: string; linkId: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const remove = (linkId: string) =>
    startTransition(async () => {
      setMessage(null);
      const result = await removeSynthesisLink(projectId, linkId);
      if (result.ok) {
        if (created?.linkId === linkId) setCreated(null);
        setMessage('Lien retiré : il ne s’ouvre plus.');
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <button
        type="button"
        className={`${btnSecondary} self-start`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await createSynthesisLink(projectId);
            if (result.ok) {
              setCreated({ url: result.url, linkId: result.linkId });
              router.refresh();
            } else {
              setMessage(result.error);
            }
          })
        }
      >
        {pending ? '…' : 'Créer un lien pour le vendeur (30 jours)'}
      </button>
      {created ? (
        <>
          <p className="text-sm break-all" data-testid="synthesis-link">
            {created.url}
          </p>
          <p className={hintText}>
            Copiez ce lien pour l’envoyer au vendeur : il ne s’affichera plus. Il expire dans 30
            jours ; l’outil n’envoie rien.
          </p>
        </>
      ) : null}
      {links.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm" data-testid="synthesis-links">
          {links.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3">
              <span>
                Lien créé le {day(item.createdAt)}, valable jusqu’au {day(item.expiresAt)}
              </span>
              <button
                type="button"
                className={linkStyle}
                disabled={pending}
                onClick={() => remove(item.id)}
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
