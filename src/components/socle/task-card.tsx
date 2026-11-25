import Link from 'next/link';

import { initialsOf } from '@/components/socle/initials';
import { MARK_TONES, type Tone } from '@/components/socle/tone';
import { socleCard } from '@/components/ui/styles';

// La refonte, lot A — les blocs d'« à faire aujourd'hui » (maquettes REFONTE-1, 5, 6, 7 et 8) : une
// carte par personne, avec ce qu'il y a à faire et son bouton ; sur tablette et ordinateur, la
// même personne en ligne dans la colonne de gauche. Des blocs d'affichage : aucune règle ici.

// Le rond aux initiales : 44 px ; dans la colonne de gauche, 40 px sur tablette (`compact`). Sa
// teinte suit la tâche (`tone`), jamais le nom.
export function PersonMark({
  name,
  tone = 'plain',
  compact = false,
}: {
  name: string;
  tone?: Tone;
  compact?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full font-extrabold ${
        compact ? 'size-10 text-sm xl:size-11 xl:text-[15px]' : 'size-11 text-[15px]'
      } ${MARK_TONES[tone]}`}
    >
      {initialsOf(name)}
    </span>
  );
}

// La carte « à faire » : la personne, ce qu'il y a à faire, et son bouton sur toute la largeur. Le
// bouton est donné par l'écran : plein pour la première carte, en contour pour les autres (un seul
// bouton plein par écran). Avec une adresse, la personne mène à sa fiche ; un retard se dit à la
// suite de la tâche, en orange.
export function TaskCard({
  name,
  task,
  late = null,
  tone = 'plain',
  href,
  action,
  testId = 'task-card',
}: {
  name: string;
  task: string;
  late?: string | null;
  tone?: Tone;
  href?: string;
  action: React.ReactNode;
  testId?: string;
}) {
  const person = (
    <>
      <PersonMark name={name} tone={tone} />
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-[17px] font-bold text-brand-darker stage:text-white">{name}</span>
        <span className="text-[15px] text-[#5B6380] stage:text-white/60">
          {task}
          {late ? <LateNote late={late} /> : null}
        </span>
      </span>
    </>
  );
  return (
    <div className={`${socleCard} flex flex-col gap-3 p-4`} data-testid={testId}>
      {href ? (
        <Link href={href} className="flex items-center gap-3" data-testid={`${testId}-person`}>
          {person}
        </Link>
      ) : (
        <div className="flex items-center gap-3">{person}</div>
      )}
      <div className="flex flex-col [&>*]:w-full">{action}</div>
    </div>
  );
}

// « · en retard de 3 jours », à la suite de ce qu'il y a à faire.
export function LateNote({ late }: { late: string }) {
  return (
    <span className="font-semibold text-[#9A3A0A] stage:text-orange-300" data-testid="task-late">
      {' · '}
      {late}
    </span>
  );
}

// La même personne, en ligne, dans la colonne de gauche (tablette et ordinateur) : un lien ; celle
// dont le détail est ouvert à droite a un contour dans la couleur de l'agence. Un peu plus serrée
// sur tablette (REFONTE-6 : rond de 40 px, textes de 16 et 14 px) que sur ordinateur (REFONTE-5).
export function PersonRow({
  href,
  name,
  task,
  late = null,
  tone = 'plain',
  selected = false,
  keepScroll = false,
  testId = 'person-row',
}: {
  href: string;
  name: string;
  task: string;
  late?: string | null;
  tone?: Tone;
  selected?: boolean;
  // Choisir une personne ne quitte pas la page : la liste ne remonte pas en haut.
  keepScroll?: boolean;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      scroll={!keepScroll}
      aria-current={selected ? 'true' : undefined}
      data-testid={testId}
      className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-3 transition-colors xl:p-3.5 stage:bg-white/5 ${
        selected
          ? 'border-brand-deep stage:border-brand'
          : 'border-white hover:border-[#D5DAEA] stage:border-transparent stage:hover:border-white/20'
      }`}
    >
      <PersonMark name={name} tone={tone} compact />
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-base font-bold text-brand-darker xl:text-[17px] stage:text-white">
          {name}
        </span>
        <span className="text-sm text-[#5B6380] xl:text-[15px] stage:text-white/60">
          {task}
          {late ? <LateNote late={late} /> : null}
        </span>
      </span>
    </Link>
  );
}

// « Tous mes acquéreurs · 12 › » : la ligne qui mène à la liste entière.
export function RowLink({
  href,
  label,
  count,
  testId = 'row-link',
}: {
  href: string;
  label: string;
  count?: number;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="flex h-[52px] items-center justify-between rounded-2xl bg-brand-soft px-4 text-base font-bold text-brand-darker transition-colors hover:text-brand-deep stage:bg-brand/15 stage:text-white"
    >
      <span>{label}</span>
      <span className="flex items-center gap-1.5 font-semibold text-[#5B6380] stage:text-white/60">
        {count ?? null}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[18px]"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
