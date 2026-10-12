'use client';

import { useState, useTransition } from 'react';

import { btnSecondary, inputBase } from '@/components/ui/styles';
import { addManualOpposition } from '@/features/prospecting/actions/add-prospecting-opposition';
import { MANUAL_OPPOSITION_MAX_LENGTH } from '@/features/prospecting/services/manual-opposition';

// Mission 102 — inscrire À LA MAIN une adresse sur la liste « Ne plus solliciter » : un
// propriétaire appelle, son bien n'est sur aucune carte. L'adresse est bloquée pour toute
// l'agence, dans tous les dossiers, présents et futurs ; le geste ne s'annule pas d'ici.
export function ManualOppositionForm() {
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await addManualOpposition(address);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setAddress('');
      setMessage({
        ok: true,
        text: 'Adresse inscrite : plus de courrier, plus de tournée, dans aucun dossier.',
      });
    });
  };

  return (
    <details className="rounded-2xl border border-zinc-200 bg-white p-4 stage:border-white/10 stage:bg-white/5">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-700 stage:text-white/80">
        Inscrire une adresse « Ne plus solliciter »
      </summary>
      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <p className="text-xs text-zinc-500 stage:text-white/60">
          Un propriétaire vous demande de ne plus le contacter, et son bien n’est sur aucune
          carte&nbsp;: inscrivez son adresse. Elle sera bloquée pour toute l’agence, dans tous les
          dossiers. Ce geste ne s’annule pas d’ici.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            required
            maxLength={MANUAL_OPPOSITION_MAX_LENGTH}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="14 chemin des Oliviers, 06800 Cagnes-sur-Mer"
            aria-label="Adresse à ne plus solliciter"
            className={`${inputBase} min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={pending}
            className={`${btnSecondary} px-3 py-1.5 text-xs`}
          >
            {pending ? 'Inscription…' : 'Ne plus solliciter cette adresse'}
          </button>
        </div>
        {message ? (
          <p
            role={message.ok ? 'status' : 'alert'}
            className={
              message.ok
                ? 'text-xs text-emerald-700 stage:text-emerald-300'
                : 'text-xs text-amber-700 stage:text-amber-300'
            }
          >
            {message.text}
          </p>
        ) : null}
      </form>
    </details>
  );
}
