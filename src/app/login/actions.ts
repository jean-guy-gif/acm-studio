'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { loginErrorCode } from '@/lib/auth/auth-messages';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mission 88 — un CODE dans l'adresse, jamais le message brut (en anglais) de Supabase.
    redirect(`/login?error=${loginErrorCode(error)}`);
  }

  revalidatePath('/', 'layout');
  redirect('/builder');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect('/login');
}
