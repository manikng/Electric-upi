import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import ListChargerClient from "./ListChargerClient";

export const metadata = {
  title: "List Your Charger — Electric UPI",
  description:
    "Earn ₹2,000–₹8,000/month by sharing your EV charger with your community. List in 5 minutes.",
};

export default async function ListChargerPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware handles the redirect, but double-check at page level
  if (!user) {
    redirect("/login?next=/list-charger");
  }

  return <ListChargerClient user={user} />;
}
