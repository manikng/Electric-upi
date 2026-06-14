import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import LandingPageClient from "./LandingPageClient";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LandingPageClient initialUser={user} />;
}
