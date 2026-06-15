import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers, users } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

// ── GET /api/bookings/driver ──
// Retrieve bookings requested by the signed-in driver.
export async function GET(request: Request) {
  try {
    // 1. Verify user session
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // 2. Fetch bookings matching user's driver ID
    const driverBookings = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        createdAt: bookings.createdAt,
        startedAt: bookings.startedAt,
        endedAt: bookings.endedAt,
        energyKwh: bookings.energyKwh,
        chargerTitle: chargers.title,
        chargerAddress: chargers.address,
        pricePerKwh: chargers.pricePerKwh,
        hostName: users.fullName,
      })
      .from(bookings)
      .innerJoin(chargers, eq(bookings.chargerId, chargers.id))
      .innerJoin(users, eq(chargers.hostId, users.id))
      .where(eq(bookings.driverId, user.id))
      .orderBy(desc(bookings.createdAt));

    return NextResponse.json({ bookings: driverBookings }, { status: 200 });
  } catch (error) {
    console.error("GET /api/bookings/driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
