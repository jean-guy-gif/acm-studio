'use client';

import { useState } from 'react';

import { btnSecondary } from '@/components/ui/styles';
import { createOfferLinks } from '@/features/purchase-offer/actions/create-offer-links';
import { OfferShare } from '@/features/purchase-offer/components/offer-share';

// Mission 137 (partie B) — sur la page d'une offre signée : « Créer les liens », puis les deux liens
// avec Copier / SMS / E-mail.
export function OfferLinksPanel(props: {
  documentId: string;
  buyerEmail: string | null;
  sellerEmail: string | null;
  sellerPhone: string | null;
  validUntil: string;
  advisorFirstName: string | null;
}) {
  const [links, setLinks] = useState<{ buyerLinkPath: string; sellerLinkPath: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (links) {
    return (
      <OfferShare
        buyerLinkPath={links.buyerLinkPath}
        sellerLinkPath={links.sellerLinkPath}
        buyerEmail={props.buyerEmail}
        sellerEmail={props.sellerEmail}
        sellerPhone={props.sellerPhone}
        validUntil={props.validUntil}
        advisorFirstName={props.advisorFirstName}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={`${btnSecondary} self-start`}
        disabled={pending}
        data-testid="offer-create-links"
        onClick={() => {
          setPending(true);
          setError(null);
          void createOfferLinks(props.documentId)
            .then((result) => {
              setPending(false);
              if (result.ok) setLinks(result);
              else setError(result.error);
            })
            .catch(() => {
              setPending(false);
              setError('Connexion perdue : réessayez.');
            });
        }}
      >
        {pending ? 'Création…' : 'Créer les liens (offrants et vendeur, 30 jours)'}
      </button>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
