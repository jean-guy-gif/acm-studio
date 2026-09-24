import Link from 'next/link';

import { card, metaLabel } from '@/components/ui/styles';
import { DormancyThresholds } from '@/features/team/components/dormancy-thresholds';
import type { ManagerOverview } from '@/features/team/services/build-manager-overview';

// Mission 59 jalon 1 — ce que le manager voit EN PLUS : l'activité de son agence, orientée
// action. Où en est chacun, ce qui dort, les mandats signés. Rien d'inventé, aucune moyenne.

const numberCell = 'px-3 py-2.5 text-center tabular-nums text-zinc-800 stage:text-white/90';
const headCell =
  'px-3 py-2.5 text-center text-xs font-medium tracking-wide text-zinc-500 stage:text-white/50';

function Badge({ children, tone }: { children: React.ReactNode; tone: 'manager' | 'idle' }) {
  const tones = {
    manager: 'bg-brand-soft text-brand-deep',
    idle: 'bg-amber-100 text-amber-800',
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ManagerOverviewView({ overview }: { overview: ManagerOverview }) {
  const { advisors, dormant, agency } = overview;

  return (
    <div className="flex flex-col gap-8">
      {/* Où en est chacun — une ligne par conseiller, zéro compris. */}
      <section className="flex flex-col gap-3">
        <span className={metaLabel}>Où en est chacun</span>
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-100 stage:border-white/10">
                <th className={`${headCell} text-left`}>Conseiller</th>
                <th className={headCell}>En préparation</th>
                <th className={headCell}>Prêts</th>
                <th className={headCell}>Conclus</th>
                <th className={headCell}>Mandats signés</th>
              </tr>
            </thead>
            <tbody>
              {advisors.map((advisor) => (
                <tr
                  key={advisor.advisorId}
                  className="border-b border-zinc-50 last:border-0 stage:border-white/5"
                >
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 stage:text-white">
                        {advisor.name}
                      </span>
                      {advisor.isManager ? <Badge tone="manager">Manager</Badge> : null}
                    </span>
                  </td>
                  <td className={numberCell}>{advisor.inPreparation}</td>
                  <td className={numberCell}>{advisor.ready}</td>
                  <td className={numberCell}>{advisor.completed}</td>
                  <td className={`${numberCell} font-semibold`}>{advisor.signed}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-200 stage:border-white/15">
                <td className="px-3 py-2.5 font-semibold text-zinc-900 stage:text-white">
                  Total agence
                </td>
                <td className={`${numberCell} font-semibold`}>{agency.inPreparation}</td>
                <td className={`${numberCell} font-semibold`}>{agency.ready}</td>
                <td className={`${numberCell} font-semibold`}>{agency.completed}</td>
                <td className={`${numberCell} font-semibold`}>{agency.signed}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Ce qui dort — dossiers qui n'avancent plus. Orienté action : chacun est cliquable.
          Les seuils se règlent ICI (§ seuils), et la section dit son seuil. */}
      <section className="flex flex-col gap-3">
        <span className={metaLabel}>Ce qui dort</span>
        <DormancyThresholds initial={overview.thresholds} />
        {dormant.length === 0 ? (
          <div className={`${card} p-5 text-sm text-zinc-500 stage:text-white/55`}>
            Rien ne traîne : aucun dossier en préparation ni à relancer laissé de côté.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {dormant.map((entry) => (
              <li key={`${entry.projectId}-${entry.kind}`}>
                <Link
                  href={`/builder/${entry.projectId}`}
                  className={`${card} flex flex-wrap items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10`}
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 stage:text-white">
                        {entry.sellerName}
                      </span>
                      <Badge tone="idle">
                        {entry.kind === 'preparation' ? 'En préparation' : 'À relancer'}
                      </Badge>
                    </span>
                    <span className="text-xs text-zinc-500 stage:text-white/50">
                      {entry.advisorName}
                    </span>
                  </span>
                  <span className="text-sm whitespace-nowrap text-amber-700 stage:text-amber-300">
                    Sans changement depuis {entry.daysSinceChange} jours
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
