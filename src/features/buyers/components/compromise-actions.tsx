'use client';

import { useRouter } from 'next/navigation';

import { socleBigStep, socleBtnFilledBig, socleStepLink } from '@/components/ui/styles';
import {
  OfferMessagePanel,
  useOfferMessages,
} from '@/features/purchase-offer/components/offer-answer-task';

// Mission 143 (B1, maquette AUDIT-keller.png) — « Lancer le compromis », dans le bloc de la prochaine
// étape : « Prévenir la famille Keller », bouton plein, puis « Transmettre au notaire » en lien ; les
// gestes et les messages de la M138. Chaque message préparé crée son lien : la page se relit, pour
// que « Avant le compromis » coche ce qui vient d'être fait.
export function CompromiseActions({
  offerId,
  notifyLabel,
}: {
  offerId: string;
  notifyLabel: string;
}) {
  const router = useRouter();
  const messages = useOfferMessages(offerId, () => router.refresh());
  return (
    <div className="flex flex-col gap-3" data-testid="compromise-actions">
      <button
        type="button"
        onClick={() => messages.prepare('buyer')}
        data-testid="buyer-next-button"
        className={`${socleBtnFilledBig} ${socleBigStep}`}
      >
        {notifyLabel}
      </button>
      <button
        type="button"
        onClick={() => messages.prepare('notary')}
        data-testid="buyer-next-secondary"
        className={socleStepLink}
      >
        Transmettre au notaire
      </button>
      <OfferMessagePanel messages={messages} />
    </div>
  );
}
