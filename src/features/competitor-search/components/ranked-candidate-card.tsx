'use client';

import { useState } from 'react';

import { RemoteImage } from '@/components/ui/remote-image';
import {
  badgeBrand,
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
import { NEW_BUILD_COMPLEMENT_MENTION } from '@/features/competitor-search/services/new-build';
import { formatFrenchDate } from '@/features/competitor-search/services/stream-estate-import';
import type {
  ProximityReason,
  RankedCandidate,
  StreamEstateFacts,
} from '@/features/competitor-search/types';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

const percent = (value: number): string =>
  `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`.replace('-', '−');

// Essai Stream Estate — ce que l'API dit du bien, sur la carte : site d'origine (toujours un site
// que l'extension relit), depuis quand il est en ligne, ses baisses de prix.
export function StreamEstateFactsLine({ facts }: { facts: StreamEstateFacts }) {
  const since = formatFrenchDate(facts.onlineSince);
  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-600 stage:text-white/70">
      <span>
        Annonce d’origine : <span className="font-medium">{facts.originSite}</span>
        {since ? ` · en ligne depuis le ${since}` : ''}
      </span>
      <span>
        {facts.priceDrops.length > 0
          ? `Baisse${facts.priceDrops.length > 1 ? 's' : ''} de prix : ${facts.priceDrops.map(percent).join(' puis ')}`
          : 'Aucune baisse de prix relevée'}
      </span>
    </div>
  );
}

// Étape 2 — « pourquoi il est proche », critère par critère, dans l'ordre où ils comptent : le
// niveau 1 d'abord (secteur, surface, prix, stationnement, extérieur), puis le niveau 2. Ce qui
// rapproche est en couleur, ce qui éloigne est barré d'un « ≠ », l'inconnu est dit « non indiqué ».
function ReasonList({ reasons }: { reasons: ProximityReason[] }) {
  return (
    <>
      {reasons.map((reason, index) => (
        <span key={reason.criterion}>
          {index > 0 ? ' · ' : ''}
          <span
            className={
              reason.points > 0
                ? 'font-medium text-brand-deep stage:text-white'
                : reason.points < 0
                  ? 'text-amber-800 stage:text-amber-300'
                  : reason.known
                    ? ''
                    : 'text-zinc-400 stage:text-white/40'
            }
          >
            {reason.label}
          </span>
        </span>
      ))}
    </>
  );
}

