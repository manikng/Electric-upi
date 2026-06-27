import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { chargers, users } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getCoordinates } from "@/app/actions/geocode";

// Helper to compute distance between two points in km (Haversine formula)
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── POST /api/chargers ──
// Authenticated users can list their charger.
export async function POST(request: Request) {
  try {
    // 1. Verify auth session
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // 2. Parse and validate body
    const body = await request.json();
    const {
      title,
      address,
      city,
      price_per_kwh,
      description,
      area,
      pincode,
      state,
      charger_type,
      power_kw,
      plug_type,
      available_from,
      available_to,
      amenities,
      vehicle_segments,
      image_url,
    } = body;

    // Required field check
    if (!title?.trim() || !address?.trim() || !city?.trim() || !price_per_kwh) {
      return NextResponse.json(
        { error: "Missing required fields: title, address, city, price_per_kwh" },
        { status: 400 }
      );
    }

    // Price validation (adversarial: 0, negative, NaN, "abc")
    const price = Number(price_per_kwh);
    if (!Number.isFinite(price) || price <= 0 || price > 100) {
      return NextResponse.json(
        { error: "Price per kWh must be a number between ₹0.01 and ₹100." },
        { status: 400 }
      );
    }

    // Power kW validation (adversarial: 9999, negative)
    let powerKwSafe: string | null = null;
    if (power_kw !== undefined && power_kw !== "") {
      const pw = Number(power_kw);
      if (!Number.isFinite(pw) || pw <= 0 || pw > 500) {
        return NextResponse.json(
          { error: "Power output must be between 0.1 kW and 500 kW." },
          { status: 400 }
        );
      }
      powerKwSafe = pw.toFixed(2);
    }

    // Pincode validation (adversarial: letters, wrong length)
    if (pincode && !/^\d{6}$/.test(String(pincode).trim())) {
      return NextResponse.json(
        { error: "Pincode must be exactly 6 digits." },
        { status: 400 }
      );
    }

    // Serialise arrays safely (cap size to prevent huge payloads)
    const amenitiesJson = Array.isArray(amenities)
      ? JSON.stringify(amenities.slice(0, 20).map(String))
      : null;
    const vehicleSegmentsJson = Array.isArray(vehicle_segments)
      ? JSON.stringify(vehicle_segments.slice(0, 5).map(String))
      : null;

    // 3. Geocode address (fallback: null coords — invariant preserved)
    let latitude: string | null = null;
    let longitude: string | null = null;
    try {
      const geoText = `${address.trim()}, ${area ? area.trim() + ", " : ""}${city.trim()}`;
      const geoResult = await getCoordinates(geoText);
      if (geoResult.success && geoResult.latitude && geoResult.longitude) {
        latitude = geoResult.latitude.toFixed(7);
        longitude = geoResult.longitude.toFixed(7);
      }
    } catch (geoErr) {
      console.warn("Geocoding failed during charger creation:", geoErr);
    }
    // 3.5 Check if user exists in custom users table, if not, insert them safely
    const existingUser = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (existingUser.length === 0) {
      // @ts-ignore - Schema key fallbacks to avoid schema property mismatch
      await db.insert(users).values({
        id: user.id,
        fullName: user.user_metadata?.full_name || user.user_metadata?.name || "EV Host",
        email: user.email || "",
        trustScore: 100,
      });
    }

    // 4. Insert into DB — all fields
    const [inserted] = await db
      .insert(chargers)
      .values({
        hostId: user.id,
        title: title.trim(),
        address: address.trim(),
        city: city.trim(),
        area: area?.trim() || null,
        pincode: pincode?.trim() || null,
        state: state?.trim() || null,
        pricePerKwh: price.toFixed(2),
        chargerType: charger_type?.trim() || null,
        powerKw: powerKwSafe,
        plugType: plug_type?.trim() || null,
        availableFrom: available_from || null,
        availableTo: available_to || null,
        amenities: amenitiesJson,
        vehicleSegments: vehicleSegmentsJson,
        imageUrl: image_url?.trim() || null,
        description: description?.trim() || null,
        status: "pending",
        latitude,
        longitude,
      })
      .returning();

    return NextResponse.json({ charger: inserted }, { status: 201 });
  } catch (error) {
    console.error("POST /api/chargers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET /api/chargers ──
// Public endpoint for drivers to search chargers.
// Supports: q, city, lat, lng (existing) + plug, maxPrice, chargerType, radius, page (new)
// Backward compatible: returns { chargers: [...] } for existing consumers.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const city = searchParams.get("city");
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");

    // ── New filter params ──
    const plugParam = searchParams.get("plug");
    const maxPriceParam = searchParams.get("maxPrice");
    const chargerTypeParam = searchParams.get("chargerType");
    const radiusParam = searchParams.get("radius");
    const pageParam = searchParams.get("page");

    // Parse new params
    let plugTypes: string[] | undefined;
    if (plugParam) {
      plugTypes = plugParam.split(",").map((p) => p.trim()).filter(Boolean);
      if (plugTypes.length === 0) plugTypes = undefined;
    }

    let maxPrice: number | undefined;
    if (maxPriceParam) {
      const mp = parseFloat(maxPriceParam);
      if (!Number.isNaN(mp) && mp > 0 && mp <= 100) maxPrice = mp;
    }

    let chargerType: string | undefined;
    if (chargerTypeParam) chargerType = chargerTypeParam.trim();

    let radius = 50; // default km
    if (radiusParam) {
      const r = parseFloat(radiusParam);
      if (!Number.isNaN(r) && r >= 1 && r <= 100) radius = r;
    }

    let page = 1;
    if (pageParam) {
      const p = parseInt(pageParam, 10);
      if (!Number.isNaN(p) && p >= 1) page = p;
    }

    const PAGE_SIZE = 20;
    const hasNewFilters = plugTypes || maxPrice !== undefined || chargerType;

    // ── Coordinate resolution ──
    let originLat: number | null = null;
    let originLng: number | null = null;
    let isGeocodedSearch = false;

    if (latParam && lngParam) {
      const parsedLat = parseFloat(latParam);
      const parsedLng = parseFloat(lngParam);
      if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng) &&
        parsedLat >= -90 && parsedLat <= 90 &&
        parsedLng >= -180 && parsedLng <= 180) {
        originLat = parsedLat;
        originLng = parsedLng;
      } else {
        console.warn("API received invalid/out-of-bounds query coordinates:", latParam, lngParam);
      }
    }

    const searchQuery = q || city;
    if (originLat === null && searchQuery && searchQuery.trim()) {
      try {
        const geoResult = await getCoordinates(searchQuery);
        if (geoResult.success && geoResult.latitude && geoResult.longitude) {
          originLat = geoResult.latitude;
          originLng = geoResult.longitude;
          isGeocodedSearch = true;
        }
      } catch (geoErr) {
        console.error("Geocoding failed during search query parsing:", geoErr);
      }
    }

    // ── If new filter params or geo search, use PostGIS raw SQL path ──
    if (hasNewFilters || (originLat !== null && originLng !== null)) {
      const offset = (page - 1) * PAGE_SIZE;

      // Build geo WHERE clause
      let geoWhereClause = "";
      if (originLat !== null && originLng !== null) {
        geoWhereClause = `AND ST_DWithin(
          COALESCE(c.location, ST_SetSRID(ST_MakePoint(c.longitude::float8, c.latitude::float8), 4326)::geography),
          ST_SetSRID(ST_MakePoint(${originLng}, ${originLat}), 4326)::geography,
          ${radius * 1000}
        )`;
      }

      // Distance SELECT
      const distanceSelect = originLat !== null && originLng !== null
        ? sql`ST_Distance(
            COALESCE(c.location, ST_SetSRID(ST_MakePoint(c.longitude::float8, c.latitude::float8), 4326)::geography),
            ST_SetSRID(ST_MakePoint(${originLng}, ${originLat}), 4326)::geography
          ) / 1000.0 AS distance_km`
        : sql`NULL::float8 AS distance_km`;

      // Count query
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM chargers c
        WHERE c.status = 'active'
        ${searchQuery ? sql`AND (c.title ILIKE ${"%" + searchQuery.replace(/[%_]/g, "\\$&") + "%"} OR c.address ILIKE ${"%" + searchQuery.replace(/[%_]/g, "\\$&") + "%"} OR c.city ILIKE ${"%" + searchQuery.replace(/[%_]/g, "\\$&") + "%"})` : sql``}
        ${maxPrice !== undefined ? sql`AND c.price_per_kwh <= ${maxPrice.toFixed(2)}` : sql``}
        ${plugTypes && plugTypes.length > 0 ? sql`AND c.plug_type = ANY(${plugTypes})` : sql``}
        ${chargerType ? sql`AND c.charger_type = ${chargerType}` : sql``}
        ${geoWhereClause ? sql.raw(geoWhereClause) : sql``}
      `);
      const total = Number(countResult.rows[0]?.count ?? 0);

      // Data query
      const dataResult = await db.execute(sql`
        SELECT
          c.id, c.title, c.address, c.city, c.area, c.pincode, c.state,
          c.price_per_kwh, c.charger_type, c.power_kw, c.plug_type,
          c.available_from, c.available_to, c.amenities, c.vehicle_segments,
          c.image_url, c.description, c.latitude, c.longitude, c.created_at,
          u.full_name AS host_name, u.trust_score AS host_trust_score,
          ${distanceSelect}
        FROM chargers c
        LEFT JOIN users u ON c.host_id = u.id
        WHERE c.status = 'active'
        ${searchQuery ? sql`AND (c.title ILIKE ${"%" + searchQuery.replace(/[%_]/g, "\\$&") + "%"} OR c.address ILIKE ${"%" + searchQuery.replace(/[%_]/g, "\\$&") + "%"} OR c.city ILIKE ${"%" + searchQuery.replace(/[%_]/g, "\\$&") + "%"})` : sql``}
        ${maxPrice !== undefined ? sql`AND c.price_per_kwh <= ${maxPrice.toFixed(2)}` : sql``}
        ${plugTypes && plugTypes.length > 0 ? sql`AND c.plug_type = ANY(${plugTypes})` : sql``}
        ${chargerType ? sql`AND c.charger_type = ${chargerType}` : sql``}
        ${geoWhereClause ? sql.raw(geoWhereClause) : sql``}
        ORDER BY ${originLat !== null ? sql`distance_km ASC` : sql`c.created_at DESC`}
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `);

      const results = dataResult.rows.map((row: Record<string, unknown>) => {
        const trustScore = Number(row.host_trust_score) || 100;
        const isSuperhost = trustScore >= 95;
        let amenitiesParsed: string[] = [];
        try { if (row.amenities) amenitiesParsed = JSON.parse(String(row.amenities)); } catch { /* */ }
        let vehicleSegmentsParsed: string[] = [];
        try { if (row.vehicle_segments) vehicleSegmentsParsed = JSON.parse(String(row.vehicle_segments)); } catch { /* */ }

        const pricePerKwh = parseFloat(String(row.price_per_kwh));
        const chargerTypeVal = String(row.charger_type || "AC Charger");
        const plugTypeVal = String(row.plug_type || "Type 2");

        return {
          id: String(row.id),
          title: String(row.title),
          hostName: String(row.host_name || "Verified Host"),
          isSuperhost,
          rating: 4.8 + (trustScore % 3) * 0.1,
          reviewsCount: 12 + (trustScore % 10) * 5,
          address: String(row.address),
          city: String(row.city),
          area: row.area ? String(row.area) : null,
          pincode: row.pincode ? String(row.pincode) : null,
          state: row.state ? String(row.state) : null,
          pricePerKwh,
          chargerType: row.charger_type ? String(row.charger_type) : null,
          powerKw: row.power_kw ? parseFloat(String(row.power_kw)) : null,
          plugType: row.plug_type ? String(row.plug_type) : null,
          availableFrom: row.available_from ? String(row.available_from) : null,
          availableTo: row.available_to ? String(row.available_to) : null,
          amenities: amenitiesParsed,
          vehicleSegments: vehicleSegmentsParsed,
          imageUrl: row.image_url ? String(row.image_url) : null,
          description: row.description ? String(row.description) : null,
          status: "active",
          latitude: row.latitude ? parseFloat(String(row.latitude)) : null,
          longitude: row.longitude ? parseFloat(String(row.longitude)) : null,
          distanceKm: row.distance_km !== null && row.distance_km !== undefined
            ? parseFloat(String(row.distance_km)) : null,
          tags: [
            pricePerKwh < 6 ? "Budget Friendly" : "Premium Slot",
            plugTypeVal,
            chargerTypeVal,
          ],
          type: chargerTypeVal,
          category: "Home Charger",
        };
      });

      // Return enhanced shape with pagination metadata when filters are used
      return NextResponse.json({
        chargers: results,
        total,
        page,
        hasMore: offset + PAGE_SIZE < total,
      }, { status: 200 });
    }

    // ── Legacy path: no new filters, no geo coords ──
    // Keeps exact backward compatibility for existing landing page.
    const chargersList = await db
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
        status: chargers.status,
        latitude: chargers.latitude,
        longitude: chargers.longitude,
        createdAt: chargers.createdAt,
        hostName: users.fullName,
        hostTrustScore: users.trustScore,
      })
      .from(chargers)
      .leftJoin(users, eq(chargers.hostId, users.id))
      .where(eq(chargers.status, "active"));

    // Map database models to front-end schema and calculate distances
    let results = chargersList.map((charger) => {
      let distanceKm: number | null = null;

      if (originLat !== null && originLng !== null && charger.latitude && charger.longitude) {
        const charLat = parseFloat(charger.latitude);
        const charLng = parseFloat(charger.longitude);
        if (!Number.isNaN(charLat) && !Number.isNaN(charLng)) {
          distanceKm = getHaversineDistance(originLat, originLng, charLat, charLng);
        }
      }

      const trustScore = charger.hostTrustScore || 100;
      const isSuperhost = trustScore >= 95;

      let amenitiesParsed: string[] = [];
      try {
        if (charger.amenities) {
          amenitiesParsed = JSON.parse(charger.amenities);
        }
      } catch (err) {
        console.warn("Failed to parse amenities for charger:", charger.id, err);
      }

      let vehicleSegmentsParsed: string[] = [];
      try {
        if (charger.vehicleSegments) {
          vehicleSegmentsParsed = JSON.parse(charger.vehicleSegments);
        }
      } catch (err) {
        console.warn("Failed to parse vehicleSegments for charger:", charger.id, err);
      }

      return {
        id: charger.id,
        title: charger.title,
        hostName: charger.hostName || "Verified Host",
        isSuperhost,
        rating: 4.8 + (trustScore % 3) * 0.1,
        reviewsCount: 12 + (trustScore % 10) * 5,
        address: charger.address,
        city: charger.city,
        area: charger.area,
        pincode: charger.pincode,
        state: charger.state,
        pricePerKwh: parseFloat(charger.pricePerKwh),
        chargerType: charger.chargerType,
        powerKw: charger.powerKw ? parseFloat(charger.powerKw) : null,
        plugType: charger.plugType,
        availableFrom: charger.availableFrom,
        availableTo: charger.availableTo,
        amenities: amenitiesParsed,
        vehicleSegments: vehicleSegmentsParsed,
        imageUrl: charger.imageUrl,
        description: charger.description,
        status: charger.status,
        latitude: charger.latitude ? parseFloat(charger.latitude) : null,
        longitude: charger.longitude ? parseFloat(charger.longitude) : null,
        distanceKm,
        tags: [
          charger.pricePerKwh < "6.00" ? "Budget Friendly" : "Premium Slot",
          charger.plugType || "Type 2 Plug",
          charger.chargerType || "AC Charger"
        ],
        type: charger.chargerType || "AC Charger",
        category: "Home Charger",
      };
    });

    // Filtering logic (legacy text-only)
    if (searchQuery && searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      results = results.filter((charger) => {
        if (isGeocodedSearch && charger.distanceKm !== null) {
          return charger.distanceKm < 50;
        }
        return (
          charger.city.toLowerCase().includes(lowerQuery) ||
          charger.address.toLowerCase().includes(lowerQuery) ||
          charger.title.toLowerCase().includes(lowerQuery)
        );
      });
    }

    // Sort by proximity if coordinates are available, else by creation or default order
    if (originLat !== null && originLng !== null) {
      results.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return NextResponse.json({ chargers: results }, { status: 200 });
  } catch (error) {
    console.error("GET /api/chargers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
