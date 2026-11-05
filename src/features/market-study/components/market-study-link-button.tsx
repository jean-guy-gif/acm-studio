'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, hintText, link as linkStyle } from '@/components/ui/styles';
import { createMarketStudyLink } from '@/features/market-study/actions/create-market-study-link';
import { removeMarketStudyLink } from '@/features/market-study/actions/remove-market-study-link';
import {
  marketStudyShareHrefs,
  marketStudyShareMessage,
} from '@/features/market-study/services/market-study-link';

export type MarketStudyLinkView = { id: string; createdAt: string; expiresAt: string };

const day = (value: string): string =>
  new Date(value).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

// Mission 131 — « Créer un lien pour le vendeur (30 jours) » sur l'Étude de marché, modèle du Point
// marché (M127) : le lien ne s'affiche qu'une fois, à copier ou à envoyer par SMS, WhatsApp ou
// e-mail, avec un message prérempli signé du prénom du conseiller ; rien n'est envoyé par l'outil ;
// un nouveau lien remplace le précédent ; « Retirer le lien » le rend inutilisable tout de suite.
export function MarketStudyLinkButton({
  projectId,
  links,
  advisorFirstName,
  studyDate,
}: {
  projectId: string;
  links: MarketStudyLinkView[];
  advisorFirstName: string | null;
  studyDate: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ url: string; linkId: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);

  const remove = (linkId: string) =>
    startTransition(async () => {
      setMessage(null);
      const result = await removeMarketStudyLink(projectId, linkId);
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
            const result = await createMarketStudyLink(projectId);
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
            const text = marketStudyShareMessage(created.url, advisorFirstName);
            const hrefs = marketStudyShareHrefs(text, studyDate);
            return (
              <div className="flex flex-col gap-2" data-testid="market-study-link-share">
                <p className="text-sm break-all" data-testid="market-study-link">
                  {created.url}
                </p>
                <p
                  className="rounded-xl bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-zinc-700"
                  data-testid="market-study-link-message"
                >
                  {text}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    data-testid="market-study-share-copy"
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(text)
                        .then(() => setCopied('ok'))
                        .catch(() => setCopied('failed'));
                    }}
                  >
                    Copier
                  </button>
                  <a className={btnSecondary} href={hrefs.sms} data-testid="market-study-share-sms">
                    SMS
                  </a>
                  <a
                    className={btnSecondary}
                    href={hrefs.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="market-study-share-whatsapp"
                  >
                    WhatsApp
                  </a>
                  <a
                    className={btnSecondary}
                    href={hrefs.email}
                    data-testid="market-study-share-email"
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
        <ul className="flex flex-col gap-1 text-sm" data-testid="market-study-links">
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
