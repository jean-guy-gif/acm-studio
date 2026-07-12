'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { bootstrapAgencyOwner as runBootstrap } from '@/lib/onboarding/bootstrap-agency-owner';

export async function bootstrapAgencyOwner(formData: FormData): Promise<void> {
  const agencyName = String(formData.get('agencyName') ?? '').trim();
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();

  // Minimal server-side validation (the RPC re-validates as the source of truth).
  if (!agencyName || !firstName || !lastName) {
    redirect(`/onboarding?error=${encodeURIComponent('Tous les champs sont requis.')}`);
  }

  try {
    await runBootstrap({ agencyName, firstName, lastName });
  } catch {
    redirect(`/onboarding?error=${encodeURIComponent("La création de l'agence a échoué.")}`);
  }

  revalidatePath('/', 'layout');
  redirect('/protected');
}
