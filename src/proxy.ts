import { type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16 renamed the "middleware" file convention to "proxy".
// The Supabase @supabase/ssr session logic lives in updateSession().
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
