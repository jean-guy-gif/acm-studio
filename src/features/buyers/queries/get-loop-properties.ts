import 'server-only';

import { readDismissals } from '@/features/buyer-dismissals/queries/read-dismissals';
import {
  loadAgencyBuyers,
  loadLoopProperties,
  type AgencyBuyers,
} from '@/features/buyers/queries/get-property-buyers';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import {
  isNewProperty,
  loopBuyers,
  loopProposalOf,
  mergeLoopProperties,
  readyToPropose,
  type BuyerLoopProposal,
  type LoopContacts,
  type LoopProperty,
} from '@/features/buyers/services/loop-properties';
import { projectsUnderOffer } from '@/features/buyers/services/proposable';
import { idealLabel } from '@/features/ideal-properties/services/ideal-label';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { getProjectOfferAnswers } from '@/features/purchase-offer/queries/get-offer-answers';
import { readPages } from '@/lib/supabase/read-pages';
import { createClient } from '@/lib/supabase/server';

// Mission 134 — les biens qui appellent les acquéreurs de l'agence, lus en une vague, et les envois
// déjà notés. Mission 145 (partie A) — seul un bien sous MANDAT SIGNÉ, sans offre acceptée, se
// propose (décision de Jean-Guy, 07/11 ; `proposable.ts`) : ni un vendeur à relancer, ni un
// concurrent, un nouveau venu ou un bien démarché — le catalogue ne les lit plus. Une lecture en
// échec le dit (`failed`) : aucune tâche n'est alors déduite, jamais « rien à proposer » (M98).
export async function loadLoopCatalog(
  agencyId: string,
  now: Date,
): Promise<{ items: LoopProperty[]; contacts: LoopContacts; failed: boolean }> {
  const empty: LoopContacts = { proposals: new Map() };
  const supabase = await createClient();
  const [conclusions, projects, proposals, dismissals] = await Promise.all([
    supabase
      .from('project_meeting_conclusions')
      .select('project_id, outcome, signed_at, concluded_at')
      .eq('agency_id', agencyId)
      .eq('outcome', 'signed'),
    supabase
      .from('projects')
      .select('id, seller_name, status, is_example')
      .eq('agency_id', agencyId)
      .neq('status', 'archived')
      .eq('is_example', false),
    readPages((from, to) =>
      supabase
        .from('buyer_proposals')
        .select('buyer_id, property_key, sent_at')
        .eq('agency_id', agencyId)
        .order('id')
        .range(from, to),
    ),
    // Mission 139 — les biens écartés pour un acquéreur ne lui sont plus proposés.
    readDismissals(supabase, agencyId),
  ]);
  if (conclusions.error || projects.error || proposals.error || dismissals == null) {
    return { items: [], contacts: empty, failed: true };
  }
  const projectOf = new Map((projects.data ?? []).map((row) => [row.id, row]));
  const contacts: LoopContacts = { proposals: new Map(), dismissals };
  for (const row of proposals.data) {
    const byBuyer = contacts.proposals.get(row.property_key) ?? new Map<string, string>();
    byBuyer.set(row.buyer_id, row.sent_at);
    contacts.proposals.set(row.property_key, byBuyer);
  }

  // Les mandats signés de l'agence, au prix de la 133, sauf ceux qu'une offre acceptée tient.
  const signed = (conclusions.data ?? []).filter((row) => projectOf.has(row.project_id));
  const signedIds = signed.map((row) => row.project_id);
  const [loop, answers] = await Promise.all([
    loadLoopProperties(agencyId, signedIds),
    getProjectOfferAnswers(supabase, agencyId, signedIds),
  ]);
  if (loop.failed || answers == null) return { items: [], contacts: empty, failed: true };
  const held = projectsUnderOffer(answers);
  const list: LoopProperty[] = [];
  for (const row of signed) {
    if (held.has(row.project_id)) continue;
    const entry = loop.properties.get(row.project_id);
    if (!entry) continue;
    list.push({
      key: `project:${row.project_id}`,
      source: 'project',
      reference: row.project_id,
      projectId: row.project_id,
      sellerName: projectOf.get(row.project_id)?.seller_name ?? null,
      origin: 'mandate',
      label: idealLabel(entry.property),
      property: entry.property,
      price: entry.price,
      bornAt: row.signed_at ?? row.concluded_at ?? now.toISOString(),
      selectionRefs: [`project:${row.project_id}`],
      originBuyerIds: [],
    });
  }
  return { items: mergeLoopProperties(list), contacts, failed: false };
}

