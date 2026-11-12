import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { NotesFlow } from '@/features/buyer-notes/components/notes-flow';
import { notesReadingOpen } from '@/features/buyer-notes/services/reading-gate';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { DEMO_NOTES_PHOTO, DEMO_NOTES_TEXT } from '@/features/demo/data/notes-arnaud';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';

export const metadata: Metadata = { title: 'Compléter depuis mes notes — ACM Studio' };

// Mission 151 — « Compléter depuis mes notes » sur une fiche existante (planche 1) : le même écran
// que « Nouvel acquéreur » ; une valeur différente de la fiche est proposée décochée (A.8).
export default async function CompleteFromNotesPage({
  params,
}: {
  params: Promise<{ buyerId: string }>;
}) {
  const { buyerId } = await params;
  const [profile, buyer] = await Promise.all([getProfile(), getBuyer(buyerId)]);
  if (!profile || !buyer || buyer.archivedAt) notFound();
  const isDemo = await isDemoAgency(profile.agency_id);
  if (!notesReadingOpen({ isDemo, email: profile.email })) notFound();

  return (
    <div className="flex max-w-6xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href={`/acquereurs/${buyer.id}`} className={backLink}>
          ← {buyer.name}
        </Link>
        <span className={kickerLabel}>Acquéreurs</span>
        <h1 className={pageTitle}>{buyer.name}</h1>
        <p className={pageSubtitle}>
          Ce que vos notes ajoutent à sa fiche : vous choisissez ce qui change.
        </p>
      </div>
      <NotesFlow
        existing={buyer}
        demo={isDemo ? { text: DEMO_NOTES_TEXT, photo: DEMO_NOTES_PHOTO } : null}
      />
    </div>
  );
}
