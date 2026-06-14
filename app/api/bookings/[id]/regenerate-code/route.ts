import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// ── POST /api/bookings/[id]/regenerate-code ──
// Driver requests a new verification code.
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

    // 2. Fetch booking details
    const [booking] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        driverId: bookings.driverId,
      })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // 3. Verify caller is the driver who requested the booking (adversarial guard)
    if (booking.driverId !== user.id) {
      return NextResponse.json({ error: "Forbidden. Only the booking driver can regenerate codes." }, { status: 403 });
    }

    // 4. Verify booking is in the correct state
    if (booking.status !== "awaiting_driver_arrival") {
      return NextResponse.json(
        { error: `Cannot regenerate code when status is '${booking.status}'` },
        { status: 400 }
      );
    }

    // 5. Generate new secure 6-digit OTP code and new expiration (15 minutes from now)
    // Rule: MUST use crypto.randomInt (no Math.random)
    const newCode = crypto.randomInt(100000, 1000000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    // 6. Update database
    await db
      .update(bookings)
      .set({
        secretCode: newCode,
        codeExpiresAt: expiry,
        codeUsed: false,
      })
      .where(eq(bookings.id, id));

    return NextResponse.json({
      success: true,
      secretCode: newCode,
      codeExpiresAt: expiry,
      message: "New verification code generated successfully.",
    }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/regenerate-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
