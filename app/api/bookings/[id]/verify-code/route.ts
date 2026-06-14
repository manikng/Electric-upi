import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq } from "drizzle-orm";

// ── POST /api/bookings/[id]/verify-code ──
// Charger host enters the driver's secret OTP code to verify arrival.
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

    // 2. Parse request body
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Missing verification code in request body." }, { status: 400 });
    }

    const cleanCode = String(code).trim();

    // 3. Fetch booking and parent charger details
    const [booking] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        secretCode: bookings.secretCode,
        codeExpiresAt: bookings.codeExpiresAt,
        codeUsed: bookings.codeUsed,
        hostId: chargers.hostId,
      })
      .from(bookings)
      .innerJoin(chargers, eq(bookings.chargerId, chargers.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // 4. Verify caller is the host of this charger
    if (booking.hostId !== user.id) {
      return NextResponse.json({ error: "Forbidden. You are not the host for this charger." }, { status: 403 });
    }

    // 5. Verify booking is in the correct state
    if (booking.status !== "awaiting_driver_arrival") {
      return NextResponse.json(
        { error: `Verification is not possible. Booking status is '${booking.status}'` },
        { status: 400 }
      );
    }

    // 6. Adversarial checks: code match, expiration, and replay attack
    if (booking.codeUsed) {
      return NextResponse.json({ error: "This code has already been verified." }, { status: 400 });
    }

    if (!booking.secretCode || booking.secretCode !== cleanCode) {
      return NextResponse.json({ error: "Incorrect verification code. Please check again." }, { status: 400 });
    }

    if (booking.codeExpiresAt && new Date() > new Date(booking.codeExpiresAt)) {
      return NextResponse.json(
        { error: "Verification code has expired. Please ask the driver to regenerate a new code." },
        { status: 400 }
      );
    }

    // 7. Success: Update status and mark code as used
    await db
      .update(bookings)
      .set({
        status: "verified",
        codeUsed: true,
      })
      .where(eq(bookings.id, id));

    return NextResponse.json({
      success: true,
      status: "verified",
      message: "Driver arrival verified successfully. The charging session can now start.",
    }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/verify-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
