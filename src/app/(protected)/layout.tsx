import Link from 'next/link';
import { redirect } from 'next/navigation';

import { signOut } from '@/app/login/actions';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';

// Protected application shell. Server Component only (no 'use client').
// Redirects users without a profile to onboarding; renders the sidebar + main area.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) {
    redirect('/onboarding');
  }

  const agency = await getAgency(profile.agency_id);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-6">
          <div className="text-lg font-semibold">ACM Studio</div>
          <nav className="flex flex-col gap-1">
            <Link
              href="/builder"
              className="rounded px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Builder
            </Link>
            <Link
              href="/live"
              className="rounded px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Live
            </Link>
            <Link
              href="/admin"
              className="rounded px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Admin
            </Link>
          </nav>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col">
            <span className="font-medium">
              {profile.first_name} {profile.last_name}
            </span>
            <span className="text-zinc-500">{profile.email}</span>
          </div>
          <div className="text-zinc-500">{agency ? agency.name : 'Agence inconnue'}</div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
