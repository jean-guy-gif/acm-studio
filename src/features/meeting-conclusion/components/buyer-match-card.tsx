import {
  badgeBrand,
  badgeNeutral,
  badgeRejected,
  badgeSelected,
  card,
} from '@/components/ui/styles';
import type { BuyerMatch } from '@/features/meeting-conclusion/services/buyer-match';
import { OUTCOME_LABELS, type ConclusionOutcome } from '@/features/meeting-conclusion/types';
import { propertyLabel } from '@/features/projects/services/property-label';

const euro = (value: number): string => `${Math.round(value).toLocaleString('fr-FR')} €`;

const OUTCOME_BADGE: Record<ConclusionOutcome, string> = {
  signed: badgeSelected,
  follow_up: badgeBrand,
  sold_elsewhere: badgeRejected,
  withdrawn: badgeNeutral,
};

// §3.1 — la carte DIT quel prix de référence elle a utilisé : un rapprochement par budget
// sur un prix dont on ignore la nature ne vaut rien.
function referenceText(reference: BuyerMatch['reference']): string {
  if (reference.kind === 'convenu' && reference.value != null) {
    return `Référence : prix de commercialisation convenu — ${euro(reference.value)}`;
  }
  if (reference.kind === 'conseille' && reference.value != null) {
    return `Référence : prix conseillé (figé au rendez-vous) — ${euro(reference.value)}`;
  }
  return 'Aucun prix de référence — à charge du conseiller de juger';
}

// Mission 54 §3 — une carte de rapprochement : le dossier, son issue, le prix de référence
// (nommé), et où ça rapproche / où ça coince — chiffré quand c'est possible.
export function BuyerMatchCard({ match }: { match: BuyerMatch }) {
  const { dossier, reference, strengths, weaknesses, typeUnrecognized, score } = match;
  const bien = propertyLabel(dossier.property);
  const outcome = dossier.conclusion?.outcome ?? null;

  return (
    <li className={`${card} flex flex-col gap-3 p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
            {dossier.project.seller_name ?? 'Dossier vendeur'}
          </span>
          {outcome ? (
            <span className={OUTCOME_BADGE[outcome]}>{OUTCOME_LABELS[outcome]}</span>
          ) : null}
        </div>
        <span className="font-title text-lg font-bold text-brand-deep stage:text-brand">
          {score}
          <span className="text-sm font-medium text-zinc-400 stage:text-white/40">/100</span>
        </span>
      </div>

      {bien ? (
        <span className="text-sm text-zinc-600 stage:text-white/70">{bien}</span>
      ) : (
        <span className="text-sm text-zinc-400 italic stage:text-white/45">
          Bien vendeur non renseigné
        </span>
      )}

      <span className="text-sm text-zinc-500 stage:text-white/60">{referenceText(reference)}</span>

      {typeUnrecognized ? (
        <span className="text-sm text-amber-700 stage:text-amber-300">
          Type de bien non reconnu — vérifiez qu’il correspond à la recherche.
        </span>
      ) : null}

      {strengths.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {strengths.map((strength) => (
            <span
              key={strength}
              className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 stage:bg-emerald-500/15 stage:text-emerald-300"
            >
              {strength}
            </span>
          ))}
        </div>
      ) : null}

      {weaknesses.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {weaknesses.map((gap) => (
            <span
              key={gap.label}
              className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 stage:bg-white/10 stage:text-white/70"
            >
              {gap.detail ?? gap.label}
            </span>
          ))}
        </div>
      ) : null}
    </li>
  );
}
