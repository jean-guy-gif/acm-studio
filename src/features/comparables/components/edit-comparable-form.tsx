'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import { alertError, card } from '@/components/ui/styles';
import {
  initialUpdateComparableState,
  type UpdateComparableState,
} from '@/features/comparables/actions/update-comparable-state';
import { ComparableFormFields } from '@/features/comparables/comparable-form-fields';
import { DismissedDuplicates } from '@/features/comparables/components/dismissed-duplicates';
import type { Comparable } from '@/features/comparables/types';

// Mission 112 — « Modifier le bien » : une erreur ou un doublon laisse la saisie dans le formulaire
// ; un doublon écarté propose « la retenir ? », comme à l'import (M108).
export function EditComparableForm({
  projectId,
  comparable,
  action,
  initialError,
}: {
  projectId: string;
  comparable: Comparable;
  action: (state: UpdateComparableState, formData: FormData) => Promise<UpdateComparableState>;
  initialError: string | null;
}) {
  const [state, formAction] = useActionState(action, {
    ...initialUpdateComparableState,
    error: initialError,
  });
  return (
    <div className="flex flex-col gap-4">
      {state.error ? (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      ) : null}
      {state.duplicate && !state.duplicate.selected ? (
        <DismissedDuplicates
          projectId={projectId}
          items={[{ id: state.duplicate.id, label: '' }]}
        />
      ) : null}
      <form
        action={formAction}
        className={`${card} grid w-full max-w-3xl grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6`}
      >
        <ComparableFormFields comparable={comparable} values={state.values ?? undefined} />
        <SubmitButton
          pendingLabel="Enregistrement…"
          className="mt-2 self-start justify-self-start sm:col-span-2"
        >
          Enregistrer les modifications
        </SubmitButton>
      </form>
    </div>
  );
}