export function ProximityLines({ reasons }: { reasons: ProximityReason[] }) {
  const first = reasons.filter((reason) => reason.level === 1);
  const second = reasons.filter((reason) => reason.level === 2);
  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-600 stage:text-white/70">
      <p>
        <span className="font-semibold">Pourquoi il est proche : </span>
        <ReasonList reasons={first} />
      </p>
      {second.length > 0 ? (
        <p>
          <span className="font-semibold">Puis : </span>
          <ReasonList reasons={second} />
        </p>
      ) : null}
    </div>
  );
}

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
  position,
  selected,
  onToggleSelect,
  onDecision,
  pending,
}: {
  ranked: RankedCandidate;
  // Étape 2 — la place de l'annonce dans l'ordre « les plus proches » (1 = la plus proche).
  position: number;
  // MISSION 50 §8 — case à cocher : la SEULE interaction pour retenir. Cochée =
  // retenue au lot (importée à la validation). Le « Non » reste, comme motif de
  // refus FACULTATIF pour qui veut le donner ; rien n'est écrit avant la validation.
  selected: boolean;
  onToggleSelect: () => void;
  onDecision: (payload: DecisionPayload) => void;
  pending: boolean;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<DecisionReason>('surface_too_different');
  const [comment, setComment] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);

  const { candidate } = ranked;
  // On classe et on tranche sur les seules données de la CARTE de résultat, déjà lues,
  // zéro fetch (l'enrichissement automatique par candidat — 12 fetchs serveur bloqués
  // par les portails — a été retiré). La lecture profonde de la fiche a lieu à l'import
  // d'un concurrent retenu, là où elle a du sens.
  const photos = candidate.photoUrls;
  const price = candidate.price;
  const surface = candidate.surfaceArea;
  const rooms = candidate.roomsCount;

  const shown = photos.length > 0 ? Math.min(photoIndex, photos.length - 1) : 0;
  const step = (delta: number) =>
    setPhotoIndex((index) => (index + delta + photos.length) % photos.length);

  return (
    <div className={`${card} group flex flex-col gap-2.5 overflow-hidden`}>
      {photos.length > 0 ? (
        <div className="relative h-36 w-full">
          <RemoteImage
            src={photos[shown]}
            alt={candidate.title ?? 'Bien concurrent'}
            className="h-36 w-full object-cover"
            fallbackClassName="h-36 w-full"
          />
          {/* Point 4 — défiler la galerie du bien depuis la vignette de la carte. */}
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Photo précédente"
                onClick={() => step(-1)}
                className="absolute top-1/2 left-1 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm leading-none text-white hover:bg-black/65"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Photo suivante"
                onClick={() => step(1)}
                className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm leading-none text-white hover:bg-black/65"
              >
                ›
              </button>
              <span className="absolute right-1 bottom-1 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white">
                {shown + 1}/{photos.length}
              </span>
            </>
          ) : null}
        </div>
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
          <span className={badgeBrand} title="Place dans l’ordre, du plus proche au plus éloigné">
            n° {position}
          </span>
        </div>

        <div className="text-sm text-zinc-500 stage:text-white/60">
          <span className="font-semibold text-brand-deep stage:text-white">{euro(price)}</span>
          {surface != null ? ` · ${surface} m²` : ''}
          {rooms != null ? ` · ${rooms} pièces` : ''}
          {candidate.landArea != null
            ? ` · ${candidate.landArea.toLocaleString('fr-FR')} m² de terrain`
            : ''}
          {candidate.city ? ` · ${candidate.city}` : ''}
          {` · ${ranked.portalLabel}`}
        </div>

        {candidate.streamEstate ? <StreamEstateFactsLine facts={candidate.streamEstate} /> : null}

        {ranked.alreadyJudged ? (
          <span className={ranked.alreadyJudged === 'accepted' ? badgeBrand : badgeRejected}>
            {ranked.alreadyJudged === 'accepted' ? 'Déjà retenu' : 'Déjà écarté'}
          </span>
        ) : null}

        {/* Le neuf n'est proposé qu'en complément, sous 3 concurrents dans l'ancien : il le DIT. */}
        {ranked.newBuildComplement ? (
          <span className="inline-flex w-fit rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {NEW_BUILD_COMPLEMENT_MENTION}
          </span>
        ) : null}

        {/* Mission 61 — une annonce retenue grâce à un cran de desserrage le DIT.
            Mission 68 — même règle que le bandeau : quand le plancher de ±3 m² l'emporte, la
            surface n'a pas été élargie pour cette annonce (elle entrait déjà à ±3 m²) ;
            `loosenedSurface` est alors false et la mention ne parle que des pièces. */}
        {ranked.loosenedSurface || ranked.loosenedRooms ? (
          <span className="inline-flex w-fit rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Retenu après élargissement
            {ranked.loosenedSurface ? ' de la surface' : ''}
            {ranked.loosenedRooms
              ? ranked.loosenedSurface
                ? ' et des pièces'
                : ' des pièces'
              : ''}
          </span>
        ) : null}

        {/* Pourquoi cette annonce est à cette place : chaque critère de l'ordre, dit tel quel. */}
        <ProximityLines reasons={ranked.proximity.reasons} />

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
          <div className="mt-auto flex flex-col gap-2 pt-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2 font-medium text-zinc-800 stage:text-white/90">
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                disabled={pending}
                className="h-4 w-4 accent-brand"
              />
              À retenir
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className={`${btnSecondary} px-3 py-1.5`}
              >
                Écarter avec un motif
              </button>
              <a
                href={candidate.url}
                target="_blank"
                rel="noreferrer noopener"
                className={`${btnSecondary} px-3 py-1.5`}
              >
                Voir l’annonce
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
