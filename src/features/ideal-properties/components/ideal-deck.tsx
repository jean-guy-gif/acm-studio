'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import {
  chipNeutral,
  errorText,
  pillGreen,
  pillNeutral,
  pillOrange,
  socleBigPair,
  socleBtnFilledBig,
  socleBtnQuietBig,
  socleCardBordered,
} from '@/components/ui/styles';
import { DISMISS_REASON_LABELS } from '@/features/buyer-messages/report';
import { DISMISS_REASONS, type DismissReason } from '@/features/buyer-messages/templates/types';
import type { WhyPill } from '@/features/ideal-properties/services/categorize-ideal';
import { formatEuro } from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';

// La refonte, lot C (maquettes REFONTE-3, 5 et 6) — « un bien à la fois » : la photo et « 8
// critères sur 8 », le prix et sa pastille de budget, le libellé neutre, « Pourquoi celui-ci pour
// eux » en pastilles, puis « Écarter » ou « Proposer ». Un composant d'affichage : les biens, la
// sélection et les gestes sont ceux des biens idéaux (M118, M139), tenus par le panneau.

export type DeckCard = {
  key: string;
  // Le libellé neutre (type · pièces · surface · commune) : jamais un titre ni une adresse.
  label: string;
  photo: string | null;
  price: number | null;
  // « affiché le 24/11/2026 », « Dans l'agence · mandat signé ».
  origin: string | null;
  // « 8 critères sur 8 » ; `allMet` : tous satisfaits (la coche verte).
  criteria: { label: string; allMet: boolean } | null;
  budget: { tone: 'good' | 'watch'; label: string } | null;
  why: WhyPill[];
  // Ce qui est à savoir avant de proposer : les écarts, ce qui reste à vérifier. Jamais caché.
  notes: string[];
  // Une annonce du marché, ou un bien de l'agence : le lien de la fiche complète le dit.
  listing: boolean;
};

const PILL: Record<WhyPill['tone'], string> = {
  must: pillOrange,
  said: pillGreen,
  plain: pillNeutral,
};

// « 0 retenu sur 3 » ; sur tablette, « 0 sur 3 » (150 px).
export function retainedLabel(retained: number, max: number): { long: string; short: string } {
  return {
    long: `${retained} retenu${retained > 1 ? 's' : ''} sur ${max}`,
    short: `${retained} sur ${max}`,
  };
}

