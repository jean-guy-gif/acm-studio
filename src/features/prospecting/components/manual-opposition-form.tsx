'use client';

import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, inputBase } from '@/components/ui/styles';
import {
  addManualOpposition,
  checkManualOpposition,
} from '@/features/prospecting/actions/add-prospecting-opposition';
import { OPPOSITION_RECORDED_MESSAGE } from '@/features/prospecting/components/opposition-notice';
import {
  COMMUNE_UNVERIFIED_LABEL,
  MANUAL_OPPOSITION_CHOOSE,
  MANUAL_OPPOSITION_MAX_LENGTH,
  type ManualCommune,
} from '@/features/prospecting/services/manual-opposition';

const small = 'px-3 py-1.5 text-xs';

// Mission 104 — l'appel lui-même a échoué (réseau, serveur) : rien n'est confirmé, on le dit.
export const OPPOSITION_NOT_CONFIRMED =
  'L’inscription n’a pas été confirmée\u00a0: vérifiez la connexion, puis réessayez.';

// Mission 102 — inscrire À LA MAIN une adresse sur la liste « Ne plus solliciter » : un
// propriétaire appelle, son bien n'est sur aucune carte. L'adresse est bloquée pour toute
// l'agence, dans tous les dossiers, présents et futurs ; le geste ne s'annule pas d'ici.
// Mission 103 — en deux temps : l'écran montre d'abord l'adresse COMPRISE, avec sa commune
// (déduite du code postal, ou choisie quand il en couvre plusieurs), puis inscrit.
export function ManualOppositionForm() {
  const [address, setAddress] = useState('');
  const [communes, setCommunes] = useState<ManualCommune[]>([]);
  const [communeCode, setCommuneCode] = useState('');
  const [understood, setUnderstood] = useState<{ display: string; verified: boolean } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setCommunes([]);
    setCommuneCode('');
    setUnderstood(null);
  };

  const check = (code: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await checkManualOpposition(address, code || undefined).catch(() => ({
        ok: false as const,
        error: OPPOSITION_NOT_CONFIRMED,
      }));
      if (!result.ok) {
        reset();
        setMessage({ ok: false, text: result.error });
        return;
      }
      if (result.status === 'choose') {
        setCommunes(result.communes);
        setUnderstood(null);
        return;
      }
      setUnderstood({ display: result.display, verified: result.verified });
    });
  };

  const record = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await addManualOpposition(address, communeCode || undefined).catch(() => ({
        ok: false as const,
        error: OPPOSITION_NOT_CONFIRMED,
      }));
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setAddress('');
      reset();
      setMessage({ ok: true, text: OPPOSITION_RECORDED_MESSAGE });
    });
  };

  return (
    <details className="rounded-2xl border border-zinc-200 bg-white p-4 stage:border-white/10 stage:bg-white/5">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-700 stage:text-white/80">
        Inscrire une adresse «&nbsp;Ne plus solliciter&nbsp;»
      </summary>
      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          check(communeCode);
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
            onChange={(event) => {
              setAddress(event.target.value);
              reset();
            }}
            placeholder="14 chemin des Oliviers, 06800 Cagnes-sur-Mer"
            aria-label="Adresse à ne plus solliciter"
            className={`${inputBase} min-w-0 flex-1`}
          />
          {understood == null ? (
            <button type="submit" disabled={pending} className={`${btnSecondary} ${small}`}>
              {pending ? 'Vérification…' : 'Ne plus solliciter cette adresse'}
            </button>
          ) : null}
        </div>

        {communes.length > 0 && understood == null ? (
          <label className="flex flex-wrap items-center gap-2 text-xs text-zinc-700 stage:text-white/80">
            {MANUAL_OPPOSITION_CHOOSE}
            <select
              value={communeCode}
              aria-label="Commune de l’adresse"
              disabled={pending}
              onChange={(event) => {
                setCommuneCode(event.target.value);
                if (event.target.value) {
                  check(event.target.value);
                }
              }}
              className={`${inputBase} w-auto`}
            >
              <option value="">Choisir…</option>
              {communes.map((commune) => (
                <option key={commune.code} value={commune.code}>
                  {commune.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {understood != null ? (
          <div
            role="group"
            aria-label="Adresse comprise"
            className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 stage:border-amber-300/40 stage:bg-amber-300/10 stage:text-amber-100"
          >
            <p>
              <strong data-testid="manual-opposition-understood">{understood.display}</strong>
              {understood.verified ? null : (
                <span data-testid="manual-opposition-unverified">
                  {' '}
                  ({COMMUNE_UNVERIFIED_LABEL}&nbsp;: le service des communes ne répond pas)
                </span>
              )}{' '}
              — Inscrire&#x202f;?
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={reset}
                className={`${btnSecondary} ${small}`}
              >
                Modifier
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={record}
                className={`${btnPrimary} ${small}`}
              >
                {pending ? 'Inscription…' : 'Inscrire'}
              </button>
            </div>
          </div>
        ) : null}

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
