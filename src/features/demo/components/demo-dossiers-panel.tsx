import Link from 'next/link';

import { alertError, card, hintText, link, sectionTitle } from '@/components/ui/styles';
import { DemoSetup } from '@/features/demo/components/demo-setup';
import type { DemoDossier } from '@/features/demo/queries/get-demo-dossiers';
import { DEMO_BUYERS } from '@/features/demo/services/demo-buyers';
import { DEMO_SEED_STAGE, DEMO_SEEDS, DEMO_STAGE_LABELS } from '@/features/demo/services/demo-seed';
import { demoSetupSteps } from '@/features/demo/services/demo-setup';
import { numberInWords } from '@/features/purchase-offer/services/amount-in-words';

// Le vrai nombre de dossiers et d'acquéreurs de la démo, lu sur ce qu'elle crée (finitions, 06/11).
const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// Mission 114 (partie B) — « Ma démo » : les dossiers du closer, un par étape (cinq depuis la M131,
// six depuis la M145 : deux mandats signés), « Préparer ma démo » tant qu'il n'en a pas, « Remettre
// ma démo à zéro » ensuite. Mission 147 (partie B) — en étapes, avec la barre ; des dossiers
// illisibles (`null`) se disent, sans « Préparer » ni « Remettre à zéro ».
const STAGE_HREF: Record<DemoDossier['stage'], (id: string) => string> = {
  to_prepare: (id) => `/builder/${id}`,
  ready: (id) => `/builder/${id}/avant-rendez-vous`,
  direct: (id) => `/builder/${id}/avant-rendez-vous`,
  signed: (id) => `/builder/${id}`,
  follow_up: () => '/suivi',
};

export function DemoDossiersPanel({ dossiers }: { dossiers: DemoDossier[] | null }) {
  const header = (
    <>
      <h2 className={sectionTitle}>Ma démo</h2>
      <p className={hintText}>
        {capitalized(numberInWords(DEMO_SEEDS.length))} dossiers aux étapes de l’outil : à préparer,
        prêt pour le Live, prêt en présentation directe,{' '}
        {numberInWords(DEMO_SEEDS.filter((key) => DEMO_SEED_STAGE[key] === 'signed').length)}{' '}
        mandats signés, à relancer ; et {numberInWords(DEMO_BUYERS.length)}{' '}
        <Link href="/acquereurs" className={link}>
          acquéreurs
        </Link>{' '}
        à rapprocher. Ils sont à vous ; chaque closer a les siens.
      </p>
    </>
  );
  return (
    <section className={`${card} flex flex-col gap-4 p-5 sm:p-6`} data-testid="demo-dossiers">
      {dossiers === null ? (
        <>
          {header}
          <p role="alert" className={alertError} data-testid="demo-dossiers-unread">
            Vos dossiers de démo n’ont pas pu être lus : rechargez la page.
          </p>
        </>
      ) : (
        <DemoSetup
          header={header}
          hasDossiers={dossiers.length > 0}
          steps={demoSetupSteps()}
          counts={{
            dossiers: numberInWords(DEMO_SEEDS.length),
            buyers: numberInWords(DEMO_BUYERS.length),
          }}
        >
          {dossiers.length > 0 ? (
            <ul className="flex flex-col gap-2" data-testid="demo-dossier-list">
              {dossiers.map((dossier) => (
                <li
                  key={dossier.id}
                  data-testid="demo-dossier"
                  data-stage={dossier.stage}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm stage:border-white/10"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium text-zinc-900 stage:text-white">
                      {dossier.sellerName}
                    </span>
                    <span className="text-xs text-zinc-500 stage:text-white/60">
                      {DEMO_STAGE_LABELS[dossier.stage]}
                    </span>
                  </span>
                  <Link
                    href={STAGE_HREF[dossier.stage](dossier.id)}
                    className="text-sm font-medium text-brand-deep underline-offset-2 hover:underline stage:text-brand"
                  >
                    Ouvrir →
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </DemoSetup>
      )}
    </section>
  );
}
