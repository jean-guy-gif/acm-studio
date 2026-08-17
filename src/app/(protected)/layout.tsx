import Link from 'next/link';
import { redirect } from 'next/navigation';

import { signOut } from '@/app/login/actions';
import { Logo } from '@/components/brand/logo';
import { btnSecondary } from '@/components/ui/styles';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';

const NAV = [
  { href: '/builder', label: 'Préparation' },
  { href: '/live', label: 'Live' },
  { href: '/admin', label: 'Administration' },
];

// Protected application shell. Server Component only (no 'use client').
// Redirects users without a profile to onboarding; renders the sidebar + main area.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) {
    redirect('/onboarding');
  }

  const agency = await getAgency(profile.agency_id);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 border-b border-zinc-200 bg-white p-4 md:h-screen md:w-64 md:justify-between md:gap-6 md:border-r md:border-b-0 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 md:gap-6">
          <Logo />
          <nav className="flex flex-wrap gap-1 md:flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-brand-soft hover:text-brand-deep dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden flex-col gap-3 text-sm md:flex">
          <div className="flex flex-col">
            <span className="font-medium">
              {profile.first_name} {profile.last_name}
            </span>
            <span className="text-zinc-500">{profile.email}</span>
          </div>
          <div className="text-zinc-500">{agency ? agency.name : 'Agence inconnue'}</div>
          <form action={signOut}>
            <button type="submit" className={btnSecondary}>
              Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}
