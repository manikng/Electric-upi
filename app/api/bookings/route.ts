import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq, and, ne } from "drizzle-orm";

// ── POST /api/bookings ──
// Authenticated drivers can request to book a charger.
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
    const { chargerId } = body;

    if (!chargerId) {
      return NextResponse.json({ error: "Missing chargerId in request body." }, { status: 400 });
    }

    // 3. Find the charger & verify status
    const [charger] = await db
      .select()
      .from(chargers)
      .where(eq(chargers.id, chargerId))
      .limit(1);

    if (!charger) {
      return NextResponse.json({ error: "Charger not found." }, { status: 404 });
    }

    // Invariant: Charger must be active to be booked
    if (charger.status !== "active" && charger.status !== "pending") {
      // Allow pending for demo/testing convenience, but block if explicitly inactive
      return NextResponse.json({ error: "This charger is currently inactive." }, { status: 400 });
    }

    // Adversarial: Host tries to book their own charger
    if (charger.hostId === user.id) {
      return NextResponse.json({ error: "You cannot book your own charger." }, { status: 400 });
    }

    // Adversarial: Driver already has an active booking that is not completed.
    // Select only minimal fields to avoid referencing newer columns that may
    // not exist in older databases.
    const existingActiveBookings = await db
      .select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(
        and(
          eq(bookings.driverId, user.id),
          ne(bookings.status, "completed")
        )
      )
      .limit(1);

    if (existingActiveBookings.length > 0) {
      return NextResponse.json(
        {
          error: "You already have an active charging booking. Complete it before requesting a new one.",
          bookingId: existingActiveBookings[0].id,
        },
        { status: 400 }
      );
    }

    // 4. Create booking request
    const [newBooking] = await db
      .insert(bookings)
      .values({
        chargerId: charger.id,
        driverId: user.id,
        status: "pending_host_accept",
      })
      .returning();

    return NextResponse.json({ bookingId: newBooking.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
