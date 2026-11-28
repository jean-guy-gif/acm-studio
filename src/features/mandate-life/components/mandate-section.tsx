import Link from 'next/link';

import { link, socleCardBordered } from '@/components/ui/styles';
import {
  MandateConfirm,
  MandateForm,
  type MandateFormContext,
} from '@/features/mandate-life/components/mandate-forms';
import type {
  MandateAction,
  MandateFormKey,
  MandateSheet,
} from '@/features/mandate-life/services/mandate-sheet';
import type { MandateStep } from '@/features/mandate-life/services/mandate-steps';
import { StepCardList } from '@/features/projects/components/overview-steps';

// Lot C (maquette C0, validée par Jean-Guy le 28/11) — « Son mandat », avant « Son dossier » :
// ses quatre étapes dans les cartes de « Son dossier » (vert fait, bleu maintenant, gris à venir),
// puis « Le mandat » — sa fin, son prix et ses avenants, l'offre acceptée, le compromis, la vente —,
// ses sorties, et la saisie ouverte sur place. Pour le conseiller seul.

const actionClass = `${link} text-sm font-semibold underline underline-offset-4`;

function Action({ projectId, action }: { projectId: string; action: MandateAction }) {
  switch (action.kind) {
    case 'form':
      return (
        <Link
          href={`/builder/${projectId}?mandat=${action.form}#son-mandat`}
          className={actionClass}
          data-testid={`mandate-open-${action.form}`}
        >
          {action.label}
        </Link>
      );
    case 'confirm':
      return <MandateConfirm projectId={projectId} kind={action.confirm} label={action.label} />;
    case 'link':
      return (
        <Link href={action.href} className={actionClass}>
          {action.label}
        </Link>
      );
  }
}

export function MandateSection({
  projectId,
  view,
  openForm,
}: {
  projectId: string;
  view:
    | { readable: false }
    | {
        readable: true;
        steps: MandateStep[];
        sheet: MandateSheet;
        formContext: MandateFormContext;
      };
  openForm: MandateFormKey | null;
}) {
  return (
    <section
      id="son-mandat"
      className="@container flex scroll-mt-6 flex-col gap-2.5"
      aria-labelledby="mandate-title"
      data-testid="son-mandat"
    >
      <h3
        id="mandate-title"
        className="font-sans text-[17px] font-extrabold text-brand-darker stage:text-white"
      >
        Son mandat
      </h3>
      {!view.readable ? (
        <p role="alert" className="text-sm font-semibold text-red-700" data-testid="mandate-unread">
          La vie du mandat n’a pas pu être lue (ses offres ou ses avenants)&nbsp;: rechargez la
          page.
        </p>
      ) : (
        <>
          <StepCardList
            steps={view.steps.map((step, index) => ({ ...step, number: index + 1 }))}
            testId="mandate-steps"
            itemTestId="mandate-step"
            columns={4}
          />
          <div
            className={`${socleCardBordered} flex flex-col divide-y divide-[#E3E6F0] stage:divide-white/10`}
            data-testid="mandate-card"
          >
            {view.sheet.rows.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-1 px-4 py-3 @xl:grid @xl:grid-cols-[170px_minmax(0,1fr)_auto] @xl:items-baseline @xl:gap-4"
                data-testid="mandate-row"
                data-row={row.key}
              >
                <span className="text-sm font-bold text-[#5B6380] stage:text-white/60">
                  {row.label}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={
                      row.watch
                        ? 'text-base font-semibold text-[#9A3A0A] stage:text-orange-300'
                        : 'text-base text-brand-darker stage:text-white'
                    }
                    data-testid="mandate-row-value"
                  >
                    {row.value}
                  </span>
                  {row.history ? (
                    <span className="text-sm text-[#5B6380] stage:text-white/60">
                      {row.history}
                    </span>
                  ) : null}
                </span>
                {row.actions.length > 0 ? (
                  <span className="flex flex-wrap gap-x-4 gap-y-1 @xl:justify-end">
                    {row.actions.map((action) => (
                      <Action key={action.label} projectId={projectId} action={action} />
                    ))}
                  </span>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
            ))}
            {view.sheet.exits.length > 0 ? (
              <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 py-3" data-testid="mandate-exits">
                {view.sheet.exits.map((action) => (
                  <Action key={action.label} projectId={projectId} action={action} />
                ))}
              </div>
            ) : null}
          </div>
          {openForm ? (
            <MandateForm key={openForm} form={openForm} context={view.formContext} />
          ) : null}
        </>
      )}
    </section>
  );
}
