import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers, users, payments } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { computeCost, effectiveBillingStatus } from "@/lib/billing";

// ── GET /api/bookings/[id] ──
// Retrieve detailed information about a booking.
// Accessible only to the Driver who booked it or the Host who owns the charger.
export async function GET(
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

    const driverUsers = aliasedTable(users, "driver_users");
    const hostUsers = aliasedTable(users, "host_users");

    const [bookingDetails] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        secretCode: bookings.secretCode,
        codeExpiresAt: bookings.codeExpiresAt,
        codeUsed: bookings.codeUsed,
        nonce: bookings.nonce,
        nonceExpiresAt: bookings.nonceExpiresAt,
        nonceUsed: bookings.nonceUsed,
        holdExpiresAt: bookings.holdExpiresAt,
        createdAt: bookings.createdAt,
        startedAt: bookings.startedAt,
        endedAt: bookings.endedAt,
        energyKwh: bookings.energyKwh,
        billingStatus: bookings.billingStatus,
        energySource: bookings.energySource,
        autoEnergyKwh: bookings.autoEnergyKwh,
        finalAmount: bookings.finalAmount,
        billingFinalizedAt: bookings.billingFinalizedAt,
        chargerId: chargers.id,
        title: chargers.title,
        address: chargers.address,
        city: chargers.city,
        pricePerKwh: chargers.pricePerKwh,
        powerKw: chargers.powerKw,
        chargerType: chargers.chargerType,
        plugType: chargers.plugType,
        hostId: chargers.hostId,
        driverId: bookings.driverId,
        driverEmail: driverUsers.email,
        driverName: driverUsers.fullName,
        hostEmail: hostUsers.email,
        hostName: hostUsers.fullName,
      })
      .from(bookings)
      .innerJoin(chargers, eq(bookings.chargerId, chargers.id))
      .innerJoin(driverUsers, eq(bookings.driverId, driverUsers.id))
      .innerJoin(hostUsers, eq(chargers.hostId, hostUsers.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!bookingDetails) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const isDriver = bookingDetails.driverId === user.id;
    const isHost = bookingDetails.hostId === user.id;

    if (!isDriver && !isHost) {
      return NextResponse.json({ error: "Forbidden. You are not a party to this booking." }, { status: 403 });
    }

    const effectiveCode = bookingDetails.secretCode ?? bookingDetails.nonce;
    const effectiveExpiry = bookingDetails.codeExpiresAt ?? bookingDetails.nonceExpiresAt;
    const effectiveUsed = bookingDetails.codeUsed || bookingDetails.nonceUsed || false;
    const effectiveStatus =
      bookingDetails.status === "awaiting_handshake"
        ? "awaiting_driver_arrival"
        : bookingDetails.status === "verified"
        ? "active"
        : bookingDetails.status;

    const billingStatus = effectiveBillingStatus(
      bookingDetails.status,
      bookingDetails.billingStatus,
      bookingDetails.energyKwh
    );

    const price = parseFloat(bookingDetails.pricePerKwh);
    const powerKw = bookingDetails.powerKw ? parseFloat(bookingDetails.powerKw) : null;
    const energy = bookingDetails.energyKwh ? parseFloat(bookingDetails.energyKwh) : 0;
    const autoEnergy = bookingDetails.autoEnergyKwh ? parseFloat(bookingDetails.autoEnergyKwh) : null;

    let cost: number | null = null;
    if (billingStatus === "finalized" && bookingDetails.finalAmount) {
      cost = parseFloat(bookingDetails.finalAmount);
    } else if (energy > 0) {
      cost = computeCost(energy, price);
    }

    const [latestPayment] = await db
      .select({
        status: payments.status,
        amount: payments.amount,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(eq(payments.bookingId, id))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    const paymentStatus = latestPayment?.status ?? null;
    const isPaid = paymentStatus === "simulated_paid";

    return NextResponse.json({
      booking: {
        id: bookingDetails.bookingId,
        status: effectiveStatus,
        secretCode: isDriver ? effectiveCode : null,
        codeExpiresAt: effectiveExpiry,
        codeUsed: effectiveUsed,
        holdExpiresAt: bookingDetails.holdExpiresAt,
        createdAt: bookingDetails.createdAt,
        startedAt: bookingDetails.startedAt,
        endedAt: bookingDetails.endedAt,
        energyKwh: bookingDetails.energyKwh ? parseFloat(bookingDetails.energyKwh) : null,
        autoEnergyKwh: autoEnergy,
        energySource: bookingDetails.energySource,
        billingStatus,
        finalAmount: bookingDetails.finalAmount ? parseFloat(bookingDetails.finalAmount) : null,
        billingFinalizedAt: bookingDetails.billingFinalizedAt,
        cost,
        paymentStatus,
        isPaid,
        charger: {
          id: bookingDetails.chargerId,
          title: bookingDetails.title,
          address: bookingDetails.address,
          city: bookingDetails.city,
          pricePerKwh: price,
          powerKw,
          chargerType: bookingDetails.chargerType,
          plugType: bookingDetails.plugType,
        },
        driver: {
          id: bookingDetails.driverId,
          name: bookingDetails.driverName || "EV Driver",
          email: isHost ? bookingDetails.driverEmail : null,
        },
        host: {
          id: bookingDetails.hostId,
          name: bookingDetails.hostName || "Verified Host",
          email: isDriver ? bookingDetails.hostEmail : null,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error("GET /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
