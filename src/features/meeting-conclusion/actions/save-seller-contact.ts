'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getProject } from '@/features/projects/queries/get-project';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SaveSellerContactResult =
  { ok: true; phone: string | null; email: string | null } | { ok: false; error: string };

// Un champ vide = rien à écrire pour lui ; un champ rempli est relu ici.
const blank = (value: FormDataEntryValue | null): string | null => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
};
// Un numéro : chiffres, espaces, points, tirets, « + » en tête ; de 6 à 15 chiffres.
const phoneSchema = z
  .string()
  .max(30)
  .regex(/^\+?[\d\s.-]+$/)
  .refine((value) => {
    const digits = value.replace(/\D/g, '').length;
    return digits >= 6 && digits <= 15;
  });
const emailSchema = z.string().max(254).email();

// Mission 130 — dans la relance, sans téléphone ni e-mail : les ajouter sur place, sans quitter le
// Suivi. Seuls les champs vides du dossier s'écrivent ici (un numéro connu ne se remplace pas
// depuis la relance) ; le dossier est relu dans l'agence de l'appelant (RLS) et doit être conclu.
export async function saveSellerContact(
  projectId: string,
  formData: FormData,
): Promise<SaveSellerContactResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const phone = blank(formData.get('seller_phone'));
  const email = blank(formData.get('seller_email'));
  if (!phone && !email) {
    return { ok: false, error: 'Indiquez un téléphone ou un e-mail.' };
  }
  if (phone && !phoneSchema.safeParse(phone).success) {
    return { ok: false, error: 'Téléphone non reconnu\u00a0: des chiffres, 6 au moins.' };
  }
  if (email && !emailSchema.safeParse(email).success) {
    return { ok: false, error: 'E-mail non reconnu\u00a0: vérifiez l’adresse.' };
  }
  const project = await getProject(projectId);
  if (!project || project.status !== 'meeting_completed') {
    return { ok: false, error: 'Dossier introuvable dans votre Suivi.' };
  }
  const update: { seller_phone?: string; seller_email?: string } = {};
  if (phone && !project.seller_phone?.trim()) update.seller_phone = phone;
  if (email && !project.seller_email?.trim()) update.seller_email = email;
  if (Object.keys(update).length === 0) {
    return { ok: false, error: 'Le dossier a déjà ces coordonnées.' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id);
  if (error) {
    return { ok: false, error: 'Les coordonnées n’ont pas pu être enregistrées. Réessayez.' };
  }
  revalidatePath('/suivi');
  revalidatePath('/aujourdhui');
  return {
    ok: true,
    phone: update.seller_phone ?? project.seller_phone ?? null,
    email: update.seller_email ?? project.seller_email ?? null,
  };
}
