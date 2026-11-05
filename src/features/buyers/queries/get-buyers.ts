import 'server-only';

import { toBuyer } from '@/features/buyers/services/buyer-row';
import type { Buyer } from '@/features/buyers/types';
import { createClient } from '@/lib/supabase/server';

// Mission 117 — les acquéreurs de l'agence, lus par le navigateur du conseiller (la RLS cloisonne
// et exclut un membre retiré, M105) ; les fiches archivées n'apparaissent nulle part (M93).
export async function getBuyers(): Promise<Buyer[]> {
  return (await readBuyers()).buyers;
}

// Mission 132 — la même lecture, qui dit son échec : une liste illisible n'est jamais « aucun
// acquéreur » quand une tâche ou un compteur en dépend (M98).
export async function readBuyers(): Promise<{ buyers: Buyer[]; failed: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .is('archived_at', null)
    .order('updated_at', { ascending: false });
  return { buyers: (data ?? []).map(toBuyer), failed: error != null };
}

// Une fiche, par son adresse : introuvable si archivée ou d'une autre agence.
export async function getBuyer(buyerId: string): Promise<Buyer | null> {
  if (!/^[0-9a-f-]{36}$/i.test(buyerId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', buyerId)
    .is('archived_at', null)
    .maybeSingle();
  return data ? toBuyer(data) : null;
}