export type LoopTasks = {
  tasks: SuiviTask[];
  // Par mandat signé : ses acquéreurs prêts (« Acquéreurs · 7 », M133).
  readyByProject: Map<string, number>;
  failed: boolean;
};

// Les tâches « 4 acquéreurs pour la maison de Vence » : une par nouveau bien qui a au moins un
// acquéreur prêt à qui il n'a pas été proposé ; due à l'arrivée du bien, jamais en retard.
export async function getLoopTasks(
  agencyId: string,
  now: Date,
  preloaded?: AgencyBuyers,
): Promise<LoopTasks> {
  const [agency, catalog] = await Promise.all([
    preloaded ?? loadAgencyBuyers(agencyId),
    loadLoopCatalog(agencyId, now),
  ]);
  const readyByProject = new Map<string, number>();
  if (agency.failed || catalog.failed) return { tasks: [], readyByProject, failed: true };
  const tasks: SuiviTask[] = [];
  for (const item of catalog.items) {
    const loop = loopBuyers(item, agency.buyers, agency.progress, catalog.contacts, now);
    if (item.origin === 'mandate' && item.projectId) {
      readyByProject.set(item.projectId, loop.ready.length);
    }
    if (!isNewProperty(item, now)) continue;
    const count = readyToPropose(loop);
    if (count === 0) continue;
    tasks.push({
      kind: 'propose_buyers',
      projectId: item.projectId ?? '',
      sellerName: item.sellerName ?? '',
      dueOn: parisDay(new Date(item.bornAt)),
      count,
      propertyKey: item.key,
      propertyLabel: item.label,
      origin: item.origin,
      property: { propertyType: item.property.propertyType, city: item.property.city },
      figures: { surfaceArea: item.property.surfaceArea, price: item.price },
    });
  }
  return { tasks, readyByProject, failed: false };
}

// Mission 145 (partie A, I2) — la boucle vue de l'acquéreur : pour chaque acquéreur PRÊT, les
// mandats à lui proposer (ceux que compte la tâche « N acquéreurs pour … »), le plus récent
// d'abord. Sa fiche et sa ligne disent alors « Lui proposer la maison de M. et Mme Lopez ».
export type BuyerLoopProposals = {
  byBuyer: Map<string, BuyerLoopProposal[]>;
  failed: boolean;
};

export async function getBuyerLoopProposals(
  agencyId: string,
  now: Date,
): Promise<BuyerLoopProposals> {
  const [agency, catalog] = await Promise.all([
    loadAgencyBuyers(agencyId),
    loadLoopCatalog(agencyId, now),
  ]);
  const byBuyer = new Map<string, BuyerLoopProposal[]>();
  if (agency.failed || catalog.failed) return { byBuyer, failed: true };
  for (const item of catalog.items) {
    if (!isNewProperty(item, now)) continue;
    const loop = loopBuyers(item, agency.buyers, agency.progress, catalog.contacts, now);
    for (const { buyer, ready } of loop.toPropose) {
      if (!ready) continue;
      byBuyer.set(buyer.id, [...(byBuyer.get(buyer.id) ?? []), loopProposalOf(item)]);
    }
  }
  for (const list of byBuyer.values()) list.sort((a, b) => b.bornAt.localeCompare(a.bornAt));
  return { byBuyer, failed: false };
}
