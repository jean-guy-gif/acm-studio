import { card, hintText, metaLabel } from '@/components/ui/styles';
import type {
  MandateDashboard,
  MandateFigures,
} from '@/features/team/services/build-mandate-dashboard';
import { formatNumber, formatPercent } from '@/lib/format';

// Mission 110 — le tableau de la prise de mandat : pour l'agence, puis par conseiller. Des faits
// posés par les conseillers à la conclusion ; aucune comparaison avec d'autres agences.
const exclusive = (share: number | null): string =>
  share == null ? '—' : formatPercent(Math.round(share * 100));
const days = (value: number | null): string =>
  value == null ? '—' : `${formatNumber(value)} jour${value > 1 ? 's' : ''}`;
const objections = (figures: MandateFigures): string =>
  figures.objections.length > 0
    ? figures.objections
        .slice(0, 3)
        .map((item) => `${item.label} (${item.count})`)
        .join(' · ')
    : '—';

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={metaLabel}>{label}</span>
      <span className="font-title text-xl font-semibold text-zinc-900 stage:text-white">
        {value}
      </span>
    </div>
  );
}

export function MandateDashboardView({ dashboard }: { dashboard: MandateDashboard }) {
  const { agency } = dashboard;
  return (
    <div className="flex flex-col gap-4" data-testid="mandate-dashboard">
      <div className={`${card} grid grid-cols-2 gap-5 p-5 md:grid-cols-4 lg:grid-cols-7`}>
        <Figure label="Rendez-vous menés" value={formatNumber(agency.meetings)} />
        <Figure
          label="Mandats signés au rendez-vous"
          value={formatNumber(agency.signedAtMeeting)}
        />
        <Figure
          label="Mandats signés après relance"
          value={formatNumber(agency.signedAfterFollowUp)}
        />
        <Figure label="Part d’exclusifs" value={exclusive(agency.exclusiveShare)} />
        <Figure label="Délai médian après relance" value={days(agency.medianDaysToSignature)} />
        <Figure label="Freins les plus cités" value={objections(agency)} />
        {/* Mission 115 — les collaborations obtenues avec un confrère, à part des mandats. */}
        <Figure label="Collaborations obtenues" value={formatNumber(agency.collaborations)} />
      </div>
      {dashboard.advisors.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-zinc-500 stage:text-white/60">
              <tr>
                <th className="py-2 pr-4 font-medium">Conseiller</th>
                <th className="py-2 pr-4 font-medium">Rendez-vous</th>
                <th className="py-2 pr-4 font-medium">Signés au rendez-vous</th>
                <th className="py-2 pr-4 font-medium">Signés après relance</th>
                <th className="py-2 pr-4 font-medium">Exclusifs</th>
                <th className="py-2 pr-4 font-medium">Délai médian</th>
                <th className="py-2 pr-4 font-medium">Collaborations</th>
                <th className="py-2 font-medium">Freins</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.advisors.map((advisor) => (
                <tr
                  key={advisor.advisorId}
                  className="border-t border-zinc-100 stage:border-white/10"
                >
                  <td className="py-2 pr-4 font-medium text-zinc-900 stage:text-white">
                    {advisor.name}
                  </td>
                  <td className="py-2 pr-4">{formatNumber(advisor.meetings)}</td>
                  <td className="py-2 pr-4">{formatNumber(advisor.signedAtMeeting)}</td>
                  <td className="py-2 pr-4">{formatNumber(advisor.signedAfterFollowUp)}</td>
                  <td className="py-2 pr-4">{exclusive(advisor.exclusiveShare)}</td>
                  <td className="py-2 pr-4">{days(advisor.medianDaysToSignature)}</td>
                  <td className="py-2 pr-4">{formatNumber(advisor.collaborations)}</td>
                  <td className="py-2">{objections(advisor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={hintText}>Aucun rendez-vous conclu pour l’instant.</p>
      )}
      {agency.signedUnknownPath > 0 ? (
        <p className={hintText} data-testid="unknown-path">
          Parcours inconnu : {formatNumber(agency.signedUnknownPath)} mandat
          {agency.signedUnknownPath > 1 ? 's' : ''} signé{agency.signedUnknownPath > 1 ? 's' : ''}{' '}
          avant que l’outil ne garde la première issue.
        </p>
      ) : null}
      <p className={hintText}>
        « Au rendez-vous » : la première issue enregistrée est « Mandat signé ». « Après relance » :
        signé ensuite ; le délai médian se compte depuis le rendez-vous. Le dossier d’exemple n’est
        jamais compté.
      </p>
    </div>
  );
}
