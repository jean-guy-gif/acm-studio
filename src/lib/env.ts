// Centralised, typed access to the public Supabase environment variables.
// Native TypeScript only — no validation library.
//
// The variables are referenced statically (process.env.NEXT_PUBLIC_*) so that
// Next.js can inline them in both the server and the browser bundles.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
} as const;
