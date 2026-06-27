import LandingPageClient from "./LandingPageClient";

// NOTE: We intentionally do NOT await Supabase auth here.
// The page streams immediately; auth is resolved client-side via useAuth().
// This avoids blocking the entire landing page on a network round-trip
// to Supabase (which was a major cause of perceived freeze).
export default function Page() {
  return <LandingPageClient />;
}
