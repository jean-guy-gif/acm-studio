import { DEMO_BANNER_MESSAGE } from '@/features/demo/constants';

// Mission 114 — dans l'agence de démonstration, un bandeau permanent en haut de l'espace
// conseiller : « Démonstration — données fictives ». Jamais imprimé (le filigrane s'en charge),
// absent de la scène du Live (qui a sa note discrète).
export function DemoBanner({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) {
    return null;
  }
  return (
    <div
      role="status"
      data-testid="demo-banner"
      className="sticky top-0 z-50 bg-violet-700 px-4 py-1.5 text-center text-sm font-semibold text-white print:hidden"
    >
      {DEMO_BANNER_MESSAGE}
    </div>
  );
}
