import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { computeCost } from "@/lib/billing";

// ── PATCH /api/bookings/[id]/billing ──
// Host updates draft bill (optional manual kWh override or revert to auto).
export async function PATCH(
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

    const body = await request.json().catch(() => ({}));
    const manualEnergy = body.energyKwh;

    const [booking] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        billingStatus: bookings.billingStatus,
        autoEnergyKwh: bookings.autoEnergyKwh,
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
      return NextResponse.json({ error: "Forbidden. Only the host may update billing." }, { status: 403 });
    }

    if (booking.status !== "completed") {
      return NextResponse.json({ error: "Billing can only be updated after the session is completed." }, { status: 400 });
    }

    if (booking.billingStatus !== "draft") {
      return NextResponse.json({ error: "Bill is already finalized and cannot be edited." }, { status: 400 });
    }

    let energyKwhStr: string;
    let energySource: string;

    if (manualEnergy === undefined || manualEnergy === null || manualEnergy === "") {
      const revert = booking.autoEnergyKwh ?? booking.energyKwh;
      if (!revert) {
        return NextResponse.json({ error: "No auto-calculated energy available to revert to." }, { status: 400 });
      }
      energyKwhStr = parseFloat(revert).toFixed(3);
      energySource = "auto";
    } else {
      const parsed = parseFloat(String(manualEnergy));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json({ error: "energyKwh must be a positive number." }, { status: 400 });
      }
      energyKwhStr = parsed.toFixed(3);
      energySource = "manual";
    }

    const price = parseFloat(booking.pricePerKwh);
    const previewCost = computeCost(parseFloat(energyKwhStr), price);

    await db
      .update(bookings)
      .set({
        energyKwh: energyKwhStr,
        energySource,
      })
      .where(and(eq(bookings.id, id), eq(bookings.billingStatus, "draft")));

    return NextResponse.json({
      success: true,
      billingStatus: "draft",
      energyKwh: parseFloat(energyKwhStr),
      energySource,
      previewCost,
      message: "Draft bill updated. Finalize when ready.",
    }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/bookings/[id]/billing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
