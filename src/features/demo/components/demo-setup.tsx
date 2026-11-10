'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import {
  alertError,
  alertOk,
  btnPrimary,
  btnSecondary,
  link,
  sectionTitle,
} from '@/components/ui/styles';
import {
  seedDemoBuyersStep,
  seedDemoProjectStep,
  startDemoSetup,
  verifyDemoSetup,
} from '@/features/demo/actions/demo-setup';
import {
  setupFailure,
  type DemoSetupMode as Mode,
  type DemoSetupStepView,
} from '@/features/demo/services/demo-setup';

// Mission 147 (partie B, planche M147-5) — « Préparer ma démo » et « Remettre ma démo à zéro » en
// étapes : l'écran appelle chaque étape l'une après l'autre et la barre dit où l'on en est
// (« Dossier 4 sur 6 »). Pendant ce temps, aucun bouton. « Votre démo est prête » seulement quand
// la vérification a relu la base ; sinon le message dit ce qui manque, avec « Recommencer », le
// seul bouton plein. Pas de verrou : deux remises à zéro simultanées se voient à la vérification.

type State =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'running'; mode: Mode; index: number }
  | { kind: 'done' }
  | { kind: 'failed'; message: string };

async function attempt<T>(call: () => Promise<T>): Promise<T | null> {
  try {
    return await call();
  } catch {
    return null;
  }
}

export function DemoSetup({
  header,
  hasDossiers,
  steps,
  counts,
  children,
}: {
  // Le titre et la phrase de la carte : la barre les remplace pendant les étapes (planche M147-5).
  header: ReactNode;
  hasDossiers: boolean;
  steps: DemoSetupStepView[];
  // Le vrai nombre de dossiers et d'acquéreurs, en lettres, lu sur ce que la démo crée.
  counts: { dossiers: string; buyers: string };
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'idle' });

  const run = async (mode: Mode): Promise<void> => {
    const fail = (message: string) => setState({ kind: 'failed', message });
    const lost = setupFailure(mode, 'la connexion a été perdue');
    const at = (index: number) => setState({ kind: 'running', mode, index });
    at(0);
    const start = await attempt(() => startDemoSetup(mode));
    if (!start) return fail(lost);
    if (!start.ok) return fail(start.error);
    for (const [index, step] of steps.entries()) {
      if (step.key === 'delete') continue;
      at(index);
      const result = await attempt(() =>
        step.key === 'buyers'
          ? seedDemoBuyersStep(start.now, mode)
          : step.key === 'verify'
            ? verifyDemoSetup(mode)
            : seedDemoProjectStep(step.key, start.now, mode),
      );
      if (!result) return fail(lost);
      if (!result.ok) {
        router.refresh();
        return fail(result.error);
      }
    }
    setState({ kind: 'done' });
    router.refresh();
  };

  if (state.kind === 'running') {
    return <Progress steps={steps} index={state.index} mode={state.mode} />;
  }

  if (state.kind === 'failed') {
    return (
      <div
        className={`${alertError} flex flex-col items-start gap-3`}
        role="alert"
        data-testid="demo-setup-failed"
      >
        <p>{state.message}</p>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => void run('reset')}
          data-testid="demo-setup-retry"
        >
          Recommencer
        </button>
      </div>
    );
  }

  return (
    <>
      {state.kind === 'done' ? (
        <p className={alertOk} role="status" data-testid="demo-ready">
          ✓ Votre démo est prête : {counts.dossiers} dossiers et {counts.buyers} acquéreurs, datés
          d’aujourd’hui.
        </p>
      ) : (
        header
      )}
      {children}
      <div className="flex flex-wrap items-center gap-3">
        {!hasDossiers ? (
          <button type="button" className={btnPrimary} onClick={() => void run('prepare')}>
            Préparer ma démo
          </button>
        ) : state.kind === 'confirming' ? (
          <div
            data-testid="demo-reset-confirm"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-200"
          >
            <span>
              Supprimer vos {counts.dossiers} dossiers et vos {counts.buyers} acquéreurs de démo, et
              les recréer neufs ? Les dossiers de vos collègues ne bougent pas.
            </span>
            <button type="button" className={btnSecondary} onClick={() => void run('reset')}>
              Remettre à zéro
            </button>
            <button
              type="button"
              className={`${link} text-xs`}
              onClick={() => setState({ kind: 'idle' })}
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setState({ kind: 'confirming' })}
          >
            Remettre ma démo à zéro
          </button>
        )}
      </div>
    </>
  );
}

function Progress({
  steps,
  index,
  mode,
}: {
  steps: DemoSetupStepView[];
  index: number;
  mode: Mode;
}) {
  const dossiers = steps
    .map((step, position) => ({ ...step, position }))
    .filter((step) => step.key !== 'delete' && step.key !== 'buyers' && step.key !== 'verify');
  const firstDossier = dossiers[0]?.position ?? 1;
  const lastDossier = dossiers[dossiers.length - 1]?.position ?? firstDossier;
  const made = Math.max(0, Math.min(index, lastDossier + 1) - firstDossier);
  const current = dossiers.find((step) => step.position === index);
  const percent = Math.round((index / steps.length) * 100);
  const line = (state: 'done' | 'current' | 'todo', text: string, key: string) => (
    <li
      key={key}
      data-testid="demo-setup-step"
      data-state={state}
      className={
        state === 'done'
          ? 'text-emerald-700 stage:text-emerald-300'
          : state === 'current'
            ? 'font-semibold text-zinc-900 stage:text-white'
            : 'text-zinc-500 stage:text-white/60'
      }
    >
      {state === 'done' ? '✓ ' : state === 'current' ? '● ' : '○ '}
      {text}
    </li>
  );
  const after = (key: 'buyers' | 'verify') => steps.findIndex((step) => step.key === key);
  const stateOf = (position: number): 'done' | 'current' | 'todo' =>
    position < index ? 'done' : position === index ? 'current' : 'todo';
  return (
    <section className="flex flex-col gap-3" data-testid="demo-setup-progress" aria-live="polite">
      <h2 className={sectionTitle}>
        {mode === 'prepare' ? 'Préparation de votre démo' : 'Remise à zéro de votre démo'}
      </h2>
      <div
        className="h-2 overflow-hidden rounded-full bg-zinc-200 stage:bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Avancement"
      >
        <div className="h-full bg-brand-deep transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <ul className="flex flex-col gap-1 text-sm">
        {line(
          stateOf(0),
          mode === 'reset' ? (steps[0]?.label ?? '') : 'Votre agence préparée',
          'delete',
        )}
        {made > 0
          ? line('done', made === 1 ? 'Dossier 1 créé' : `Dossiers 1 à ${made} créés`, 'made')
          : null}
        {current
          ? line(
              'current',
              `Dossier ${current.position - firstDossier + 1} sur ${dossiers.length} : ${current.label}…`,
              'current',
            )
          : null}
        {index < firstDossier ? line('todo', `${dossiers.length} dossiers`, 'dossiers') : null}
        {line(stateOf(after('buyers')), steps[after('buyers')]?.label ?? '', 'buyers')}
        {line(stateOf(after('verify')), steps[after('verify')]?.label ?? '', 'verify')}
      </ul>
      <p className="text-xs text-zinc-500 stage:text-white/60">
        Environ 20 secondes. Gardez cette page ouverte.
      </p>
    </section>
  );
}
