import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { chargers, users } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getCoordinates } from "@/app/actions/geocode";

// Helper to compute distance between two points in km (Haversine formula)
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const city = searchParams.get("city");
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");

    // Retrieve active chargers joined with host details
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

    // Coordinate validation & origin resolution
    let originLat: number | null = null;
    let originLng: number | null = null;
    let isGeocodedSearch = false;

    // Check if coordinates were passed explicitly (e.g. "Nearby Me" flow)
    if (latParam && lngParam) {
      const parsedLat = parseFloat(latParam);
      const parsedLng = parseFloat(lngParam);

      // Sanitization bounds
      if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng) &&
        parsedLat >= -90 && parsedLat <= 90 &&
        parsedLng >= -180 && parsedLng <= 180) {
        originLat = parsedLat;
        originLng = parsedLng;
      } else {
        console.warn("API received invalid/out-of-bounds query coordinates:", latParam, lngParam);
      }
    }

    // If no direct coordinates but a search string exists, attempt geocoding
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
        // Fallback: system invariant will handle it below via text matching
      }
    }

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
        rating: 4.8 + (trustScore % 3) * 0.1, // Mock rating derived from trust score
        reviewsCount: 12 + (trustScore % 10) * 5, // Mock reviews count
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
        // Mock tags for premium aesthetics
        tags: [
          charger.pricePerKwh < "6.00" ? "Budget Friendly" : "Premium Slot",
          charger.plugType || "Type 2 Plug",
          charger.chargerType || "AC Charger"
        ],
        type: charger.chargerType || "AC Charger",
        category: "Home Charger",
      };
    });

    // Filtering logic
    if (searchQuery && searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      results = results.filter((charger) => {
        // If geocoding was successful and we have coordinates, prioritize proximity filtering.
        // Otherwise, fall back to simple case-insensitive text matching (invariant protection)
        if (isGeocodedSearch && charger.distanceKm !== null) {
          return charger.distanceKm < 50; // Show matches within 50 km boundary
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