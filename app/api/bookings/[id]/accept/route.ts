import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// ── POST /api/bookings/[id]/accept ──
// Charger host accepts a pending booking request.
// Generates secure 6-digit OTP code using crypto.randomInt.
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
        chargerId: bookings.chargerId,
        hostId: chargers.hostId,
      })
      .from(bookings)
      .innerJoin(chargers, eq(bookings.chargerId, chargers.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // 3. Verify that caller is the host of this charger (adversarial guard)
    if (booking.hostId !== user.id) {
      return NextResponse.json({ error: "Forbidden. You are not the host for this charger." }, { status: 403 });
    }

    // 4. Verify status is pending
    if (booking.status !== "pending_host_accept") {
      return NextResponse.json(
        { error: `Cannot accept booking in its current state: '${booking.status}'` },
        { status: 400 }
      );
    }

    // 5. Update booking to await driver arrival. Do NOT generate any code here.
    await db
      .update(bookings)
      .set({
        status: "awaiting_driver_arrival",
      })
      .where(and(eq(bookings.id, id), eq(bookings.status, "pending_host_accept")));

    // verify update affected a row
    const [updatedBooking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!updatedBooking || updatedBooking.status !== "awaiting_driver_arrival") {
      return NextResponse.json({ error: "Failed to accept booking (state changed)." }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      status: "awaiting_driver_arrival",
      message: "Booking accepted. Driver should generate verification code upon arrival.",
    }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/accept error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
