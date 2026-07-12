import type { Database } from '@/lib/supabase/database.types';

export type SubjectProperty = Database['public']['Tables']['subject_properties']['Row'];
export type SubjectPropertyInsert = Database['public']['Tables']['subject_properties']['Insert'];
