import Link from 'next/link';

import type { OverviewStep } from '@/features/projects/services/overview-steps';

// Mission 143 (B4) — les cinq étapes de la Vue d'ensemble : vert coché = fait, bleu = maintenant,
// gris = plus tard ; chaque carte mène à son écran.
const TONE: Record<OverviewStep['status'], { card: string; title: string; bar: string }> = {
  done: {
    card: 'border-zinc-200 bg-white',
    title: 'text-emerald-700',
    bar: 'bg-emerald-600',
  },
  current: {
    card: 'border-brand-deep/30 bg-brand-soft',
    title: 'text-brand-deep',
    bar: 'bg-brand-deep',
  },
  later: {
    card: 'border-zinc-200 bg-white',
    title: 'text-zinc-700',
    bar: 'bg-zinc-200',
  },
};

export function OverviewSteps({ steps }: { steps: OverviewStep[] }) {
  return (
    <ol
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      data-testid="overview-steps"
    >
      {steps.map((step) => {
        const tone = TONE[step.status];
        return (
          <li key={step.key}>
            <Link
              href={step.href}
              className={`flex h-full flex-col overflow-hidden rounded-2xl border ${tone.card} transition-shadow hover:shadow-md stage:border-white/10 stage:bg-white/5`}
              data-testid="overview-step"
              data-step={step.key}
              data-status={step.status}
              aria-current={step.status === 'current' ? 'step' : undefined}
            >
              <span className={`h-1 w-full ${tone.bar}`} aria-hidden />
              <span className="flex flex-col gap-0.5 px-4 py-3">
                <span
                  className={`font-title text-base font-semibold ${tone.title} stage:text-white`}
                >
                  {step.number} · {step.title}
                  {step.status === 'done' ? <span aria-label="fait"> ✓</span> : null}
                </span>
                <span className="text-sm text-zinc-600 stage:text-white/60">{step.fact}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