// L'en-tête : à gauche, ce que donne l'écran (le retour vers la fiche sur téléphone, le nom et la
// recherche dans le détail) ; puis « Bien 1 sur 4 », « 0 retenu sur 3 » et un trait par bien. Sur
// téléphone, les trois sur une ligne et les traits dessous ; sur tablette et ordinateur, un bloc à
// droite (150 et 200 px).
export function DeckHeader({
  lead,
  position,
  total,
  retained,
  max,
}: {
  lead: ReactNode;
  // Le rang du bien affiché, à partir de 1 ; au-delà du dernier, tout a été vu.
  position: number;
  total: number;
  retained: number;
  max: number;
}) {
  const label = retainedLabel(retained, max);
  const shown = Math.min(position, total);
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3.5 md:flex md:items-center md:justify-between md:gap-4 xl:items-start xl:gap-6">
      <div className="min-w-0">{lead}</div>
      <div
        className="contents md:flex md:w-[150px] md:flex-none md:flex-col md:gap-1.5 xl:w-[200px] xl:gap-2"
        data-testid="deck-progress"
      >
        <div className="contents md:flex md:items-baseline md:justify-between">
          <span
            className="text-center text-[15px] font-bold text-brand-darker md:text-left md:text-[13px] xl:text-sm stage:text-white"
            data-testid="deck-position"
          >
            {total > 0 ? `Bien ${shown} sur ${total}` : 'Aucun bien'}
          </span>
          <span
            className="text-sm text-[#5B6380] md:text-[13px] xl:text-sm stage:text-white/60"
            data-testid="deck-retained"
          >
            <span className="md:hidden xl:inline">{label.long}</span>
            <span className="hidden md:inline xl:hidden">{label.short}</span>
          </span>
        </div>
        {total > 0 ? (
          <div
            aria-hidden="true"
            className="col-span-3 grid gap-1.5 md:gap-[5px] xl:gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(total, 12)}, minmax(0, 1fr))` }}
            data-testid="deck-segments"
          >
            {Array.from({ length: Math.min(total, 12) }, (_, index) => {
              // Au-delà de douze biens, douze traits : chacun vaut une part du chemin.
              const reached = total <= 12 ? index < shown : index < (shown / total) * 12;
              return (
                <span
                  key={index}
                  data-reached={reached ? 'true' : 'false'}
                  className={`h-1 rounded-sm ${reached ? 'bg-brand-deep stage:bg-brand' : 'bg-[#D5DAEA] stage:bg-white/15'}`}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const cross = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    className="size-5"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const check = (size: string, width = '2.5') => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={size}
  >
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

// Le lien de la fiche complète du bien (ses photos, ses caractéristiques, son texte).
function SheetLink({
  card,
  onOpen,
  className,
}: {
  card: DeckCard;
  onOpen: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      className={`items-center text-left font-bold text-brand-deep hover:text-brand-darker stage:text-brand ${className}`}
      data-testid="deck-open-sheet"
      onClick={onOpen}
    >
      {card.listing ? 'Voir l’annonce complète' : 'Voir la fiche du bien'}
    </button>
  );
}

// Un bien, et ses deux gestes. « Écarter » demande sa raison, en un toucher (M139) ; « Proposer »
// le retient dans la sélection (trois au plus, M118). Au clavier, sur ordinateur : flèche gauche
// pour écarter, flèche droite pour proposer.
export function DeckCardView({
  card,
  full,
  pending,
  error,
  keyboard,
  onOpen,
  onPropose,
  onDismiss,
  onSkip,
  more = null,
}: {
  card: DeckCard;
  // La sélection est complète : « Proposer » ne peut plus rien retenir.
  full: boolean;
  pending: boolean;
  error: string | null;
  // Écouter les flèches du clavier (jamais quand une fiche est ouverte par-dessus).
  keyboard: boolean;
  onOpen: () => void;
  onPropose: () => void;
  onDismiss: (reason: DismissReason) => void;
  // Sélection complète : voir le bien suivant sans rien décider de celui-ci.
  onSkip?: () => void;
  // Sous le bien, avant les deux gestes : le lien vers toute la liste.
  more?: ReactNode;
}) {
  const [choosing, setChoosing] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const reasons = useRef<HTMLDivElement>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (choosing) reasons.current?.querySelector('button')?.focus();
  }, [choosing]);

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      // Un bien caché (le détail, sous 768 px) n'entend pas le clavier.
      if (!root.current || root.current.offsetParent === null) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === 'Escape' && choosing) {
        setChoosing(false);
        return;
      }
      if (pending || choosing) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setChoosing(true);
      } else if (event.key === 'ArrowRight' && !full) {
        event.preventDefault();
        onPropose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboard, pending, choosing, full, onPropose]);

  const photo = card.photo && !broken ? displayPhotoUrl(card.photo) : null;
  // La photo prend la place que l'écran lui laisse (290 px sur tablette, 410 sur ordinateur, comme
  // les maquettes), jamais moins de 180 px : sur un écran moins haut, « Écarter » et « Proposer »
  // restent visibles sans défiler. Sélection complète, la mention prend sa ligne : la photo cède
  // sa hauteur.
  const photoHeight = full
    ? 'h-[250px] md:h-[clamp(180px,calc(100dvh_-_530px),290px)] xl:h-[clamp(180px,calc(100dvh_-_540px),410px)]'
    : 'h-[250px] md:h-[clamp(180px,calc(100dvh_-_480px),290px)] xl:h-[clamp(180px,calc(100dvh_-_490px),410px)]';
  return (
    <div className="flex flex-1 flex-col gap-3.5 xl:gap-[18px]" data-testid="deck-card" ref={root}>
      {/* La photo, ou — pour un bien de l'agence, dont la photo se lit sur sa fiche — un bandeau. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ouvrir la fiche : ${card.label}`}
        className={`relative block w-full flex-none overflow-hidden rounded-[20px] bg-[#E7EAF7] text-left stage:bg-white/10 ${
          photo ? photoHeight : 'h-[120px] md:h-[140px]'
        }`}
        data-testid="deck-photo"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="block h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="absolute inset-0 flex items-end p-4 text-sm font-semibold text-[#5B6380] stage:text-white/60">
            {card.photo ? 'Photo à voir sur l’annonce' : 'Les photos sont sur sa fiche'}
          </span>
        )}
        {card.criteria ? (
          <span
            className={`absolute top-3 left-3 flex h-8 items-center gap-1.5 rounded-2xl bg-white px-3 text-sm font-extrabold xl:top-4 xl:left-4 xl:h-[34px] xl:px-3.5 xl:text-[15px] ${
              card.criteria.allMet ? 'text-[#0B6B4A]' : 'text-brand-darker'
            }`}
            data-testid="deck-criteria"
          >
            {card.criteria.allMet ? check('size-4', '3') : null}
            {card.criteria.label}
          </span>
        ) : null}
      </button>

      <div className="flex flex-col gap-3.5 xl:grid xl:grid-cols-2 xl:gap-5">
        <div className="flex flex-col gap-1.5 xl:gap-2">
          <div className="flex items-center justify-between gap-2.5 md:justify-start md:gap-3 xl:flex-col xl:items-start xl:gap-2">
            <span
              className="text-[28px] leading-tight font-extrabold tracking-[-0.5px] text-brand-darker xl:text-[32px] stage:text-white"
              data-testid="deck-price"
            >
              {card.price != null ? formatEuro(card.price) : 'Prix à confirmer'}
            </span>
            {card.budget ? (
              <span
                className={`flex h-[30px] items-center rounded-[15px] px-3 text-[13px] font-bold whitespace-nowrap xl:text-sm ${
                  card.budget.tone === 'good'
                    ? 'bg-[#E3F4EC] text-[#0B6B4A] stage:bg-emerald-400/15 stage:text-emerald-300'
                    : 'bg-[#FDEBDD] text-[#7A2E08] stage:bg-orange-400/15 stage:text-orange-300'
                }`}
                data-testid="deck-budget"
              >
                {card.budget.label}
              </span>
            ) : null}
          </div>
          <p className="text-base text-[#5B6380] stage:text-white/60" data-testid="deck-label">
            {card.label}
          </p>
          {card.origin ? (
            <p className="text-sm text-[#5B6380] stage:text-white/60" data-testid="deck-origin">
              {card.origin}
            </p>
          ) : null}
          <SheetLink card={card} onOpen={onOpen} className="hidden h-8 text-[15px] xl:flex" />
        </div>

        {/* « Pourquoi celui-ci pour eux » : une carte sur téléphone et sur ordinateur ; sur
            tablette, les pastilles seules (REFONTE-6), le titre gardé pour les lecteurs d'écran. */}
        <div
          className={`${socleCardBordered} flex flex-col gap-2.5 p-4 md:rounded-none md:border-0 md:bg-transparent md:p-0 xl:rounded-[20px] xl:border xl:bg-white xl:p-4 xl:stage:bg-white/5`}
          data-testid="deck-why"
        >
          <h3 className="text-base font-extrabold text-brand-darker md:sr-only xl:not-sr-only stage:text-white">
            Pourquoi celui-ci pour eux
          </h3>
          {card.why.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {card.why.map((pill) => (
                <span
                  key={`${pill.tone}:${pill.label}`}
                  className={PILL[pill.tone]}
                  data-testid="deck-why-pill"
                  data-tone={pill.tone}
                >
                  {pill.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#5B6380] stage:text-white/60">
              Rien de sa fiche ne le dit encore : à lire sur{' '}
              {card.listing ? 'l’annonce' : 'sa fiche'}.
            </p>
          )}
          {card.notes.length > 0 ? (
            <p className="text-sm text-[#7A2E08] stage:text-orange-300" data-testid="deck-notes">
              À savoir : {card.notes.join(' · ')}
            </p>
          ) : null}
          <SheetLink card={card} onOpen={onOpen} className="flex h-8 text-sm xl:hidden" />
        </div>
      </div>

      {more}

      {/* Les deux gestes : sous le pouce sur téléphone (fixés en bas de l'écran), en bas du détail
          ailleurs. « Écarter » demande sa raison ; « Garder » revient au bien. */}
      <div
        className="sticky bottom-[var(--shell-bottom)] z-10 mt-auto flex flex-col gap-2 bg-[#F4F5FA]/95 pt-3 pb-4 backdrop-blur md:static md:bg-transparent md:p-0 md:backdrop-blur-none stage:bg-transparent"
        data-testid="deck-actions"
      >
        {error ? (
          <p role="alert" className={errorText}>
            {error}
          </p>
        ) : null}
        {/* Sélection complète : « Proposer » n'a plus de place. Le bien se voit quand même — il
            s'écarte, ou se passe — et l'écran dit comment en retenir un autre. */}
        {full && !choosing ? (
          <p
            className="flex flex-wrap items-center gap-x-2 text-sm text-[#5B6380] stage:text-white/60"
            data-testid="deck-full"
          >
            Sélection complète : pour proposer ce bien, retirez-en un dans toute la liste.
            {onSkip ? (
              <button
                type="button"
                disabled={pending}
                className="font-bold text-brand-deep underline stage:text-brand"
                data-testid="deck-skip"
                onClick={onSkip}
              >
                Passer ce bien
              </button>
            ) : null}
          </p>
        ) : null}
        {choosing ? (
          <div className="flex flex-col gap-2.5" data-testid="deck-reasons" ref={reasons}>
            <span className="text-[15px] font-bold text-brand-darker stage:text-white">
              Pourquoi l’écarter ?
            </span>
            <div className="flex flex-wrap gap-2">
              {DISMISS_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  disabled={pending}
                  className={chipNeutral}
                  data-testid={`deck-reason-${reason}`}
                  onClick={() => onDismiss(reason)}
                >
                  {DISMISS_REASON_LABELS[reason]}
                </button>
              ))}
              <button
                type="button"
                disabled={pending}
                className="flex h-11 items-center px-2 text-[15px] font-bold text-brand-deep stage:text-brand"
                data-testid="deck-keep"
                onClick={() => setChoosing(false)}
              >
                Garder
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 xl:flex xl:items-center xl:justify-between xl:gap-5">
            <p className="hidden text-sm text-[#5B6380] xl:block stage:text-white/60">
              Au clavier : flèche gauche pour écarter, flèche droite pour proposer.
            </p>
            <div className="contents xl:flex xl:gap-3">
              <button
                type="button"
                disabled={pending}
                className={`${socleBtnQuietBig} ${socleBigPair} xl:w-[190px]`}
                data-testid="deck-dismiss"
                onClick={() => setChoosing(true)}
              >
                {cross}
                Écarter
              </button>
              <button
                type="button"
                disabled={pending || full}
                className={`${socleBtnFilledBig} ${socleBigPair} xl:w-[190px]`}
                data-testid="deck-propose"
                onClick={onPropose}
              >
                {check('size-5')}
                Proposer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
