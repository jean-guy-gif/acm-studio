'use server';

import { redirect } from 'next/navigation';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export async function createProject(formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const sellerName = String(formData.get('sellerName') ?? '').trim();
  const sellerEmail = String(formData.get('sellerEmail') ?? '').trim();
  const sellerPhone = String(formData.get('sellerPhone') ?? '').trim();

  if (!sellerName) {
    redirect(`/builder/new?error=${encodeURIComponent('Le nom du vendeur est requis.')}`);
  }

  const supabase = await createClient();

  // agency_id, advisor_id and status are set from the server; never from the client.
  const { data, error } = await supabase
    .from('projects')
    .insert({
      agency_id: profile.agency_id,
      advisor_id: profile.id,
      seller_name: sellerName,
      seller_email: sellerEmail || null,
      seller_phone: sellerPhone || null,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error || !data) {
    redirect(`/builder/new?error=${encodeURIComponent('La création du dossier a échoué.')}`);
  }

  redirect(`/builder/${data.id}`);
}
