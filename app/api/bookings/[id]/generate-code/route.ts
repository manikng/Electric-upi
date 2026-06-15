import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// ── POST /api/bookings/[id]/generate-code ──
// Driver at the host location generates a one-time verification code (MVP).
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
      .select({ bookingId: bookings.id, status: bookings.status, driverId: bookings.driverId, nonceGeneratedAt: bookings.nonceGeneratedAt })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // 3. Verify caller is the driver
    if (booking.driverId !== user.id) {
      return NextResponse.json({ error: "Forbidden. Only the booking driver can generate a code." }, { status: 403 });
    }

    // 4. Booking must be awaiting driver arrival (or old awaiting_handshake — same stage)
    if (booking.status !== "awaiting_driver_arrival" && booking.status !== "awaiting_handshake") {
      return NextResponse.json({ error: `Cannot generate code when status is '${booking.status}'` }, { status: 400 });
    }

    // 5. Cooldown: enforce 2-minute cooldown between generations using nonceGeneratedAt
    if (booking.nonceGeneratedAt && new Date() < new Date(new Date(booking.nonceGeneratedAt).getTime() + 2 * 60 * 1000)) {
      return NextResponse.json({ error: "You can generate a code only once every 2 minutes." }, { status: 429 });
    }

    // 6. Generate code and expiry
    const newCode = crypto.randomInt(100000, 1000000).toString().padStart(6, "0");
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    // 7. Update DB with secretCode and expiry
    await db.update(bookings).set({ secretCode: newCode, codeExpiresAt: expiry, codeUsed: false, nonceGeneratedAt: new Date(), nonceGeneratedBy: user.id }).where(eq(bookings.id, id));

    return NextResponse.json({ success: true, secretCode: newCode, codeExpiresAt: expiry }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/generate-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
