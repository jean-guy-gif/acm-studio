import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/env';

// Routes that never require authentication. /design-preview is the design-review
// harness: it renders ONLY fictional demo data and self-gates with notFound() in
// production (see src/app/design-preview/page.tsx), so letting the middleware
// pass it through exposes nothing.
const PUBLIC_PATHS = ['/login', '/design-preview'];

// Official Supabase @supabase/ssr session handler for Next.js.
// Restores the session, refreshes the auth tokens, and guards private routes.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getClaims().
  // getClaims() validates the JWT (signature + expiry) and returns its claims;
  // a present claims payload means the request carries a valid session.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  // /design-preview et ses sous-pages (ex. /design-preview/app) : harnais de
  // revue design auto-gardé en production (notFound sans ACM_DESIGN_PREVIEW=1).
  const isPublicPath =
    PUBLIC_PATHS.includes(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith('/design-preview/');

  if (!isAuthenticated && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
