import { redirect } from 'next/navigation';

import { getProfile } from '@/lib/auth/get-profile';

// Entry point for authenticated users: if they have no profile yet,
// send them to onboarding. Authentication itself is enforced by the proxy.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) {
    redirect('/onboarding');
  }

  return <>{children}</>;
}
