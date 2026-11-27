'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { DEMO_SEED_STAGE, DEMO_SEEDS, demoSeedPlan } from '@/features/demo/services/demo-seed';
import {
  deleteDemoBuyers,
  deleteDemoDossiers,
  ownDemoDossierIds,
  prepareDemoAgency,
  seedDemoBuyersStory,
  seedDemoDossier,
  type Closer,
  type DemoMandateIds,
} from '@/features/demo/services/demo-dossiers';
import {
  checkDemoSetup,
  demoSeedGroup,
  demoSeedLabel,
  isDemoSeedKey,
  readSetupMode,
  readSetupMoment,
  setupFailure,
  setupName,
  type DemoSetupMode,
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

const READ_FAILED = 'Vos dossiers de démo n’ont pas pu être lus\u00a0: rechargez la page.';
const stale = (mode: DemoSetupMode): { ok: false; error: string } => ({
  ok: false,
  error: `${setupName(mode)} a été interrompue trop longtemps. Recommencez\u00a0: rien n’est prêt.`,
});
const failed = (reason: string, mode: DemoSetupMode): { ok: false; error: string } => ({
  ok: false,
  error: setupFailure(mode, reason),
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
export async function startDemoSetup(requested: unknown): Promise<DemoSetupStart> {
  if (requested !== 'prepare' && requested !== 'reset') return failed('demande inconnue', 'reset');
  const mode = requested;
  const closer = await requireDemoCloser();
  const supabase = createServiceRoleClient();
  const ids = await ownDemoDossierIds(supabase, closer);
  if (!ids) return { ok: false, error: READ_FAILED };
  if (
    !(await deleteDemoDossiers(supabase, closer)) ||
    !(await deleteDemoBuyers(supabase, closer))
  ) {
    await reportServerError('demoReset.delete', new Error('suppression de la démo en échec'));
    return failed('vos anciens dossiers n’ont pas pu être supprimés', mode);
  }
  const left = await readOwnDemo(supabase, closer);
  if (!left) return { ok: false, error: READ_FAILED };
  if (left.stages.length > 0 || left.buyers > 0) {
    return failed(
      `${left.stages.length} dossier(s) et ${left.buyers} acquéreur(s) de démo sont restés après la suppression`,
      mode,
    );
  }
  if (!(await prepareDemoAgency(supabase, closer))) {
    await reportServerError('demoReset.agency', new Error('préparation de l’agence en échec'));
    return failed('votre agence n’a pas pu être préparée', mode);
  }
  revalidateDemo();
  return { ok: true, now: new Date().toISOString() };
}

// Une étape par dossier, à son étape et dans son scénario.
export async function seedDemoProjectStep(
  key: unknown,
  now: unknown,
  requested?: unknown,
): Promise<DemoSetupResult> {
  const mode = readSetupMode(requested);
  if (!isDemoSeedKey(key)) return failed('dossier inconnu', mode);
  const closer = await requireDemoCloser();
  const moment = readSetupMoment(now, new Date());
  if (!moment) return stale(mode);
  const supabase = createServiceRoleClient();
  const id = await seedDemoDossier(supabase, closer, demoSeedPlan(key, moment), moment);
  if (!id) {
    await reportServerError('demoReset.dossier', new Error(`dossier ${key} non créé`));
    return failed(`le dossier de ${demoSeedLabel(key)} n’a pas pu être créé`, mode);
  }
  return { ok: true };
}

// Mission 155 — un groupe de dossiers, créés en même temps (`DEMO_SEED_GROUPS`) : seul un groupe
// connu, dans son ordre, est accepté ; un dossier en échec arrête tout et se nomme.
export async function seedDemoProjectsStep(
  keys: unknown,
  now: unknown,
  requested?: unknown,
): Promise<DemoSetupResult> {
  const mode = readSetupMode(requested);
  const group = demoSeedGroup(keys);
  if (!group) return failed('dossiers inconnus', mode);
  const closer = await requireDemoCloser();
  const moment = readSetupMoment(now, new Date());
  if (!moment) return stale(mode);
  const supabase = createServiceRoleClient();
  const ids = await Promise.all(
    group.map((key) => seedDemoDossier(supabase, closer, demoSeedPlan(key, moment), moment)),
  );
  const missing = group.filter((_, index) => !ids[index]);
  if (missing.length > 0) {
    await reportServerError(
      'demoReset.dossier',
      new Error(`dossiers ${missing.join(', ')} non créés`),
    );
    const names = missing.map((key) => demoSeedLabel(key));
    return failed(
      names.length === 1
        ? `le dossier de ${names[0]} n’a pas pu être créé`
        : `les dossiers de ${names.join('\u202f; ')} n’ont pas pu être créés`,
      mode,
    );
  }
  return { ok: true };
}

// Les acquéreurs et leur histoire. Les mandats (la sélection et l'offre des Keller sur celui de
// Mougins, M145 ; les sélections des autres acquéreurs, M155) se retrouvent en base par leur marque
// ET leur vendeur, jamais par la marque seule ; chacun doit y être une fois.
export async function seedDemoBuyersStep(
  now: unknown,
  requested?: unknown,
): Promise<DemoSetupResult> {
  const mode = readSetupMode(requested);
  const closer = await requireDemoCloser();
  const moment = readSetupMoment(now, new Date());
  if (!moment) return stale(mode);
  const supabase = createServiceRoleClient();
  const signedKeys = DEMO_SEEDS.filter((key) => DEMO_SEED_STAGE[key] === DEMO_SEED_STAGE.signed);
  const sellerOf = new Map(signedKeys.map((key) => [demoSeedPlan(key, moment).sellerName, key]));
  const { data: rows, error } = await supabase
    .from('projects')
    .select('id, seller_name')
    .eq('agency_id', closer.agencyId)
    .eq('advisor_id', closer.id)
    .eq('demo_stage', DEMO_SEED_STAGE.signed)
    .in('seller_name', [...sellerOf.keys()]);
  if (error) return { ok: false, error: READ_FAILED };
  const mandates: DemoMandateIds = {};
  for (const row of rows ?? []) {
    const key = sellerOf.get(row.seller_name ?? '');
    if (!key || mandates[key]) {
      return failed('un mandat signé est en double', mode);
    }
    mandates[key] = row.id;
  }
  if (!mandates.signed) {
    return failed('le mandat signé de Mougins est introuvable', mode);
  }
  if (!(await seedDemoBuyersStory(supabase, closer, mandates, moment))) {
    await reportServerError('demoReset.buyers', new Error('acquéreurs de démo non créés'));
    return failed('les acquéreurs n’ont pas pu être créés', mode);
  }
  return { ok: true };
}

// La preuve : la base relue, six dossiers (un par étape attendue) et neuf acquéreurs.
export async function verifyDemoSetup(requested?: unknown): Promise<DemoSetupResult> {
  const mode = readSetupMode(requested);
  const closer = await requireDemoCloser();
  const supabase = createServiceRoleClient();
  const own = await readOwnDemo(supabase, closer);
  revalidateDemo();
  if (!own) return { ok: false, error: READ_FAILED };
  const check = checkDemoSetup(own.stages, own.buyers, mode);
  if (!check.ok) {
    await reportServerError('demoReset.verify', new Error(check.message));
    return { ok: false, error: check.message };
  }
  return { ok: true };
}
