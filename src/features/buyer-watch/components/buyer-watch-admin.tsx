'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btnSecondary, card, hintText, kickerLabel } from '@/components/ui/styles';
import { setBuyerWatchActive } from '@/features/buyer-watch/actions/set-watch-cap';
import type { WatchAdmin } from '@/features/buyer-watch/queries/get-watch';
import { WATCH_BUDGET_LABELS } from '@/features/buyer-watch/services/watch-schedule';
import { formatRelativeMoment } from '@/lib/format';

// Mission 155 — une réponse perdue ne laisse jamais « Veille active » sans le dire (décision de
// Jean-Guy, 13/11 : le 13/11, la base tenait la veille coupée et l'écran restait sur l'ancien
// état) : au-delà de 20 secondes sans réponse, ou si l'appel échoue, l'écran dit que
// l'enregistrement n'a pas abouti et propose de recharger.
const SAVE_TIMEOUT_MS = 20_000;
const SAVE_LOST =
  'L’enregistrement n’a pas abouti : rechargez la page pour voir l’état enregistré de la veille.';

const STATUS_LABELS: Record<WatchAdmin['journal'][number]['status'], string> = {
  running: 'en cours',
  done: 'terminée',
  failed: 'en échec',
};

// Mission 136 — Administration, pour le manager : l'état de la veille des acquéreurs (« Veille
// active », « Veille en pause : forfait du mois atteint », « Veille coupée ») et le journal des
// passages (acquéreur, biens trouvés). Lancement, mission 5 (Jean-Guy, 23/11) — plus aucun
// montant : le manager coupe ou reprend la veille ; son plafond se règle par l'opérateur. Le
// conseiller ne voit rien de tout cela.
export function BuyerWatchAdmin({ watch }: { watch: Pick<WatchAdmin, 'state' | 'journal'> }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
    reload?: true;
  } | null>(null);
  const off = watch.state === 'off';

  const toggle = () => {
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
    void setBuyerWatchActive(off)
      .then((result) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        setPending(false);
        if (!result.ok) {
          setMessage({ ok: false, text: result.error });
          return;
        }
        // Reprise demandée, mais la recherche de l'agence est coupée : la veille ne repart pas.
        setMessage(
          off && !result.active
            ? {
                ok: false,
                text: 'La veille ne peut pas reprendre : la recherche de l’agence est coupée. Contactez l’équipe ACM Studio.',
              }
            : { ok: true, text: result.active ? 'Veille reprise.' : 'Veille coupée.' },
        );
        router.refresh();
      })
      .catch(() => {
        window.clearTimeout(timer);
        lost();
      });
  };

  return (
    <section className={`${card} flex flex-col gap-3 p-5`} data-testid="buyer-watch-admin">
      <span className={kickerLabel}>Veille des acquéreurs</span>
      <div className="flex flex-wrap items-center gap-3">
        <p
          role="status"
          data-testid="buyer-watch-state"
          className={
            watch.state === 'active'
              ? 'font-title text-lg font-semibold text-emerald-700 stage:text-emerald-300'
              : 'font-title text-lg font-semibold text-amber-700 stage:text-amber-300'
          }
        >
          {WATCH_BUDGET_LABELS[watch.state]}
        </p>
        <button
          type="button"
          className={btnSecondary}
          disabled={pending}
          onClick={toggle}
          data-testid="buyer-watch-toggle"
        >
          {pending ? 'Enregistrement…' : off ? 'Reprendre la veille' : 'Couper la veille'}
        </button>
      </div>
      <p className={hintText}>
        Chaque semaine, une recherche sur le marché pour chaque acquéreur prêt à visiter, comptée
        dans le forfait de l’agence. Coupée, plus aucune recherche ne part la nuit.
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
                    `${entry.adverts} annonce${entry.adverts > 1 ? 's' : ''} comptée${entry.adverts > 1 ? 's' : ''}`,
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
