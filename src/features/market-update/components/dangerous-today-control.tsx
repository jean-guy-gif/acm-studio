'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, hintText, link as linkStyle } from '@/components/ui/styles';
import { designateDangerousToday } from '@/features/market-update/actions/designate-dangerous-today';
import { formatEuro } from '@/lib/format';

export type DangerousOption = {
  id: string;
  label: string;
  newcomer: boolean;
  price: number;
};

// Mission 129 — « Désigner le plus dangereux aujourd'hui », sur la ligne du Suivi d'un mandat
// signé (maquette M129-2) : parmi les biens encore en vente du dernier point, dans l'ordre du
// classement, nouveaux venus compris ; « Revenir au choix du rendez-vous ». Le choix du vendeur au
// rendez-vous reste écrit ; le document et son lien montrent le nouveau dès maintenant.
export function DangerousTodayControl({
  projectId,
  options,
  current,
  meeting,
  changed,
  needsNew,
  pointDay,
  editable,
}: {
  projectId: string;
  options: DangerousOption[];
  // Le plus dangereux en vigueur, et celui du rendez-vous.
  current: DangerousOption | null;
  meeting: (DangerousOption & { gone: boolean }) | null;
  changed: boolean;
  needsNew: boolean;
  pointDay: string;
  // Seul le point du jour se désigne : un point déjà daté se rouvre tel qu'il était (M127).
  editable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (competitorId: string | null) =>
    startTransition(async () => {
      setMessage(null);
      const result = await designateDangerousToday(projectId, competitorId).catch(() => ({
        ok: false as const,
        error: 'Le choix n’a pas été enregistré. Réessayez.',
      }));
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      const chosen = options.find((item) => item.id === competitorId);
      setOpen(false);
      setChoice(null);
      setMessage({
        ok: true,
        text: chosen
          ? `Point du ${pointDay} mis à jour : le plus dangereux aujourd’hui est ${chosen.label}.`
          : `Point du ${pointDay} mis à jour : le plus dangereux redevient le choix du vendeur au rendez-vous.`,
      });
      router.refresh();
    });

  const line = (tag: string, item: DangerousOption, note: string) => (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-zinc-800 stage:text-white">
      <span className="rounded bg-[#fbf4e3] px-1.5 py-0.5 text-[0.65rem] font-bold tracking-[0.1em] text-[#8f6a1c] uppercase">
        {tag}
      </span>
      <span className="font-semibold">{item.label}</span>
      <span>· {formatEuro(item.price)}</span>
      <span className="text-xs text-zinc-500 stage:text-white/60">· {note}</span>
    </span>
  );

  return (
    <div className="flex flex-col gap-2" data-testid="dangerous-today">
      <span className="text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
        Le plus dangereux
      </span>
      {needsNew && meeting && editable ? (
        <p className="text-sm text-amber-800 stage:text-amber-200" data-testid="dangerous-gone">
          Le plus dangereux du rendez-vous a quitté le marché ({meeting.label}). Désignez-en un
          autre pour ce point.
        </p>
      ) : null}
      {current && changed ? line('Aujourd’hui', current, 'désigné par vous') : null}
      {meeting && !meeting.gone
        ? line(changed ? 'Au rendez-vous' : 'Selon le vendeur', meeting, 'son choix au rendez-vous')
        : null}
      {!editable ? (
        <p className={hintText} data-testid="dangerous-stale">
          Pour désigner le plus dangereux aujourd’hui, mettez d’abord les concurrents à jour : le
          point du {pointDay} reste tel qu’il a été remis.
        </p>
      ) : open ? (
        <fieldset className="flex flex-col gap-1.5" data-testid="dangerous-options">
          <legend className="sr-only">Désigner le plus dangereux aujourd’hui</legend>
          {options.length === 0 ? (
            <p className={hintText}>Aucun bien encore en vente : rien à désigner.</p>
          ) : (
            options.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`dangerous-${projectId}`}
                  value={item.id}
                  checked={choice === item.id}
                  onChange={() => setChoice(item.id)}
                  disabled={pending}
                />
                <span>{item.label}</span>
                {item.newcomer ? (
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.1em] text-brand-darker uppercase">
                    Nouveau
                  </span>
                ) : null}
                <span className="text-zinc-500">· {formatEuro(item.price)}</span>
              </label>
            ))
          )}
          <p className={hintText}>
            Le document et son lien le montreront dès maintenant. Le choix du vendeur au rendez-vous
            reste écrit, avec la mention « votre choix au rendez-vous ».
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`${btnPrimary} px-3 py-1.5 text-xs`}
              disabled={pending || choice == null || choice === current?.id}
              onClick={() => save(choice)}
              data-testid="dangerous-save"
            >
              {pending ? 'Enregistrement…' : 'En faire le plus dangereux'}
            </button>
            <button
              type="button"
              className={linkStyle}
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setChoice(null);
              }}
            >
              Annuler
            </button>
          </div>
        </fieldset>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`${btnSecondary} px-3 py-1.5 text-xs`}
            onClick={() => {
              setMessage(null);
              setOpen(true);
            }}
            data-testid="dangerous-designate"
          >
            {changed ? 'Désigner un autre' : 'Désigner le plus dangereux aujourd’hui'}
          </button>
          {changed && meeting && !meeting.gone ? (
            <button
              type="button"
              className={linkStyle}
              disabled={pending}
              onClick={() => save(null)}
              data-testid="dangerous-reset"
            >
              Revenir au choix du rendez-vous
            </button>
          ) : null}
        </div>
      )}
      {message ? (
        <p role="status" className={`text-xs ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
