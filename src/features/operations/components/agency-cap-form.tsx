'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnSecondary, errorText, inputBase, okText } from '@/components/ui/styles';
import type { SetAgencySearchCapResult } from '@/features/operations/actions/set-agency-search-cap';
import { MAX_MONTHLY_CAP_EUR } from '@/features/search-budget/services/budget';

// Mission 100 — le plafond mensuel d'une agence, en euros entiers. Le serveur revérifie tout,
// à commencer par le compte qui règle.
export function AgencyCapForm({
  label,
  agencyName,
  initialEuros,
  saveAction,
}: {
  // Ce que règle ce plafond, dit devant le champ : « Recherche », « Veille », « IA ».
  label?: string;
  agencyName: string;
  initialEuros: number;
  saveAction: (formData: FormData) => Promise<SetAgencySearchCapResult>;
}) {
  const router = useRouter();
  const [euros, setEuros] = useState(String(initialEuros));
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  function save() {
    setState(null);
    const formData = new FormData();
    formData.set('cap', euros);
    startTransition(async () => {
      const result = await saveAction(formData);
      if (result.ok) {
        setState({ ok: true, message: 'Plafond enregistré.' });
        router.refresh();
      } else {
        setState({ ok: false, message: result.error });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label ? (
        <span className="w-20 text-right text-sm font-medium text-zinc-700 stage:text-white/75">
          {label}
        </span>
      ) : null}
      <input
        type="number"
        min={0}
        max={MAX_MONTHLY_CAP_EUR}
        step={1}
        inputMode="numeric"
        aria-label={`Plafond mensuel de ${agencyName}, en euros`}
        value={euros}
        onChange={(event) => setEuros(event.target.value)}
        className={`${inputBase} w-24`}
      />
      <span className="text-sm text-zinc-500 stage:text-white/60">€ par mois</span>
      <button
        type="button"
        onClick={save}
        disabled={pending || euros === String(initialEuros)}
        className={btnSecondary}
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {state ? (
        <span role="status" className={state.ok ? okText : errorText}>
          {state.message}
        </span>
      ) : null}
    </div>
  );
}
