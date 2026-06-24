import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { db } from "@/lib/db";
import { bookings, payments } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

// ── POST /api/bookings/[id]/pay ──
// Driver simulated UPI payment (MVP). Only after host finalized the bill.
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

    const body = await request.json();
    const pin = String(body.pin ?? "").trim();

    if (!/^\d{4}$|^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "UPI PIN must be 4 or 6 digits." }, { status: 400 });
    }

    const [booking] = await db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        billingStatus: bookings.billingStatus,
        finalAmount: bookings.finalAmount,
        driverId: bookings.driverId,
      })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.driverId !== user.id) {
      return NextResponse.json({ error: "Forbidden. Only the driver may pay for this booking." }, { status: 403 });
    }

    if (booking.status !== "completed") {
      return NextResponse.json({ error: "Payment is only available after the session is completed." }, { status: 400 });
    }

    if (booking.billingStatus !== "finalized") {
      return NextResponse.json({ error: "Host has not finalized the bill yet." }, { status: 400 });
    }

    if (!booking.finalAmount) {
      return NextResponse.json({ error: "No finalized amount on this booking." }, { status: 400 });
    }

    const [existingPayment] = await db
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(and(eq(payments.bookingId, id), eq(payments.status, "simulated_paid")))
      .limit(1);

    if (existingPayment) {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        message: "Payment already recorded for this booking.",
      }, { status: 200 });
    }

    const amount = booking.finalAmount;
    const paidAt = new Date();

    await db.insert(payments).values({
      bookingId: id,
      amount,
      status: "simulated_paid",
      paidAt,
    });

    return NextResponse.json({
      success: true,
      amount: parseFloat(amount),
      message: "Simulated payment recorded successfully.",
    }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/pay error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
