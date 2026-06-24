import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers, users, payments } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { computeCost, effectiveBillingStatus } from "@/lib/billing";

// ── GET /api/bookings/host ──
// Retrieve bookings requested on chargers listed by the signed-in host.
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const hostBookings = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        createdAt: bookings.createdAt,
        startedAt: bookings.startedAt,
        endedAt: bookings.endedAt,
        energyKwh: bookings.energyKwh,
        autoEnergyKwh: bookings.autoEnergyKwh,
        energySource: bookings.energySource,
        billingStatus: bookings.billingStatus,
        finalAmount: bookings.finalAmount,
        billingFinalizedAt: bookings.billingFinalizedAt,
        chargerTitle: chargers.title,
        chargerAddress: chargers.address,
        pricePerKwh: chargers.pricePerKwh,
        powerKw: chargers.powerKw,
        driverEmail: users.email,
        driverName: users.fullName,
      })
      .from(bookings)
      .innerJoin(chargers, eq(bookings.chargerId, chargers.id))
      .innerJoin(users, eq(bookings.driverId, users.id))
      .where(eq(chargers.hostId, user.id))
      .orderBy(desc(bookings.createdAt));

    const bookingIds = hostBookings.map((b) => b.id);
    const paidBookingIds = new Set<string>();

    if (bookingIds.length > 0) {
      const paidRows = await db
        .select({ bookingId: payments.bookingId })
        .from(payments)
        .where(eq(payments.status, "simulated_paid"));

      for (const row of paidRows) {
        if (bookingIds.includes(row.bookingId)) {
          paidBookingIds.add(row.bookingId);
        }
      }
    }

    const normalizedBookings = hostBookings.map((b) => {
      const status =
        b.status === "awaiting_handshake"
          ? "awaiting_driver_arrival"
          : b.status === "verified"
          ? "active"
          : b.status;

      const billingStatus = effectiveBillingStatus(b.status, b.billingStatus, b.energyKwh);
      const price = parseFloat(b.pricePerKwh);
      const energy = b.energyKwh ? parseFloat(b.energyKwh) : 0;
      const previewCost = energy > 0 ? computeCost(energy, price) : null;
      const finalAmount = b.finalAmount ? parseFloat(b.finalAmount) : null;

      return {
        ...b,
        status,
        billingStatus,
        powerKw: b.powerKw ? parseFloat(b.powerKw) : null,
        autoEnergyKwh: b.autoEnergyKwh ? parseFloat(b.autoEnergyKwh) : null,
        energyKwh: b.energyKwh ? parseFloat(b.energyKwh) : null,
        previewCost,
        finalAmount,
        isPaid: paidBookingIds.has(b.id),
      };
    });

    return NextResponse.json({ bookings: normalizedBookings }, { status: 200 });
  } catch (error) {
    console.error("GET /api/bookings/host error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
