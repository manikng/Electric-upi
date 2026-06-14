"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { User } from "@supabase/supabase-js";
import { Zap, Clock, CheckCircle2, ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";

// Warm grounded styling inline (avoid Tailwind Preflight conflicts)
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
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    transition: "border-color 160ms ease",
  } as React.CSSProperties,

  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "40px 24px",
  } as React.CSSProperties,

  title: {
    fontSize: "32px",
    fontWeight: 700,
    color: "#1a1916",
    marginBottom: "8px",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  subtitle: {
    fontSize: "15px",
    color: "#6e6b63",
    marginBottom: "32px",
    lineHeight: 1.5,
  } as React.CSSProperties,

  card: {
    background: "white",
    border: "1.5px solid #e2dfd8",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
    position: "relative" as const,
  } as React.CSSProperties,

  badge: (status: string) => {
    let bg = "#e2dfd8";
    let color = "#6e6b63";
    if (status === "pending_host_accept") {
      bg = "#fef3c7";
      color = "#b45309";
    } else if (status === "awaiting_driver_arrival") {
      bg = "#dbeafe";
      color = "#1d4ed8";
    } else if (status === "verified" || status === "charging") {
      bg = "#dcfce7";
      color = "#15803d";
    } else if (status === "completed") {
      bg = "#f3f4f6";
      color = "#374151";
    }
    return {
      background: bg,
      color: color,
      padding: "4px 10px",
      borderRadius: "6px",
      fontSize: "11px",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.04em",
      display: "inline-block",
      width: "fit-content",
    };
  },

  btn: {
    padding: "10px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "opacity 150ms ease",
  } as React.CSSProperties,

  input: {
    height: "42px",
    padding: "0 12px",
    border: "1.5px solid #d1cdc3",
    borderRadius: "8px",
    fontSize: "15px",
    outline: "none",
    width: "160px",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textAlign: "center" as const,
  } as React.CSSProperties,
};

export default function HostBookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [otpInputs, setOtpInputs] = useState<{ [bookingId: string]: string }>({});
  const [successMsg, setSuccessMsg] = useState("");

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        fetchHostBookings();
      }
    }
    checkAuth();
  }, []);

  // Poll status every 5 seconds to reflect driver's real-time transitions (e.g. driver ended)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchHostBookings(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  async function fetchHostBookings(showLoader = true) {
    if (showLoader) setLoading(true);
    setError("");
    try {
      // Fetch bookings where host is the currently signed-in user
      const res = await fetch("/api/bookings/host");
      if (res.ok) {
        const data = await res.json();
        setBookingsList(data.bookings || []);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load bookings.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  const handleAccept = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept booking.");
      } else {
        setSuccessMsg("Booking accepted! OTP has been generated.");
        fetchHostBookings(false);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to communicate with the server.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleVerifyOtp = async (bookingId: string) => {
    const code = otpInputs[bookingId]?.trim();
    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setActionLoadingId(bookingId);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid verification code.");
      } else {
        setSuccessMsg("Driver verified! The charging session can begin.");
        // Clear input
        setOtpInputs(prev => ({ ...prev, [bookingId]: "" }));
        fetchHostBookings(false);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to verify code.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleStartCharging = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start charging.");
      } else {
        fetchHostBookings(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId("");
    }
  };

  const handleEndCharging = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/end`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to end charging.");
      } else {
        fetchHostBookings(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId("");
    }
  };

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <h1 style={S.title}>Host Dashboard</h1>
            <p style={S.subtitle}>Manage booking requests and live charging sessions for your listings.</p>
          </div>
          <button
            onClick={() => fetchHostBookings(true)}
            style={{
              background: "white",
              border: "1.5px solid #d1cdc3",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
            aria-label="Refresh bookings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div style={{ color: "#b91c1c", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px", fontSize: "14px", fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div style={{ color: "#15803d", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px", fontSize: "14px", fontWeight: 600 }}>
            ✓ {successMsg}
          </div>
        )}

        {/* Main List */}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ background: "white", border: "1.5px solid #e2dfd8", height: "180px", borderRadius: "16px", marginBottom: "20px" }} />
          ))
        ) : bookingsList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", border: "1.5px dashed #d1cdc3", borderRadius: "16px", color: "#6e6b63" }}>
            <Zap className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p style={{ fontWeight: 600, fontSize: "16px", margin: 0 }}>No booking requests found</p>
            <p style={{ fontSize: "13px", marginTop: "4px" }}>When drivers request bookings for your charger, they will appear here.</p>
          </div>
        ) : (
          bookingsList.map((booking) => (
            <div key={booking.id} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>{booking.chargerTitle}</h3>
                  <span style={{ fontSize: "12px", color: "#6e6b63" }}>Requested by: <strong>{booking.driverName || booking.driverEmail}</strong></span>
                </div>
                <div style={S.badge(booking.status)}>
                  {booking.status.replace(/_/g, " ")}
                </div>
              </div>

              {/* Status Specific Info */}
              {booking.status === "awaiting_driver_arrival" && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span style={{ fontSize: "13px", color: "#334155", fontWeight: 600 }}>Driver is arriving. Enter their 6-digit code:</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={otpInputs[booking.id] || ""}
                      onChange={(e) => setOtpInputs(prev => ({ ...prev, [booking.id]: e.target.value.replace(/\D/g, "") }))}
                      style={S.input}
                    />
                    <button
                      onClick={() => handleVerifyOtp(booking.id)}
                      disabled={actionLoadingId !== ""}
                      style={{
                        ...S.btn,
                        background: "#1d4ed8",
                        color: "white",
                        opacity: actionLoadingId !== "" ? 0.7 : 1
                      }}
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}

              {booking.status === "verified" && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span style={{ fontSize: "13px", color: "#166534", fontWeight: 600 }}>Driver verified. Plug in vehicle and start charging:</span>
                  </div>
                  <button
                    onClick={() => handleStartCharging(booking.id)}
                    disabled={actionLoadingId !== ""}
                    style={{
                      ...S.btn,
                      background: "#16a34a",
                      color: "white",
                      opacity: actionLoadingId !== "" ? 0.7 : 1
                    }}
                  >
                    Start Charging
                  </button>
                </div>
              )}

              {booking.status === "charging" && (
                <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "10px", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Zap className="w-4 h-4 text-pink-600 animate-bounce" />
                    <span style={{ fontSize: "13px", color: "#9d174d", fontWeight: 600 }}>Session Active. Charging vehicle...</span>
                  </div>
                  <button
                    onClick={() => handleEndCharging(booking.id)}
                    disabled={actionLoadingId !== ""}
                    style={{
                      ...S.btn,
                      background: "#db2777",
                      color: "white",
                      opacity: actionLoadingId !== "" ? 0.7 : 1
                    }}
                  >
                    End Session
                  </button>
                </div>
              )}

              {booking.status === "completed" && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#334155" }}>
                  Session successfully finished. Completed <strong>{booking.energyKwh || "10.5"} kWh</strong> for <strong>₹{(parseFloat(booking.pricePerKwh) * parseFloat(booking.energyKwh || "10.5")).toFixed(2)}</strong>. UPI payment split complete.
                </div>
              )}

              {/* Actions Footer for pending */}
              {booking.status === "pending_host_accept" && (
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    onClick={() => handleAccept(booking.id)}
                    disabled={actionLoadingId !== ""}
                    style={{
                      ...S.btn,
                      background: "linear-gradient(135deg, #1a6b4a, #22914f)",
                      color: "white",
                      opacity: actionLoadingId === booking.id ? 0.7 : 1
                    }}
                  >
                    Accept Request
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
