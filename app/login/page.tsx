import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import LoginClient from "./LoginClient";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email!,
      })
      .onConflictDoNothing();
  }

  return <LoginClient user={user} />;
}
