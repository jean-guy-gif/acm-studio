'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { errorText, okText } from '@/components/ui/styles';
import type { SetAgencyDemoResult } from '@/features/operations/actions/set-agency-demo';

// Mission 114 — « Agence de démonstration », une case par agence, en bas de `/erreurs`. Le
// serveur revérifie tout, à commencer par le compte qui règle ; l'écran ne fait que demander.
export function AgencyDemoToggle({
  agencyName,
  initialIsDemo,
  saveAction,
}: {
  agencyName: string;
  initialIsDemo: boolean;
  saveAction: (formData: FormData) => Promise<SetAgencyDemoResult>;
}) {
  const router = useRouter();
  const [isDemo, setIsDemo] = useState(initialIsDemo);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  function toggle(next: boolean) {
    setState(null);
    const formData = new FormData();
    formData.set('demo', String(next));
    startTransition(async () => {
      const result = await saveAction(formData);
      if (result.ok) {
        setIsDemo(result.isDemo);
        setState({
          ok: true,
          message: result.isDemo
            ? 'Agence de démonstration : fournisseurs simulés.'
            : 'Agence réelle : fournisseurs réels.',
        });
        router.refresh();
      } else {
        setState({ ok: false, message: result.error });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm text-zinc-700 stage:text-white/80">
        <input
          type="checkbox"
          checked={isDemo}
          disabled={pending}
          onChange={(event) => toggle(event.target.checked)}
          aria-label={`${agencyName} : agence de démonstration`}
          className="h-4 w-4 accent-violet-700"
        />
        Agence de démonstration
      </label>
      {state ? (
        <span role="status" className={state.ok ? okText : errorText}>
          {state.message}
        </span>
      ) : null}
    </div>
  );
}
