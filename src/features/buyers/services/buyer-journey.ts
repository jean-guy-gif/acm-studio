import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import type { BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';

// Mission 130 B — « Une seule prochaine étape » côté acquéreur (maquette M130-fiche-acquereur.png,
// validée par Jean-Guy) : son parcours en quatre étapes — Biens idéaux → Présenter → Sa réponse →
// Visites —, UNE prochaine étape avec un bouton plein, et ce qui s'est passé, daté, lu dans les
// tables existantes. Pur.

export type JourneyKey = 'ideal' | 'present' | 'answer' | 'visits';
export type JourneyStatus = 'done' | 'current' | 'later';

export type JourneyStep = {
  key: JourneyKey;
  number: 1 | 2 | 3 | 4;
  title: string;
  state: string;
  status: JourneyStatus;
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count > 1 ? many : one}`;

const presented = (facts: BuyerProgressFacts) => facts.presentedAt != null;
const answered = (facts: BuyerProgressFacts) => presented(facts) || facts.answeredOnLink;

export function buyerJourney(facts: BuyerProgressFacts): JourneyStep[] {
  const hasSelection = facts.selectionCount > 0;
  const done = facts.visitsDone ?? 0;
  const raw: Omit<JourneyStep, 'status'>[] = [
    {
      key: 'ideal',
      number: 1,
      title: 'Biens idéaux',
      state: hasSelection
        ? plural(facts.selectionCount, 'bien sélectionné', 'biens sélectionnés')
        : 'à faire',
    },
    {
      key: 'present',
      number: 2,
      title: 'Présenter',
      state: presented(facts)
        ? `présentée le ${buyerDateLabel(facts.presentedAt!)}`
        : facts.linkCreated
          ? 'lien envoyé'
          : 'à faire',
    },
    {
      key: 'answer',
      number: 3,
      title: 'Sa réponse',
      state: facts.answeredOnLink
        ? 'reçue par le lien'
        : presented(facts)
          ? 'donnée en rendez-vous'
          : facts.linkCreated
            ? 'attendue'
            : 'lien à envoyer',
    },
    {
      key: 'visits',
      number: 4,
      title: 'Visites',
      state:
        facts.visitsToOrganize > 0
          ? `${plural(facts.visitsToOrganize, 'demandée', 'demandées')}, à organiser`
          : done > 0
            ? plural(done, 'faite', 'faites')
            : '0 demandée',
    },
  ];
  const isDone: Record<JourneyKey, boolean> = {
    ideal: hasSelection,
    present: presented(facts) || facts.linkCreated,
    answer: answered(facts),
    visits: done > 0 && facts.visitsToOrganize === 0,
  };
  const current = raw.find((step) => !isDone[step.key])?.key ?? null;
  return raw.map((step) => ({
    ...step,
    status: isDone[step.key] ? 'done' : step.key === current ? 'current' : 'later',
  }));
}

export type BuyerAction = { label: string; href: string };

export type BuyerNextAction = {
  title: string;
  phrase: string;
  primary: BuyerAction;
  secondary: BuyerAction | null;
  // Le jour où l'étape a commencé (ISO) : la liste le dit.
  since: string | null;
};

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

// La prochaine étape d'un acquéreur, selon où il en est : trouver les biens idéaux → présenter
// (ou envoyer le lien) → relancer sa réponse → organiser la visite → lui proposer d'autres biens.
export function buyerNextAction(
  buyer: { id: string; createdAt: string; phone: string | null },
  facts: BuyerProgressFacts,
): BuyerNextAction {
  const id = buyer.id;
  const ideal = { label: 'Trouver les biens idéaux', href: `/acquereurs/${id}/biens-ideaux` };
  const present = { label: 'Présenter maintenant', href: `/presentation/${id}` };
  const link = { label: 'Envoyer le lien à la place', href: `/acquereurs/${id}/dossier` };
  if (facts.selectionCount === 0) {
    return {
      title: 'Trouver ses biens idéaux',
      phrase: 'Ce que l’agence a déjà, puis le marché ; vous retenez trois biens au plus.',
      primary: ideal,
      secondary: null,
      since: buyer.createdAt,
    };
  }
  if (!answered(facts)) {
    if (!facts.linkCreated) {
      return {
        title: 'Lui présenter sa sélection',
        phrase:
          'En rendez-vous ou en visio : il répond bien par bien. Ou envoyez-lui le lien, il répond depuis son téléphone.',
        primary: present,
        secondary: link,
        since: facts.selectionAt ?? null,
      };
    }
    const linkDay = facts.linkAt ? ` depuis le ${buyerDateLabel(facts.linkAt)}` : '';
    return {
      title: 'Relancer sa réponse',
      phrase: `Le lien est envoyé${linkDay} ; il n’a pas encore répondu.`,
      primary: buyer.phone
        ? { label: 'L’appeler', href: telHref(buyer.phone) }
        : { label: 'Revoir le lien', href: `/acquereurs/${id}/dossier` },
      secondary: { label: 'Présenter maintenant', href: `/presentation/${id}` },
      since: facts.linkAt ?? null,
    };
  }
  if (facts.visitsToOrganize > 0) {
    return {
      title: 'Organiser la visite',
      phrase: `${plural(facts.visitsToOrganize, 'visite demandée', 'visites demandées')} : contactez le propriétaire ou le confrère, puis notez le retour de visite.`,
      primary: { label: 'Organiser les visites', href: '/visites' },
      secondary: null,
      since: facts.answeredAt ?? facts.presentedAt ?? null,
    };
  }
  return {
    title: 'Lui proposer d’autres biens',
    phrase:
      (facts.visitsDone ?? 0) > 0
        ? 'Ses visites sont faites : une nouvelle sélection relance la recherche.'
        : 'Il n’a demandé aucune visite : une nouvelle sélection relance la recherche.',
    primary: { label: 'Trouver d’autres biens', href: `/acquereurs/${id}/biens-ideaux` },
    secondary: null,
    since: facts.answeredAt ?? facts.presentedAt ?? null,
  };
}

// « Prix et écart au budget » d'un bien de sa sélection (M116 acquéreur, M122 B : vert dans le
// budget, orange au-dessus, jamais rouge) ; sans prix montré, rien.
export function budgetGap(
  price: number | null,
  budgetMax: number | null,
): { over: number; tone: 'green' | 'orange' } | null {
  if (price == null || budgetMax == null) return null;
  if (price <= budgetMax) return { over: 0, tone: 'green' };
  return { over: price - budgetMax, tone: 'orange' };
}

export type TimelineEntry = { at: string; text: string };

export type TimelineInput = {
  createdAt: string;
  selections: { createdAt: string; agencyCount: number; marketCount: number }[];
  presentedAt: string | null;
  linkAt: string | null;
  answeredAt: string | null;
  visits: {
    requestedAt: string;
    visitedAt: string | null;
    label: string;
    during: string;
    outcomeLabel: string | null;
  }[];
};

// « Ce qui s'est passé » : un fil daté, du plus récent au plus ancien, rien d'autre que ce qui est
// en base.
export function buyerTimeline(input: TimelineInput): TimelineEntry[] {
  const entries: TimelineEntry[] = [{ at: input.createdAt, text: 'Fiche créée' }];
  for (const selection of input.selections) {
    const total = selection.agencyCount + selection.marketCount;
    const parts = [
      selection.agencyCount > 0 ? `${selection.agencyCount} de l’agence` : null,
      selection.marketCount > 0 ? `${selection.marketCount} du marché` : null,
    ].filter(Boolean);
    entries.push({
      at: selection.createdAt,
      text: `${plural(total, 'bien sélectionné', 'biens sélectionnés')}${parts.length > 0 ? ` : ${parts.join(', ')}` : ''}`,
    });
  }
  if (input.presentedAt) entries.push({ at: input.presentedAt, text: 'Sélection présentée' });
  if (input.linkAt) entries.push({ at: input.linkAt, text: 'Lien de sa sélection envoyé' });
  if (input.answeredAt)
    entries.push({ at: input.answeredAt, text: 'Sa réponse reçue par le lien' });
  for (const visit of input.visits) {
    entries.push({
      at: visit.requestedAt,
      text: `Visite demandée : ${visit.label}${visit.during === 'dossier' ? ' (depuis le lien)' : ''}`,
    });
    if (visit.visitedAt) {
      entries.push({
        at: visit.visitedAt,
        text: `Visite faite : ${visit.label}${visit.outcomeLabel ? ` · ${visit.outcomeLabel}` : ''}`,
      });
    }
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

// « dernier échange il y a 2 j » : le plus récent fait de la fiche après sa création.
export function lastExchangeLabel(dates: (string | null | undefined)[], now: Date): string | null {
  const known = dates.filter((value): value is string => Boolean(value)).sort();
  const last = known.at(-1);
  if (!last) return null;
  const days = Math.max(0, Math.floor((now.getTime() - new Date(last).getTime()) / 86_400_000));
  return days === 0 ? 'dernier échange aujourd’hui' : `dernier échange il y a ${days} j`;
}
