import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key || url === 'undefined' || key === 'undefined') {
    // If we're on the client, log a warning
    if (typeof window !== 'undefined') {
      console.warn("Supabase environment variables are missing. Some features may not work.");
    }

    return {
      auth: { 
        getSession: async () => ({ data: { session: null }, error: null }), 
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Supabase environment variables are missing.") }),
        signUp: async () => ({ data: { user: null, session: null }, error: new Error("Supabase environment variables are missing.") }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({ 
        select: () => ({ 
          order: () => ({ 
            limit: () => ({ 
              execute: async () => ({ data: [], error: null }),
              then: (cb: any) => cb({ data: [], error: null })
            }) 
          }) 
        }),
        insert: async () => ({ data: null, error: new Error("Supabase environment variables are missing.") }),
        upsert: async () => ({ data: null, error: new Error("Supabase environment variables are missing.") }),
      })
    } as any;
  }

  return createBrowserClient(url, key);
}
