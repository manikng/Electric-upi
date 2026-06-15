"use client";

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
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    background: "linear-gradient(135deg, #1a6b4a, #22914f)",
    color: "white",
    textDecoration: "none",
  } as React.CSSProperties,
};

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { User } from "@supabase/supabase-js";
import { Zap, Clock, CheckCircle2, ArrowLeft, RefreshCw, Eye } from "lucide-react";
// app/driver/bookings/page.tsx
// Warm premium style mapping

export default function DriverBookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [error, setError] = useState("");

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        fetchDriverBookings();
      }
    }
    checkAuth();
  }, []);

  async function fetchDriverBookings() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/driver");
      if (res.ok) {
        const data = await res.json();
        setBookingsList(data.bookings || []);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load bookings history.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <h1 style={S.title}>My Bookings</h1>
            <p style={S.subtitle}>Track your requested charging sessions and past payment receipts.</p>
          </div>
          <button
            onClick={fetchDriverBookings}
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
            aria-label="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div style={{ color: "#b91c1c", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px", fontSize: "14px", fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ background: "white", border: "1.5px solid #e2dfd8", height: "140px", borderRadius: "16px", marginBottom: "20px" }} />
          ))
        ) : bookingsList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", border: "1.5px dashed #d1cdc3", borderRadius: "16px", color: "#6e6b63" }}>
            <Zap className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p style={{ fontWeight: 600, fontSize: "16px", margin: 0 }}>No bookings found</p>
            <p style={{ fontSize: "13px", marginTop: "4px" }}>Go back home and search for chargers to start booking requests.</p>
            <Link href="/" style={{ ...S.btn, marginTop: "16px" }}>Find Chargers</Link>
          </div>
        ) : (
          bookingsList.map((booking) => {
            // Only calculate cost for completed sessions with real energy data
            const isCompleted = booking.status === "completed" && booking.energyKwh;
            const price = parseFloat(booking.pricePerKwh);
            const energy = isCompleted ? parseFloat(booking.energyKwh) : null;
            const cost = isCompleted ? price * energy! : null;

            return (
              <div key={booking.id} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>{booking.chargerTitle}</h3>
                    <span style={{ fontSize: "12px", color: "#6e6b63" }}>Host: <strong>{booking.hostName || "Verified Host"}</strong></span>
                  </div>
                  <div style={S.badge(booking.status)}>
                    {booking.status.replace(/_/g, " ")}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderTop: "1px solid #f0ede6", paddingTop: "14px" }}>
                  <div>
                    {isCompleted ? (
                      <span style={{ fontSize: "13px", color: "#6e6b63" }}>
                        Charged <strong>{energy} kWh</strong> for <strong>₹{cost!.toFixed(2)}</strong> on {new Date(booking.createdAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span style={{ fontSize: "13px", color: "#6e6b63" }}>
                        Requested on {new Date(booking.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {booking.status !== "completed" ? (
                    <Link href={`/booking/${booking.id}`} style={S.btn}>
                      <Eye className="w-4 h-4" /> Track Session
                    </Link>
                  ) : (
                    <Link href={`/booking/${booking.id}`} style={{ ...S.btn, background: "white", border: "1.5px solid #d1cdc3", color: "#1a1916" }}>
                      View Receipt
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
