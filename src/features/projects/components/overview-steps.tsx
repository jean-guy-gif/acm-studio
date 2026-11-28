import Link from 'next/link';

import type { OverviewStep } from '@/features/projects/services/overview-steps';

// Mission 143 (B4) — les cinq étapes de la Vue d'ensemble : vert coché = fait, bleu = maintenant,
// gris = plus tard ; chaque carte mène à son écran.
// La refonte, lot E (maquette REFONTE-8) — « Son dossier » : une carte par étape, son rond (la
// coche quand elle est faite, son numéro sinon), son titre et ce qu'elle dit ; l'étape du moment
// est cerclée. Sur une ligne de cinq quand la place le permet (la largeur du bloc, pas celle de
// l'écran : le même bloc vit dans le détail de Vendeurs et sur la page du dossier), sinon en liste.

const MARK: Record<OverviewStep['status'], string> = {
  done: 'bg-[#E3F4EC] text-[#0B6B4A] stage:bg-emerald-400/15 stage:text-emerald-300',
  current: 'bg-brand-deep text-white stage:bg-brand',
  later: 'bg-[#E7EAF7] text-[#5B6380] stage:bg-white/10 stage:text-white/60',
};

const check = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
  >
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

// Une carte d'étape : son rond, son titre, ce qu'elle dit ; un lien quand elle mène à un écran.
export type StepCard = {
  key: string;
  number: number;
  title: string;
  fact: string;
  status: OverviewStep['status'];
  href?: string;
};

// Lot C — la liste des cartes, partagée par « Son dossier » et « Son mandat ».
export function StepCardList({
  steps,
  testId,
  itemTestId,
}: {
  steps: StepCard[];
  testId: string;
  itemTestId: string;
}) {
  return (
    <ol
      className="grid grid-cols-1 gap-2 @lg:grid-cols-3 @lg:gap-2.5 @2xl:grid-cols-5"
      data-testid={testId}
    >
      {steps.map((step) => {
        const className = `flex h-full items-center gap-3 rounded-2xl border-2 bg-white px-3.5 py-3 @lg:flex-col @lg:items-start @lg:gap-2 @lg:p-3.5 stage:bg-white/5 ${
          step.status === 'current'
            ? 'border-brand-deep stage:border-brand'
            : 'border-white stage:border-white/10'
        }`;
        const body = (
          <>
            <span
              aria-hidden="true"
              className={`flex size-7 flex-none items-center justify-center rounded-full text-sm font-extrabold ${MARK[step.status]}`}
            >
              {step.status === 'done' ? check : step.number}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-base font-bold text-brand-darker stage:text-white">
                {step.title}
                {step.status === 'done' ? <span className="sr-only">&nbsp;: fait</span> : null}
                {step.status === 'current' ? (
                  <span className="sr-only">&nbsp;: maintenant</span>
                ) : null}
              </span>
              <span className="text-sm text-[#5B6380] stage:text-white/60">{step.fact}</span>
            </span>
          </>
        );
        const marks = {
          'data-testid': itemTestId,
          'data-step': step.key,
          'data-status': step.status,
          'aria-current': step.status === 'current' ? ('step' as const) : undefined,
        };
        return (
          <li key={step.key}>
            {step.href ? (
              <Link
                href={step.href}
                className={`${className} transition-colors hover:border-brand-deep/40`}
                {...marks}
              >
                {body}
              </Link>
            ) : (
              <div className={className} {...marks}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function OverviewSteps({ steps }: { steps: OverviewStep[] }) {
  return (
    <section className="@container flex flex-col gap-2.5" aria-labelledby="dossier-steps-title">
      <h3
        id="dossier-steps-title"
        className="font-sans text-[17px] font-extrabold text-brand-darker stage:text-white"
      >
        Son dossier
      </h3>
      <StepCardList steps={steps} testId="overview-steps" itemTestId="overview-step" />
    </section>
  );
}
