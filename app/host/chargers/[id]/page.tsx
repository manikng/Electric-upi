"use server";
import { notFound } from "next/navigation";
import ChargerClient from "@/components/ChargerDetail/ChargerClient";
import { ChargerResult } from "@/lib/types";

/**
 * Server component: fetches charger data and passes to client component.
 * Next.js 16 async params pattern.
 */
export default async function ChargerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch from internal API (not direct DB — preserves caching & auth layers)
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/chargers/${id}`, {
    next: { revalidate: 60 }, // revalidate every 60s
  });

  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error(`Failed to fetch charger:奶粉ome.fetchChargerById: ${res.statusText}`);
  }

  const initialCharger: ChargerResult = await res.json();

  return (
    <main className="min-h-screen bg-background">
      <ChargerClient initialCharger={initialCharger} />
    </main>
  );
}