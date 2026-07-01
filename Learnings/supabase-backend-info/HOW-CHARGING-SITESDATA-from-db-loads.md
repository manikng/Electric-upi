we use some state and api 
/api/charging-sites

```
 // Fetch public charging sites with search/filter based on user's submittedQuery
  useEffect(() => {
    let active = true;

    async function fetchChargingSites() {
      setChargingSitesLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("limit", "20");
        if (submittedQuery.trim()) {
          params.append("q", submittedQuery.trim());
        }
        if (userCoords) {
          params.append("lat", userCoords.lat.toString());
          params.append("lng", userCoords.lng.toString());
          params.append("radius", "200");
        }
        const url = `/api/charging-sites?${params.toString()}`;
        const res = await fetch(url);
        if (res.ok && active) {
          const payload = await res.json();
          setChargingSites(payload?.data || []);
        } else if (active) {
          // Backend may be slow or unavailable — don't block the whole page
          setChargingSites([]);
        }
      } catch (err) {
        console.error("Failed to fetch charging sites:", err);
        if (active) setChargingSites([]);
      } finally {
        if (active) setChargingSitesLoading(false);
      }
    }
   
    fetchChargingSites();
    return () => {
      active = false;
    };
  }, [submittedQuery, userCoords]);

```
if we want to fetch both host and public data of ev chargers then 
GET /api/map-stations
```
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chargers, chargingSites } from "@/lib/schema";
import type { ChargerResult, ChargingSiteResult } from "@/lib/types";

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
export async function GET() {
  try {
    const chargerRows = await db.select().from(chargers).limit(20);// before it was 100
    const siteRows = await db.select().from(chargingSites).limit(30);//before it was 500

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

    const mappedSites: ChargingSiteResult[] = siteRows.map((row) => ({
      id: String(row.id),
      cpoName: String(row.cpoName ?? "Public Charging Site"),
      ownership: String(row.ownership ?? "Unknown"),
      state: String(row.state ?? ""),
      district: String(row.district ?? ""),
      cityVillage: String(row.cityVillage ?? ""),
      location: String(row.location ?? ""),
      latitude: parseNumber(row.latitude) ?? 0,
      longitude: parseNumber(row.longitude) ?? 0,
      source: row.source ? String(row.source) : null,
      connectorProfiles: [],
      connectorSummary: "No connector info",
      totalConnectors: 0,
      distanceKm: null,
    }));

    return NextResponse.json({ chargers: mappedChargers, sites: mappedSites });
  } catch (error) {
    console.error("GET /api/map-stations error:", error);
    return NextResponse.json({ error: "Failed to fetch map stations" }, { status: 500 });
  }
}
```