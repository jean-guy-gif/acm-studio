'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { activeDossierStep, dossierSteps } from '@/features/projects/services/dossier-steps';

const tab = 'rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors';
const tabActive = `${tab} bg-brand-soft text-brand-deep stage:bg-brand/15 stage:text-brand`;
const tabIdle = `${tab} text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 stage:text-white/55 stage:hover:bg-white/10`;

// Mission 97 — la barre des étapes, en haut de chaque écran d'un dossier : on va à n'importe
// laquelle d'un clic. Purement navigationnelle : aucun avancement inventé.
export function DossierStepsBar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const active = activeDossierStep(pathname, projectId);
  return (
    <nav
      aria-label="Étapes du dossier"
      data-testid="dossier-steps"
      className="flex flex-wrap gap-1"
    >
      {dossierSteps(projectId).map((step) => (
        <Link
          key={step.key}
          href={step.href}
          aria-current={active === step.key ? 'page' : undefined}
          className={active === step.key ? tabActive : tabIdle}
        >
          {step.label}
        </Link>
      ))}
    </nav>
  );
}
