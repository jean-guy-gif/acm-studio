'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { DEMO_SEED_STAGE, demoSeedPlan } from '@/features/demo/services/demo-seed';
import {
  deleteDemoBuyers,
  deleteDemoDossiers,
  ownDemoDossierIds,
  prepareDemoAgency,
  seedDemoBuyersStory,
  seedDemoDossier,
  type Closer,
} from '@/features/demo/services/demo-dossiers';
import {
  checkDemoSetup,
  demoSeedLabel,
  isDemoSeedKey,
  readSetupMoment,
} from '@/features/demo/services/demo-setup';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 147 (partie B, planche M147-5) — « Préparer ma démo » et « Remettre ma démo à zéro », en
// étapes courtes que l'écran appelle l'une après l'autre, la barre disant où l'on en est :
// supprimer (puis recompter à zéro), chaque dossier, les acquéreurs, vérifier. Une étape en échec
// arrête tout et le dit ; « Votre démo est prête » ne se dit que sur la vérification, qui relit la
// base. Chaque étape repasse le garde : un closer de l'agence repérée `is_demo` (repère lu en
// base, M114), pour ses seuls dossiers marqués ; l'écriture passe par la clé service après lui.

export type DemoSetupResult = { ok: true } | { ok: false; error: string };
export type DemoSetupStart = { ok: true; now: string } | { ok: false; error: string };

const READ_FAILED = 'Vos dossiers de démo n’ont pas pu être lus : rechargez la page.';
const STALE = 'La remise à zéro a été interrompue trop longtemps. Recommencez : rien n’est prêt.';
const failed = (reason: string): { ok: false; error: string } => ({
  ok: false,
  error: `La remise à zéro n’a pas abouti : ${reason}. Rien n’est prêt.`,
});

async function requireDemoCloser(): Promise<Closer> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    redirect('/onboarding');
  }
  if (!(await isDemoAgency(profile.agency_id))) {
    redirect('/builder');
  }
  return { id: profile.id, agencyId: profile.agency_id };
}

function revalidateDemo(): void {
  for (const path of [
    '/ma-demo',
    '/builder',
    '/live',
    '/suivi',
    '/prospection',
    '/acquereurs',
    '/bienvenue',
    '/aujourdhui',
  ]) {
    revalidatePath(path);
  }
}

// Ce que le closer a encore de démo : ses dossiers marqués (leur étape) et ses acquéreurs marqués ;
// null si une lecture échoue.
async function readOwnDemo(
  supabase: ReturnType<typeof createServiceRoleClient>,
  closer: Closer,
): Promise<{ stages: string[]; buyers: number } | null> {
  const dossiers = await supabase
    .from('projects')
    .select('demo_stage')
    .eq('agency_id', closer.agencyId)
    .eq('advisor_id', closer.id)
    .not('demo_stage', 'is', null);
  const buyers = await supabase
    .from('buyers')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', closer.agencyId)
    .eq('advisor_id', closer.id)
    .eq('demo', true);
  if (dossiers.error || buyers.error || buyers.count == null) return null;
  return {
    stages: (dossiers.data ?? []).map((row) => row.demo_stage ?? ''),
    buyers: buyers.count,
  };
}

// Étape 1 : supprimer ses dossiers et ses acquéreurs de démo, recompter à zéro, préparer l'agence
// (nom, adresse, logo s'il manque, téléphone du closer). « Préparer » fait de même : des dossiers
// créés entre-temps dans un autre onglet (ou archivés, que « Ma démo » ne montre pas) partent aussi ;
// une lecture en échec n'est jamais « aucun dossier ».
// Rend le « maintenant » de toute la démo.
export async function startDemoSetup(mode: unknown): Promise<DemoSetupStart> {
  if (mode !== 'prepare' && mode !== 'reset') return failed('demande inconnue');
  const closer = await requireDemoCloser();
  const supabase = createServiceRoleClient();
  const ids = await ownDemoDossierIds(supabase, closer);
  if (!ids) return { ok: false, error: READ_FAILED };
  if (
    !(await deleteDemoDossiers(supabase, closer)) ||
    !(await deleteDemoBuyers(supabase, closer))
  ) {
    await reportServerError('demoReset.delete', new Error('suppression de la démo en échec'));
    return failed('vos anciens dossiers n’ont pas pu être supprimés');
  }
  const left = await readOwnDemo(supabase, closer);
  if (!left) return { ok: false, error: READ_FAILED };
  if (left.stages.length > 0 || left.buyers > 0) {
    return failed(
      `${left.stages.length} dossier(s) et ${left.buyers} acquéreur(s) de démo sont restés après la suppression`,
    );
  }
  if (!(await prepareDemoAgency(supabase, closer))) {
    await reportServerError('demoReset.agency', new Error('préparation de l’agence en échec'));
    return failed('votre agence n’a pas pu être préparée');
  }
  revalidateDemo();
  return { ok: true, now: new Date().toISOString() };
}

// Une étape par dossier, à son étape et dans son scénario.
export async function seedDemoProjectStep(key: unknown, now: unknown): Promise<DemoSetupResult> {
  if (!isDemoSeedKey(key)) return failed('dossier inconnu');
  const closer = await requireDemoCloser();
  const moment = readSetupMoment(now, new Date());
  if (!moment) return { ok: false, error: STALE };
  const supabase = createServiceRoleClient();
  const id = await seedDemoDossier(supabase, closer, demoSeedPlan(key, moment), moment);
  if (!id) {
    await reportServerError('demoReset.dossier', new Error(`dossier ${key} non créé`));
    return failed(`le dossier de ${demoSeedLabel(key)} n’a pas pu être créé`);
  }
  return { ok: true };
}

// Les acquéreurs et leur histoire. Le mandat de Mougins (la sélection et l'offre des Keller) se
// retrouve en base par sa marque ET son vendeur, jamais par la marque seule (M145).
export async function seedDemoBuyersStep(now: unknown): Promise<DemoSetupResult> {
  const closer = await requireDemoCloser();
  const moment = readSetupMoment(now, new Date());
  if (!moment) return { ok: false, error: STALE };
  const supabase = createServiceRoleClient();
  const mougins = demoSeedPlan('signed', moment);
  const { data: mandates, error } = await supabase
    .from('projects')
    .select('id')
    .eq('agency_id', closer.agencyId)
    .eq('advisor_id', closer.id)
    .eq('demo_stage', DEMO_SEED_STAGE.signed)
    .eq('seller_name', mougins.sellerName);
  if (error) return { ok: false, error: READ_FAILED };
  if ((mandates ?? []).length !== 1) {
    return failed('le mandat signé de Mougins est introuvable, ou en double');
  }
  if (!(await seedDemoBuyersStory(supabase, closer, mandates![0]!.id, moment))) {
    await reportServerError('demoReset.buyers', new Error('acquéreurs de démo non créés'));
    return failed('les acquéreurs n’ont pas pu être créés');
  }
  return { ok: true };
}

// La preuve : la base relue, six dossiers (un par étape attendue) et neuf acquéreurs.
export async function verifyDemoSetup(): Promise<DemoSetupResult> {
  const closer = await requireDemoCloser();
  const supabase = createServiceRoleClient();
  const own = await readOwnDemo(supabase, closer);
  revalidateDemo();
  if (!own) return { ok: false, error: READ_FAILED };
  const check = checkDemoSetup(own.stages, own.buyers);
  if (!check.ok) {
    await reportServerError('demoReset.verify', new Error(check.message));
    return { ok: false, error: check.message };
  }
  return { ok: true };
}
