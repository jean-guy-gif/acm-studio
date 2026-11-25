import type { NavIcon } from '@/features/workspace-mode/services/workspace-mode';

// Les icônes du menu, tracées comme sur les maquettes de la refonte (REFONTE-1, 5, 6 et 8) :
// un trait de 2, bouts ronds, dans la couleur du texte.
const PATHS: Record<NavIcon, React.ReactNode> = {
  today: <path d="M5 12l5 5L20 7" />,
  sellers: <path d="M4 11l8-7 8 7v9H4z" />,
  buyers: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  visits: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  prospecting: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
    </>
  ),
};

export function NavIconSvg({ name, className }: { name: NavIcon; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
