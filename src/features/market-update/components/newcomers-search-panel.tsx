'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btnPrimary, btnSecondary, hintText, link as linkStyle } from '@/components/ui/styles';
import { RemoteImage } from '@/components/ui/remote-image';
import { pingExtension } from '@/features/browser-extension/client';
import { NO_EXTENSION_FOR_REFRESH } from '@/features/competitor-refresh/components/refresh-prices-button';
import { recordCompetitorDecision } from '@/features/competitor-search/actions/record-competitor-decision';
import { registerPendingImports } from '@/features/competitor-search/actions/pending-imports';
import {
  importListing,
  READ_FAILURE_LABELS,
} from '@/features/competitor-search/services/import-listing';
import {
  DECISION_REASON_LABELS,
  DECISION_REASONS,
  type DecisionReason,
} from '@/features/competitor-search/services/learn-from-decisions';
import { listingImportDeps } from '@/features/competitor-search/services/listing-import-deps';
import { useDemoMode } from '@/features/demo/components/demo-mode-provider';
import { DpeLetter } from '@/features/dpe/components/dpe-letter';
import { dpeClass } from '@/features/dpe/services/dpe';
import { recordMarketUpdate } from '@/features/market-update/actions/record-market-update';
import {
  searchNewcomers,
  type SearchNewcomersResult,
} from '@/features/market-update/actions/search-newcomers';
import { shortDay } from '@/features/market-update/components/market-update-panel';
import type { NewcomerCandidate } from '@/features/market-update/services/newcomers-filter';
import { formatEuro, formatEuroPerSquareMeter, formatNumber } from '@/lib/format';

export const NEWCOMERS_SEARCH_LABEL = 'Chercher les nouveaux venus · jusqu’à 0,60 €';
export const NEWCOMERS_LIMITED_LABEL =
  'Recherche limitée aux biens au prix de commercialisation ou moins';

type Found = Extract<SearchNewcomersResult, { ok: true }>;
type CardState = 'open' | 'importing' | 'retained' | 'pending' | 'rejected';

