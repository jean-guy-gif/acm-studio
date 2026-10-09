'use client';

import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, inputBase } from '@/components/ui/styles';
import { confirmCompetitorAddress } from '@/features/competitor-locator/actions/confirm-competitor-address';
import { openLocatorProperty } from '@/features/competitor-locator/client';
import { ADDRESS_MAX_LENGTH } from '@/features/competitor-locator/services/advisor-address';
import { LOCATOR_SHARING_OFF_MESSAGE } from '@/features/competitor-locator/types';

const smallBtn = `${btnSecondary} px-3 py-1.5 text-xs`;
// Le Localisateur n'ouvre qu'une vue toutes les 2 s : le bouton attend autant.
const OPEN_COOLDOWN_MS = 2_000;

// Mission 84 — sur une ligne de la liste de tournée, de quoi confirmer l'adresse sans quitter
// ACM : valider celle que le Localisateur propose, l'ouvrir dans le Localisateur (ACM relit au
// retour sur l'onglet), ou la saisir. Une fois confirmée par le conseiller, seul « Corriger
// l'adresse » reste. Rien ne s'imprime.
export function ConfirmAddressActions({
  projectId,
  competitorId,
  listingUrl,
  canAccept,
  confirmed,
  confirmedByAdvisor,
}: {
  projectId: string;
  competitorId: string;
  listingUrl: string | null;
  // Le Localisateur propose une adresse, pas encore confirmée.
  canAccept: boolean;
  confirmed: boolean;
  confirmedByAdvisor: boolean;
}) {
  const [typing, setTyping] = useState(false);
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [cooling, setCooling] = useState(false);
  const [pending, startTransition] = useTransition();

  // Confirmée par le Localisateur : rien à faire ici.
  if (confirmed && !confirmedByAdvisor) {
    return null;
  }

  const submit = (input: { mode: 'accept' } | { mode: 'typed'; address: string }) => {
    setMessage(null);
    startTransition(async () => {
      const result = await confirmCompetitorAddress(projectId, competitorId, input);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setTyping(false);
      setAddress('');
    });
  };

  const locate = async () => {
    if (!listingUrl) {
      return;
    }
    setMessage(null);
    setCooling(true);
    window.setTimeout(() => setCooling(false), OPEN_COOLDOWN_MS);
    const result = await openLocatorProperty(listingUrl);
    if (!result.ok) {
      setMessage(
        result.reason === 'sharing_off'
          ? `${LOCATOR_SHARING_OFF_MESSAGE}.`
          : (result.message ??
              'Le Localisateur n’a pas ouvert ce bien. Vous pouvez saisir l’adresse.'),
      );
    }
  };

  return (
    <div className="flex flex-col gap-1.5 py-0.5 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        {canAccept ? (
          <button
            type="button"
            className={smallBtn}
            disabled={pending}
            onClick={() => submit({ mode: 'accept' })}
          >
            C’est la bonne adresse
          </button>
        ) : null}
        {!confirmed && listingUrl ? (
          <button type="button" className={smallBtn} disabled={cooling} onClick={locate}>
            Localiser moi-même
          </button>
        ) : null}
        {!typing ? (
          <button type="button" className={smallBtn} onClick={() => setTyping(true)}>
            {confirmed ? 'Corriger l’adresse' : 'Saisir l’adresse'}
          </button>
        ) : null}
      </div>
      {typing ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit({ mode: 'typed', address });
          }}
        >
          <input
            type="text"
            autoFocus
            maxLength={ADDRESS_MAX_LENGTH}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="14 chemin des Oliviers, 06800 Cagnes-sur-Mer"
            aria-label="Adresse du bien concurrent"
            className={`${inputBase} min-w-0 flex-1`}
          />
          <button type="submit" className={`${btnPrimary} px-3 py-1.5 text-xs`} disabled={pending}>
            {pending ? 'Enregistrement…' : 'Confirmer l’adresse'}
          </button>
          <button type="button" className={smallBtn} onClick={() => setTyping(false)}>
            Annuler
          </button>
        </form>
      ) : null}
      {message ? (
        <p role="status" className="text-xs text-amber-700 stage:text-amber-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}
