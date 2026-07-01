"use server";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import ChargerClient from "@/components/ChargerDetail/ChargerClient";
import { ChargerResult } from "@/lib/types";

export default async function ChargerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();

  // Initialize Supabase server client directly
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  // Direct database query (fastest & crash-proof)
  const { data: charger, error } = await supabase
    .from("chargers")
    .select(
      "id, title, hostName, isSuperhost, rating, reviewsCount, address, city, area, " +
      "pincode, state, pricePerKwh, chargerType, powerKw, plugType, " +
      "availableFrom, availableTo, amenities, vehicleSegments, imageUrl, " +
      "description, latitude, longitude, distanceKm"
    )
    .eq("id", id)
    .maybeSingle();

  // Handle errors without crashing the page
  if (error) {
    console.error("Database query failed:", error);
    notFound();
    return;
  }

  if (!charger) {
    notFound();
    return;
  }

  // Type assertion for ChargerResult
  const initialCharger = charger as unknown as ChargerResult;

  return (
    <main className="min-h-screen bg-background">
      <ChargerClient initialCharger={initialCharger} />
    </main>
  );
}