import type { MandateLife, MandateOffer, MandateStage } from '@/features/mandate-life/types';
import { formatEuro, formatRelativeDay } from '@/lib/format';

// Lot C (maquette C0, validée le 28/11) — « Son mandat », quatre cartes dans le socle de « Son
// dossier » : vert fait, bleu maintenant, gris à venir. Les dates du conseiller, relatives (M143).
// Pur.

export type MandateStepKey = 'signed' | 'offer_accepted' | 'under_compromise' | 'sold';
export type MandateStep = {
  key: MandateStepKey;
  title: string;
  fact: string;
  status: 'done' | 'current' | 'later';
};

const ORDER: MandateStepKey[] = ['signed', 'offer_accepted', 'under_compromise', 'sold'];
const TITLES: Record<MandateStepKey, string> = {
  signed: 'Mandat signé',
  offer_accepted: 'Offre acceptée',
  under_compromise: 'Sous compromis',
  sold: 'Vendu par l’agence',
};
const MANDATE_TYPES: Record<string, string> = { exclusive: 'exclusif', simple: 'simple' };

export function mandateSteps(input: {
  stage: MandateStage;
  signedAt: string | null;
  mandateType: string | null;
  offer: MandateOffer | null;
  life: MandateLife;
  now: Date;
}): MandateStep[] {
  const { stage, life, offer, now } = input;
  const day = (value: string) => formatRelativeDay(value, now);
  const signedFact = [
    input.signedAt ? day(input.signedAt) : null,
    input.mandateType ? (MANDATE_TYPES[input.mandateType] ?? null) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  if (stage === 'ended') {
    // La fin sans vente : la signature seule ; le reste est sans objet.
    return ORDER.map((key) => ({
      key,
      title: TITLES[key],
      fact: key === 'signed' ? signedFact : '—',
      status: key === 'signed' ? 'done' : 'later',
    }));
  }
  const reached = ORDER.indexOf(stage);
  const status = (key: MandateStepKey): MandateStep['status'] => {
    const at = ORDER.indexOf(key);
    return at < reached ? 'done' : at === reached ? 'current' : 'later';
  };
  const offerFact = (): string => {
    if (offer) return [day(offer.acceptedAt), offer.buyerName].filter(Boolean).join(' · ');
    if (status('offer_accepted') === 'later') return 'à venir';
    // Passé sans offre dans ACM : un compromis venu d'ailleurs, ou une offre faite hors d'ACM.
    return life.buyerOrigin === 'outside' ? 'acquéreur venu d’ailleurs' : 'offre faite hors d’ACM';
  };
  const compromiseFact = (): string => {
    if (life.compromiseSignedOn && life.deedPlannedOn) {
      return status('sold') === 'current'
        ? day(life.compromiseSignedOn)
        : `${day(life.compromiseSignedOn)} · acte prévu ${day(life.deedPlannedOn)}`;
    }
    return stage === 'offer_accepted' ? 'à noter' : 'à venir';
  };
  const saleFact = (): string =>
    life.deedSignedOn && life.salePrice != null
      ? `${day(life.deedSignedOn)} · ${formatEuro(life.salePrice)}`
      : 'l’acte et son prix';
  const facts: Record<MandateStepKey, () => string> = {
    signed: () => signedFact,
    offer_accepted: offerFact,
    under_compromise: compromiseFact,
    sold: saleFact,
  };
  return ORDER.map((key) => ({ key, title: TITLES[key], fact: facts[key](), status: status(key) }));
}
