import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq, and, lt } from "drizzle-orm";

// ── GET /api/bookings/[id]/status ──
// Lightweight status-only endpoint. Used for manual refresh checks.
// Returns effectiveStatus (normalizes awaiting_handshake → awaiting_driver_arrival).
export async function GET(
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
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const [booking] = await db
      .select({
        status: bookings.status,
        driverId: bookings.driverId,
        hostId: chargers.hostId,
        holdExpiresAt: bookings.holdExpiresAt,
      })
      .from(bookings)
      .innerJoin(chargers, eq(bookings.chargerId, chargers.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // Auto-cancel expired hold-timer bookings (10-min window passed without host acceptance)
    if (
      booking.status === "pending_host_accept" &&
      booking.holdExpiresAt &&
      new Date(booking.holdExpiresAt) < new Date()
    ) {
      await db
        .update(bookings)
        .set({ status: "cancelled", endedAt: new Date() })
        .where(and(eq(bookings.id, id), eq(bookings.status, "pending_host_accept")));

      return NextResponse.json({ status: "cancelled", holdExpired: true }, { status: 200 });
    }

    const isDriver = booking.driverId === user.id;
    const isHost = booking.hostId === user.id;

    if (!isDriver && !isHost) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Normalize old awaiting_handshake to awaiting_driver_arrival during reads
    const effectiveStatus =
      booking.status === "awaiting_handshake"
        ? "awaiting_driver_arrival"
        : booking.status === "verified"
        ? "active"
        : booking.status;

    return NextResponse.json({ status: effectiveStatus }, { status: 200 });
  } catch (error) {
    console.error("GET /api/bookings/[id]/status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
