import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getEnvironmentVariables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export async function createSupabaseServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getEnvironmentVariables();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // In Server Components the cookies() store is read-only; modifying
      // cookies is only allowed in Route Handlers or Server Actions.
      // To avoid runtime errors when `createSupabaseServerClient()` is used
      // from a Server Component, make `setAll` a safe no-op.
      setAll(_cookiesToSet) {
        // Intentionally empty: cookie writes are handled in route handlers
        // or server actions where `cookies().set` is permitted.
        return;
      }
    }
  });
}
