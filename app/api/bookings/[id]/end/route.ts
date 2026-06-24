import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { computeAutoEnergyKwh, computeCost, parsePowerKw } from "@/lib/billing";

// ── POST /api/bookings/[id]/end ──
// Driver or host triggers the end of charging.
// Calculates energy from elapsed session time × charger power; draft billing for host review.
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
        driverId: bookings.driverId,
        startedAt: bookings.startedAt,
        pricePerKwh: chargers.pricePerKwh,
        powerKw: chargers.powerKw,
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

    if (booking.status !== "charging") {
      return NextResponse.json(
        { error: `Cannot end charging session. Booking status is '${booking.status}' (expected 'charging')` },
        { status: 400 }
      );
    }

    const endedAt = new Date();
    const powerKw = parsePowerKw(booking.powerKw);
    if (!booking.powerKw) {
      console.warn(`POST /end: charger missing powerKw for booking ${id}, using ${powerKw} kW`);
    }

    const autoEnergy = computeAutoEnergyKwh(booking.startedAt, endedAt, powerKw);
    const autoEnergyStr = autoEnergy.toFixed(3);
    const price = parseFloat(booking.pricePerKwh);
    const previewCost = computeCost(autoEnergy, price);

    await db
      .update(bookings)
      .set({
        status: "completed",
        endedAt,
        energyKwh: autoEnergyStr,
        autoEnergyKwh: autoEnergyStr,
        energySource: "auto",
        billingStatus: "draft",
        finalAmount: null,
        billingFinalizedAt: null,
      })
      .where(and(eq(bookings.id, id), eq(bookings.status, "charging")));

    const [updatedBooking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!updatedBooking || updatedBooking.status !== "completed") {
      return NextResponse.json({ error: "Failed to end charging (state changed or already completed)." }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      status: "completed",
      billingStatus: "draft",
      energyKwh: autoEnergy,
      cost: previewCost,
      message: "Charging session ended. Host will review and finalize the bill.",
    }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/end error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
