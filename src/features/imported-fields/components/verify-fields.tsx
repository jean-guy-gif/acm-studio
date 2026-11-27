'use client';

import { createContext, useContext, useState } from 'react';

import { btnSecondary } from '@/components/ui/styles';
import {
  ALL_CORRECT_LABEL,
  VERIFY_LABEL,
  importedToVerifyLabel,
  withoutField,
} from '@/features/imported-fields/services/fields-to-verify';

// Mission 97 — la pastille « À vérifier » et son bouton « Tout est juste ». Le composant
// affiche ; la liste des champs vient de la fiche (base + import), et repart avec elle.
const VerifyContext = createContext<ReadonlySet<string>>(new Set());

export function VerifyProvider({
  fields,
  children,
}: {
  fields: readonly string[];
  children: React.ReactNode;
}) {
  return <VerifyContext.Provider value={new Set(fields)}>{children}</VerifyContext.Provider>;
}

// À côté du libellé d'un champ rempli par un import, tant qu'il n'a pas été relu.
export function VerifyMark({ field }: { field?: string }) {
  const fields = useContext(VerifyContext);
  if (!field || !fields.has(field)) {
    return null;
  }
  return (
    <span
      data-testid="verify-mark"
      data-field={field}
      className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-amber-800 stage:bg-amber-400/20 stage:text-amber-200"
    >
      {VERIFY_LABEL}
    </span>
  );
}

// En haut du bloc : ce qu'il reste à relire, et le geste qui dit « j'ai tout relu ».
export function VerifyBanner({ count, onAllCorrect }: { count: number; onAllCorrect: () => void }) {
  const label = importedToVerifyLabel(count);
  if (!label) {
    return null;
  }
  return (
    <div
      data-testid="verify-banner"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-200"
    >
      <span>
        {label}&nbsp;: relisez les champs marqués «&nbsp;{VERIFY_LABEL}&nbsp;», ou confirmez d’un
        geste. Rien n’est bloquant.
      </span>
      <button type="button" className={btnSecondary} onClick={onAllCorrect}>
        {ALL_CORRECT_LABEL}
      </button>
    </div>
  );
}

// Pour un formulaire dont les champs ne sont pas tenus par React (la fiche d'un concurrent) : la
// liste vit ici, part avec le formulaire dans un champ caché, et un champ modifié s'en retire.
export function VerifyScope({
  initialFields,
  children,
}: {
  initialFields: readonly string[];
  children: React.ReactNode;
}) {
  const [fields, setFields] = useState<string[]>([...initialFields]);
  const touched = (event: React.SyntheticEvent) => {
    const name = (event.target as { name?: unknown }).name;
    if (typeof name === 'string' && name !== '') {
      setFields((current) => (current.includes(name) ? withoutField(current, name) : current));
    }
  };
  return (
    <VerifyProvider fields={fields}>
      <div className="contents" onInput={touched} onChange={touched}>
        <input type="hidden" name="fields_to_verify" value={fields.join(',')} />
        <div className="sm:col-span-2 empty:hidden">
          <VerifyBanner count={fields.length} onAllCorrect={() => setFields([])} />
        </div>
        {children}
      </div>
    </VerifyProvider>
  );
}
