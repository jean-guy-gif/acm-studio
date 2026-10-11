import { TEST_ACCOUNT_MESSAGE, isTestAgency } from '@/features/test-account/is-test-agency';

// Mission 87 — le compte de test se voit : un bandeau orange, collé en haut de chaque page de
// l'espace conseiller. Rien pour les autres agences. Jamais imprimé, et absent du Live montré
// au vendeur (il n'est monté que dans le shell et le groupe « impression »).
export function TestAccountBanner({ agencyName }: { agencyName: string | null | undefined }) {
  if (!isTestAgency(agencyName)) {
    return null;
  }
  return (
    <div
      role="status"
      data-testid="test-account-banner"
      className="sticky top-0 z-50 bg-orange-500 px-4 py-1.5 text-center text-sm font-semibold text-white print:hidden"
    >
      {TEST_ACCOUNT_MESSAGE}
    </div>
  );
}
