'use client';

import { useState, useTransition } from 'react';

import { btnSecondary, card, inputBase, link } from '@/components/ui/styles';
import {
  correctOppositionCommune,
  markOppositionAlertTreated,
} from '@/features/prospecting/actions/resolve-unknown-commune';
import type { UnknownCommuneOpposition } from '@/features/prospecting/queries/get-unknown-commune-oppositions';
import { UNKNOWN_COMMUNE_NOTICE } from '@/features/prospecting/services/opposition-recheck';
import { formatRelativeMoment } from '@/lib/format';

// Mission 107 — pour le manager : chaque opposition dont la commune est restée inconnue, avec
// l'adresse (sa clé), qui l'a inscrite et quand ; corriger la commune, ou marquer l'alerte
// traitée. L'opposition n'est jamais retirée ni affaiblie.
export function UnknownCommuneAlerts({ alerts }: { alerts: UnknownCommuneOpposition[] }) {
  return (
    <div
      role="status"
      data-testid="unknown-commune-oppositions"
      className={`${card} flex flex-col gap-3 border-amber-300 p-5 text-sm text-amber-900 stage:text-amber-200`}
    >
      <p className="font-semibold">
        {UNKNOWN_COMMUNE_NOTICE}
        {alerts.length > 1 ? ` (${alerts.length})` : ''}
      </p>
      <ul className="flex flex-col gap-3">
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </ul>
    </div>
  );
}

function AlertRow({ alert }: { alert: UnknownCommuneOpposition }) {
  const [commune, setCommune] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(() => ({
        ok: false as const,
        error: 'L’enregistrement n’a pas été confirmé : réessayez.',
      }));
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <li className="flex flex-col gap-1.5 border-t border-amber-200 pt-2 first:border-0 first:pt-0">
      <span>
        <span className="font-medium">{alert.addressKey}</span> — commune tapée «
        {alert.communeTyped ?? '—'} », inscrite {formatRelativeMoment(alert.requestedAt)}
        {alert.author ? ` par ${alert.author}` : ''}
      </span>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => correctOppositionCommune(alert.id, commune));
        }}
      >
        <input
          type="text"
          value={commune}
          maxLength={120}
          onChange={(event) => setCommune(event.target.value)}
          aria-label="Commune corrigée"
          placeholder="La bonne commune"
          className={`${inputBase} w-auto min-w-48`}
        />
        <button type="submit" disabled={pending} className={`${btnSecondary} px-3 py-1.5 text-xs`}>
          Corriger la commune
        </button>
        <button
          type="button"
          disabled={pending}
          className={`${link} text-xs`}
          onClick={() => run(() => markOppositionAlertTreated(alert.id))}
        >
          Marquer traitée
        </button>
      </form>
      {error ? <span role="alert">{error}</span> : null}
    </li>
  );
}
