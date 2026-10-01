import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// Mission 60 — le lien d'invitation (e-mail) atterrit ici : on vérifie le jeton (verifyOtp),
// ce qui établit la session de l'invité, puis on l'envoie vers `next` (l'écran d'acceptation).
// Un jeton invalide/expiré ne crée aucune session et renvoie vers la connexion, sans drame.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // `next` ne doit JAMAIS sortir de notre origine (sinon open redirect : un lien forgé
  // renverrait l'utilisateur vérifié vers un site tiers). On n'accepte qu'un chemin relatif,
  // et on refuse « // » (URL protocol-relative vers un autre hôte).
  const nextParam = searchParams.get('next') ?? '/';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  return NextResponse.redirect(new URL('/login?error=lien-invalide', request.url));
}
