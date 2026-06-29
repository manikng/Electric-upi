import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chargers, chargingSites, siteConnectorProfiles } from "@/lib/schema";
import type { ChargerResult, ChargingSiteResult } from "@/lib/types";

import { inArray } from "drizzle-orm";

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStringArray(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // Fall back to an empty array when the stored value is not valid JSON.
    }
  }

  return [];
}

// Return a lightweight map snapshot of peer-to-peer chargers and public charging sites.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chargerLimit =
      Number(searchParams.get("chargerLimit")) || 20;

    const siteLimit =
      Number(searchParams.get("siteLimit")) || 30;

    const chargerRows = await db.select().from(chargers).limit(chargerLimit);
    const siteRows = await db.select().from(chargingSites).limit(siteLimit);
    const siteIds = siteRows.map(site => site.id);

const connectorRows =
  siteIds.length === 0
    ? []
    : await db
        .select()
        .from(siteConnectorProfiles)
        .where(
          inArray(siteConnectorProfiles.siteId, siteIds)
        );
    // const siteIds = siteRows.map(site => site.id);

    // const connectorRows = await db
    //   .select()
    //   .from(siteConnectorProfiles)
    //   .where(inArray(siteConnectorProfiles.siteId, siteIds));
    // const connectorRows = await db
    //   .select()
    //   .from(siteConnectorProfiles);

    const connectorMap = new Map<
      string,
      {
        id: string;
        connectorType: string | null;
        chargerRatingKw: number | null;
        connectorRatingKw: number | null;
        connectorCount: number;
      }[]
    >();

    for (const row of connectorRows) {
      const siteId = String(row.siteId);

      if (!connectorMap.has(siteId)) {
        connectorMap.set(siteId, []);
      }

      connectorMap.get(siteId)!.push({
        id: String(row.id),
        connectorType: row.connectorType,
        chargerRatingKw: parseNumber(row.chargerRatingKw),
        connectorRatingKw: parseNumber(row.connectorRatingKw),
        connectorCount: row.connectorCount ?? 0,
      });
    }

    const mappedChargers: ChargerResult[] = chargerRows.map((row) => {
      const pricePerKwh = parseNumber(row.pricePerKwh);
      const powerKw = parseNumber(row.powerKw);
      const latitude = parseNumber(row.latitude);
      const longitude = parseNumber(row.longitude);

      return {
        id: String(row.id),
        title: String(row.title ?? "EV Charger"),
        hostName: "Verified Host",
        isSuperhost: false,
        rating: 4.8,
        reviewsCount: 0,
        address: String(row.address ?? ""),
        city: String(row.city ?? ""),
        area: row.area ? String(row.area) : null,
        pincode: row.pincode ? String(row.pincode) : null,
        state: row.state ? String(row.state) : null,
        pricePerKwh: pricePerKwh ?? 0,
        chargerType: row.chargerType ? String(row.chargerType) : null,
        powerKw,
        plugType: row.plugType ? String(row.plugType) : null,
        availableFrom: row.availableFrom ? String(row.availableFrom) : null,
        availableTo: row.availableTo ? String(row.availableTo) : null,
        amenities: parseStringArray(row.amenities),
        vehicleSegments: parseStringArray(row.vehicleSegments),
        imageUrl: row.imageUrl ? String(row.imageUrl) : null,
        description: row.description ? String(row.description) : null,
        latitude,
        longitude,
        distanceKm: null,
        tags: [
          row.plugType ? String(row.plugType) : "EV",
          row.chargerType ? String(row.chargerType) : "Charger",
        ],
        type: "peer-to-peer",
        category: String(row.site_type ?? "home"),
      };
    });

    const mappedSites: ChargingSiteResult[] = siteRows.map((row) => {
      const profiles =
        connectorMap.get(String(row.id)) ?? [];

      const totalConnectors =
        profiles.reduce(
          (sum, profile) =>
            sum + profile.connectorCount,
          0
        );

      const connectorSummary =
        profiles.length === 0
          ? "No connector info"
          : profiles
            .map((p) =>
              `${p.connectorType} (${p.connectorCount})`
            )
            .join(", ");

      return {
        id: String(row.id),

        cpoName: String(
          row.cpoName ?? "Public Charging Site"
        ),

        ownership: String(
          row.ownership ?? "Unknown"
        ),

        state: String(row.state ?? ""),

        district: String(row.district ?? ""),

        cityVillage: String(
          row.cityVillage ?? ""
        ),

        location: String(row.location ?? ""),

        latitude:
          parseNumber(row.latitude) ?? 0,

        longitude:
          parseNumber(row.longitude) ?? 0,

        source: row.source
          ? String(row.source)
          : null,

        connectorProfiles: profiles,

        connectorSummary,

        totalConnectors,

        distanceKm: null,
      };
    });

    return NextResponse.json({ chargers: mappedChargers, sites: mappedSites });
  } catch (error) {
    console.error("GET /api/map-stations error:", error);
    return NextResponse.json({ error: "Failed to fetch map stations" }, { status: 500 });
  }
}