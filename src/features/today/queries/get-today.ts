import 'server-only';

import { cache } from 'react';

import { readDismissals } from '@/features/buyer-dismissals/queries/read-dismissals';
import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { getBuyerProspecting } from '@/features/buyer-prospecting/queries/get-buyer-prospecting';
import { getWatchTasks } from '@/features/buyer-watch/queries/get-watch';
import { getBuyerRecontactTasks } from '@/features/buyers/queries/get-buyer-recontact-tasks';
import { getLoopTasks } from '@/features/buyers/queries/get-loop-properties';
import {
  loadAgencyBuyers,
  loadLoopProperties,
} from '@/features/buyers/queries/get-property-buyers';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  daysSinceLastContact,
  parisDay,
  sortContacts,
} from '@/features/meeting-conclusion/services/follow-up-contacts';
import { followUpMotiveLabel } from '@/features/meeting-conclusion/types';
import { propertyLabel } from '@/features/projects/services/property-label';
import { buyerReadiness } from '@/features/buyers/services/buyer-readiness';
import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import { buyerInSentence } from '@/features/meeting-conclusion/services/suivi-step-labels';
import { suiviTaskInputs } from '@/features/meeting-conclusion/services/suivi-task-inputs';
import {
  dossierTasks,
  followUpDueOn,
  isTaskDue,
  sortTasks,
  type SuiviTask,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import { getOfferTasks } from '@/features/purchase-offer/queries/get-offer-tasks';
import { isManagerRole } from '@/features/team/services/role';
import { doneToday, type DoneFact, type DoneLine } from '@/features/today/services/done-today';
import {
  followUpAlert,
  projectReadyBuyers,
  prospectBuyersTasks,
  withFollowUpAlerts,
  type FollowUpAlert,
} from '@/features/today/services/mandate-alerts';
import { prospectingAlerts } from '@/features/today/services/prospecting-alerts';
import {
  mineOnly,
  todayBoard,
  type TaskOwners,
  type TodayBoard,
} from '@/features/today/services/today-board';
import { withoutExamples } from '@/features/welcome/services/example-exclusion';
import { getProfile } from '@/lib/auth/get-profile';
import { parisMidnightOf } from '@/lib/paris-time';
import { createClient } from '@/lib/supabase/server';

// Mission 145 (partie B) — « Aujourd'hui » : une seule lecture pour la page et pour la pastille du
// menu (elles comptent pareil). Les tâches du Suivi (M130 A à M139), les alertes pour rentrer un
// mandat (un vendeur à relancer, un bien en prospection que veulent des acquéreurs prêts), « Fait
// aujourd'hui ». Une lecture en échec le dit : jamais « rien à faire » (M98).

export type TodayScope = 'mine' | 'agency';

export type Today = {
  scope: TodayScope;
  manager: boolean;
  board: TodayBoard;
  // Sans tâche due : la prochaine tâche à venir (dans le même périmètre).
  next: SuiviTask | null;
  done: DoneLine[] | null;
  // Les acquéreurs prêts (le repère de la page, M132), dans le périmètre.
  readyBuyers: number | null;
  // Ce que la ligne d'une tâche sait du dossier (le motif de relance, le dernier contact…).
  context: Map<string, TodayTaskContext>;
  // Les lectures en échec, dites dans la page (M98).
  failed: string[];
};

export type TodayTaskContext = {
  motiveLabel: string | null;
  lastContactDays: number | null;
  signedOn: string | null;
  propertyLabel: string | null;
};

export const getToday = cache(async (scopeAsked: TodayScope = 'mine'): Promise<Today | null> => {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return null;
  const manager = isManagerRole(profile.role);
  const scope: TodayScope = manager && scopeAsked === 'agency' ? 'agency' : 'mine';
  const now = new Date();
  const today = parisDay(now);
  const since = parisMidnightOf(today).toISOString();
  const supabase = await createClient();
  const agencyId = profile.agency_id;

  const [allDossiers, visitRead, agency, dismissals] = await Promise.all([
    getSuiviDossiers(),
    readVisitLines(),
    loadAgencyBuyers(agencyId),
    readDismissals(supabase, agencyId),
  ]);
  const dossiers = withoutExamples(allDossiers);
  const projectIds = dossiers.map((dossier) => dossier.project.id);
  const followUpIds = dossiers
    .filter((dossier) => dossier.conclusion?.outcome === 'follow_up')
    .map((dossier) => dossier.project.id);

  const [
    prospecting,
    buyerProspecting,
    contactsRes,
    pointsRes,
    keptRes,
    loop,
    buyerRead,
    loopTasks,
    watchRead,
    offerRead,
    profilesRes,
    eventsRes,
    followUpsRes,
    proposalsRes,
  ] = await Promise.all([
    getAgencyProspecting(dossiers),
    getBuyerProspecting(supabase, agencyId).catch(() => null),
    projectIds.length > 0
      ? supabase
          .from('follow_up_contacts')
          .select('project_id, contacted_at, next_follow_up_on, author_id')
          .eq('agency_id', agencyId)
          .in('project_id', projectIds)
      : { data: [], error: null },
    projectIds.length > 0
      ? supabase
          .from('project_market_updates')
          .select('project_id, made_at, made_by')
          .eq('agency_id', agencyId)
          .in('project_id', projectIds)
      : { data: [], error: null },
    followUpIds.length > 0
      ? supabase
          .from('project_meeting_conclusions')
          .select('project_id, early_follow_up_kept_at, early_follow_up_kept_ready')
          .eq('agency_id', agencyId)
          .in('project_id', followUpIds)
      : { data: [], error: null },
    loadLoopProperties(agencyId, followUpIds),
    getBuyerRecontactTasks(profile, now),
    getLoopTasks(agencyId, now, agency.failed ? undefined : agency),
    getWatchTasks(agencyId, now),
    getOfferTasks(agencyId, now),
    supabase.from('profiles').select('id, first_name').eq('agency_id', agencyId),
    supabase
      .from('buyer_events')
      .select('buyer_id, kind, occurred_at, created_by')
      .eq('agency_id', agencyId)
      .in('kind', ['relaunch', 'weekly_report', 'meeting_proposed'])
      .gte('occurred_at', since),
    supabase
      .from('buyer_offer_follow_ups')
      .select('done_at, done_by, buyer_documents!inner(buyer_id)')
      .eq('agency_id', agencyId)
      .gte('done_at', since),
    supabase
      .from('buyer_proposals')
      .select('buyer_id, label, sent_at, sent_by')
      .eq('agency_id', agencyId)
      .gte('sent_at', since),
  ]);

  const failed: string[] = [];
  if (visitRead.failed) failed.push('Les visites n’ont pas pu être lues : rechargez la page.');
  if (contactsRes.error) failed.push('Les relances n’ont pas pu être lues : rechargez la page.');
  if (pointsRes.error) failed.push('Les Points marché n’ont pas pu être lus : rechargez la page.');
  if (buyerRead.failed || loopTasks.failed || watchRead.failed || agency.failed) {
    failed.push('Les tâches des acquéreurs n’ont pas pu être lues : rechargez la page.');
  }
  if (offerRead.failed) failed.push('Les offres n’ont pas pu être lues : rechargez la page.');
  if (keptRes.error || loop.failed || dismissals == null || buyerProspecting == null) {
    failed.push(
      'Les acquéreurs prêts des biens sans mandat n’ont pas pu être lus : rechargez la page.',
    );
  }

  // Les relances par dossier, et le dernier point marché.
  type ContactRow = {
    project_id: string;
    contacted_at: string;
    next_follow_up_on: string | null;
    author_id: string | null;
  };
  const contactRows = (contactsRes.data ?? []) as ContactRow[];
  const contacts = new Map<string, { contactedAt: string; nextFollowUpOn: string | null }[]>();
  for (const row of contactRows) {
    contacts.set(row.project_id, [
      ...(contacts.get(row.project_id) ?? []),
      { contactedAt: row.contacted_at, nextFollowUpOn: row.next_follow_up_on },
    ]);
  }
  type PointRow = { project_id: string; made_at: string; made_by: string | null };
  const pointRows = (pointsRes.data ?? []) as PointRow[];
  const lastPoints = new Map<string, string>();
  for (const row of pointRows) {
    const known = lastPoints.get(row.project_id);
    if (!known || row.made_at > known) lastPoints.set(row.project_id, row.made_at);
  }

  // Les biens en prospection que veulent des acquéreurs prêts : concurrents et biens démarchés.
  const { cards: alertCards, alerts: cardAlerts } = prospectingAlerts(
    prospecting.cards,
    buyerProspecting?.cards ?? [],
    agency,
    dismissals,
    now,
  );
  const alerted = new Set(
    [...cardAlerts.entries()]
      .filter(([card, alert]) => card.kind === 'competitor' && alert.mention === 'owner')
      .map(([card]) => card.row),
  );

  const inputs = suiviTaskInputs({
    dossiers,
    contacts,
    lastPoints,
    cards: prospecting.cards,
    visits: visitRead.lines,
    pointsUnknown: pointsRes.error != null,
    alerted,
  });

  // Les vendeurs à relancer que veulent des acquéreurs prêts.
  const keptOf = new Map(
    (
      (keptRes.data ?? []) as {
        project_id: string;
        early_follow_up_kept_at: string | null;
        early_follow_up_kept_ready: number | null;
      }[]
    ).map((row) => [row.project_id, row]),
  );
  const followUpAlerts = new Map<string, FollowUpAlert>();
  if (!agency.failed && !loop.failed && dismissals != null && !keptRes.error) {
    for (const dossier of dossiers) {
      if (dossier.conclusion?.outcome !== 'follow_up') continue;
      const id = dossier.project.id;
      const ready = projectReadyBuyers(
        id,
        agency.buyers,
        agency.progress,
        loop.properties.get(id),
        dismissals,
        now,
      );
      const own = contacts.get(id) ?? [];
      const due = followUpDueOn(
        dossier.conclusion.concludedAt ?? null,
        own,
        dossier.conclusion.nextFollowUpOn ?? null,
      );
      if (!due) continue;
      const kept = keptOf.get(id);
      followUpAlerts.set(
        id,
        followUpAlert(
          {
            dueOn: due.day,
            readyBuyers: ready,
            keptAt: kept?.early_follow_up_kept_at ?? null,
            keptReady: kept?.early_follow_up_kept_ready ?? null,
            lastContactAt: sortContacts(own)[0]?.contactedAt ?? null,
          },
          today,
        ),
      );
    }
  }

  const all = sortTasks([
    ...inputs.flatMap(dossierTasks),
    ...buyerRead.tasks,
    ...loopTasks.tasks,
    ...watchRead.tasks,
    ...offerRead.tasks,
  ]);
  const dues = all.filter((task) => isTaskDue(task, today));
  const upcoming = all.filter((task) => !isTaskDue(task, today));
  // Mission 146 (partie B, B5) — l'argument d'une relance dit le type du bien.
  const propertyOf = new Map(dossiers.map((d) => [d.project.id, d.property]));
  const withAlerts = [
    ...withFollowUpAlerts(dues, upcoming, followUpAlerts, today).map((task) =>
      task.kind === 'follow_up' && task.readyBuyers
        ? {
            ...task,
            property: {
              propertyType: propertyOf.get(task.projectId)?.propertyType ?? null,
              city: propertyOf.get(task.projectId)?.city ?? null,
            },
          }
        : task,
    ),
    ...prospectBuyersTasks([...cardAlerts.keys()], cardAlerts, today),
  ];

  // Le périmètre : « Mes tâches », ou « Toute l'agence » pour un manager.
  const owners: TaskOwners = {
    projectAdvisor: new Map(allDossiers.map((d) => [d.project.id, d.project.advisor_id])),
    buyerAdvisor: new Map(agency.buyers.map((buyer) => [buyer.id, buyer.advisorId])),
  };
  const scoped = (tasks: SuiviTask[]) =>
    scope === 'agency' ? tasks : mineOnly(tasks, profile.id, owners);
  const shown = scoped(withAlerts);
  const board = todayBoard(shown, today);
  const next = shown.length > 0 ? null : (scoped(upcoming)[0] ?? null);

  // Le repère de la page : les acquéreurs prêts à visiter, dans le périmètre.
  const readyBuyers = agency.failed
    ? null
    : agency.buyers.filter(
        (buyer) =>
          (scope === 'agency' || buyer.advisorId === profile.id) &&
          buyerReadiness(buyer, agency.progress.get(buyer.id) ?? NO_PROGRESS, now).state ===
            'ready',
      ).length;

  // « Fait aujourd'hui ».
  const sellerOf = new Map(allDossiers.map((d) => [d.project.id, d.project.seller_name]));
  const buyerOf = new Map(agency.buyers.map((buyer) => [buyer.id, buyer.name]));
  const projectOwners = (id: string) => {
    const advisor = owners.projectAdvisor.get(id);
    return advisor ? [advisor] : [];
  };
  const buyerOwners = (id: string) => {
    const advisor = owners.buyerAdvisor.get(id);
    return advisor ? [advisor] : [];
  };
  const buyerTitle = (id: string) => buyerInSentence(buyerOf.get(id) ?? null);
  const facts: DoneFact[] = [
    ...contactRows
      .filter((row) => row.contacted_at >= since)
      .map((row) => ({
        at: row.contacted_at,
        title: `Relancer ${sellerOf.get(row.project_id) ?? 'le vendeur'}`,
        authorId: row.author_id,
        ownerIds: projectOwners(row.project_id),
      })),
    ...pointRows
      .filter((row) => row.made_at >= since)
      .map((row) => ({
        at: row.made_at,
        title: `Point marché de ${sellerOf.get(row.project_id) ?? 'ce vendeur'}`,
        authorId: row.made_by,
        ownerIds: projectOwners(row.project_id),
      })),
    ...(
      (eventsRes.data ?? []) as {
        buyer_id: string;
        kind: string;
        occurred_at: string;
        created_by: string | null;
      }[]
    ).map((row) => ({
      at: row.occurred_at,
      title:
        row.kind === 'relaunch'
          ? `Relancer ${buyerTitle(row.buyer_id)}`
          : row.kind === 'weekly_report'
            ? `Point de la semaine à ${buyerTitle(row.buyer_id)}`
            : `Point proposé à ${buyerTitle(row.buyer_id)}`,
      authorId: row.created_by,
      ownerIds: buyerOwners(row.buyer_id),
    })),
    ...(
      (followUpsRes.data ?? []) as unknown as {
        done_at: string;
        done_by: string | null;
        buyer_documents: { buyer_id: string | null } | null;
      }[]
    ).map((row) => {
      const buyerId = row.buyer_documents?.buyer_id ?? null;
      return {
        at: row.done_at,
        title: `Suites de l’offre de ${buyerId ? buyerTitle(buyerId) : 'l’acquéreur'}`,
        authorId: row.done_by,
        ownerIds: buyerId ? buyerOwners(buyerId) : [],
      };
    }),
    ...(
      (proposalsRes.data ?? []) as {
        buyer_id: string;
        label: string;
        sent_at: string;
        sent_by: string | null;
      }[]
    ).map((row) => ({
      at: row.sent_at,
      title: `Bien proposé à ${buyerTitle(row.buyer_id)} : ${row.label}`,
      authorId: row.sent_by,
      ownerIds: buyerOwners(row.buyer_id),
    })),
    ...alertCards
      .filter((card) => card.row.handedAt != null && card.row.handedAt >= since)
      .map((card) => ({
        at: card.row.handedAt as string,
        title: `Courrier remis : ${card.label}`,
        authorId: null,
        ownerIds:
          card.kind === 'competitor'
            ? card.projectIds.flatMap(projectOwners)
            : card.originBuyerIds.flatMap(buyerOwners),
      })),
    ...visitRead.lines
      .filter((line) => line.visitedAt != null && line.visitedAt >= since)
      .map((line) => ({
        at: line.visitedAt as string,
        title: `Visite faite : ${buyerInSentence(line.buyerName)}`,
        authorId: null,
        ownerIds: buyerOwners(line.buyerId),
      })),
  ];
  // Une lecture en échec n'affiche pas « Fait aujourd'hui » amputé (M98).
  const doneFailed = Boolean(
    profilesRes.error ||
    eventsRes.error ||
    followUpsRes.error ||
    proposalsRes.error ||
    contactsRes.error ||
    pointsRes.error ||
    visitRead.failed ||
    buyerProspecting == null,
  );
  const firstNames = new Map(
    ((profilesRes.data ?? []) as { id: string; first_name: string | null }[]).map((row) => [
      row.id,
      row.first_name?.trim() || '',
    ]),
  );
  const done = doneFailed
    ? null
    : doneToday(facts, { scope, advisorId: profile.id, firstNames, now });

  // Ce que la ligne d'une tâche sait de son dossier.
  const context = new Map<string, TodayTaskContext>();
  for (const dossier of allDossiers) {
    const id = dossier.project.id;
    const conclusion = dossier.conclusion;
    const signed = conclusion?.signedAt ?? conclusion?.concludedAt ?? null;
    context.set(id, {
      motiveLabel:
        conclusion?.outcome === 'follow_up'
          ? followUpMotiveLabel(
              conclusion.followUpMotive ?? null,
              conclusion.followUpMotiveDetail ?? null,
            )
          : null,
      lastContactDays: conclusion
        ? daysSinceLastContact(conclusion.concludedAt ?? null, contacts.get(id) ?? [], now)
        : null,
      signedOn: signed ? parisDay(new Date(signed)) : null,
      propertyLabel: propertyLabel(dossier.property),
    });
  }

  return { scope, manager, board, next, done, readyBuyers, context, failed };
});
