import type { Database } from '@/lib/supabase/database.types';

export type Comparable = Database['public']['Tables']['comparables']['Row'];
export type ComparableInsert = Database['public']['Tables']['comparables']['Insert'];