// Mission 127 B — après le point, l'étape (c) : « Chercher les nouveaux venus sur le marché ? »
// (appel payant, jamais sans le clic, M50), puis la liste « Nouveaux sur le marché depuis le
// rendez-vous » : seuls les biens à votre prix ou moins, vus sur le marché après le rendez-vous.
// « Retenir » enregistre d'abord le bien en attente (M101), le lit par l'extension et le crée dans
// le dossier (le même enchaînement que la préparation), puis réécrit le point du jour ; « Écarter »
// écrit la décision avec son motif (M50). En démo, aucun appel : la recherche simulée (M114).
export function NewcomersSearchPanel({
  projectId,
  meetingDate,
  searched,
  onPointRewritten,
}: {
  projectId: string;
  meetingDate: string | null;
  // Une recherche a déjà été faite pour le point du jour : seul le lien texte reste.
  searched: boolean;
  onPointRewritten?: (line: string) => void;
}) {
  const router = useRouter();
  const demo = useDemoMode();
  // Ouvert en carte ; « Pas maintenant » le replie en lien texte (décision de Jean-Guy, 29/10).
  const [shown, setShown] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [states, setStates] = useState<Record<string, CardState>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const since = meetingDate ? shortDay(meetingDate) : null;
  // Une recherche par point, pas de « Chercher encore » : recherche faite, plus rien à proposer.
  if (searched && !found) return null;

  const search = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!demo) {
        const ping = await pingExtension();
        if (!ping.available) {
          setError(`${NO_EXTENSION_FOR_REFRESH} La recherche passe par elle.`);
          return;
        }
      }
      const result = await searchNewcomers(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFound(result);
      if (result.line) onPointRewritten?.(result.line);
      router.refresh();
    } catch {
      setError('La recherche des nouveaux venus a échoué. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const retain = async (candidate: NewcomerCandidate) => {
    setStates((current) => ({ ...current, [candidate.url]: 'importing' }));
    setNotes((current) => ({ ...current, [candidate.url]: '' }));
    try {
      const registered = await registerPendingImports(projectId, [
        { url: candidate.url, snapshot: candidate.snapshot },
      ]);
      if (!registered.ok) {
        setStates((current) => ({ ...current, [candidate.url]: 'open' }));
        setNotes((current) => ({ ...current, [candidate.url]: registered.error }));
        return;
      }
      if (!demo) {
        const ping = await pingExtension();
        if (!ping.available) {
          setStates((current) => ({ ...current, [candidate.url]: 'pending' }));
          setNotes((current) => ({
            ...current,
            [candidate.url]:
              'Retenu, en attente d’import : installez ou activez l’extension ACM, puis « Réessayer » sur la page des concurrents.',
          }));
          return;
        }
      }
      const outcome = await importListing(
        candidate.url,
        listingImportDeps({
          projectId,
          propertyType: candidate.propertyType,
          fromStreamEstate: true,
          robotsCache: new Map(),
          demo,
        }),
      );
      if (outcome.status === 'pending') {
        setStates((current) => ({ ...current, [candidate.url]: 'pending' }));
        setNotes((current) => ({
          ...current,
          [candidate.url]: `Retenu, en attente d’import : ${READ_FAILURE_LABELS[outcome.cause]}.`,
        }));
        return;
      }
      if (outcome.status === 'imported_withdrawn') {
        setStates((current) => ({ ...current, [candidate.url]: 'rejected' }));
        setNotes((current) => ({
          ...current,
          [candidate.url]:
            'Cette annonce n’est plus en ligne : entrée dans le dossier, non retenue.',
        }));
        return;
      }
      const decision = new FormData();
      decision.set('listing_url', candidate.url);
      decision.set('decision', 'accepted');
      decision.set('price', String(candidate.price));
      if (candidate.surfaceArea != null)
        decision.set('surface_area', String(candidate.surfaceArea));
      if (candidate.roomsCount != null) decision.set('rooms_count', String(candidate.roomsCount));
      if (candidate.city) decision.set('city', candidate.city);
      if (candidate.propertyType) decision.set('property_type', candidate.propertyType);
      await recordCompetitorDecision(projectId, decision);
      const rewritten = await recordMarketUpdate(projectId);
      setStates((current) => ({ ...current, [candidate.url]: 'retained' }));
      setNotes((current) => ({
        ...current,
        [candidate.url]:
          outcome.status === 'imported_from_search'
            ? 'Retenu ✓ · créé depuis la recherche (page illisible) · dans le dossier et dans Prospection'
            : 'Retenu ✓ · dans le dossier et dans Prospection',
      }));
      if (rewritten.ok) onPointRewritten?.(rewritten.line);
      router.refresh();
    } catch {
      setStates((current) => ({ ...current, [candidate.url]: 'open' }));
      setNotes((current) => ({ ...current, [candidate.url]: 'La retenue a échoué. Réessayez.' }));
    }
  };

  const reject = async (candidate: NewcomerCandidate, reason: DecisionReason, comment: string) => {
    const decision = new FormData();
    decision.set('listing_url', candidate.url);
    decision.set('decision', 'rejected');
    decision.set('reason', reason);
    if (comment.trim()) decision.set('comment', comment.trim().slice(0, 500));
    decision.set('price', String(candidate.price));
    if (candidate.surfaceArea != null) decision.set('surface_area', String(candidate.surfaceArea));
    if (candidate.roomsCount != null) decision.set('rooms_count', String(candidate.roomsCount));
    if (candidate.city) decision.set('city', candidate.city);
    if (candidate.propertyType) decision.set('property_type', candidate.propertyType);
    try {
      const result = await recordCompetitorDecision(projectId, decision);
      if (result.ok) {
        setStates((current) => ({ ...current, [candidate.url]: 'rejected' }));
        setNotes((current) => ({
          ...current,
          [candidate.url]: `Écarté · ${DECISION_REASON_LABELS[reason]}`,
        }));
      } else {
        setNotes((current) => ({ ...current, [candidate.url]: result.error }));
      }
    } catch {
      setNotes((current) => ({
        ...current,
        [candidate.url]: 'L’écart n’a pas pu être enregistré.',
      }));
    }
  };

  if (found) {
    const parts = [
      `${found.found} trouvé${found.found > 1 ? 's' : ''}`,
      demo
        ? '0 annonce facturée'
        : `${formatNumber(found.billed)} annonce${found.billed > 1 ? 's' : ''} facturée${found.billed > 1 ? 's' : ''} (${formatEuro(found.billed * 0.01)})`,
      'critères du dossier',
      since ? `vus sur le marché après le ${since}` : null,
      `${NEWCOMERS_LIMITED_LABEL} (${formatEuro(found.priceCeiling)})`,
    ].filter(Boolean);
    return (
      <div
        className="mt-1 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 stage:border-white/10 stage:bg-white/5"
        data-testid="newcomers-results"
      >
        <span className="font-title text-sm font-bold text-zinc-900 stage:text-white">
          Nouveaux sur le marché depuis le rendez-vous
        </span>
        <span className="text-xs text-zinc-600 stage:text-white/70">{parts.join(' · ')}</span>
        {found.excludedNoDate > 0 ? (
          <span className="text-xs text-zinc-500 stage:text-white/60">
            {found.excludedNoDate} annonce{found.excludedNoDate > 1 ? 's' : ''} sans date de
            première vue : non proposée{found.excludedNoDate > 1 ? 's' : ''}.
          </span>
        ) : null}
        {found.newcomers.length === 0 ? (
          <p className="text-sm text-zinc-600 stage:text-white/70" data-testid="newcomers-none">
            Aucun nouveau venu{since ? ` depuis le ${since}` : ''} avec les critères du dossier, au
            prix de commercialisation ou moins.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="newcomers-list">
            {found.newcomers.map((candidate) => {
              const state = states[candidate.url] ?? 'open';
              return (
                <NewcomerCard
                  key={candidate.url}
                  candidate={candidate}
                  state={state}
                  note={notes[candidate.url] ?? null}
                  onRetain={() => void retain(candidate)}
                  onReject={(reason, comment) => void reject(candidate, reason, comment)}
                />
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  if (!shown) {
    return (
      <button
        type="button"
        className={`${linkStyle} self-start text-xs`}
        disabled={busy}
        onClick={() => setShown(true)}
        data-testid="newcomers-search-link"
      >
        Chercher les nouveaux venus
      </button>
    );
  }

  return (
    <div
      className="mt-1 flex flex-col gap-2 rounded-xl border border-brand/40 bg-brand-soft/40 p-3 stage:border-white/10 stage:bg-white/5"
      data-testid="newcomers-proposal"
    >
      <span className="font-title text-sm font-bold text-zinc-900 stage:text-white">
        Chercher les nouveaux venus sur le marché ?
      </span>
      <p className={hintText}>
        Recherche payante sur le marché : jusqu’à 0,60 €. Les critères du dossier, les annonces vues
        sur le marché{since ? ` depuis le ${since}` : ' depuis le rendez-vous'} seulement, sans
        celles déjà retenues ou écartées, au prix de commercialisation ou moins.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={busy}
          onClick={() => void search()}
          data-testid="newcomers-search"
        >
          {busy ? 'Recherche en cours…' : NEWCOMERS_SEARCH_LABEL}
        </button>
        {busy ? (
          <span className={hintText}>
            {demo
              ? 'Aucun appel payant en démonstration.'
              : 'Jusqu’à 0,60 € réservés sur le budget du mois ; la part non utilisée est rendue.'}
          </span>
        ) : (
          <button
            type="button"
            className={`${linkStyle} text-xs`}
            onClick={() => setShown(false)}
            data-testid="newcomers-later"
          >
            Pas maintenant
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NewcomerCard({
  candidate,
  state,
  note,
  onRetain,
  onReject,
}: {
  candidate: NewcomerCandidate;
  state: CardState;
  note: string | null;
  onRetain: () => void;
  onReject: (reason: DecisionReason, comment: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<DecisionReason>('price_too_high');
  const [comment, setComment] = useState('');
  const facts = [
    candidate.surfaceArea != null ? `${formatNumber(candidate.surfaceArea)} m²` : null,
    candidate.roomsCount != null
      ? `${candidate.roomsCount} pièce${candidate.roomsCount > 1 ? 's' : ''}`
      : null,
  ].filter(Boolean);
  return (
    <li
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 stage:border-white/10 stage:bg-white/5"
      data-testid="newcomer-card"
      data-state={state}
    >
      {candidate.photoUrls[0] ? (
        <RemoteImage
          src={candidate.photoUrls[0]}
          alt={candidate.label}
          className="h-32 w-full rounded-lg object-cover"
          fallbackClassName="h-32 w-full rounded-lg"
        />
      ) : null}
      <div className="flex flex-col gap-0.5">
        <span className="font-title text-sm font-bold text-zinc-900 stage:text-white">
          {candidate.label}
        </span>
        <span className="font-title text-lg font-bold text-brand-deep stage:text-white">
          {formatEuro(candidate.price)}
          {candidate.pricePerSqm != null ? (
            <span className="ml-2 text-xs font-semibold text-zinc-500 stage:text-white/60">
              {formatEuroPerSquareMeter(candidate.pricePerSqm)}
            </span>
          ) : null}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-600 stage:text-white/70">
          {facts.join(' · ')}
          {dpeClass(candidate.energyClass) ? (
            <DpeLetter letter={dpeClass(candidate.energyClass)!} />
          ) : null}
        </span>
        <span className="text-xs text-zinc-500 stage:text-white/60">
          Vu par la recherche le {shortDay(candidate.seenSince)}, après le rendez-vous
        </span>
      </div>
      {state === 'open' ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={onRetain}
            data-testid="newcomer-retain"
          >
            Retenir
          </button>
          {rejecting ? (
            <>
              <select
                className="rounded-lg border border-zinc-200 px-2 py-1 text-xs"
                value={reason}
                onChange={(event) => setReason(event.target.value as DecisionReason)}
                aria-label="Motif"
              >
                {DECISION_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {DECISION_REASON_LABELS[value]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="rounded-lg border border-zinc-200 px-2 py-1 text-xs"
                placeholder="Précision (facultatif)"
                aria-label="Précision (facultatif)"
                maxLength={500}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <button
                type="button"
                className={`${linkStyle} text-xs`}
                onClick={() => onReject(reason, comment)}
                data-testid="newcomer-reject-confirm"
              >
                Écarter avec ce motif
              </button>
              <button
                type="button"
                className={`${linkStyle} text-xs`}
                onClick={() => setRejecting(false)}
              >
                Annuler
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`${linkStyle} text-xs`}
              onClick={() => setRejecting(true)}
              data-testid="newcomer-reject"
            >
              Écarter
            </button>
          )}
        </div>
      ) : state === 'importing' ? (
        <span className="text-xs text-zinc-500 stage:text-white/60">Import…</span>
      ) : (
        <span
          className={`text-xs font-semibold ${state === 'retained' ? 'text-emerald-700 stage:text-emerald-300' : 'text-zinc-600 stage:text-white/70'}`}
          data-testid="newcomer-note"
        >
          {note}
        </span>
      )}
      {state === 'open' && note ? <span className="text-xs text-red-700">{note}</span> : null}
    </li>
  );
}
