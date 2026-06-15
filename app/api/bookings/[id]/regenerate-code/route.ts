import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// ── POST /api/bookings/[id]/regenerate-code ──
// Driver regenerates a fresh verification code when the existing one is stale or expired.
// Unlike generate-code, this has no cooldown — driver can always regenerate when the code is stale.
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

    // 2. Fetch booking
    const [booking] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        driverId: bookings.driverId,
        codeExpiresAt: bookings.codeExpiresAt,
        nonceExpiresAt: bookings.nonceExpiresAt,
      })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // 3. Only the driver can regenerate their own code
    if (booking.driverId !== user.id) {
      return NextResponse.json({ error: "Forbidden. Only the booking driver can regenerate the code." }, { status: 403 });
    }

    // 4. Booking must be in arrival verification stage (both old and new status)
    if (booking.status !== "awaiting_driver_arrival" && booking.status !== "awaiting_handshake") {
      return NextResponse.json({ error: `Cannot regenerate code when status is '${booking.status}'` }, { status: 400 });
    }

    // 5. Generate new code — write to both secretCode and nonce so old-row consumers
    //    also get the fresh value via effectiveCode = secretCode ?? nonce.
    const newCode = crypto.randomInt(100000, 1000000).toString().padStart(6, "0");
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await db.update(bookings).set({
      secretCode: newCode,
      codeExpiresAt: expiry,
      codeUsed: false,
      nonce: newCode,
      nonceExpiresAt: expiry,
      nonceUsed: false,
      nonceGeneratedAt: new Date(),
      nonceGeneratedBy: user.id,
    }).where(eq(bookings.id, id));

    return NextResponse.json({ success: true, secretCode: newCode, codeExpiresAt: expiry }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/regenerate-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
