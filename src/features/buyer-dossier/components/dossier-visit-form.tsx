'use client';

import { useState, useTransition } from 'react';

import { requestVisitsFromDossier } from '@/features/buyer-dossier/actions/request-visits-from-dossier';
import { DOSSIER_NO_CHOICE, type DossierItem } from '@/features/buyer-dossier/types';

// Mission 119 (partie B) — la dernière page du dossier : « Quels biens souhaitez-vous visiter ? ».
// Sur le lien public, l'acquéreur coche et envoie, sans compte ni e-mail ; à l'écran du conseiller
// et à l'impression, les cases sont là, à cocher à la main.
export const DOSSIER_SENT = 'Votre demande est envoyée : votre conseiller vous recontacte.';

export function DossierVisitForm({
  items,
  token,
}: {
  items: DossierItem[];
  // Le jeton du lien public ; absent, le formulaire est inerte (écran du conseiller, impression).
  token: string | null;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const interactive = token != null && !sent;

  return (
    <form
      className="flex flex-col gap-3"
      data-testid="dossier-visit-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!token) return;
        if (checked.size === 0) {
          setMessage({ ok: false, text: DOSSIER_NO_CHOICE });
          return;
        }
        setMessage(null);
        startTransition(async () => {
          const result = await requestVisitsFromDossier(token, [...checked]).catch(() => ({
            ok: false as const,
            error: 'Votre demande n’a pas pu être envoyée. Réessayez.',
          }));
          if (!result.ok) {
            setMessage({ ok: false, text: result.error });
            return;
          }
          setSent(true);
          setMessage({ ok: true, text: DOSSIER_SENT });
        });
      }}
    >
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.itemId}>
            <label className="flex items-center gap-3 border border-zinc-200 bg-white px-4 py-3 text-base">
              <input
                type="checkbox"
                className="h-5 w-5 accent-brand print:h-4 print:w-4"
                disabled={!interactive || item.visitRequested}
                checked={item.visitRequested || checked.has(item.itemId)}
                onChange={(event) =>
                  setChecked((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(item.itemId);
                    else next.delete(item.itemId);
                    return next;
                  })
                }
                data-testid="dossier-visit-check"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">
                  {item.position}. {item.label}
                </span>
                {item.visitRequested ? (
                  <span className="text-xs text-zinc-500">Visite déjà demandée</span>
                ) : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {token ? (
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            type="submit"
            disabled={!interactive || pending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2 font-semibold text-white disabled:opacity-50"
            data-testid="dossier-visit-send"
          >
            {pending ? 'Envoi…' : 'Envoyer ma demande de visite'}
          </button>
          {message ? (
            <p
              role={message.ok ? 'status' : 'alert'}
              className={
                message.ok
                  ? 'text-sm font-medium text-emerald-700'
                  : 'text-sm font-medium text-red-600'
              }
              data-testid="dossier-visit-message"
            >
              {message.text}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Cochez les biens qui vous intéressent et dites-le à votre conseiller.
        </p>
      )}
    </form>
  );
}
