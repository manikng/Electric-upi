import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chargers, chargingSites, siteConnectorProfiles } from "@/lib/schema";
import { ilike, or, inArray } from "drizzle-orm";
import { getCoordinates, GeocodeResult  } from "@/app/actions/geocode";
import type { InferSelectModel } from "drizzle-orm";
import type { ChargerResult, ChargingSiteResult } from "@/lib/types";


// type GeocodeSuccess = {
//     success: true;
//     latitude: number;
//     longitude: number;
// };

// type GeocodeFailure = {
//     success: false;
//     latitude: null;
//     longitude: null;
// };

// export type GeocodeResult =
//     | GeocodeSuccess
//     | GeocodeFailure;


// ─── Helpers ──────────────────────────────────────────────────────────────
function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(String(value));
    return Number.isFinite(parsed) ? parsed : null;
}

function parseStringArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
        } catch { }
    }
    return [];
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ─── DB Row Types ──────────────────────────────────────────────────────────
type ChargerRow = InferSelectModel<typeof chargers>;
type SiteRow = InferSelectModel<typeof chargingSites>;
type ConnectorRow = InferSelectModel<typeof siteConnectorProfiles>;

// ─── Main API ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q")?.trim() ?? "";
        const latParam = parseNumber(searchParams.get("lat"));
        const lngParam = parseNumber(searchParams.get("lng"));
        const radius = parseNumber(searchParams.get("radius")) ?? 50;
        const chargerLimit = parseNumber(searchParams.get("chargerLimit")) ?? 50;
        const siteLimit = parseNumber(searchParams.get("siteLimit")) ?? 50;

        // Default center (India)
        let centerLat = 20.5937;
        let centerLng = 78.9629;

        // 1) Text search
               // 1.a) Determine search mode
        let chargerRows: ChargerRow[] = [];
        let siteRows: SiteRow[] = [];
        const hasQuery = q.length > 0;
        const hasCoords = latParam !== null && lngParam !== null;

        if (hasQuery) {
            // TEXT SEARCH MODE
            chargerRows = await db
                .select()
                .from(chargers)
                .where(
                    or(
                        ilike(chargers.title, `%${q}%`),
                        ilike(chargers.city, `%${q}%`),
                        ilike(chargers.state, `%${q}%`),
                        ilike(chargers.address, `%${q}%`)
                    )
                )
                .limit(chargerLimit);

            siteRows = await db
                .select()
                .from(chargingSites)
                .where(
                    or(
                        ilike(chargingSites.cityVillage, `%${q}%`),
                        ilike(chargingSites.state, `%${q}%`),
                        ilike(chargingSites.location, `%${q}%`)
                    )
                )
                .limit(siteLimit);
        } else if (hasCoords) {
            // NEARBY MODE — fetch all then filter by radius
            centerLat = latParam!;
            centerLng = lngParam!;

            const allChargers = await db.select().from(chargers).limit(1000);
            const allSites = await db.select().from(chargingSites).limit(1000);

            chargerRows = allChargers.filter((c) => {
                const rlat = parseNumber(c.latitude);
                const rlng = parseNumber(c.longitude);
                if (rlat == null || rlng == null) return false;
                return haversineDistance(centerLat, centerLng, rlat, rlng) <= radius;
            }).slice(0, chargerLimit);

            siteRows = allSites.filter((s) => {
                const rlat = parseNumber(s.latitude);
                const rlng = parseNumber(s.longitude);
                if (rlat == null || rlng == null) return false;
                return haversineDistance(centerLat, centerLng, rlat, rlng) <= radius;
            }).slice(0, siteLimit);

            // Skip geocode + radius fallback below
            const geo = { success: false as const, latitude: null, longitude: null };
        } else {
            // DEFAULT MODE — no query, no coords → return sample data
            chargerRows = await db.select().from(chargers).limit(chargerLimit);
            siteRows = await db.select().from(chargingSites).limit(siteLimit);
        }

        // 2) Geocode the query to get center (only in text search mode)
        let geoCenterSet = false;
        let geo: GeocodeResult ;
        if (hasQuery && !hasCoords) {
            geo = await getCoordinates(q);
            if (geo.success && geo.latitude != null && geo.longitude != null) {
                centerLat = geo.latitude!;
                centerLng = geo.longitude!;
                geoCenterSet = true;
            }
        } else {
            geo = { success: false as const, latitude: undefined, longitude: undefined };
        }
        // 3) If text search returned nothing and we have a geo center, fetch by radius
        if (chargerRows.length === 0 && siteRows.length === 0 && geoCenterSet) {
            const allChargers = await db.select().from(chargers).limit(500);
            const allSites = await db.select().from(chargingSites).limit(500);

            chargerRows = allChargers.filter((c) => {
                const rlat = parseNumber(c.latitude);
                const rlng = parseNumber(c.longitude);
                if (rlat == null || rlng == null) return false;
                return haversineDistance(centerLat, centerLng, rlat, rlng) <= radius;
            });

            siteRows = allSites.filter((s) => {
                const rlat = parseNumber(s.latitude);
                const rlng = parseNumber(s.longitude);
                if (rlat == null || rlng == null) return false;
                return haversineDistance(centerLat, centerLng, rlat, rlng) <= radius;
            });

            chargerRows = chargerRows.slice(0, chargerLimit);
            siteRows = siteRows.slice(0, siteLimit);
        } else {
            // If lat/lng explicitly provided, apply radius filter on already fetched results
            if (latParam !== null && lngParam !== null) {
                centerLat = latParam;
                centerLng = lngParam;
                chargerRows = chargerRows.filter((c) => {
                    const rlat = parseNumber(c.latitude);
                    const rlng = parseNumber(c.longitude);
                    if (rlat == null || rlng == null) return false;
                    return haversineDistance(centerLat, centerLng, rlat, rlng) <= radius;
                });
                siteRows = siteRows.filter((s) => {
                    const rlat = parseNumber(s.latitude);
                    const rlng = parseNumber(s.longitude);
                    if (rlat == null || rlng == null) return false;
                    return haversineDistance(centerLat, centerLng, rlat, rlng) <= radius;
                });
            }
        }

        // 4) Fetch connector profiles for sites
        const siteIds = siteRows.map((s) => s.id);
        let connectorRows: ConnectorRow[] = [];
        if (siteIds.length > 0) {
            connectorRows = await db
                .select()
                .from(siteConnectorProfiles)
                .where(inArray(siteConnectorProfiles.siteId, siteIds));
        }

        const connectorMap = new Map<
            string,
            { id: string; connectorType: string | null; chargerRatingKw: number | null; connectorRatingKw: number | null; connectorCount: number }[]
        >();
        for (const row of connectorRows) {
            const siteId = String(row.siteId);
            if (!connectorMap.has(siteId)) connectorMap.set(siteId, []);
            connectorMap.get(siteId)!.push({
                id: String(row.id),
                connectorType: row.connectorType,
                chargerRatingKw: parseNumber(row.chargerRatingKw),
                connectorRatingKw: parseNumber(row.connectorRatingKw),
                connectorCount: row.connectorCount ?? 0,
            });
        }

        // ─── MAPPING ──────────────────────────────────────────────────────────
        // 5) Map to ChargerResult (latitude/longitude can be null)
        const mappedChargers: ChargerResult[] = chargerRows.map((row) => ({
            id: String(row.id),
            title: String(row.title ?? "EV Charger"),
            // TODO: fetch real host data from DB
            hostName: "Verified Host",
            isSuperhost: false,
            rating: 4.8,
            reviewsCount: 0,
            address: String(row.address ?? ""),
            city: String(row.city ?? ""),
            area: row.area ? String(row.area) : null,
            pincode: row.pincode ? String(row.pincode) : null,
            state: row.state ? String(row.state) : null,
            pricePerKwh: parseNumber(row.pricePerKwh) ?? 0,
            chargerType: row.chargerType ? String(row.chargerType) : null,
            powerKw: parseNumber(row.powerKw),
            plugType: row.plugType ? String(row.plugType) : null,
            availableFrom: row.availableFrom ? String(row.availableFrom) : null,
            availableTo: row.availableTo ? String(row.availableTo) : null,
            amenities: parseStringArray(row.amenities),
            vehicleSegments: parseStringArray(row.vehicleSegments),
            imageUrl: row.imageUrl ? String(row.imageUrl) : null,
            description: row.description ? String(row.description) : null,
            latitude: parseNumber(row.latitude),
            longitude: parseNumber(row.longitude),
            distanceKm: null,
            tags: [row.plugType ? String(row.plugType) : "EV", row.chargerType ? String(row.chargerType) : "Charger"],
            type: "peer-to-peer",
            category: String(row.site_type ?? "home"),
        }));

        // 6) Map to ChargingSiteResult (latitude/longitude must be numbers)
        const mappedSites: ChargingSiteResult[] = siteRows.map((row) => {
            const profiles = connectorMap.get(String(row.id)) ?? [];
            const totalConnectors = profiles.reduce((sum, p) => sum + p.connectorCount, 0);
            const connectorSummary =
                profiles.length === 0
                    ? "No connector info"
                    : profiles.map((p) => `${p.connectorType} (${p.connectorCount})`).join(", ");
            return {
                id: String(row.id),
                cpoName: String(row.cpoName ?? "Public Charging Site"),
                ownership: String(row.ownership ?? "Unknown"),
                state: String(row.state ?? ""),
                district: String(row.district ?? ""),
                cityVillage: String(row.cityVillage ?? ""),
                location: String(row.location ?? ""),
                // Use Number() to safely convert and fallback to 0
                latitude: Number(row.latitude) || 0,
                longitude: Number(row.longitude) || 0,
                source: row.source ? String(row.source) : null,
                connectorProfiles: profiles,
                connectorSummary,
                totalConnectors,
                distanceKm: null,
            };
        });

        return NextResponse.json({
            chargers: mappedChargers,
            sites: mappedSites,
            center: { lat: centerLat, lng: centerLng },
        });
    } catch (err) {
        console.error("GET /api/map-search error:", err);
        return NextResponse.json(
            { error: "Failed to search map", chargers: [], sites: [] },
            { status: 500 }
        );
    }
}