'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { ARCHIVED_STATUS } from '@/features/projects/services/archive-project';
import {
  EXAMPLE_COMPETITORS,
  EXAMPLE_PROPERTY,
  EXAMPLE_SELLER_NAME,
} from '@/features/welcome/services/example-dossier';
import { exampleDecisionRow } from '@/features/welcome/services/example-decision';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const FAILED = `/bienvenue?error=${encodeURIComponent('Le dossier d’exemple n’a pas pu être créé. Réessayez.')}`;

// Mission 97 — « Ouvrir le dossier d'exemple » : celui du conseiller s'il en a déjà un qui n'est
// pas conclu, sinon un neuf, créé à la demande — bien et concurrents fictifs, prêt pour le Live.
// Mission 110 — avec sa décision de prix d'exemple : un parcours complet, synthèse comprise.
// Un exemple archivé ou déjà mené jusqu'à la conclusion n'est pas rouvert : on en crée un autre,
// c'est ce qui permet de s'entraîner de nouveau (les réponses d'un Live sont figées, M92).
export async function openExampleDossier(): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }
  const supabase = await createClient();
  const agencyId = profile.agency_id;

  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('advisor_id', profile.id)
    .eq('is_example', true)
    .in('status', ['draft', 'ready_for_meeting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    redirect(`/builder/${existing.id}`);
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      agency_id: agencyId,
      advisor_id: profile.id,
      seller_name: EXAMPLE_SELLER_NAME,
      status: 'draft',
      is_example: true,
    })
    .select('id')
    .single();
  if (error || !project) {
    redirect(FAILED);
  }

  const { error: propertyError } = await supabase.from('subject_properties').insert({
    ...EXAMPLE_PROPERTY,
    outdoor_spaces: [...EXAMPLE_PROPERTY.outdoor_spaces],
    parking_types: [...EXAMPLE_PROPERTY.parking_types],
    project_id: project.id,
    agency_id: agencyId,
  });
  const { data: competitors, error: competitorsError } = propertyError
    ? { data: null, error: propertyError }
    : await supabase
        .from('comparables')
        .insert(
          EXAMPLE_COMPETITORS.map((competitor, index) => ({
            ...competitor,
            property_type: 'apartment',
            city: EXAMPLE_PROPERTY.city,
            district: EXAMPLE_PROPERTY.district,
            source: 'Exemple',
            display_order: index + 1,
            is_selected: true,
            project_id: project.id,
            agency_id: agencyId,
          })),
        )
        .select('*');
  // Mission 110 — livré avec une décision de prix d'exemple, calculée par le moteur de l'outil.
  const decision =
    competitorsError || !competitors
      ? null
      : exampleDecisionRow({
          projectId: project.id,
          agencyId,
          validatedBy: profile.id,
          sellerSurface: EXAMPLE_PROPERTY.surface_area,
          comparables: competitors,
          now: new Date(),
        });
  const { error: decisionError } = decision
    ? await createServiceRoleClient()
        .from('project_price_positionings')
        .upsert(decision, { onConflict: 'project_id' })
    : { error: competitorsError ?? new Error('décision d’exemple impossible') };
  if (competitorsError || decisionError) {
    // Un exemple à moitié créé ne reste pas dans les listes : il est archivé (M93).
    await supabase
      .from('projects')
      .update({ status: ARCHIVED_STATUS })
      .eq('id', project.id)
      .eq('agency_id', agencyId);
    redirect(FAILED);
  }

  // Prêt pour le Live : c'est le conseiller qui le déclare d'ordinaire (M52) ; ici, l'exemple.
  await supabase
    .from('projects')
    .update({ status: 'ready_for_meeting', updated_at: new Date().toISOString() })
    .eq('id', project.id)
    .eq('agency_id', agencyId);

  revalidatePath('/builder');
  revalidatePath('/live');
  redirect(`/builder/${project.id}`);
}
