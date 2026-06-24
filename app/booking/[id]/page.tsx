"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { User } from "@supabase/supabase-js";
import { Zap, Clock, CheckCircle2, ArrowLeft, BatteryCharging, CreditCard, Shield, XCircle, Timer } from "lucide-react";
import { useBookingActions } from "./useBookingActions";

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f9f7f4 0%, #f0ebe4 100%)",
    fontFamily: "Inter, system-ui, sans-serif",
    color: "#1a1916",
  },
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "24px",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    padding: "24px",
    marginTop: "24px",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 0",
    marginBottom: "8px",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    textDecoration: "none",
    color: "#1a6b4a",
    fontWeight: 600,
    fontSize: "14px",
  },
  logoIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    background: "linear-gradient(135deg, #1a6b4a, #22914f)",
    borderRadius: "10px",
    color: "white",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "14px 20px",
    borderRadius: "12px",
    border: "none",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1.5px solid #d1cdc3",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s",
  },
};

export default function BookingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [upiPin, setUpiPin] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [holdTimeLeft, setHoldTimeLeft] = useState<number | null>(null); // seconds remaining
  const showCodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        fetchBookingDetails();
      }
    }
    checkAuth();

    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  // Countdown timer for hold expiry
  useEffect(() => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    setHoldTimeLeft(null);

    if (booking?.holdExpiresAt && booking.status === "pending_host_accept") {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((new Date(booking.holdExpiresAt).getTime() - Date.now()) / 1000));
        setHoldTimeLeft(remaining);
        if (remaining <= 0) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          fetchBookingDetails(); // refresh to get cancelled status
        }
      };
      updateTimer();
      holdTimerRef.current = setInterval(updateTimer, 1000);
    }

    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, [booking?.holdExpiresAt, booking?.status]);

  async function fetchBookingDetails() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Booking not found.");
      } else {
        setBooking(data.booking);
        setPaymentSuccess(!!data.booking.isPaid);
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Could not retrieve booking details.");
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateCode = async () => {
    setActionLoading(true);
    setError("");
    if (showCodeTimer.current) clearTimeout(showCodeTimer.current);

    try {
      const res = await fetch(`/api/bookings/${id}/generate-code`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate code.");
        return;
      }

      await fetchBookingDetails();
      setShowCode(true);
      showCodeTimer.current = setTimeout(() => {
        setShowCode(false);
      }, 3500);
    } catch (err) {
      console.error(err);
      setError("Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    setActionLoading(true);
    setError("");
    if (showCodeTimer.current) clearTimeout(showCodeTimer.current);

    try {
      const res = await fetch(`/api/bookings/${id}/regenerate-code`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to regenerate code.");
        return;
      }

      await fetchBookingDetails();
      setShowCode(true);
      showCodeTimer.current = setTimeout(() => {
        setShowCode(false);
      }, 3500);
    } catch (err) {
      console.error(err);
      setError("Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartCharging = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}/start`, { method: "POST" });
      if (res.ok) {
        fetchBookingDetails();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to start session.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndCharging = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}/end`, { method: "POST" });
      if (res.ok) {
        fetchBookingDetails();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to stop session.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

const { cancelBooking } = useBookingActions(id);

const handleCancelBooking = () => cancelBooking(setActionLoading, setError);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (upiPin.length !== 4 && upiPin.length !== 6) {
      setError("UPI PIN must be 4 or 6 digits.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: upiPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Payment failed.");
        return;
      }
      setPaymentSuccess(true);
      await fetchBookingDetails();
    } catch (err) {
      console.error(err);
      setError("Network error during payment.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={S.page}>
        <div style={{ ...S.container, textAlign: "center", paddingTop: "60px" }}>
          <div style={{ fontSize: "18px", color: "#6e6b63" }}>Loading booking details...</div>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div style={S.page}>
        <div style={{ ...S.container, ...S.card, color: "#b91c1c", background: "#fef2f2", border: "1.5px solid #fca5a5" }}>
          <p style={{ margin: 0 }}>{error}</p>
          <Link href="/" style={{ ...S.navLink, marginTop: "12px", alignSelf: "flex-start" }}>
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={S.page}>
        <div style={{ ...S.container, ...S.card, textAlign: "center" }}>
          <p style={{ margin: 0, color: "#6e6b63" }}>Booking not found.</p>
          <Link href="/" style={{ ...S.navLink, marginTop: "12px", alignSelf: "flex-start" }}>
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const chargerPowerKw = booking?.charger?.powerKw ?? 7;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <Link href="/" style={S.navLink}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div style={S.logoIcon}>
          <Zap size={18} fill="white" />
        </div>
      </nav>

      <div style={S.container}>
        <div style={S.card}>
          {/* Charger info */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <Zap size={24} className="text-pink-500" />
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1a1916" }}>
                {booking.charger?.name}
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#6e6b63" }}>
                {booking.charger?.address}
              </p>
            </div>
          </div>

          {/* OTP / Code */}
          {booking.status === "pending_host_accept" && (
            <div style={{ textAlign: "center", padding: "2rem 1.5rem", maxWidth: "500px", margin: "0 auto" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <Timer className="w-20 h-20 text-amber-500" />
                <h4 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a1916" }}>Host Approval Pending</h4>
                <p style={{ fontSize: "13px", color: "#6e6b63", textAlign: "center" }}>
                  The host <strong>{booking.host.name}</strong> needs to accept your request within the next {holdTimeLeft !== null && holdTimeLeft > 0 ? `${Math.floor(holdTimeLeft / 60)}:${String(holdTimeLeft % 60).padStart(2, "0")}` : "0:00"} seconds.
                </p>
                {holdTimeLeft !== null && holdTimeLeft > 0 ? (
                  <div style={{
                    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                    border: "1px solid #f59e0b",
                    borderRadius: "12px",
                    padding: "0.75rem 1.25rem",
                    marginBottom: "1rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}>
                    <Timer className="w-5 h-5 text-amber-600" />
                    <span style={{ fontWeight: 700, color: "#92400e", fontSize: "1.1rem" }}>
                      Expires in {Math.floor(holdTimeLeft / 60)}:{String(holdTimeLeft % 60).padStart(2, "0")}
                    </span>
                  </div>
                ) : null}
              </div>
              <button
                onClick={handleCancelBooking}
                disabled={actionLoading || holdTimeLeft === 0}
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "#fff",
                  border: "none",
                  padding: "0.75rem 2rem",
                  borderRadius: "12px",
                  fontWeight: 600,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  opacity: actionLoading ? 0.6 : 1,
                  marginBottom: "1rem"
                }}
              >
                {actionLoading ? "Cancelling..." : "Cancel Booking"}
              </button>
            </div>
          )}

          {booking.status === "awaiting_driver_arrival" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "20px 0", textAlign: "center" }}>
          <Shield className="w-16 h-16 text-amber-500" />
          <div>
            <h4 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "#1a1916" }}>Generate Arrival Code</h4>
            <p style={{ fontSize: "13px", color: "#6e6b63", marginTop: "6px" }}>
              Generate a 6-digit OTP and share it with host <strong>{booking.host?.name}</strong> to begin your session.
            </p>
          </div>
          {showCode && booking.secretCode && (
            <div style={{
              background: "linear-gradient(135deg, #fef3c7, #fde68a)",
              border: "2px dashed #f59e0b",
              borderRadius: "12px",
              padding: "16px 24px",
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "0.2em",
              color: "#92400e",
            }}>
              {booking.secretCode}
            </div>
          )}
          <button
            onClick={handleGenerateCode}
            disabled={actionLoading}
            style={{
              ...S.btn,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "white",
              opacity: actionLoading ? 0.7 : 1,
            }}
          >
            <Shield className="w-4 h-4" />
            {actionLoading ? "Generating..." : showCode ? "Regenerate Code" : "Generate OTP Code"}
          </button>
          {showCode && (
            <p style={{ fontSize: "12px", color: "#6e6b63", marginTop: "4px" }}>
              Share this code with the host. They will verify it to start the charging session.
            </p>
          )}
        </div>
      )}
      {(booking.status === "verified" || booking.status === "active") && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "20px 0", textAlign: "center" }}>
              <CheckCircle2 className="w-16 h-16 text-green-600" />
              <div>
                <h4 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "#1a6b4a" }}>
                  {booking.status === "verified" ? "Host Verified Arrival" : "Ready to Charge"}
                </h4>
                <p style={{ fontSize: "13px", color: "#6e6b63", marginTop: "6px" }}>
                  {booking.status === "verified"
                    ? "The host has verified your arrival. Select charging duration to begin."
                    : "Your booking is active. Select duration and start charging."}
                </p>
              </div>

              {/* Duration selector */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  { label: "10 min", minutes: 10 },
                  { label: "15 min", minutes: 15 },
                  { label: "30 min", minutes: 30 },
                  { label: "1 hr", minutes: 60 },
                  { label: "2 hr", minutes: 120 },
                ].map(({ label, minutes }) => (
                  <button
                    key={minutes}
                    onClick={() => setSelectedDuration(minutes)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "9999px",
                      border: selectedDuration === minutes ? "2px solid #1a6b4a" : "1.5px solid #d1cdc3",
                      background: selectedDuration === minutes ? "#f0fdf4" : "white",
                      color: selectedDuration === minutes ? "#1a6b4a" : "#1a1916",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Estimated cost — frontend only, no backend billing */}
              {selectedDuration !== null && (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "12px", padding: "12px 20px", fontSize: "14px", color: "#15803d", fontWeight: 600 }}>
                  Estimated cost: ₹{((chargerPowerKw * (selectedDuration / 60)) * (booking?.charger?.pricePerKwh || 0)).toFixed(2)}
                  <span style={{ fontWeight: 400, color: "#6e6b63", fontSize: "12px", marginLeft: "6px" }}>
                    ({selectedDuration} min @ {chargerPowerKw} kW)
                  </span>
                </div>
              )}

              <button
                onClick={handleStartCharging}
                disabled={actionLoading}
                style={{ ...S.btn, background: "linear-gradient(135deg, #1a6b4a, #22914f)", color: "white" }}
              >
                <Zap className="w-4 h-4 fill-current" /> Start Charging
              </button>
            </div>
          )}

          {booking.status === "charging" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "20px 0", textAlign: "center" }}>
              <BatteryCharging className="w-16 h-16 text-pink-500 animate-pulse" />
              <div>
                <h4 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "#9d174d" }}>Charging Active</h4>
                <p style={{ fontSize: "13px", color: "#6e6b63", marginTop: "6px" }}>
                  Power is transferring to your EV. Tap stop once you have completed your charge.
                </p>
              </div>
              <button
                onClick={handleEndCharging}
                disabled={actionLoading}
                style={{ ...S.btn, background: "linear-gradient(135deg, #b91c1c, #dc2626)", color: "white" }}
              >
                <BatteryCharging className="w-4 h-4" /> Stop Charging
              </button>
            </div>
          )}

          {booking.status === "completed" && booking.billingStatus === "draft" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "20px 0", textAlign: "center" }}>
              <Clock className="w-16 h-16 text-pink-500" />
              <div>
                <h4 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "#9d174d" }}>Session Complete</h4>
                <p style={{ fontSize: "13px", color: "#6e6b63", marginTop: "6px" }}>
                  The host is reviewing your session and will finalize billing shortly.
                </p>
              </div>
            </div>
          )}

          {booking.status === "completed" && booking.billingStatus === "finalized" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "12px", padding: "16px" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 800, color: "#1a6b4a" }}>Bill Summary</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px", color: "#1a1916" }}>
                  <div>Energy</div>
                  <div style={{ textAlign: "right" }}>{booking.energyKwh?.toFixed(2)} kWh</div>
                  <div>Duration</div>
                  <div style={{ textAlign: "right" }}>{Math.round(booking.durationMinutes)} min</div>
                  <div>Rate</div>
                  <div style={{ textAlign: "right" }}>₹{booking.charger.pricePerKwh}/kWh</div>
                  <div style={{ fontWeight: 700, borderTop: "1px solid #bbf7d0", paddingTop: "8px", marginTop: "4px" }}>Total</div>
                  <div style={{ textAlign: "right", fontWeight: 700, borderTop: "1px solid #bbf7d0", paddingTop: "8px", marginTop: "4px" }}>₹{booking.cost?.toFixed(2)}</div>
                </div>
              </div>

              {paymentSuccess || booking.isPaid ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#1a6b4a", fontWeight: 600 }}>
                  <CheckCircle2 size={20} />
                  <span>Payment successful</span>
                  {booking.isPaid && <span style={{ color: "#6e6b63", fontWeight: 400 }}>(already paid)</span>}
                </div>
              ) : (
                <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#1a1916" }}>
                      UPI PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={upiPin}
                      onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      style={S.input}
                      placeholder="Enter 4 or 6 digit PIN"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{ ...S.btn, background: "linear-gradient(135deg, #1a6b4a, #22914f)", color: "white", opacity: actionLoading ? 0.7 : 1 }}
                  >
                    <CreditCard className="w-4 h-4" /> Pay ₹{booking.cost?.toFixed(2)} via UPI
                  </button>
                </form>
              )}
            </div>
          )}

          {error && (
            <div style={{ color: "#b91c1c", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "10px", padding: "12px 14px", fontSize: "13px", fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
