import { redirect } from 'next/navigation';

// Mission 91 — cet écran a rejoint « Avant le rendez-vous » : l'ancienne adresse y mène.
export default async function LegacyBeforeMeetingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/builder/${projectId}/avant-rendez-vous`);
}
