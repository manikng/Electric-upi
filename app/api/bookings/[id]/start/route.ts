import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq } from "drizzle-orm";

// ── POST /api/bookings/[id]/start ──
// Driver or host triggers the start of charging.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verify user session
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // 2. Fetch booking and parent charger details
    const [booking] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        driverId: bookings.driverId,
        hostId: chargers.hostId,
      })
      .from(bookings)
      .innerJoin(chargers, eq(bookings.chargerId, chargers.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // 3. Authorization Guard: caller must be driver or host
    const isDriver = booking.driverId === user.id;
    const isHost = booking.hostId === user.id;

    if (!isDriver && !isHost) {
      return NextResponse.json({ error: "Forbidden. You are not a party to this booking." }, { status: 403 });
    }

    // 4. Verify booking is verified
    if (booking.status !== "verified") {
      return NextResponse.json(
        { error: `Cannot start charging. Booking status is '${booking.status}' (expected 'verified')` },
        { status: 400 }
      );
    }

    // 5. Update booking state: set startedAt to current time, status to 'charging'
    await db
      .update(bookings)
      .set({
        status: "charging",
        startedAt: new Date(),
      })
      .where(eq(bookings.id, id));

    return NextResponse.json({
      success: true,
      status: "charging",
      message: "Charging session started successfully.",
    }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
