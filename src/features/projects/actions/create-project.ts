'use server';

import {
  advisorDefaultSettings,
  parseSearchSettings,
  settingsToStore,
} from '@/features/competitor-search/services/search-settings';
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
      // Mission 108 — les réglages de recherche gardés par défaut par le conseiller (relus).
      // Mission 109 — le secteur et l'élargissement seulement, quoi que la base contienne.
      search_settings: settingsToStore(
        advisorDefaultSettings(parseSearchSettings(profile.search_defaults)),
      ),
    })
    .select('id')
    .single();

  if (error || !data) {
    redirect(`/builder/new?error=${encodeURIComponent('La création du dossier a échoué.')}`);
  }

  redirect(`/builder/${data.id}`);
}
