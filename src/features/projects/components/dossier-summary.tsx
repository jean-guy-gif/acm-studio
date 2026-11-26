import Link from 'next/link';
import type { ReactNode } from 'react';

import { MARK_TONES, type Tone } from '@/components/socle/tone';
import { socleCardBordered, socleKicker } from '@/components/ui/styles';

// La refonte, lot E (maquette REFONTE-8) — les blocs du dossier d'un vendeur, les mêmes dans le
// détail de Vendeurs (tablette, ordinateur) et en tête de la page du dossier (aux trois tailles) :
// son nom et son bien, son état ; la prochaine étape et son bouton ; trois chiffres ; « Son
// dossier » ; « Tout le dossier ». Des blocs d'affichage : aucune règle ici.

// Son nom, son bien en une ligne (le libellé de la liste, M97), son état en pastille.
export function DossierHeader({
  name,
  propertyText,
  badge,
  as: Title = 'h2',
}: {
  name: string;
  propertyText: string | null;
  badge: { label: string; tone: Tone } | null;
  as?: 'h1' | 'h2';
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <Title
          className="text-[22px] leading-tight font-extrabold tracking-[-0.3px] text-brand-darker xl:text-[26px] xl:tracking-[-0.4px] stage:text-white"
          data-testid="dossier-name"
        >
          {name}
        </Title>
        <p
          className="text-sm text-[#5B6380] xl:text-[15px] stage:text-white/60"
          data-testid="dossier-property"
        >
          {propertyText ?? 'Bien vendeur non renseigné'}
        </p>
      </div>
      {badge ? (
        <span
          className={`flex h-[34px] flex-none items-center self-start rounded-full px-3.5 text-sm font-bold ${MARK_TONES[badge.tone]}`}
          data-testid="dossier-badge"
        >
          {badge.label}
        </span>
      ) : null}
    </div>
  );
}

// La prochaine étape : ce qu'il y a à faire, en une phrase, et son bouton — le seul plein de
// l'écran (M146). Sur ordinateur, le bouton à droite (240 px) ; ailleurs, sous la phrase. Un geste
// qui s'ouvre sur place (son message, ses boutons d'envoi) reprend toute la largeur.
export function NextStepCard({
  title,
  late = null,
  phrase = null,
  action,
  links = null,
  testId = 'dossier-next-step',
}: {
  title: string;
  late?: string | null;
  phrase?: ReactNode;
  action: ReactNode;
  // Sous la phrase : un lien discret (« S'entraîner sur le dossier d'exemple »).
  links?: ReactNode;
  testId?: string;
}) {
  return (
    <section
      className={`${socleCardBordered} flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between xl:gap-8 xl:p-6 xl:has-[[data-task-open]]:flex-col xl:has-[[data-task-open]]:items-stretch`}
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <span className={socleKicker}>Prochaine étape</span>
        <h2
          className="text-[21px] leading-snug font-bold text-brand-darker stage:text-white"
          data-testid={`${testId}-title`}
        >
          {title}
          {late ? (
            <span className="font-semibold text-[#9A3A0A] stage:text-orange-300"> · {late}</span>
          ) : null}
        </h2>
        {phrase ? (
          <p
            className="text-[15px] text-[#5B6380] stage:text-white/60"
            data-testid={`${testId}-phrase`}
          >
            {phrase}
          </p>
        ) : null}
        {links}
      </div>
      <div className="flex flex-col xl:w-60 xl:flex-none xl:has-[[data-task-open]]:w-auto [&>*]:w-full">
        {action}
      </div>
    </section>
  );
}

const chevron = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-[18px] flex-none text-[#5B6380]"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

// « Tout le dossier » : une ligne qui mène au dossier entier (le détail de Vendeurs).
export function DossierAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex h-[52px] items-center justify-between rounded-2xl border border-[#E3E6F0] bg-white px-4 text-base font-bold text-brand-darker hover:border-brand-deep stage:border-white/10 stage:bg-white/5 stage:text-white"
      data-testid="dossier-all-link"
    >
      Tout le dossier
      {chevron}
    </Link>
  );
}

// Sur la page du dossier, « Tout le dossier » se déplie sur place : tout ce que la Vue d'ensemble
// montrait sous ses étapes (M143) y est, rien n'est retiré. Ouvert d'office quand l'adresse le
// demande (`?tout=1`).
export function DossierAllFold({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <details
      className="group rounded-2xl border border-[#E3E6F0] bg-white open:bg-transparent stage:border-white/10 stage:bg-white/5"
      data-testid="dossier-all"
      open={open}
    >
      <summary className="flex h-[52px] cursor-pointer list-none items-center justify-between px-4 text-base font-bold text-brand-darker group-open:border-b group-open:border-[#E3E6F0] stage:text-white [&::-webkit-details-marker]:hidden">
        Tout le dossier
        <span className="transition-transform group-open:rotate-90">{chevron}</span>
      </summary>
      <div className="flex flex-col gap-6 py-5 md:gap-8">{children}</div>
    </details>
  );
}
