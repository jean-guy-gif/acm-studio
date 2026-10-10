'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  btnPrimary,
  btnSecondary,
  card,
  inputBase,
  metaLabel,
  sectionTitle,
} from '@/components/ui/styles';
import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  noneOfTypeLabel,
  typeCountLabel,
  type BuyerCriteria,
  type SuiviComposition,
} from '@/features/meeting-conclusion/services/buyer-match';
import {
  BUYER_GROUPS,
  BUYER_GROUP_LABELS,
  buyerCandidates,
  reconcileBuyer,
  type BuyerCandidate,
  type BuyerGroup,
  type BuyerHit,
  type BuyerReconciliation,
} from '@/features/meeting-conclusion/services/buyer-reconciliation';
import type { ProspectingEntry } from '@/features/prospecting/types';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// « 3 appartements · 1 maison · 2 sans type » — ce que les trois listes CONTIENNENT.
function compositionLine(composition: SuiviComposition): string {
  const parts = composition.byType.map(typeCountLabel);
  if (composition.unclassifiedCount > 0) {
    parts.push(`${composition.unclassifiedCount} sans type`);
  }
  return parts.join(' · ');
}

const num = (value: FormDataEntryValue | null): number | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const text = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  return value.trim();
};

const GROUP_COLOR: Record<BuyerGroup, string> = {
  mandate: 'text-emerald-700 stage:text-emerald-300',
  follow_up: 'text-brand-deep stage:text-brand',
  competitor: 'text-amber-700 stage:text-amber-300',
};

const STEP_WORD = { colleague: 'Exclusivité', owner: 'Propriétaire', check: 'À vérifier' } as const;

const fieldCaption =
  'text-[11px] font-bold tracking-[0.08em] text-zinc-500 uppercase stage:text-white/50';
const miniPrimary = `${btnPrimary} px-2.5 py-1.5 text-xs whitespace-nowrap`;
const miniSecondary = `${btnSecondary} px-2.5 py-1.5 text-xs whitespace-nowrap`;

// L'adresse d'une annonce vient d'un portail : on n'en fait un lien que si c'est une adresse web.
const webUrl = (url: string | null): string | null =>
  url != null && /^https?:\/\//i.test(url) ? url : null;

const phoneHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;

// « 3 p. · 65 m² · 320 000 € · Antibes » — chaque morceau insécable : un prix ne se coupe pas.
function candidateFacts(candidate: BuyerCandidate): string[] {
  return [
    candidate.roomsCount != null ? `${candidate.roomsCount} p.` : null,
    candidate.surfaceArea != null ? formatSquareMeters(candidate.surfaceArea) : null,
    candidate.price != null ? formatEuro(candidate.price) : null,
    candidate.city,
    candidate.step ? STEP_WORD[candidate.step] : null,
  ].filter((fact): fact is string => fact != null && fact !== '');
}

// L'action qui va avec le groupe : une seule par bien.
function HitAction({ candidate }: { candidate: BuyerCandidate }) {
  if (candidate.group === 'mandate') {
    return (
      <Link href={`/builder/${candidate.projectId}`} className={miniPrimary}>
        Proposer une visite
      </Link>
    );
  }
  if (candidate.group === 'follow_up') {
    // Le bouton ouvre le dossier ; le numéro, quand il y en a un, s'appelle d'un clic à côté.
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {candidate.sellerPhone ? (
          <a
            href={phoneHref(candidate.sellerPhone)}
            className="text-xs font-medium whitespace-nowrap text-brand-deep hover:underline stage:text-brand"
          >
            {candidate.sellerPhone}
          </a>
        ) : null}
        <Link href={`/builder/${candidate.projectId}`} className={miniSecondary}>
          Rappeler : « j’ai un acheteur »
        </Link>
      </div>
    );
  }
  const prospection = `/prospection?bien=${candidate.projectId}`;
  if (candidate.step === 'colleague') {
    // Le contact du confrère n'est jamais stocké (M83) : il est sur son annonce.
    const listing = webUrl(candidate.listingUrl);
    return listing ? (
      <a href={listing} target="_blank" rel="noreferrer" className={miniSecondary}>
        Appeler le confrère
      </a>
    ) : (
      <Link href={prospection} className={miniSecondary}>
        Appeler le confrère
      </Link>
    );
  }
  return (
    <Link href={prospection} className={miniSecondary}>
      {candidate.step === 'owner' ? 'Ajouter à la tournée' : 'Voir dans Prospection'}
    </Link>
  );
}

