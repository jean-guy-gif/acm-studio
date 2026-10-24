import 'server-only';

import { toSelection } from '@/features/ideal-properties/services/ideal-selection';
import type { IdealSelection } from '@/features/ideal-properties/types';
import { createClient } from '@/lib/supabase/server';

// Mission 118 — la dernière sélection retenue pour un acquéreur, lue par le navigateur du
// conseiller (la RLS cloisonne) ; une sélection précédente reste en base, c'est la plus récente
// qui vaut.
export async function getIdealSelection(buyerId: string): Promise<IdealSelection | null> {
  const supabase = await createClient();
  const { data: selection } = await supabase
    .from('buyer_selections')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!selection) return null;
  const { data: items } = await supabase
    .from('buyer_selection_items')
    .select('*')
    .eq('selection_id', selection.id)
    .order('position');
  return toSelection(selection, items ?? []);
}
