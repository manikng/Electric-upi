import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import ChargerClient from "@/components/ChargerDetail/ChargerClient";
import { ChargerResult } from "@/lib/types";
import { db } from "@/lib/db";
import { chargers, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export default async function ChargerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Direct database query using Drizzle ORM (type-safe & crash-proof)
  const [chargerRow] = await db
    .select({
      id: chargers.id,
      title: chargers.title,
      address: chargers.address,
      city: chargers.city,
      area: chargers.area,
      pincode: chargers.pincode,
      state: chargers.state,
      pricePerKwh: chargers.pricePerKwh,
      chargerType: chargers.chargerType,
      powerKw: chargers.powerKw,
      plugType: chargers.plugType,
      availableFrom: chargers.availableFrom,
      availableTo: chargers.availableTo,
      amenities: chargers.amenities,
      vehicleSegments: chargers.vehicleSegments,
      imageUrl: chargers.imageUrl,
      description: chargers.description,
      latitude: chargers.latitude,
      longitude: chargers.longitude,
      status: chargers.status,
      siteType: chargers.site_type,
      hostId: chargers.hostId,
      hostName: users.fullName,
    })
    .from(chargers)
    .leftJoin(users, eq(chargers.hostId, users.id))
    .where(eq(chargers.id, id))
    .limit(1);

  if (!chargerRow) {
    notFound();
  }

  // Map DB fields to ChargerResult (handle decimal strings from Drizzle)
  const initialCharger = {
    id: chargerRow.id,
    title: chargerRow.title,
    hostName: chargerRow.hostName || "Unknown Host",
    isSuperhost: false,
    rating: 0,
    reviewsCount: 0,
    address: chargerRow.address,
    city: chargerRow.city,
    area: chargerRow.area,
    pincode: chargerRow.pincode,
    state: chargerRow.state,
    pricePerKwh: chargerRow.pricePerKwh ? parseFloat(chargerRow.pricePerKwh) : 0,
    chargerType: chargerRow.chargerType,
    powerKw: chargerRow.powerKw ? parseFloat(chargerRow.powerKw) : null,
    plugType: chargerRow.plugType,
    availableFrom: chargerRow.availableFrom,
    availableTo: chargerRow.availableTo,
    amenities: chargerRow.amenities ? JSON.parse(chargerRow.amenities) : [],
    vehicleSegments: chargerRow.vehicleSegments ? JSON.parse(chargerRow.vehicleSegments) : [],
    imageUrl: chargerRow.imageUrl,
    description: chargerRow.description,
    latitude: chargerRow.latitude ? parseFloat(chargerRow.latitude) : null,
    longitude: chargerRow.longitude ? parseFloat(chargerRow.longitude) : null,
    distanceKm: null,
    tags: [],
    type: chargerRow.siteType || "home",
    category: chargerRow.chargerType || "AC Charger",
  } as ChargerResult;

  return (
    <main className="min-h-screen bg-background">
      <ChargerClient initialCharger={initialCharger} />
    </main>
  );
}