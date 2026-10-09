'use client';

import { useState } from 'react';

import { btnSecondary } from '@/components/ui/styles';
import { openLocatorProperty } from '@/features/competitor-locator/client';
import { locationAction } from '@/features/competitor-locator/services/location-action';
import {
  LOCATOR_SHARING_OFF_MESSAGE,
  type LocatorAvailability,
} from '@/features/competitor-locator/types';

const smallBtn = `${btnSecondary} px-3 py-1.5 text-xs`;
// Le Localisateur n'ouvre qu'une vue toutes les 2 s : le bouton attend autant.
const OPEN_COOLDOWN_MS = 2_000;

export type CompetitorLocationFields = {
  listing_url: string | null;
  locator_state: string | null;
  locator_label: string | null;
  locator_address: string | null;
  locator_confirmed: boolean | null;
};

// Mission 75 — l'adresse d'un concurrent sur sa carte, côté conseiller. L'étiquette du
// Localisateur est affichée telle quelle ; les boutons n'existent que si le Localisateur répond.
export function CompetitorLocationLine({
  competitor,
  availability,
}: {
  competitor: CompetitorLocationFields;
  availability: LocatorAvailability | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [cooling, setCooling] = useState(false);
  const action = locationAction(competitor);
  const ready = availability === 'ready';
  const address = competitor.locator_address?.trim() || null;
  const label = competitor.locator_label?.trim() || null;

  if (action === 'none') {
    return null;
  }
  // Sans Localisateur : seul ce qui est déjà connu reste affiché.
  if (!ready && !address && !label) {
    return null;
  }

  const locate = async () => {
    if (!competitor.listing_url) {
      return;
    }
    setMessage(null);
    setCooling(true);
    window.setTimeout(() => setCooling(false), OPEN_COOLDOWN_MS);
    const result = await openLocatorProperty(competitor.listing_url);
    if (!result.ok) {
      setMessage(
        result.reason === 'sharing_off'
          ? `${LOCATOR_SHARING_OFF_MESSAGE}.`
          : (result.message ?? 'Le Localisateur n’a pas ouvert ce bien.'),
      );
    }
  };

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {action === 'pending' ? (
          <span className="text-zinc-500 stage:text-white/55">
            Adresse : analyse en cours dans le Localisateur…
          </span>
        ) : (
          <span className="text-zinc-700 stage:text-white/80">
            {address ? <>Adresse&nbsp;: {address}</> : null}
            {address && label ? ' · ' : null}
            {label ? <span className="text-zinc-500 stage:text-white/55">{label}</span> : null}
          </span>
        )}
        {ready && action === 'find' && competitor.listing_url ? (
          <a
            href={competitor.listing_url}
            target="_blank"
            rel="noreferrer noopener"
            className={smallBtn}
          >
            Trouver l’adresse
          </a>
        ) : null}
        {ready && action === 'locate' ? (
          <button type="button" onClick={locate} disabled={cooling} className={smallBtn}>
            Localiser moi-même
          </button>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="text-xs text-amber-700 stage:text-amber-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}
