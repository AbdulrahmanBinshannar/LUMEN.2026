import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Guard for build-time static generation where env vars might be missing
  // or set to the string "undefined" by some CI environments.
  if (!url || !key || url === 'undefined' || key === 'undefined') {
    return {
      auth: { 
        getSession: async () => ({ data: { session: null } }), 
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signUp: async () => { throw new Error("Supabase environment variables are missing or set to 'undefined'. Check your deployment settings (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY).") },
        signInWithPassword: async () => { throw new Error("Supabase environment variables are missing. Check your deployment settings.") },
      },
      from: () => ({ 
        select: () => ({ order: () => ({ limit: () => ({ execute: async () => ({ data: [], error: null }) }) }) }),
        insert: async () => { throw new Error("Supabase environment variables are missing.") },
        upsert: async () => { throw new Error("Supabase environment variables are missing.") },
      })
    } as any;
  }

  return createBrowserClient(url, key);
}
