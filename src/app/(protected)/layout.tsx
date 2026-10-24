import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { signOut } from '@/app/login/actions';
import { AppShell } from '@/components/app-shell/app-shell';
import { APP_THEME_COOKIE, type AppTheme } from '@/components/theme/theme';
import { btnPrimary } from '@/components/ui/styles';
import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { countErrorsSinceYesterday } from '@/features/operations/queries/get-error-report';
import { errorsBadgeLabel } from '@/features/operations/services/group-errors';
import { isOperatorEmail } from '@/features/operations/services/operators';
import { requireOperator } from '@/features/operations/services/require-operator';
import { DemoModeProvider } from '@/features/demo/components/demo-mode-provider';
import { TestAccountBanner } from '@/features/test-account/test-account-banner';
import { parseWorkspaceMode } from '@/features/workspace-mode/types';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';

// Protected application shell. Server Component only (no 'use client').
// Redirects users without a profile to onboarding, then renders the shared
// AppShell (barre latérale + thème utilisateur via le cookie `acm-theme`).
// La présentation Live vendeur vit hors de ce shell (groupe de routes (stage))
// et garde sa propre bascule de thème.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) {
    redirect('/onboarding');
  }

  // Mission 60 — un profil RETIRÉ garde son nom sur ses dossiers mais n'a plus accès : la RLS lui
  // ferme déjà tout (get_current_agency_id l'ignore), et l'écran le lui dit clairement plutôt que
  // de le renvoyer bootstraper une agence. Sortie par la déconnexion.
  if (profile.removed_at) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-6 text-center">
        <h1 className="font-title text-2xl font-bold text-zinc-900">
          Votre accès à cette agence a été retiré
        </h1>
        <p className="max-w-md text-zinc-600">
          Vous n’avez plus accès à cet espace. Le travail que vous avez préparé reste à l’agence, à
          votre nom.
        </p>
        <form action={signOut}>
          <button type="submit" className={btnPrimary}>
            Se déconnecter
          </button>
        </form>
      </div>
    );
  }

  const [agency, cookieStore, branding] = await Promise.all([
    getAgency(profile.agency_id),
    cookies(),
    getAgencyBranding(),
  ]);
  // Mission 100 — la pastille « N erreurs depuis hier », pour les seuls comptes autorisés : le
  // garde précède le comptage (clé service). Un comptage illisible n'affiche aucun chiffre.
  // L'adresse du profil ne sert qu'à éviter une vérification inutile à tous les autres comptes :
  // c'est `requireOperator` (la session) qui décide.
  const isOperator = isOperatorEmail(profile.email) && (await requireOperator()).ok;
  const errorsCount = isOperator ? await countErrorsSinceYesterday() : null;
  const errorsBadge = isOperator
    ? { count: errorsCount ?? 0, label: errorsBadgeLabel(errorsCount ?? 0) }
    : null;

  const theme: AppTheme = cookieStore.get(APP_THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light';

  // Mission 114 — l'agence de démonstration : le drapeau que les écrans lisent pour ne pas sonder
  // l'extension ni le Localisateur (la bascule des données, elle, se décide côté serveur sur ce
  // même repère). Rien ne dit « démonstration » à l'écran (décision du 23/10).
  const isDemo = agency?.is_demo === true;

  return (
    <DemoModeProvider isDemo={isDemo}>
      {/* Mission 87 — le compte de test se voit, en haut de chaque page. */}
      <TestAccountBanner agencyName={agency?.name} />
      <AppShell
        profileName={`${profile.first_name} ${profile.last_name}`}
        profileEmail={profile.email}
        agencyName={agency ? agency.name : 'Agence inconnue'}
        initialTheme={theme}
        signOutAction={signOut}
        logoLightUrl={branding?.logoLightUrl ?? null}
        logoDarkUrl={branding?.logoDarkUrl ?? null}
        errorsBadge={errorsBadge}
        demoEntry={isDemo}
        workspaceMode={parseWorkspaceMode(profile.workspace_mode)}
      >
        {children}
      </AppShell>
    </DemoModeProvider>
  );
}
