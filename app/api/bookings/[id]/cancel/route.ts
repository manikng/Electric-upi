import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq, and, ne } from "drizzle-orm";

// ── POST /api/bookings/[id]/cancel ──
// Cancel a booking. Allowed by driver or host before the session is completed.
// Once completed, cancellation is not allowed.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // Fetch the booking with charger info to verify ownership
    const [booking] = await db
      .select({
        id: bookings.id,
        driverId: bookings.driverId,
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

    const isDriver = booking.driverId === user.id;
    const isHost = booking.hostId === user.id;

    if (!isDriver && !isHost) {
      return NextResponse.json({ error: "Forbidden. You are not a party to this booking." }, { status: 403 });
    }

    // Prevent cancelling already completed or already cancelled bookings
    if (booking.status === "completed" || booking.status === "cancelled") {
      return NextResponse.json(
        { error: `Cannot cancel a booking that is already ${booking.status}.` },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    await db
      .update(bookings)
      .set({ status: "cancelled" })
      .where(eq(bookings.id, id));

    return NextResponse.json({ success: true, message: "Booking cancelled successfully." });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return NextResponse.json({ error: "Failed to cancel booking." }, { status: 500 });
  }
}
