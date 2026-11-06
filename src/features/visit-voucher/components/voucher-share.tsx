'use client';

import { useState } from 'react';

import { btnSecondary, hintText } from '@/components/ui/styles';
import { createVoucherLink } from '@/features/visit-voucher/actions/create-voucher-link';
import { voucherMessage } from '@/features/visit-voucher/services/voucher-link';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';

const SUBJECT = 'Votre bon de visite';

// Mission 137 — le bon signé envoyé au visiteur : Copier, ou E-mail à l'adresse de sa fiche ; ACM
// n'envoie rien (M122 B). Le lien ne se redonne pas (condensat seul) : « Créer un lien » en refait un.
export function VoucherShare({
  documentId,
  initialLinkPath,
  email,
  advisorFirstName = null,
}: {
  documentId: string;
  initialLinkPath: string | null;
  email: string | null;
  advisorFirstName?: string | null;
}) {
  const [linkPath, setLinkPath] = useState(initialLinkPath);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!linkPath) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={`${btnSecondary} self-start`}
          disabled={pending}
          data-testid="voucher-create-link"
          onClick={() => {
            setPending(true);
            setNote(null);
            void createVoucherLink(documentId)
              .then((result) => {
                setPending(false);
                if (result.ok) setLinkPath(result.linkPath);
                else setNote(result.error);
              })
              .catch(() => {
                setPending(false);
                setNote('Connexion perdue : réessayez.');
              });
          }}
        >
          {pending ? 'Création…' : 'Créer le lien pour le visiteur (30 jours)'}
        </button>
        {note ? (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {note}
          </p>
        ) : null}
      </div>
    );
  }
  const url = typeof window === 'undefined' ? linkPath : `${window.location.origin}${linkPath}`;
  const message = voucherMessage({ url, advisorFirstName });
  const hrefs = followUpShareHrefs(message, null, email, SUBJECT);
  return (
    <div className="flex flex-col gap-2" data-testid="voucher-share">
      <p
        className="break-all rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
        data-testid="voucher-link"
      >
        {url}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnSecondary}
          onClick={() => {
            navigator.clipboard
              ?.writeText(message)
              .then(() => setNote('Message copié, lien compris.'))
              .catch(() => setNote('La copie a échoué : sélectionnez le lien ci-dessus.'));
          }}
        >
          Copier
        </button>
        <a className={btnSecondary} href={hrefs.email}>
          E-mail
        </a>
      </div>
      <p className={hintText}>{note ?? 'Le lien vaut 30 jours ; le bon reste sur la fiche.'}</p>
    </div>
  );
}
