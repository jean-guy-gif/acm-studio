import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { signOut } from '@/app/login/actions';
import { AppShell } from '@/components/app-shell/app-shell';
import { APP_THEME_COOKIE, type AppTheme } from '@/components/theme/theme';
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

  const [agency, cookieStore] = await Promise.all([getAgency(profile.agency_id), cookies()]);
  const theme: AppTheme = cookieStore.get(APP_THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light';

  return (
    <AppShell
      profileName={`${profile.first_name} ${profile.last_name}`}
      profileEmail={profile.email}
      agencyName={agency ? agency.name : 'Agence inconnue'}
      initialTheme={theme}
      signOutAction={signOut}
    >
      {children}
    </AppShell>
  );
}
