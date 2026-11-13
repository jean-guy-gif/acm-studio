'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btnSecondary, card, hintText, inputBase, kickerLabel } from '@/components/ui/styles';
import { setBuyerWatchCap } from '@/features/buyer-watch/actions/set-watch-cap';
import type { WatchAdmin } from '@/features/buyer-watch/queries/get-watch';
import {
  WATCH_BUDGET_LABELS,
  watchUsageLabel,
} from '@/features/buyer-watch/services/watch-schedule';
import { formatEuro, formatRelativeMoment } from '@/lib/format';

// Mission 155 — une réponse perdue ne laisse jamais « Veille active » sans le dire (décision de
// Jean-Guy, 13/11 : le 13/11, la base tenait 0 € et l'écran restait sur l'ancien état) : au-delà
// de 20 secondes sans réponse, ou si l'appel échoue, l'écran dit que l'enregistrement n'a pas
// abouti et propose de recharger.
const SAVE_TIMEOUT_MS = 20_000;
const SAVE_LOST =
  'L’enregistrement n’a pas abouti : rechargez la page pour voir le plafond enregistré.';

const STATUS_LABELS: Record<WatchAdmin['journal'][number]['status'], string> = {
  running: 'en cours',
  done: 'terminée',
  failed: 'en échec',
};

// Mission 136 — Administration, pour le manager : « Veille des acquéreurs : jusqu'à … € par mois »,
// son état (« Veille en pause : plafond du mois atteint », « Veille coupée ») et le journal des
// passages (acquéreur, biens trouvés, coût). Le conseiller ne voit rien de tout cela.
export function BuyerWatchAdmin({ watch }: { watch: WatchAdmin }) {
  const router = useRouter();
  const [value, setValue] = useState(String(Math.round(watch.watchCapCents / 100)));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
    reload?: true;
  } | null>(null);
  const maxEuros = Math.floor(watch.agencyCapCents / 200);

  return (
    <section className={`${card} flex flex-col gap-3 p-5`} data-testid="buyer-watch-admin">
      <span className={kickerLabel}>Veille des acquéreurs · ce mois-ci</span>
      <p className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
        {watchUsageLabel(watch.watchSpentCents, watch.effectiveCapCents)}
      </p>
      <p
        role="status"
        data-testid="buyer-watch-state"
        className={
          watch.state === 'active'
            ? 'text-sm font-medium text-emerald-700 stage:text-emerald-300'
            : 'text-sm font-medium text-amber-700 stage:text-amber-300'
        }
      >
        {WATCH_BUDGET_LABELS[watch.state]}
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          setPending(true);
          let settled = false;
          const lost = () => {
            if (settled) return;
            settled = true;
            setPending(false);
            setMessage({ ok: false, text: SAVE_LOST, reload: true });
          };
          const timer = window.setTimeout(lost, SAVE_TIMEOUT_MS);
          void setBuyerWatchCap(value)
            .then((result) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timer);
              setPending(false);
              if (!result.ok) {
                setMessage({ ok: false, text: result.error });
                return;
              }
              setMessage({ ok: true, text: 'Plafond de la veille enregistré.' });
              router.refresh();
            })
            .catch(() => {
              window.clearTimeout(timer);
              lost();
            });
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 stage:text-white/80">
          Veille des acquéreurs : jusqu’à … € par mois
          <input
            className={`${inputBase} w-32`}
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            data-testid="buyer-watch-cap"
            aria-describedby="buyer-watch-cap-hint"
          />
        </label>
        <button type="submit" className={btnSecondary} disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
      <p id="buyer-watch-cap-hint" className={hintText}>
        Chaque semaine, une recherche sur le marché pour chaque acquéreur prêt à visiter, prise dans
        le budget de recherche de l’agence ({formatEuro(watch.agencyCapCents / 100)}), jamais plus
        de la moitié ({formatEuro(maxEuros)} au plus). 0 € coupe la veille. Le reste du budget va
        aux recherches des conseillers.
      </p>
      {message ? (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={
            message.ok
              ? 'text-sm font-semibold text-emerald-700'
              : 'text-sm font-semibold text-red-700'
          }
        >
          {message.text}
          {message.reload ? (
            <>
              {' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => window.location.reload()}
              >
                Recharger la page
              </button>
            </>
          ) : null}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <h3 className="font-title text-base font-semibold text-zinc-900 stage:text-white">
          Les derniers passages
        </h3>
        {watch.journal.length === 0 ? (
          <p className="text-sm text-zinc-500 stage:text-white/55">
            Aucun passage pour l’instant : la veille cherche la nuit pour les acquéreurs prêts à
            visiter.
          </p>
        ) : (
          <ul
            className="flex flex-col text-sm text-zinc-700 stage:text-white/80"
            data-testid="buyer-watch-journal"
          >
            {watch.journal.map((entry, index) => (
              <li key={`${entry.ranAt}-${index}`} className="flex flex-wrap gap-x-2 py-1">
                <span className="font-medium">{formatRelativeMoment(entry.ranAt)}</span>
                <span>{entry.buyerName}</span>
                <span className="text-zinc-500 stage:text-white/55">
                  {[
                    STATUS_LABELS[entry.status],
                    `${entry.found} bien${entry.found > 1 ? 's' : ''} trouvé${entry.found > 1 ? 's' : ''}`,
                    `${entry.adverts} annonce${entry.adverts > 1 ? 's' : ''} facturée${entry.adverts > 1 ? 's' : ''}`,
                  ].join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
