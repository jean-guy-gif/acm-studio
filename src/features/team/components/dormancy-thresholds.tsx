'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { errorText, okText } from '@/components/ui/styles';
import { saveDormancyThresholds } from '@/features/team/actions/save-dormancy-thresholds';
import type { DormancyThresholds } from '@/features/team/services/build-manager-overview';

// Mission 59 (seuils) — on règle LÀ OÙ LE CHIFFRE MORD : dans la section « Ce qui dort » elle-
// même, pas dans un écran de réglages à part. Et la section DIT son seuil (« en préparation
// depuis plus de N jours ») — c'est ce qui rend le réglage découvrable, plus honnête qu'un
// filtre invisible. Validation minimale côté saisie (au moins 1) ; le serveur re-vérifie.
const numberInput =
  'w-16 rounded-md border border-zinc-300 px-2 py-1 text-center tabular-nums text-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none stage:border-white/20 stage:bg-white/10 stage:text-white';

export function DormancyThresholds({ initial }: { initial: DormancyThresholds }) {
  const router = useRouter();
  const [preparationDays, setPreparationDays] = useState(String(initial.preparationDays));
  const [followUpDays, setFollowUpDays] = useState(String(initial.followUpDays));
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  const changed =
    preparationDays !== String(initial.preparationDays) ||
    followUpDays !== String(initial.followUpDays);
  const valid = Number(preparationDays) >= 1 && Number(followUpDays) >= 1;

  function save() {
    setState(null);
    const formData = new FormData();
    formData.set('preparationDays', preparationDays);
    formData.set('followUpDays', followUpDays);
    startTransition(async () => {
      const result = await saveDormancyThresholds(formData);
      if (result.ok) {
        setState({ ok: true, message: 'Seuils enregistrés.' });
        router.refresh(); // la liste « Ce qui dort » se recalcule avec les nouveaux seuils
      } else {
        setState({ ok: false, message: result.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm text-zinc-600 stage:text-white/60">
        <span>Signalé ici quand un dossier en préparation n’avance plus depuis plus de</span>
        <input
          type="number"
          min={1}
          step={1}
          aria-label="Jours avant qu’une préparation soit signalée dormante"
          value={preparationDays}
          onChange={(event) => setPreparationDays(event.target.value)}
          className={numberInput}
        />
        <span>jours, ou qu’un « à relancer » n’a pas bougé depuis plus de</span>
        <input
          type="number"
          min={1}
          step={1}
          aria-label="Jours avant qu’un « à relancer » soit signalé dormant"
          value={followUpDays}
          onChange={(event) => setFollowUpDays(event.target.value)}
          className={numberInput}
        />
        <span>jours.</span>
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !changed || !valid}
          className="w-fit rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer les seuils'}
        </button>
        {state ? <span className={state.ok ? okText : errorText}>{state.message}</span> : null}
      </div>
    </div>
  );
}
