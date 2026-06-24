import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { computeCost } from "@/lib/billing";

// ── POST /api/bookings/[id]/billing/finalize ──
// Host locks the draft bill; driver may pay after this.
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

    const [booking] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        billingStatus: bookings.billingStatus,
        energyKwh: bookings.energyKwh,
        pricePerKwh: chargers.pricePerKwh,
        hostId: chargers.hostId,
      })
      .from(bookings)
      .innerJoin(chargers, eq(bookings.chargerId, chargers.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.hostId !== user.id) {
      return NextResponse.json({ error: "Forbidden. Only the host may finalize billing." }, { status: 403 });
    }

    if (booking.status !== "completed") {
      return NextResponse.json({ error: "Session must be completed before finalizing the bill." }, { status: 400 });
    }

    if (booking.billingStatus !== "draft") {
      return NextResponse.json({ error: "Bill is already finalized." }, { status: 400 });
    }

    if (!booking.energyKwh) {
      return NextResponse.json({ error: "No energy amount to finalize. Update the bill first." }, { status: 400 });
    }

    const energy = parseFloat(booking.energyKwh);
    const price = parseFloat(booking.pricePerKwh);
    const finalAmount = computeCost(energy, price);
    const finalizedAt = new Date();

    await db
      .update(bookings)
      .set({
        billingStatus: "finalized",
        finalAmount: finalAmount.toFixed(2),
        billingFinalizedAt: finalizedAt,
      })
      .where(and(eq(bookings.id, id), eq(bookings.billingStatus, "draft")));

    const [updated] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!updated || updated.billingStatus !== "finalized") {
      return NextResponse.json({ error: "Failed to finalize bill (state may have changed)." }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      billingStatus: "finalized",
      energyKwh: energy,
      finalAmount,
      message: "Bill finalized. Driver can now pay.",
    }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/billing/finalize error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
