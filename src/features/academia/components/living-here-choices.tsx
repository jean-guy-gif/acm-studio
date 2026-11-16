'use client';

import Link from 'next/link';

import { badgeNeutral, hintText, link as linkStyle } from '@/components/ui/styles';
import { CopyMessage, useCopyOnOpen } from '@/features/academia/components/academia-links';
import { AGE_WARN_CLASS, LivingHereField } from '@/features/academia/components/living-here-field';
import { setPropertyLivingLink } from '@/features/academia/actions/set-property-living-link';
import type { LivingHereAgeLine } from '@/features/academia/services/living-here-age';
import { LivingHereInfo } from '@/features/academia/components/living-here-info-line';
import type { AcademiaLink } from '@/lib/academia';

// Mission 156 — « « Vivre ici » de chaque bien », sur la page du dossier acquéreur, pour le
// conseiller seul (planche A3-1) : une ligne par bien de la sélection. Un mandat garde le lien
// collé sur son bien vendeur (M147 A) ; un bien hors mandat reçoit le sien ici, pour toute
// l'agence. La ligne d'information se lit une fois, en tête du bloc, jamais sous chaque bien
// (retouche de Jean-Guy, 16/11). Jamais imprimé.

export type LivingHereChoice =
  | {
      itemId: string;
      letter: string;
      label: string;
      kind: 'mandate';
      signed: boolean;
      propertyHref: string;
      savedLine: LivingHereAgeLine | null;
      hasLink: boolean;
    }
  | {
      itemId: string;
      letter: string;
      label: string;
      kind: 'outside';
      origin: string;
      savedUrl: string | null;
      savedLine: LivingHereAgeLine | null;
      // « Ouvrir Academia ↗ » : l'accueil d'Academia et l'adresse confirmée à copier, sinon rien à
      // copier (« cherchez le bien dans Academia »).
      academia: AcademiaLink;
      academiaNote: string;
    };

export function LivingHereChoices({
  buyerId,
  choices,
}: {
  buyerId: string;
  choices: LivingHereChoice[];
}) {
  if (choices.length === 0) return null;
  return (
    <fieldset
      id="vivre-ici"
      className="flex scroll-mt-6 flex-col gap-2 print:hidden"
      data-testid="living-here-choices"
    >
      <legend className="text-sm font-semibold text-zinc-800">« Vivre ici » de chaque bien</legend>
      <p className={hintText}>
        Le lien client d’Academia : le quartier, les écoles, les commerces. Il s’affiche sous le
        bien, sur le lien de l’acquéreur et dans « Confirmer la visite ». Rien dans le dossier
        imprimé ni dans la présentation.
      </p>
      <LivingHereInfo />
      <ul className="flex flex-col gap-2.5">
        {choices.map((choice) => (
          <li
            key={choice.itemId}
            className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-3"
            data-testid="living-here-row"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-zinc-900">
                Bien {choice.letter} · {choice.label}
              </span>
              <span className={badgeNeutral}>
                {choice.kind === 'mandate'
                  ? choice.signed
                    ? 'Mandat signé'
                    : 'Dossier de l’agence'
                  : choice.origin}
              </span>
            </div>
            {choice.kind === 'mandate' ? (
              <MandateRow choice={choice} />
            ) : (
              <OutsideRow buyerId={buyerId} choice={choice} />
            )}
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

function MandateRow({ choice }: { choice: Extract<LivingHereChoice, { kind: 'mandate' }> }) {
  return (
    <>
      <p className="text-sm text-zinc-700" data-testid="living-here-mandate">
        {choice.hasLink ? (
          <>
            Le lien du mandat
            {choice.savedLine?.tone === 'hint'
              ? `, ${choice.savedLine.text.replace(/^Collé/, 'collé')}`
              : ''}
            .{' '}
          </>
        ) : (
          'Aucun lien sur le mandat · '
        )}
        <Link href={choice.propertyHref} className={`${linkStyle} text-sm`}>
          {choice.hasLink ? 'Le changer sur le bien vendeur' : 'Le coller sur le bien vendeur'}
        </Link>
      </p>
      {choice.hasLink && choice.savedLine?.tone === 'warn' ? (
        <p className={AGE_WARN_CLASS} data-testid="living-here-age" data-tone="warn">
          {choice.savedLine.text}
        </p>
      ) : null}
      {choice.hasLink && !choice.signed ? (
        <p className="text-xs text-zinc-500">Montré aux acquéreurs une fois le mandat signé.</p>
      ) : null}
    </>
  );
}

function OutsideRow({
  buyerId,
  choice,
}: {
  buyerId: string;
  choice: Extract<LivingHereChoice, { kind: 'outside' }>;
}) {
  const { state, copy } = useCopyOnOpen();
  return (
    <>
      <LivingHereField
        inputId={`vivre-ici-${choice.itemId}`}
        label="Lien « Vivre ici » montré à l’acquéreur"
        emptyLabel="Lien « Vivre ici » de ce bien (facultatif)"
        hint={
          choice.savedUrl
            ? 'Montré à chaque acquéreur de l’agence qui a ce bien dans sa sélection.'
            : null
        }
        savedUrl={choice.savedUrl}
        savedLine={choice.savedLine}
        save={(next) => setPropertyLivingLink(buyerId, choice.itemId, next)}
        testId="living-here-field"
        openable
      />
      <p className="text-xs text-zinc-500" data-testid="living-here-academia">
        <a
          href={choice.academia.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkStyle} text-xs`}
          onClick={() => copy(choice.academia.copy)}
        >
          Ouvrir Academia ↗
        </a>
        {' · '}
        {choice.academiaNote}
      </p>
      <CopyMessage state={state} address={choice.academia.copy} />
    </>
  );
}
