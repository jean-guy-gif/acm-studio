'use client';

import { useState } from 'react';

import { btnSecondary, hintText } from '@/components/ui/styles';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';
import {
  offerBuyerMessage,
  offerSellerMessage,
} from '@/features/purchase-offer/services/offer-link';

// Mission 137 (partie B) — les deux liens de l'offre signée, chacun avec son message prérempli :
// la copie des offrants (à l'e-mail de la fiche), et le lien du vendeur (à l'e-mail et au téléphone
// du dossier vendeur), qui accepte ou refuse. Copier, SMS, E-mail ; l'outil n'envoie rien. Les liens
// ne se redonnent pas (condensat seul) : ils s'affichent ici, une fois.
export function OfferShare({
  buyerLinkPath,
  sellerLinkPath,
  buyerEmail,
  sellerEmail,
  sellerPhone,
  validUntil,
  advisorFirstName,
}: {
  buyerLinkPath: string;
  sellerLinkPath: string;
  buyerEmail: string | null;
  sellerEmail: string | null;
  sellerPhone: string | null;
  validUntil: string;
  advisorFirstName: string | null;
}) {
  const [note, setNote] = useState<string | null>(null);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const blocks = [
    {
      key: 'buyer',
      title: 'La copie des offrants',
      url: `${origin}${buyerLinkPath}`,
      message: offerBuyerMessage({ url: `${origin}${buyerLinkPath}`, advisorFirstName }),
      email: buyerEmail,
      phone: null,
      subject: 'Votre offre d’achat',
    },
    {
      key: 'seller',
      title: 'Le lien du vendeur : il accepte en signant, ou refuse',
      url: `${origin}${sellerLinkPath}`,
      message: offerSellerMessage({
        url: `${origin}${sellerLinkPath}`,
        validUntil,
        advisorFirstName,
      }),
      email: sellerEmail,
      phone: sellerPhone,
      subject: 'Une offre d’achat pour votre bien',
    },
  ];
  return (
    <div className="flex flex-col gap-4" data-testid="offer-share">
      {blocks.map((block) => {
        const hrefs = followUpShareHrefs(block.message, block.phone, block.email, block.subject);
        return (
          <div key={block.key} className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-zinc-800">{block.title}</span>
            <p
              className="break-all rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
              data-testid={`offer-link-${block.key}`}
            >
              {block.url}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(block.message)
                    .then(() => setNote('Message copié, lien compris.'))
                    .catch(() => setNote('La copie a échoué : sélectionnez le lien.'));
                }}
              >
                Copier
              </button>
              {hrefs.sms ? (
                <a className={btnSecondary} href={hrefs.sms}>
                  SMS
                </a>
              ) : null}
              <a className={btnSecondary} href={hrefs.email}>
                E-mail
              </a>
            </div>
          </div>
        );
      })}
      <p className={hintText}>
        {note ?? 'Chaque lien vaut 30 jours ; l’offre reste sur la fiche.'}
      </p>
    </div>
  );
}
