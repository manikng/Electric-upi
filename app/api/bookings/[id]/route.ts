import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, chargers, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";

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

    // 2. Fetch booking joined with charger + driver + host in a single query.
    //    Alias the users table twice: once for driver, once for host.
    const driverUsers = aliasedTable(users, "driver_users");
    const hostUsers = aliasedTable(users, "host_users");

    const [bookingDetails] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        // New OTP fields
        secretCode: bookings.secretCode,
        codeExpiresAt: bookings.codeExpiresAt,
        codeUsed: bookings.codeUsed,
        // Legacy nonce fields — old rows stored verification code here
        nonce: bookings.nonce,
        nonceExpiresAt: bookings.nonceExpiresAt,
        nonceUsed: bookings.nonceUsed,
        // Timestamps and billing
        createdAt: bookings.createdAt,
        startedAt: bookings.startedAt,
        endedAt: bookings.endedAt,
        energyKwh: bookings.energyKwh,
        // Charger info
        chargerId: chargers.id,
        title: chargers.title,
        address: chargers.address,
        city: chargers.city,
        pricePerKwh: chargers.pricePerKwh,
        chargerType: chargers.chargerType,
        plugType: chargers.plugType,
        // Ownership
        hostId: chargers.hostId,
        driverId: bookings.driverId,
        // Driver info (aliased join)
        driverEmail: driverUsers.email,
        driverName: driverUsers.fullName,
        // Host info (aliased join — no extra query needed)
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

    // 3. Authorization Guard
    const isDriver = bookingDetails.driverId === user.id;
    const isHost = bookingDetails.hostId === user.id;

    if (!isDriver && !isHost) {
      return NextResponse.json({ error: "Forbidden. You are not a party to this booking." }, { status: 403 });
    }

    // 4. Normalize: old rows used nonce+awaiting_handshake, new rows use secretCode+awaiting_driver_arrival.
    //    Both represent the same business concept. Normalize during reads so frontend never sees the split.
    const effectiveCode = bookingDetails.secretCode ?? bookingDetails.nonce;
    const effectiveExpiry = bookingDetails.codeExpiresAt ?? bookingDetails.nonceExpiresAt;
    const effectiveUsed = bookingDetails.codeUsed || bookingDetails.nonceUsed || false;
    const effectiveStatus =
      bookingDetails.status === "awaiting_handshake"
        ? "awaiting_driver_arrival"
        : bookingDetails.status;

    // 5. Calculate cost if energy metrics exist
    const price = parseFloat(bookingDetails.pricePerKwh);
    const energy = bookingDetails.energyKwh ? parseFloat(bookingDetails.energyKwh) : 0;
    const cost = price * energy;

    // 6. Return flat shape — same keys all frontend consumers already reference.
    //    Driver receives the code; host receives null (they enter it manually, not read from API).
    return NextResponse.json({
      booking: {
        id: bookingDetails.bookingId,
        status: effectiveStatus,
        secretCode: isDriver ? effectiveCode : null,
        codeExpiresAt: effectiveExpiry,
        codeUsed: effectiveUsed,
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

