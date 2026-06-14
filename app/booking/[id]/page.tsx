"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { User } from "@supabase/supabase-js";
import { Zap, Clock, CheckCircle2, ArrowLeft, BatteryCharging, CreditCard, Shield } from "lucide-react";

// Warm premium style mapping
const S = {
  page: {
    minHeight: "100vh",
    background: "#f7f5f0",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    paddingTop: "80px",
    paddingBottom: "60px",
  } as React.CSSProperties,

  nav: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: "rgba(247,245,240,0.92)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(26,25,22,0.08)",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    height: "64px",
    gap: "16px",
  } as React.CSSProperties,

  navLogo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    textDecoration: "none",
    color: "inherit",
    fontWeight: 700,
    fontSize: "16px",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  logoIcon: {
    width: "34px",
    height: "34px",
    background: "linear-gradient(135deg, #1a6b4a, #22914f)",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as React.CSSProperties,

  backBtn: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    border: "1.5px solid #d1cdc3",
    borderRadius: "9999px",
    background: "white",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    color: "#1a1916",
    textDecoration: "none",
  } as React.CSSProperties,

  container: {
    maxWidth: "580px",
    margin: "0 auto",
    padding: "40px 24px",
  } as React.CSSProperties,

  card: {
    background: "white",
    border: "1.5px solid #e2dfd8",
    borderRadius: "20px",
    padding: "32px 24px",
    boxShadow: "0 4px 16px rgba(26,25,22,0.02)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
  } as React.CSSProperties,

  otpBox: {
    background: "#fafaf8",
    border: "1.5px solid #d1cdc3",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    alignItems: "center",
  } as React.CSSProperties,

  otpCode: {
    fontSize: "36px",
    fontWeight: 800,
    letterSpacing: "0.15em",
    color: "#1a6b4a",
    fontFamily: "monospace",
    margin: "8px 0",
  } as React.CSSProperties,

  btn: {
    padding: "14px 24px",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    boxShadow: "0 4px 12px rgba(26,107,74,0.15)",
    transition: "opacity 150ms ease",
  } as React.CSSProperties,
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
  }, []);

  // Poll status endpoint every 3 seconds to keep UI in sync with host verification
  useEffect(() => {
    if (!id || !user) return;
    const interval = setInterval(() => {
      fetchBookingStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [id, user]);

  async function fetchBookingDetails() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Booking not found.");
      } else {
        setBooking(data.booking);
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Could not retrieve booking details.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchBookingStatus() {
    try {
      const res = await fetch(`/api/bookings/${id}/status`);
      if (res.ok) {
        const data = await res.json();
        // If the status has changed, trigger a full refresh to get updated model relations
        setBooking((prev: any) => {
          if (prev && prev.status !== data.status) {
            fetchBookingDetails();
          }
          return prev ? { ...prev, status: data.status, secretCode: data.secretCode || prev.secretCode } : null;
        });
      }
    } catch (err) {
      console.warn("Polling error:", err);
    }
  }

  const handleRegenerateCode = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${id}/regenerate-code`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to regenerate code.");
      } else {
        setBooking((prev: any) => ({
          ...prev,
          secretCode: data.secretCode,
          codeExpiresAt: data.codeExpiresAt,
        }));
      }
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

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (upiPin.length !== 4 && upiPin.length !== 6) {
      setError("UPI PIN must be 4 or 6 digits.");
      return;
    }
    setPaymentSuccess(true);
    setError("");
  };

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={{ ...S.card, alignItems: "center", padding: "48px 24px" }}>
            <Zap className="w-8 h-8 text-primary animate-bounce" />
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#6e6b63" }}>Retrieving booking session…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={{ ...S.card, alignItems: "center", padding: "48px 24px", textAlign: "center" }}>
            <Shield className="w-12 h-12 text-red-600 mb-3" />
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Error Fetching Session</h3>
            <p style={{ fontSize: "14px", color: "#6e6b63", marginTop: "6px" }}>{error}</p>
            <Link href="/" style={{ ...S.btn, background: "#1a6b4a", color: "white", marginTop: "16px" }}>Go back home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Navbar */}
      <nav style={S.nav}>
        <Link href="/" style={S.navLogo}>
          <div style={S.logoIcon}>
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <span style={{ color: "#1a1916" }}>Electric UPI</span>
          </div>
        </Link>
        <Link href="/" style={S.backBtn}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Home
        </Link>
      </nav>

      <div style={S.container}>
        <div style={S.card}>
          {/* Charger Info Header */}
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#1a1916" }}>
              {booking.charger.title}
            </h2>
            <p style={{ fontSize: "14px", color: "#6e6b63", marginTop: "4px", marginBottom: 0 }}>
              {booking.charger.address}, {booking.charger.city}
            </p>
          </div>

          <div style={{ borderTop: "1.5px solid #e2dfd8", paddingTop: "16px" }} />

          {/* Booking State display */}
          {booking.status === "pending_host_accept" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "20px 0", textAlign: "center" }}>
              <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
              <div>
                <h4 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>Awaiting Host Acceptance</h4>
                <p style={{ fontSize: "13px", color: "#6e6b63", marginTop: "4px", maxWidth: "320px" }}>
                  The host <strong>{booking.host.name}</strong> has been notified. This page will update automatically once accepted.
                </p>
              </div>
            </div>
          )}

          {booking.status === "awaiting_driver_arrival" && (
            <div style={S.otpBox}>
              <h4 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#1a1916" }}>
                Arrival Verification Code
              </h4>
              <p style={{ fontSize: "12px", color: "#6e6b63", margin: 0 }}>
                Tell this code to the host <strong>{booking.host.name}</strong> upon arrival. Do not share it beforehand.
              </p>
              <div style={S.otpCode}>{booking.secretCode || "------"}</div>
              <div style={{ fontSize: "12px", color: "#6e6b63" }}>
                Expires in: <span style={{ fontWeight: 700 }}>15 minutes</span>
              </div>
              <button
                onClick={handleRegenerateCode}
                disabled={actionLoading}
                style={{
                  ...S.btn,
                  background: "white",
                  border: "1.5px solid #d1cdc3",
                  color: "#1a1916",
                  boxShadow: "none",
                  marginTop: "8px",
                  opacity: actionLoading ? 0.7 : 1
                }}
              >
                Regenerate Code
              </button>
            </div>
          )}

          {booking.status === "verified" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "20px 0", textAlign: "center" }}>
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <div>
                <h4 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>Arrival Verified!</h4>
                <p style={{ fontSize: "13px", color: "#6e6b63", marginTop: "6px" }}>
                  Connect the charger cable to your EV. Tap below to start the charging session.
                </p>
              </div>
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
                style={{ ...S.btn, background: "#db2777", color: "white" }}
              >
                Stop Charging Session
              </button>
            </div>
          )}

          {booking.status === "completed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#6e6b63" }}>Energy Consumed:</span>
                  <strong style={{ fontSize: "14px" }}>{booking.energyKwh || "10.5"} kWh</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#6e6b63" }}>Rate:</span>
                  <strong style={{ fontSize: "14px" }}>₹{booking.charger.pricePerKwh.toFixed(2)} / kWh</strong>
                </div>
                <div style={{ borderTop: "1px solid #e2e8f0", margin: "4px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700 }}>Total Cost:</span>
                  <strong style={{ fontSize: "20px", color: "#1a6b4a" }}>₹{booking.cost}</strong>
                </div>
              </div>

              {paymentSuccess ? (
                <div style={{ background: "#dcfce7", border: "1.5px solid #bbf7d0", borderRadius: "12px", padding: "16px", textAlign: "center", color: "#15803d", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <CheckCircle2 className="w-8 h-8 mx-auto" />
                  <span style={{ fontWeight: 800 }}>Payment Successful!</span>
                  <span style={{ fontSize: "13px" }}>₹{booking.cost} split settled directly via UPI to host.</span>
                </div>
              ) : (
                <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#1a1916" }}>UPI PIN (Simulated Split payment)</label>
                    <input
                      type="password"
                      maxLength={6}
                      pattern="\d*"
                      placeholder="Enter 4 or 6 digit UPI PIN"
                      value={upiPin}
                      onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, ""))}
                      required
                      style={{ ...S.input, width: "100%", height: "48px" }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{ ...S.btn, background: "linear-gradient(135deg, #1a6b4a, #22914f)", color: "white" }}
                  >
                    <CreditCard className="w-4 h-4" /> Pay ₹{booking.cost} via UPI
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
