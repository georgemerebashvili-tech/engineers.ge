import 'server-only';
import {createServerClient, type CookieOptions} from '@supabase/ssr';
import {cookies} from 'next/headers';

export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase server env missing: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list: Array<{name: string; value: string; options: CookieOptions}>) {
        try {
          for (const {name, value, options} of list) {
            store.set(name, value, options);
          }
        } catch {}
      }
    }
  });
}
