import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import LoginClient from "./LoginClient";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LoginClient user={user} />;
}
