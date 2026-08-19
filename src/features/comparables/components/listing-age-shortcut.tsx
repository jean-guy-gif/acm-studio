'use client';

import { useState } from 'react';

import { btnGhost, hintText } from '@/components/ui/styles';
import {
  listingAgeLookupUrl,
  canLookUpListingAge,
  LISTING_AGE_TOOL_NAME,
} from '@/features/comparables/services/listing-age-lookup';

// Bouton « Vérifier l'ancienneté ». Copie l'adresse de l'annonce et ouvre le
// service dans un nouvel onglet : le conseiller n'a plus qu'à coller.
//
// C'est lui qui consulte le service, dans son navigateur. Nos serveurs
// n'interrogent rien — voir services/listing-age-lookup.ts.

type Props = { listingUrl: string | null | undefined };

export function ListingAgeShortcut({ listingUrl }: Props) {
  const [copied, setCopied] = useState(false);

  if (!canLookUpListingAge(listingUrl)) {
    return null;
  }

  const url = (listingUrl as string).trim();

  const openTool = async () => {
    // La copie peut échouer (permission refusée, navigateur ancien) : on ouvre
    // le service quoi qu'il arrive, le conseiller collera son adresse lui-même.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    window.open(listingAgeLookupUrl(), '_blank', 'noopener,noreferrer');
  };

  return (
    <span className="mt-1 flex flex-col gap-1">
      <button type="button" onClick={openTool} className={`${btnGhost} w-fit`}>
        ↗ Vérifier l’ancienneté sur {LISTING_AGE_TOOL_NAME}
      </button>
      <span className={hintText}>
        {copied
          ? `Adresse de l’annonce copiée — collez-la dans ${LISTING_AGE_TOOL_NAME} (Cmd+V), puis reportez le nombre de jours ci-dessus.`
          : `Ouvre ${LISTING_AGE_TOOL_NAME} dans un nouvel onglet. Collez l’adresse de l’annonce, puis reportez le nombre de jours ci-dessus.`}
      </span>
    </span>
  );
}
