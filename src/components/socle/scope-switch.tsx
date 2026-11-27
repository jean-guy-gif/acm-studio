import Link from 'next/link';

// La refonte, remarques de Jean-Guy (26/11) — le choix de vue d'« Aujourd'hui » (M145 B), repris
// sur Vendeurs et Acquéreurs : « Mes dossiers » (ou « Mes fiches ») et « Toute l'agence », pour un
// manager seulement. La vue choisie est la pastille blanche.

const chip = 'rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors';

export function ScopeSwitch({
  scope,
  mineLabel,
  mineHref,
  agencyHref,
  testId,
}: {
  scope: 'mine' | 'agency';
  mineLabel: string;
  mineHref: string;
  agencyHref: string;
  testId: string;
}) {
  const look = (active: boolean) =>
    `${chip} ${active ? 'bg-white text-brand-darker shadow-sm stage:bg-white/15 stage:text-white' : 'text-zinc-600 stage:text-white/60'}`;
  return (
    <div
      className="inline-flex self-start rounded-full bg-zinc-100 p-1 stage:bg-white/10"
      data-testid={testId}
    >
      <Link
        href={mineHref}
        aria-current={scope === 'mine' ? 'true' : undefined}
        className={look(scope === 'mine')}
      >
        {mineLabel}
      </Link>
      <Link
        href={agencyHref}
        aria-current={scope === 'agency' ? 'true' : undefined}
        className={look(scope === 'agency')}
      >
        Toute l’agence
      </Link>
    </div>
  );
}
