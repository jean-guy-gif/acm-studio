import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { AdvisorProfileForm } from '@/features/advisor-profile/components/advisor-profile-form';
import { PROPERTY_PHOTO_BUCKET } from '@/features/subject-property-photos/constants';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Mon profil — ACM Studio' };

// Mission 84 — « Mon profil » : le téléphone et la photo du conseiller, pour ses dossiers de
// prospection. Le nom et l'e-mail viennent de l'invitation et ne se modifient pas ici.
export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  let photoUrl: string | null = null;
  if (profile.photo_path) {
    const supabase = await createClient();
    const { data } = await supabase.storage
      .from(PROPERTY_PHOTO_BUCKET)
      .createSignedUrl(profile.photo_path, 60 * 30);
    photoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <span className={kickerLabel}>Conseiller</span>
        <h1 className={pageTitle}>Mon profil</h1>
        <p className={pageSubtitle}>
          {profile.first_name} {profile.last_name} · {profile.email}
        </p>
      </div>
      <AdvisorProfileForm initialPhone={profile.phone ?? ''} initialPhotoUrl={photoUrl} />
    </div>
  );
}