function HitLine({ hit, showGroup = false }: { hit: BuyerHit; showGroup?: boolean }) {
  const { candidate } = hit;
  const facts = candidateFacts(candidate);
  return (
    <li
      data-testid="buyer-hit"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-zinc-100 py-2 first:border-t-0 stage:border-white/10"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={`text-sm font-semibold ${
            candidate.title ? 'text-zinc-900 stage:text-white' : 'text-zinc-500 italic'
          }`}
        >
          {candidate.title ?? 'Adresse non localisée'}
        </span>
        {facts.length > 0 ? (
          <span className="flex flex-wrap gap-x-1.5 text-xs text-zinc-500 stage:text-white/60">
            {facts.map((fact, index) => (
              <span key={`${fact}-${index}`} className="whitespace-nowrap">
                {index > 0 ? '· ' : ''}
                {fact}
              </span>
            ))}
          </span>
        ) : null}
        {candidate.group === 'competitor' ? (
          <span className="text-xs text-zinc-500 stage:text-white/60">
            Pour&nbsp;: <span className="font-semibold">{candidate.sellerName}</span>
          </span>
        ) : null}
        {showGroup ? (
          <span className={`text-xs font-semibold ${GROUP_COLOR[candidate.group]}`}>
            {BUYER_GROUP_LABELS[candidate.group]}
          </span>
        ) : null}
        {hit.note ? (
          <span className="text-xs font-medium text-amber-700 stage:text-amber-300">
            {hit.note}
          </span>
        ) : null}
        {hit.gaps.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {hit.gaps.map((gap) => (
              <span
                key={gap}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-zinc-600 stage:bg-white/10 stage:text-white/70"
              >
                {gap}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <HitAction candidate={candidate} />
    </li>
  );
}

function Results({ result }: { result: BuyerReconciliation }) {
  const count = result.matchCount;
  // Le type demandé n'existe nulle part dans les trois listes : on dit ce qu'elles contiennent.
  const noneOfType =
    result.requestedType != null &&
    count === 0 &&
    result.near.length === 0 &&
    !result.composition.byType.some((entry) => entry.type === result.requestedType);

  return (
    <div className="flex flex-col gap-4 border-t border-dashed border-zinc-200 pt-4 stage:border-white/10">
      {count > 0 ? (
        <p className="font-title text-base font-bold text-zinc-900 stage:text-white">
          <span className="text-emerald-700 stage:text-emerald-300">
            {count} bien{count > 1 ? 's' : ''}
          </span>{' '}
          {count > 1 ? 'correspondent' : 'correspond'} à cet acheteur
        </p>
      ) : (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 stage:border-amber-400/50 stage:bg-amber-500/10">
          <p className="font-title text-xl font-bold text-amber-900 stage:text-amber-200">
            {noneOfType && result.requestedType != null
              ? `Votre Suivi ne contient ${noneOfTypeLabel(result.requestedType)}`
              : 'Aucun bien ne correspond exactement à cet acheteur'}
          </p>
          {noneOfType &&
          (result.composition.byType.length > 0 || result.composition.unclassifiedCount > 0) ? (
            <p className="mt-1 text-sm font-medium text-amber-800 stage:text-amber-200/90">
              Vos mandats, vos vendeurs à relancer et vos concurrents à prospecter&nbsp;:{' '}
              {compositionLine(result.composition)}.
            </p>
          ) : null}
        </div>
      )}

      {count > 0 ? (
        <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-3">
          {BUYER_GROUPS.map((group) => (
            <section
              key={group}
              data-testid={`buyer-group-${group}`}
              className="flex min-w-0 flex-col rounded-xl border border-zinc-200 px-3 py-2.5 stage:border-white/10"
            >
              <h3
                className={`pb-1 text-[11px] font-bold tracking-[0.1em] uppercase ${GROUP_COLOR[group]}`}
              >
                {BUYER_GROUP_LABELS[group]} · {result.matches[group].length}
              </h3>
              {result.matches[group].length > 0 ? (
                <ul className="flex flex-col">
                  {result.matches[group].map((hit) => (
                    <HitLine key={hit.candidate.key} hit={hit} />
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-xs text-zinc-400 stage:text-white/40">Aucun.</p>
              )}
            </section>
          ))}
        </div>
      ) : null}

      {/* Les biens du bon type mais hors règles ne disparaissent pas : repliés, écart chiffré. */}
      {result.near.length > 0 ? (
        <details open={count === 0} data-testid="buyer-near">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-700 stage:text-white/80">
            Proches mais hors critères ({result.near.length})
          </summary>
          <ul className="mt-2 flex flex-col">
            {result.near.map((hit) => (
              <HitLine key={hit.candidate.key} hit={hit} showGroup />
            ))}
          </ul>
        </details>
      ) : null}

      {/* Type non renseigné ou non reconnu : À PART, jamais mêlés au reste (M54). */}
      {result.unclassified.length > 0 ? (
        <div className="flex flex-col gap-1 border-t border-zinc-100 pt-3 stage:border-white/10">
          <span className={metaLabel}>
            Type non renseigné — à vérifier ({result.unclassified.length})
          </span>
          <ul className="flex flex-col">
            {result.unclassified.map((hit) => (
              <HitLine key={hit.candidate.key} hit={hit} showGroup />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// Mission 54 §3 — la recherche acheteur : un panneau JETABLE (rien enregistré, pas de fiche
// acheteur). Mission 86 — elle cherche dans trois listes (mes mandats, mes vendeurs à relancer,
// les concurrents à prospecter) et range ce qui correspond en trois groupes, chacun avec son
// action. Tout tourne côté client : l'écran est réservé au conseiller.
export function BuyerSearchPanel({
  dossiers,
  entries,
}: {
  dossiers: SuiviDossier[];
  entries: ProspectingEntry[];
}) {
  const candidates = useMemo(() => buyerCandidates(dossiers, entries), [dossiers, entries]);
  const [criteria, setCriteria] = useState<BuyerCriteria | null>(null);
  // Recalculé si les listes changent (une issue modifiée plus bas) : jamais un résultat périmé.
  const result = useMemo(
    () => (criteria ? reconcileBuyer(criteria, candidates) : null),
    [criteria, candidates],
  );

  const field = (
    label: string,
    name: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className={fieldCaption}>{label}</span>
      <input name={name} className={`${inputBase} w-full font-semibold`} {...props} />
    </label>
  );

  return (
    <section className={`${card} @container flex flex-col gap-3 p-5`}>
      <div className="flex flex-col gap-0.5">
        <h2 className={sectionTitle}>Un acheteur dans le pipe&nbsp;?</h2>
        <p className="text-sm text-zinc-500 stage:text-white/60">
          Tapez sa recherche&nbsp;: ACM vous montre vos mandats, vos vendeurs à relancer et les
          concurrents à prospecter qui lui correspondent. Rien n’est enregistré.
        </p>
      </div>

      <form
        className="grid grid-cols-2 items-end gap-2.5 @2xl:grid-cols-3 @5xl:grid-cols-[1.1fr_0.6fr_0.7fr_0.8fr_0.8fr_1.1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setCriteria({
            propertyType: text(formData.get('propertyType')),
            roomsCount: num(formData.get('roomsCount')),
            surfaceArea: num(formData.get('surfaceArea')),
            budgetMin: num(formData.get('budgetMin')),
            budgetMax: num(formData.get('budgetMax')),
            city: text(formData.get('city')),
          });
        }}
      >
        {field('Type', 'propertyType', { type: 'text', placeholder: 'Appartement…' })}
        {field('Pièces', 'roomsCount', { type: 'number', min: 0 })}
        {field('Surface (m²)', 'surfaceArea', { type: 'number', min: 0 })}
        {field('Budget min (€)', 'budgetMin', { type: 'number', min: 0 })}
        {field('Budget max (€)', 'budgetMax', { type: 'number', min: 0 })}
        {field('Secteur', 'city', { type: 'text', placeholder: 'Antibes, Juan-les-Pins…' })}
        <button type="submit" className={`${btnPrimary} whitespace-nowrap`}>
          Rapprocher
        </button>
      </form>

      {result ? <Results result={result} /> : null}
    </section>
  );
}
