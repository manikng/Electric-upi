import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq } from "drizzle-orm";

// ── POST /api/bookings/[id]/verify-code ──
// Charger host confirms the mutual nonce shown to the driver (handshake).
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
      return NextResponse.json({ error: "Missing nonce in request body." }, { status: 400 });
    }

    const cleanCode = String(code).trim();

    // 3. Fetch booking and parent charger details
    //    Must fetch BOTH secretCode and nonce for backward compatibility with old rows.
    const [booking] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        secretCode: bookings.secretCode,
        codeExpiresAt: bookings.codeExpiresAt,
        codeUsed: bookings.codeUsed,
        nonce: bookings.nonce,
        nonceExpiresAt: bookings.nonceExpiresAt,
        nonceUsed: bookings.nonceUsed,
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

    // 4. Verify caller is the host (host enters the driver's code)
    const isHost = booking.hostId === user.id;
    if (!isHost) {
      return NextResponse.json({ error: "Forbidden. Only the host may verify the driver code." }, { status: 403 });
    }

    // 5. Verify booking is in the correct state
    //    awaiting_handshake is the old name for the same stage — both must be accepted.
    const isVerifiableStatus = booking.status === "awaiting_driver_arrival" || booking.status === "awaiting_handshake";
    if (!isVerifiableStatus) {
      return NextResponse.json({ error: `Cannot verify code when status is '${booking.status}'` }, { status: 400 });
    }

    // 6. Adversarial checks: code used, match, expiration
    //    effectiveCode: secretCode for new rows, nonce for old rows
    const effectiveCode = booking.secretCode ?? booking.nonce;
    const effectiveUsed = booking.codeUsed || booking.nonceUsed || false;
    const effectiveExpiry = booking.codeExpiresAt ?? booking.nonceExpiresAt;

    if (effectiveUsed) {
      return NextResponse.json({ error: "This code has already been used." }, { status: 400 });
    }

    if (!effectiveCode || effectiveCode !== cleanCode) {
      return NextResponse.json({ error: "Incorrect code. Please check again." }, { status: 400 });
    }

    if (effectiveExpiry && new Date() > new Date(effectiveExpiry)) {
      return NextResponse.json({ error: "Code has expired. Please ask the driver to generate a new code." }, { status: 400 });
    }

    // 7. Finalize booking: set status=verified, mark both codeUsed and nonceUsed so old rows are
    //    also correctly marked as consumed.
    await db.update(bookings).set({ status: "verified", codeUsed: true, nonceUsed: true }).where(eq(bookings.id, id));

    return NextResponse.json({ success: true, status: "verified", message: "Driver verified. Booking confirmed." }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/verify-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
