import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq } from "drizzle-orm";

// ── GET /api/bookings/[id]/status ──
// High-frequency status polling route for drivers and hosts.
export async function GET(
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

    // 2. Fetch booking details joined with charger to get hostId
    const [booking] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        secretCode: bookings.secretCode,
        codeExpiresAt: bookings.codeExpiresAt,
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

    // Invariant: only show raw OTP code to the driver (host gets null)
    const sanitizedSecretCode = isDriver ? booking.secretCode : null;

    return NextResponse.json({
      status: booking.status,
      codeExpiresAt: booking.codeExpiresAt,
      secretCode: sanitizedSecretCode,
    }, { status: 200 });
  } catch (error) {
    console.error("GET /api/bookings/[id]/status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
