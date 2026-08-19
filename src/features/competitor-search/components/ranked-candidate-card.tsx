'use client';

import Link from 'next/link';
import { useState } from 'react';

import { RemoteImage } from '@/components/ui/remote-image';
import {
  badgeBrand,
  badgeNeutral,
  badgeRejected,
  btnPrimary,
  btnSecondary,
  card,
  hintText,
  inputBase,
} from '@/components/ui/styles';
import {
  DECISION_REASONS,
  DECISION_REASON_LABELS,
  type DecisionReason,
} from '@/features/competitor-search/services/learn-from-decisions';
import type { EnrichedCandidate } from '@/features/competitor-search/actions/enrich-candidate';
import type { RankedCandidate } from '@/features/competitor-search/types';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

export type DecisionPayload = {
  decision: 'accepted' | 'rejected';
  reason: DecisionReason | null;
  comment: string;
};

// Une annonce proposée par la recherche, avec la raison de son classement.
//
// Principe (MISSION 36) : le conseiller doit pouvoir CONTESTER le classement.
// D'où l'affichage systématique de ce qui rapproche l'annonce du bien du
// vendeur, de ce qui l'en éloigne, et de ce que l'outil croit avoir appris.
export function RankedCandidateCard({
  ranked,
  enriched,
  projectId,
  onDecision,
  pending,
}: {
  ranked: RankedCandidate;
  // Fiche complétée en tâche de fond (photos, caractéristiques) : absente tant
  // que le portail n'a pas répondu, ou définitivement s'il a refusé.
  enriched: EnrichedCandidate | null;
  projectId: string;
  onDecision: (payload: DecisionPayload) => void;
  pending: boolean;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<DecisionReason>('surface_too_different');
  const [comment, setComment] = useState('');

  const { candidate } = ranked;
  // La fiche complétée prime sur ce que la page de résultats laissait deviner.
  const photo = enriched?.photoUrls[0] ?? candidate.photoUrl;
  const price = enriched?.price ?? candidate.price;
  const surface = enriched?.surfaceArea ?? candidate.surfaceArea;
  const rooms = enriched?.roomsCount ?? candidate.roomsCount;

  return (
    <div className={`${card} group flex flex-col gap-2.5 overflow-hidden`}>
      {photo ? (
        <RemoteImage
          src={photo}
          alt={candidate.title ?? 'Bien concurrent'}
          className="h-36 w-full object-cover"
          fallbackClassName="h-36 w-full"
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-zinc-50 text-xs text-zinc-400 stage:bg-white/5 stage:text-white/40">
          Photo indisponible
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 px-3.5 pb-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="font-title text-base leading-snug font-semibold text-zinc-900 capitalize stage:text-white">
            {candidate.title ?? 'Annonce détectée'}
          </span>
          <span className={badgeBrand} title="Ressemblance avec le bien de votre client">
            {ranked.score}%
          </span>
        </div>

        <div className="text-sm text-zinc-500 stage:text-white/60">
          <span className="font-semibold text-brand-deep stage:text-white">{euro(price)}</span>
          {surface != null ? ` · ${surface} m²` : ''}
          {rooms != null ? ` · ${rooms} pièces` : ''}
          {enriched?.district ? ` · ${enriched.district}` : ''}
          {` · ${ranked.portalLabel}`}
        </div>

        {enriched ? (
          <div className="text-xs text-zinc-500 stage:text-white/50">
            {enriched.daysOnMarket != null ? `En ligne depuis ${enriched.daysOnMarket} j` : null}
            {enriched.energyRating ? ` · DPE ${enriched.energyRating}` : ''}
            {enriched.listingFeatures.length > 0
              ? ` · ${enriched.listingFeatures.slice(0, 4).join(', ')}`
              : ''}
          </div>
        ) : null}

        {ranked.alreadyJudged ? (
          <span className={ranked.alreadyJudged === 'accepted' ? badgeBrand : badgeRejected}>
            {ranked.alreadyJudged === 'accepted' ? 'Déjà retenu' : 'Déjà écarté'}
          </span>
        ) : null}

        {/* Pourquoi cette annonce est là, et pourquoi elle est à cette place. */}
        <div className="flex flex-wrap gap-1">
          {ranked.strengths.map((label) => (
            <span key={label} className={badgeBrand}>
              {label}
            </span>
          ))}
          {ranked.weaknesses.map((label) => (
            <span key={label} className={badgeNeutral}>
              {label}
            </span>
          ))}
        </div>

        {ranked.learnedPenalties.length > 0 ? (
          <p className={hintText}>
            D’après vos choix passés : {ranked.learnedPenalties.join(' · ')}
          </p>
        ) : null}

        {rejecting ? (
          <div className="flex flex-col gap-2 pt-1">
            <label className="text-sm text-zinc-700 stage:text-white/80">
              Pourquoi n’est-ce pas un concurrent ?
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value as DecisionReason)}
                className={`${inputBase} mt-1`}
              >
                {DECISION_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {DECISION_REASON_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <input
              type="text"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Précision (facultatif)"
              maxLength={500}
              className={inputBase}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => onDecision({ decision: 'rejected', reason, comment })}
                className={`${btnPrimary} px-3 py-1.5 text-xs`}
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className={`${btnSecondary} px-3 py-1.5 text-xs`}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex flex-wrap gap-2 pt-2 text-sm">
            <Link
              href={`/builder/${projectId}/comparables/new?importUrl=${encodeURIComponent(candidate.url)}`}
              onClick={() => onDecision({ decision: 'accepted', reason: null, comment: '' })}
              className={`${btnPrimary} px-3 py-1.5 text-xs`}
            >
              Oui, c’est un concurrent
            </Link>
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className={`${btnSecondary} px-3 py-1.5 text-xs`}
            >
              Non
            </button>
            <a
              href={candidate.url}
              target="_blank"
              rel="noreferrer noopener"
              className={`${btnSecondary} px-3 py-1.5 text-xs`}
            >
              Voir l’annonce
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
