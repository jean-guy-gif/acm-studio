'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, hintText, link as linkStyle } from '@/components/ui/styles';
import {
  createDossierLink,
  removeDossierLink,
} from '@/features/buyer-dossier/actions/dossier-links';
import { BuyerGoneNotice } from '@/features/buyer-dossier/components/buyer-gone-notice';
import {
  dossierShareHrefs,
  dossierShareMessage,
} from '@/features/buyer-dossier/services/dossier-share';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';

export type DossierLinkView = { id: string; createdAt: string; expiresAt: string };

// Mission 119 (partie B) — « Créer un lien pour l'acquéreur » : valable 30 jours, jamais indexé ; le
// lien ne s'affiche qu'une fois ; rien n'est envoyé par l'outil. « Retirer le lien » le rend
// inutilisable tout de suite. Essai de Jean-Guy (26/10) : le lien s'affiche avec « Copier », « SMS »,
// « WhatsApp », « E-mail », qui ouvrent un message prérempli ; quand il n'est plus affichable,
// « Créer un nouveau lien » le remplace : l'ancien cesse de marcher, la réponse reçue reste.
export function DossierLinkButton({
  buyerId,
  links,
  advisorFirstName,
}: {
  buyerId: string;
  links: DossierLinkView[];
  advisorFirstName: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ url: string; linkId: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const replacing = links.length > 0;

  if (gone) return <BuyerGoneNotice />;
  return (
    <div className="flex flex-col gap-2 print:hidden" data-testid="dossier-links">
      {created ? null : (
        <button
          type="button"
          className={`${btnSecondary} self-start`}
          disabled={pending}
          data-testid={replacing ? 'dossier-link-renew' : 'dossier-link-create'}
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              const result = await createDossierLink(buyerId, replacing);
              if (result.ok) {
                setCreated({ url: result.url, linkId: result.linkId });
                router.refresh();
              } else if (result.gone) {
                setGone(true);
              } else {
                setMessage(result.error);
              }
            })
          }
        >
          {pending
            ? '…'
            : replacing
              ? 'Créer un nouveau lien'
              : 'Créer un lien pour l’acquéreur (30 jours)'}
        </button>
      )}
      {replacing && !created ? (
        <p className={hintText}>
          Le lien ne s’affiche qu’à sa création. Un nouveau lien remplace l’ancien, qui cesse de
          marcher ; la réponse déjà reçue reste.
        </p>
      ) : null}
      {created ? <DossierLinkShare url={created.url} advisorFirstName={advisorFirstName} /> : null}
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
                    } else if (result.gone) {
                      setGone(true);
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

function DossierLinkShare({
  url,
  advisorFirstName,
}: {
  url: string;
  advisorFirstName: string | null;
}) {
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const text = dossierShareMessage(url, advisorFirstName);
  const hrefs = dossierShareHrefs(text);
  return (
    <div className="flex flex-col gap-2" data-testid="dossier-link-share">
      <p className="text-sm break-all" data-testid="dossier-link">
        {url}
      </p>
      <p
        className="rounded-xl bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-zinc-700"
        data-testid="dossier-link-message"
      >
        {text}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          data-testid="dossier-share-copy"
          onClick={() => {
            navigator.clipboard
              ?.writeText(text)
              .then(() => setCopied('ok'))
              .catch(() => setCopied('failed'));
          }}
        >
          Copier
        </button>
        <a className={btnSecondary} href={hrefs.sms} data-testid="dossier-share-sms">
          SMS
        </a>
        <a
          className={btnSecondary}
          href={hrefs.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="dossier-share-whatsapp"
        >
          WhatsApp
        </a>
        <a className={btnSecondary} href={hrefs.email} data-testid="dossier-share-email">
          E-mail
        </a>
      </div>
      <p className={hintText} role="status">
        {copied === 'ok'
          ? 'Message copié, lien compris.'
          : copied === 'failed'
            ? 'La copie a échoué : sélectionnez le message ci-dessus.'
            : 'Le lien ne s’affichera plus. Il expire dans 30 jours ; l’outil n’envoie rien. L’acquéreur répond depuis son téléphone, une seule fois : sa réponse arrive sur sa fiche et sur Visites.'}
      </p>
    </div>
  );
}
