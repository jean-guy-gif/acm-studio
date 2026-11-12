import Link from 'next/link';

import { card, hintText, link } from '@/components/ui/styles';
import { BUYER_SOFT_CRITERION_LABELS, type BuyerSoftCriterion } from '@/features/buyers/types';

// Mission 151 — « Ce qui compte pour eux » sur la fiche acquéreur (planche 3, validée le 10/11) :
// leurs mots, tels qu'écrits. Ils rangent les biens trouvés et disent pourquoi ; ils n'en écartent
// aucun. « À vérifier » tant que le conseiller ne les a pas touchés (M97).
export function BuyerSoftCriteria({
  buyerId,
  criteria,
  toVerify,
}: {
  buyerId: string;
  criteria: BuyerSoftCriterion[];
  toVerify: boolean;
}) {
  if (criteria.length === 0) return null;
  return (
    <section className={`${card} flex flex-col gap-3 p-5`} data-testid="buyer-soft-criteria">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-title text-xl font-bold text-brand-darker">Ce qui compte pour eux</h2>
        <Link href={`/acquereurs/${buyerId}?modifier=1#recherche`} className={link}>
          Modifier
        </Link>
      </div>
      <p className={hintText}>
        Leurs mots. Les biens trouvés sont rangés d’après eux, avec la raison ; aucun bien n’est
        écarté pour eux.
      </p>
      <ul className="flex flex-col">
        {criteria.map((criterion) => (
          <li
            key={criterion.key}
            className="flex flex-col gap-1 border-t border-zinc-100 py-2.5 first:border-t-0"
          >
            <span className="flex items-center gap-2.5">
              <b className="text-[15px]">{BUYER_SOFT_CRITERION_LABELS[criterion.key]}</b>
              {toVerify ? <VerifyPill /> : null}
            </span>
            {criterion.words ? (
              <span className="text-sm italic text-brand-darker">
                «&nbsp;{criterion.words}&nbsp;»
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VerifyPill() {
  return (
    <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
      À vérifier
    </span>
  );
}
