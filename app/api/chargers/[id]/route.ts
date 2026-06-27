import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chargers, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ChargerResult } from "@/lib/types";


// ── GET /api/chargers/[id] ──
// Fetch a single charger by ID. Public (no auth required).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Query: join chargers with users to get host info
    const result = await db
      .select({
        // Charger fields
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
        // User (host) fields
        hostName: users.fullName,
        trustScore: users.trustScore,
      })
      .from(chargers)
      .leftJoin(users, eq(chargers.hostId, users.id))
      .where(eq(chargers.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Charger not found" }, { status: 404 });
    }

    const row = result[0];
    const trustScore = Number(row.trustScore) || 100;
    const isSuperhost = trustScore >= 95;

    // Parse JSON fields safely
    let amenitiesParsed: string[] = [];
    try {
      if (row.amenities) amenitiesParsed = JSON.parse(String(row.amenities));
    } catch {
      // ignore, keep empty array
    }

    let vehicleSegmentsParsed: string[] = [];
    try {
      if (row.vehicleSegments) vehicleSegmentsParsed = JSON.parse(String(row.vehicleSegments));
    } catch {
      // ignore
    }

    const pricePerKwh = parseFloat(String(row.pricePerKwh));
    const chargerTypeVal = String(row.chargerType || "AC Charger");
    const plugTypeVal = String(row.plugType || "Type 2");

    const response: ChargerResult = {
      id: String(row.id),
      title: String(row.title),
      hostName: String(row.hostName || "Verified Host"),
      isSuperhost,
      rating: 4.8 + (trustScore % 3) * 0.1,
      reviewsCount: 12 + (trustScore % 10) * 5,
      address: String(row.address),
      city: String(row.city),
      area: row.area ? String(row.area) : null,
      pincode: row.pincode ? String(row.pincode) : null,
      state: row.state ? String(row.state) : null,
      pricePerKwh,
      chargerType: row.chargerType ? String(row.chargerType) : null,
      powerKw: row.powerKw ? parseFloat(String(row.powerKw)) : null,
      plugType: row.plugType ? String(row.plugType) : null,
      availableFrom: row.availableFrom ? String(row.availableFrom) : null,
      availableTo: row.availableTo ? String(row.availableTo) : null,
      amenities: amenitiesParsed,
      vehicleSegments: vehicleSegmentsParsed,
      imageUrl: row.imageUrl ? String(row.imageUrl) : null,
      description: row.description ? String(row.description) : null,
      latitude: row.latitude ? parseFloat(String(row.latitude)) : null,
      longitude: row.longitude ? parseFloat(String(row.longitude)) : null,
      distanceKm: null,
      tags: [
        pricePerKwh < 6 ? "Budget Friendly" : "Premium Slot",
        plugTypeVal,
        chargerTypeVal,
      ],
      type: chargerTypeVal,
      category: "Home Charger",
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("GET /api/chargers/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
