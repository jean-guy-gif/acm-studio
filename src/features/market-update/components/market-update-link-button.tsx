'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, hintText, link as linkStyle } from '@/components/ui/styles';
import { createMarketUpdateLink } from '@/features/market-update/actions/create-market-update-link';
import { removeMarketUpdateLink } from '@/features/market-update/actions/remove-market-update-link';
import {
  marketUpdateShareHrefs,
  marketUpdateShareMessage,
} from '@/features/market-update/services/market-update-share';

export type MarketUpdateLinkView = { id: string; createdAt: string; expiresAt: string };

const day = (value: string): string =>
  new Date(value).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

// Mission 127 — « Créer un lien pour le vendeur (30 jours) » sur un Point marché : le lien ne
// s'affiche qu'une fois, à copier ; rien n'est envoyé par l'outil ; « Retirer le lien » le rend
// inutilisable tout de suite (modèle de la synthèse, M110).
export function MarketUpdateLinkButton({
  projectId,
  updateId,
  links,
  advisorFirstName,
  meetingDate,
  pointDate,
}: {
  projectId: string;
  updateId: string;
  links: MarketUpdateLinkView[];
  // Mission 127 B — le message prérempli (M122 B) : signé du prénom du conseiller.
  advisorFirstName: string | null;
  meetingDate: string | null;
  pointDate: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ url: string; linkId: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);

  const remove = (linkId: string) =>
    startTransition(async () => {
      setMessage(null);
      const result = await removeMarketUpdateLink(projectId, linkId);
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
            setCopied(null);
            const result = await createMarketUpdateLink(projectId, updateId);
            if (result.ok) {
              setCreated({ url: result.url, linkId: result.linkId });
              router.refresh();
            } else {
              setMessage(result.error);
            }
          })
        }
      >
        {pending
          ? '…'
          : links.length > 0 || created
            ? 'Créer un nouveau lien (30 jours)'
            : 'Créer un lien pour le vendeur (30 jours)'}
      </button>
      <p className={hintText}>
        Sans compte, jamais indexé, 30 jours ; l’outil n’envoie rien.
        {links.length > 0 || created ? ' Un nouveau lien remplace le précédent.' : ''}
      </p>
      {created
        ? (() => {
            const text = marketUpdateShareMessage(created.url, meetingDate, advisorFirstName);
            const hrefs = marketUpdateShareHrefs(text, pointDate);
            return (
              <div className="flex flex-col gap-2" data-testid="market-update-link-share">
                <p className="text-sm break-all" data-testid="market-update-link">
                  {created.url}
                </p>
                <p
                  className="rounded-xl bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-zinc-700"
                  data-testid="market-update-link-message"
                >
                  {text}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    data-testid="market-update-share-copy"
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(text)
                        .then(() => setCopied('ok'))
                        .catch(() => setCopied('failed'));
                    }}
                  >
                    Copier
                  </button>
                  <a
                    className={btnSecondary}
                    href={hrefs.sms}
                    data-testid="market-update-share-sms"
                  >
                    SMS
                  </a>
                  <a
                    className={btnSecondary}
                    href={hrefs.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="market-update-share-whatsapp"
                  >
                    WhatsApp
                  </a>
                  <a
                    className={btnSecondary}
                    href={hrefs.email}
                    data-testid="market-update-share-email"
                  >
                    E-mail
                  </a>
                </div>
                <p className={hintText} role="status">
                  {copied === 'ok'
                    ? 'Message copié, lien compris.'
                    : copied === 'failed'
                      ? 'La copie a échoué : sélectionnez le message ci-dessus.'
                      : 'Le lien ne s’affichera plus. Il expire dans 30 jours ; l’outil n’envoie rien.'}
                </p>
              </div>
            );
          })()
        : null}
      {links.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm" data-testid="market-update-links">
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
