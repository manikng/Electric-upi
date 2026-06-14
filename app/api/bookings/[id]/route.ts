import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// ── GET /api/bookings/[id] ──
// Retrieve detailed information about a booking.
// Accessible only to the Driver who booked it or the Host who owns the charger.
export async function GET(
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

    // 2. Fetch booking joined with charger and driver details
    const [bookingDetails] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        secretCode: bookings.secretCode,
        codeExpiresAt: bookings.codeExpiresAt,
        codeUsed: bookings.codeUsed,
        createdAt: bookings.createdAt,
        startedAt: bookings.startedAt,
        endedAt: bookings.endedAt,
        energyKwh: bookings.energyKwh,
        chargerId: chargers.id,
        title: chargers.title,
        address: chargers.address,
        city: chargers.city,
        pricePerKwh: chargers.pricePerKwh,
        chargerType: chargers.chargerType,
        plugType: chargers.plugType,
        hostId: chargers.hostId,
        driverId: bookings.driverId,
        driverEmail: users.email,
        driverName: users.fullName,
      })
      .from(bookings)
      .innerJoin(chargers, eq(bookings.chargerId, chargers.id))
      .innerJoin(users, eq(bookings.driverId, users.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!bookingDetails) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // 3. Authorization Guard: caller must be driver or host
    const isDriver = bookingDetails.driverId === user.id;
    const isHost = bookingDetails.hostId === user.id;

    if (!isDriver && !isHost) {
      return NextResponse.json({ error: "Forbidden. You are not a party to this booking." }, { status: 403 });
    }

    // Fetch host email/name separately to show driver
    let hostName = "Verified Host";
    let hostEmail = "";
    if (bookingDetails.hostId) {
      const [host] = await db
        .select({ fullName: users.fullName, email: users.email })
        .from(users)
        .where(eq(users.id, bookingDetails.hostId))
        .limit(1);
      if (host) {
        hostName = host.fullName || "Verified Host";
        hostEmail = host.email;
      }
    }

    // Calculate approximate cost if energy metrics exist
    const price = parseFloat(bookingDetails.pricePerKwh);
    const energy = bookingDetails.energyKwh ? parseFloat(bookingDetails.energyKwh) : 0;
    const cost = price * energy;

    // Invariant protection: only the driver can view the raw secret OTP on this GET route
    // (the host must obtain it verbally from the driver and enter it to verify).
    const sanitizedSecretCode = isDriver ? bookingDetails.secretCode : null;

    return NextResponse.json({
      booking: {
        id: bookingDetails.bookingId,
        status: bookingDetails.status,
        secretCode: sanitizedSecretCode,
        codeExpiresAt: bookingDetails.codeExpiresAt,
        codeUsed: bookingDetails.codeUsed,
        createdAt: bookingDetails.createdAt,
        startedAt: bookingDetails.startedAt,
        endedAt: bookingDetails.endedAt,
        energyKwh: bookingDetails.energyKwh ? parseFloat(bookingDetails.energyKwh) : null,
        cost: cost > 0 ? parseFloat(cost.toFixed(2)) : null,
        charger: {
          id: bookingDetails.chargerId,
          title: bookingDetails.title,
          address: bookingDetails.address,
          city: bookingDetails.city,
          pricePerKwh: price,
          chargerType: bookingDetails.chargerType,
          plugType: bookingDetails.plugType,
        },
        driver: {
          id: bookingDetails.driverId,
          name: bookingDetails.driverName || "EV Driver",
          email: isHost ? bookingDetails.driverEmail : null, // Host gets driver email for coordination
        },
        host: {
          id: bookingDetails.hostId,
          name: hostName,
          email: isDriver ? hostEmail : null, // Driver gets host email for coordination
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error("GET /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
