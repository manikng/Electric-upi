import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers, users, payments } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { effectiveBillingStatus } from "@/lib/billing";

// ── GET /api/bookings/driver ──
// Retrieve bookings requested by the signed-in driver.
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const driverBookings = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        createdAt: bookings.createdAt,
        startedAt: bookings.startedAt,
        endedAt: bookings.endedAt,
        energyKwh: bookings.energyKwh,
        billingStatus: bookings.billingStatus,
        finalAmount: bookings.finalAmount,
        chargerTitle: chargers.title,
        chargerAddress: chargers.address,
        pricePerKwh: chargers.pricePerKwh,
        hostName: users.fullName,
      })
      .from(bookings)
      .innerJoin(chargers, eq(bookings.chargerId, chargers.id))
      .innerJoin(users, eq(chargers.hostId, users.id))
      .where(eq(bookings.driverId, user.id))
      .orderBy(desc(bookings.createdAt));

    const bookingIds = driverBookings.map((b) => b.id);
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

    const normalizedBookings = driverBookings.map((b) => {
      const status =
        b.status === "awaiting_handshake"
          ? "awaiting_driver_arrival"
          : b.status === "verified"
          ? "active"
          : b.status;

      const billingStatus = effectiveBillingStatus(b.status, b.billingStatus, b.energyKwh);
      const finalAmount = b.finalAmount ? parseFloat(b.finalAmount) : null;
      const isPaid = paidBookingIds.has(b.id);

      return {
        ...b,
        status,
        billingStatus,
        energyKwh: b.energyKwh ? parseFloat(b.energyKwh) : null,
        finalAmount,
        isPaid,
        cost: billingStatus === "finalized" && finalAmount != null ? finalAmount : null,
      };
    });

    return NextResponse.json({ bookings: normalizedBookings }, { status: 200 });
  } catch (error) {
    console.error("GET /api/bookings/driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
