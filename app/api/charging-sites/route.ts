import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import {getHaversineDistance} from "@/app/api/chargers/route";
import { ChargingSiteResult, ConnectorProfile } from "@/lib/types";

interface SearchResponse {
  data: ChargingSiteResult[];
  hasMore: boolean;
}

// ── GET /api/charging-sites ──
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const q = searchParams.get("q")?.trim() || "";
    const stateFilter = searchParams.get("state")?.trim() || "";
    const ownershipFilter = searchParams.get("ownership")?.trim() || "";

    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const pageLimit = Math.min(50, Math.max(1, parseInt(limitParam || "20", 10) || 20));
    const offset = (page - 1) * pageLimit;
    const fetchLimit = pageLimit + 1;

    // Parse user location for distance calculation
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const userLat = latParam ? parseFloat(latParam) : null;
    const userLng = lngParam ? parseFloat(lngParam) : null;
    const hasUserLocation = userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng);

    // Parse radius (km) for proximity filtering
    const radiusParam = searchParams.get("radius");
    const radiusKm = hasUserLocation && radiusParam ? Math.max(1, parseFloat(radiusParam) || 200) : null;

    // ── Build dynamic WHERE fragments using Drizzle sql template ──
    const whereFragments: ReturnType<typeof sql>[] = [];

    if (q) {
      const likePattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
      whereFragments.push(
        sql`(cs.cpo_name ILIKE ${likePattern} OR cs.location ILIKE ${likePattern} OR cs.state ILIKE ${likePattern} OR cs.city_village ILIKE ${likePattern})`
      );
    }
    if (stateFilter) {
      whereFragments.push(sql`cs.state ILIKE ${stateFilter + "%"}`);
    }
    if (ownershipFilter) {
      whereFragments.push(sql`cs.ownership ILIKE ${ownershipFilter + "%"}`);
    }

    // Combine fragments with AND (or use 1=1 if none)
    const whereClause =
      whereFragments.length > 0
        ? sql.join(whereFragments, sql` AND `)
        : sql`1=1`;

    // ── Fetch sites with limit+1 for hasMore pagination ──
    const siteResult = await db.execute(sql`
      SELECT cs.id, cs.cpo_name AS "cpoName", cs.ownership, cs.state,
             cs.district, cs.city_village AS "cityVillage", cs.location,
             COALESCE(NULLIF(cs.latitude::text, '')::numeric, 0) AS latitude,
             COALESCE(NULLIF(cs.longitude::text, '')::numeric, 0) AS longitude,
             cs.source
      FROM charging_sites cs
      WHERE ${whereClause}
      ORDER BY cs.cpo_name
      LIMIT ${fetchLimit} OFFSET ${offset}
    `);

    const rawSites = siteResult.rows;
    const hasMore = rawSites.length > pageLimit;
    const sitesToMap = hasMore ? rawSites.slice(0, pageLimit) : rawSites;

    // Fetch connector profiles for these sites
    const siteIds = sitesToMap.map((s: any) => s.id);
    const connectorProfilesMap: Record<string, ConnectorProfile[]> = {};

    if (siteIds.length > 0) {
      // Build a safe IN clause by mapping each UUID through sql template
      const uuidList = sql.join(
        siteIds.map((id: string) => sql`${id}::uuid`),
        sql`, `
      );
      const profileResult = await db.execute(sql`
        SELECT id, site_id AS "siteId",
               connector_type AS "connectorType",
               charger_rating_kw::numeric AS "chargerRatingKw",
               connector_rating_kw::numeric AS "connectorRatingKw",
               connector_count AS "connectorCount"
        FROM site_connector_profiles
        WHERE site_id = ANY(ARRAY[${uuidList}]::uuid[])
      `);

      for (const profile of profileResult.rows) {
        if (!connectorProfilesMap[(profile as any).siteId]) {
          connectorProfilesMap[(profile as any).siteId] = [];
        }
        connectorProfilesMap[(profile as any).siteId].push({
          id: (profile as any).id,
          connectorType: (profile as any).connectorType,
          chargerRatingKw: (profile as any).chargerRatingKw,
          connectorRatingKw: (profile as any).connectorRatingKw,
          connectorCount: (profile as any).connectorCount,
        });
      }
    }

    // Build response with connector summaries
    let data: ChargingSiteResult[] = sitesToMap.map((site: any) => {
      const profiles = connectorProfilesMap[site.id] || [];
      const totalConnectors = profiles.reduce(
        (sum, p) => sum + (p.connectorCount || 0),
        0
      );

      const uniqueTypes = [...new Set(profiles.map((p) => p.connectorType).filter(Boolean)) as Set<string>];
      const typeCount = uniqueTypes.length;
      const connectorSummary =
        typeCount > 0
          ? `${typeCount} Type${typeCount > 1 ? "s" : ""} • ${totalConnectors} Connector${totalConnectors !== 1 ? "s" : ""}`
          : "No connector info";

      // Calculate distance if user location is available
      const distanceKm = hasUserLocation && site.latitude && site.longitude
        ? getHaversineDistance(userLat!, userLng!, Number(site.latitude), Number(site.longitude))
        : null;

      return {
        id: site.id,
        cpoName: site.cpoName,
        ownership: site.ownership,
        state: site.state,
        district: site.district,
        cityVillage: site.cityVillage,
        location: site.location,
        latitude: Number(site.latitude),
        longitude: Number(site.longitude),
        source: site.source,
        connectorProfiles: profiles,
        connectorSummary,
        totalConnectors,
        distanceKm,
      };
    });

    // Filter by radius if user location is available
    if (hasUserLocation && radiusKm !== null) {
      data = data.filter((site) => (site.distanceKm ?? Infinity) <= radiusKm);
    }

    // Sort by distance when user location is available, otherwise keep alphabetical
    if (hasUserLocation) {
      data.sort((a, b) => {
        const distA = a.distanceKm ?? Infinity;
        const distB = b.distanceKm ?? Infinity;
        return distA - distB;
      });
    }

    return NextResponse.json({
      data,
      hasMore,
    } satisfies Omit<SearchResponse, "page">);
  } catch (error) {
    console.error("[/api/charging-sites] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch charging sites" },
      { status: 500 }
    );
  }
}