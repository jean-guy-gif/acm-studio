import { hintText } from '@/components/ui/styles';
import { BUYER_SOFT_CRITERION_LABELS, type BuyerSoftCriterion } from '@/features/buyers/types';

// Mission 151 — « Ce qui compte pour eux » sur la fiche acquéreur (planche 3, validée le 10/11) :
// leurs mots, tels qu'écrits. Ils rangent les biens trouvés et disent pourquoi ; ils n'en écartent
// aucun. « À vérifier » tant que le conseiller ne les a pas touchés (M97).
//
// Mission 10 bis — sur la fiche repliée, ils se lisent sous « Ses critères et ce qui compte pour
// eux », sans carte ni lien « Modifier » : « Modifier sa recherche » n'apparaît qu'une fois, juste
// dessous.
export function BuyerSoftCriteria({
  criteria,
  toVerify,
}: {
  criteria: BuyerSoftCriterion[];
  toVerify: boolean;
}) {
  if (criteria.length === 0) return null;
  return (
    <section className="flex flex-col gap-1.5" data-testid="buyer-soft-criteria">
      <h3 className="font-title text-base font-bold text-brand-darker stage:text-white">
        Ce qui compte pour eux
      </h3>
      <p className={hintText}>
        Leurs mots. Les biens trouvés sont rangés d’après eux, avec la raison ; aucun bien n’est
        écarté pour eux.
      </p>
      <ul className="flex flex-col">
        {criteria.map((criterion) => (
          <li
            key={criterion.key}
            className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-t border-zinc-100 py-1.5 first:border-t-0 stage:border-white/10"
          >
            <b className="text-[15px]">{BUYER_SOFT_CRITERION_LABELS[criterion.key]}</b>
            {toVerify ? <VerifyPill /> : null}
            {criterion.words ? (
              <span className="text-sm italic text-brand-darker stage:text-white/80">
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
