import 'server-only';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 60 — l'équipe : membres (actifs et retirés) + invitations en attente. Cadré par la
// RLS agence existante (aucune donnée d'une autre agence). Un membre retiré reste listé — son
// travail est à son nom — mais marqué comme tel.
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  removedAt: string | null;
  isSelf: boolean;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  sentAt: string | null; // null = non envoyée (échec de livraison)
  createdAt: string;
};

export type Team = { members: TeamMember[]; invitations: PendingInvitation[] };

export async function getTeam(): Promise<Team | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }
  const supabase = await createClient();

  const [{ data: profiles }, { data: invitations }] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, email, role, removed_at'),
    supabase
      .from('agency_invitations')
      .select('id, email, role, sent_at, created_at')
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  const members: TeamMember[] = (profiles ?? [])
    .map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim() || 'Sans nom',
      email: p.email,
      role: p.role,
      removedAt: p.removed_at,
      isSelf: p.id === profile.id,
    }))
    // Actifs d'abord, puis par nom.
    .sort((a, b) => {
      if ((a.removedAt == null) !== (b.removedAt == null)) {
        return a.removedAt == null ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'fr');
    });

  const pending: PendingInvitation[] = (invitations ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    sentAt: i.sent_at,
    createdAt: i.created_at,
  }));

  return { members, invitations: pending };
}
