"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import Link from "next/link";

interface ListChargerClientProps {
  user: User;
}

// ── Inline styles (immune to global CSS/Tailwind conflicts) ──
const S = {
  page: {
    minHeight: "100vh",
    background: "var(--color-bg, #f7f5f0)",
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
    maxWidth: "680px",
    margin: "0 auto",
    padding: "40px 24px",
  } as React.CSSProperties,

  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#c8dfd4",
    color: "#1a6b4a",
    padding: "4px 12px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    marginBottom: "16px",
  } as React.CSSProperties,

  pageTitle: {
    fontSize: "clamp(28px, 5vw, 40px)",
    fontWeight: 700,
    color: "#1a1916",
    lineHeight: 1.15,
    marginBottom: "10px",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  pageSubtitle: {
    fontSize: "16px",
    color: "#6e6b63",
    marginBottom: "36px",
    lineHeight: 1.6,
    maxWidth: "100%",
  } as React.CSSProperties,

  earningsBanner: {
    background: "linear-gradient(135deg, #1a6b4a 0%, #22914f 100%)",
    borderRadius: "16px",
    padding: "20px 24px",
    marginBottom: "32px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    color: "white",
    flexWrap: "wrap" as const,
  } as React.CSSProperties,

  earningsStat: {
    textAlign: "center" as const,
    flex: 1,
    minWidth: "100px",
  } as React.CSSProperties,

  earningsNum: {
    fontSize: "24px",
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: "4px",
  } as React.CSSProperties,

  earningsLabel: {
    fontSize: "11px",
    opacity: 0.8,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,

  divider: {
    width: "1px",
    height: "40px",
    background: "rgba(255,255,255,0.3)",
    flexShrink: 0,
  } as React.CSSProperties,

  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
  } as React.CSSProperties,

  section: {
    background: "white",
    border: "1.5px solid #e2dfd8",
    borderRadius: "16px",
    padding: "24px",
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#1a1916",
    marginBottom: "18px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  } as React.CSSProperties,

  sectionIcon: {
    width: "28px",
    height: "28px",
    background: "#c8dfd4",
    borderRadius: "7px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#1a6b4a",
    flexShrink: 0,
  } as React.CSSProperties,

  fieldGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  } as React.CSSProperties,

  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  } as React.CSSProperties,

  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#1a1916",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
  } as React.CSSProperties,

  input: {
    width: "100%",
    height: "48px",
    padding: "0 14px",
    border: "1.5px solid #d1cdc3",
    borderRadius: "10px",
    background: "#fafaf8",
    color: "#1a1916",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 160ms ease, box-shadow 160ms ease",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    minHeight: "100px",
    padding: "12px 14px",
    border: "1.5px solid #d1cdc3",
    borderRadius: "10px",
    background: "#fafaf8",
    color: "#1a1916",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    fontSize: "15px",
    outline: "none",
    resize: "vertical" as const,
    transition: "border-color 160ms ease, box-shadow 160ms ease",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,

  select: {
    width: "100%",
    height: "48px",
    padding: "0 14px",
    border: "1.5px solid #d1cdc3",
    borderRadius: "10px",
    background: "#fafaf8",
    color: "#1a1916",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    fontSize: "15px",
    outline: "none",
    cursor: "pointer",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6b63' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    paddingRight: "40px",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,

  tagGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    marginTop: "2px",
  } as React.CSSProperties,

  tag: (active: boolean): React.CSSProperties => ({
    padding: "7px 14px",
    borderRadius: "9999px",
    border: active ? "1.5px solid #1a6b4a" : "1.5px solid #d1cdc3",
    background: active ? "#c8dfd4" : "#fafaf8",
    color: active ? "#1a6b4a" : "#6e6b63",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    transition: "all 140ms ease",
    userSelect: "none",
    pointerEvents: "auto",
  }),

  helperText: {
    fontSize: "11px",
    color: "#a09d96",
    marginTop: "4px",
  } as React.CSSProperties,

  submitBtn: {
    width: "100%",
    padding: "15px 24px",
    background: "linear-gradient(135deg, #1a6b4a, #22914f)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow: "0 8px 24px rgba(26,107,74,0.25)",
    transition: "opacity 160ms ease, transform 160ms ease",
    letterSpacing: "0.01em",
    pointerEvents: "auto" as const,
    zIndex: 2,
    position: "relative" as const,
  } as React.CSSProperties,

  successCard: {
    background: "#f0fdf4",
    border: "1.5px solid #bbf7d0",
    borderRadius: "16px",
    padding: "32px 24px",
    textAlign: "center" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "12px",
  } as React.CSSProperties,
} as const;

const AMENITY_TAGS = [
  "24/7 Access",
  "Covered Parking",
  "WiFi Available",
  "CCTV",
  "Gated Society",
  "Visitor Parking",
  "EV Cable Included",
  "Night Charging",
  "Lift Access",
  "Wheelchair Accessible",
];

export default function ListChargerClient({ user }: ListChargerClientProps) {
  const router = useRouter();
  // Asli file ko hold karne ke liye (jo submit ke waqt upload hogi)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Local browser preview URL ke liye
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    charger_name: "",
    charger_type: "AC Charger",
    power_kw: "",
    plug_type: "Type 2",
    address: "",
    city: "Delhi",
    area: "",
    pincode: "",
    state: "Delhi",
    price_per_kwh: "",
    available_from: "07:00",
    available_to: "22:00",
    description: "",
    amenities: [] as string[],
    vehicle_segments: ["4-Wheeler"] as string[],
    image_url: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleAmenity = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(tag)
        ? prev.amenities.filter((t) => t !== tag)
        : [...prev.amenities, tag],
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    // File size validation (Maximum 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size should be less than 5MB");
      return;
    }

    // 1. Asli file ko state mein save karlo baad me submit karne ke liye
    setSelectedFile(file);

    // 2. Browser memory me temporary preview link banao
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Form image_url me temporary link daal do taaki preview tag (<img src={form.image_url} />) break na ho
    setForm((prev) => ({ ...prev, image_url: localUrl }));
  };


  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#1a6b4a";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,107,74,0.12)";
  };

  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#d1cdc3";
    e.currentTarget.style.boxShadow = "none";
  };

  // async function handleSubmit(e: React.FormEvent) {
  //   e.preventDefault();
  //   setError("");
  //   setUploadError("");
  //   setIsSubmitting(true);

  //   if (!form.image_url) {
  //     setError("Please upload a photo of your charger setup.");
  //     setIsSubmitting(false);
  //     return;
  //   }

  //   if (form.vehicle_segments.length === 0) {
  //     setError("Please select at least one compatible vehicle type.");
  //     setIsSubmitting(false);
  //     return;
  //   }

  //   try {
  //     const res = await fetch("/api/chargers", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         title: form.charger_name.trim(),
  //         charger_type: form.charger_type,
  //         power_kw: form.power_kw,
  //         plug_type: form.plug_type,
  //         address: form.address.trim(),
  //         city: form.city,
  //         area: form.area.trim(),
  //         pincode: form.pincode.trim(),
  //         state: form.state,
  //         price_per_kwh: form.price_per_kwh,
  //         available_from: form.available_from,
  //         available_to: form.available_to,
  //         amenities: form.amenities,
  //         vehicle_segments: form.vehicle_segments,
  //         image_url: form.image_url,
  //         description: form.description.trim(),
  //       }),
  //     });

  //     const data = await res.json();

  //     if (!res.ok) {
  //       setError(data.error || "Failed to list charger. Please try again.");
  //       setIsSubmitting(false);
  //       return;
  //     }

  //     setIsSubmitting(false);
  //     setSubmitted(true);
  //   } catch (err) {
  //     console.error("Submit error:", err);
  //     setError("Network error. Check your connection and try again.");
  //     setIsSubmitting(false);
  //   }
  // }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUploadError("");
    setIsSubmitting(true);

    // Validation Check
    if (!selectedFile) {
      setError("Please upload a photo of your charger setup.");
      setIsSubmitting(false);
      return;
    }

    if (form.vehicle_segments.length === 0) {
      setError("Please select at least one compatible vehicle type.");
      setIsSubmitting(false);
      return;
    }

    try {
      let finalImageUrl = "";

      // === YAHA REAL UPLOAD HOGA JAB USER SUBMIT KAREGA ===
      if (selectedFile) {
        setUploading(true); // agar upar state bani ho toh use kar sakte hain
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Failed to upload image to server.");
        }

        // Asli Cloud/Supabase URL jo server ne return kiya
        finalImageUrl = uploadData.url;
      }
      // ====================================================

      // Ab niche aapka pehle wala API call chalega, bas image_url me 'finalImageUrl' pass karna:
      const res = await fetch("/api/chargers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.charger_name.trim(),
          charger_type: form.charger_type,
          power_kw: form.power_kw,
          plug_type: form.plug_type,
          address: form.address.trim(),
          city: form.city,
          area: form.area.trim(),
          pincode: form.pincode.trim(),
          state: form.state,
          price_per_kwh: form.price_per_kwh,
          available_from: form.available_from,
          available_to: form.available_to,
          amenities: form.amenities,
          vehicle_segments: form.vehicle_segments,
          image_url: finalImageUrl, // <-- YAHAN ASLI CDN URL DE DO
          description: form.description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to list charger. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Memory clean karne ke liye temporary link destroy karein
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setIsSubmitting(false);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Network error. Check your connection and try again.");
      setIsSubmitting(false);
    } finally {
      setUploading(false);
    }
  }

  if (submitted) {
    return (
      <div style={S.page}>
        <nav style={S.nav}>
          <Link href="/" style={S.navLogo}>
            <div style={S.logoIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
              </svg>
            </div>
            <span>Electric UPI</span>
          </Link>
        </nav>
        <div style={S.container}>
          <div style={S.successCard}>
            <div style={{ fontSize: "56px" }}>⚡</div>
            <h1 style={{ ...S.pageTitle, textAlign: "center", fontSize: "26px" }}>
              Charger Listed Successfully!
            </h1>
            <p style={{ ...S.pageSubtitle, textAlign: "center", marginBottom: "0" }}>
              Your listing is under review. We'll notify you at{" "}
              <strong>{user.email}</strong> within 24 hours once it's live.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: "8px",
              }}
            >
              <Link
                href="/"
                style={{
                  ...S.backBtn,
                  marginLeft: 0,
                  background: "linear-gradient(135deg, #1a6b4a, #22914f)",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                }}
              >
                ← Back to Home
              </Link>
              <button
                style={{ ...S.backBtn, marginLeft: 0 }}
                onClick={() => { setSubmitted(false); setForm({ charger_name: "", charger_type: "AC Charger", power_kw: "", plug_type: "Type 2", address: "", city: "Delhi", area: "", pincode: "", state: "Delhi", price_per_kwh: "", available_from: "07:00", available_to: "22:00", description: "", amenities: [], vehicle_segments: ["4-Wheeler"], image_url: "" }); }}
              >
                List Another Charger
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* ── Navbar ── */}
      <nav style={S.nav}>
        <Link href="/" style={S.navLogo}>
          <div style={S.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
            </svg>
          </div>
          <span>Electric UPI</span>
        </Link>

        <span style={{ fontSize: "13px", color: "#6e6b63", marginLeft: "auto", marginRight: "8px" }}>
          Signed in as <strong>{user.email}</strong>
        </span>
        <Link href="/" style={S.backBtn}>
          ← Back
        </Link>
      </nav>

      <div style={S.container}>
        {/* ── Header ── */}
        <div style={S.badge}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="currentColor" />
          </svg>
          Host Dashboard
        </div>

        <h1 style={S.pageTitle}>
          List Your Charger
        </h1>
        <p style={S.pageSubtitle}>
          Join 1,200+ hosts earning ₹2,000–₹8,000/month by sharing their EV
          charger. Setup takes under 5 minutes.
        </p>

        {/* ── Earnings Banner ── */}
        <div style={S.earningsBanner}>
          <div style={S.earningsStat}>
            <div style={S.earningsNum}>₹8,000</div>
            <div style={S.earningsLabel}>Max monthly earnings</div>
          </div>
          <div style={S.divider} />
          <div style={S.earningsStat}>
            <div style={S.earningsNum}>5 min</div>
            <div style={S.earningsLabel}>To list your charger</div>
          </div>
          <div style={S.divider} />
          <div style={S.earningsStat}>
            <div style={S.earningsNum}>4.9★</div>
            <div style={S.earningsLabel}>Avg host rating</div>
          </div>
          <div style={S.divider} />
          <div style={S.earningsStat}>
            <div style={S.earningsNum}>₹0</div>
            <div style={S.earningsLabel}>Listing fee, always free</div>
          </div>
        </div>

        {/* ── Form ── */}
        <form style={S.form} onSubmit={handleSubmit}>

          {/* Section 1 — Charger Info */}
          <div style={S.section}>
            <div style={S.sectionTitle}>
              <div style={S.sectionIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" /></svg>
              </div>
              Charger Details
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={S.fieldGroup}>
                <label style={S.label} htmlFor="charger_name">Listing Title</label>
                <input
                  id="charger_name"
                  style={S.input}
                  placeholder="e.g. Rahul's Level 2 Home Charger — Green Park"
                  required
                  value={form.charger_name}
                  onChange={(e) => set("charger_name", e.target.value)}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>

              <div style={S.fieldGrid2}>
                <div style={S.fieldGroup}>
                  <label style={S.label} htmlFor="charger_type">Charger Type</label>
                  <select id="charger_type" style={S.select} value={form.charger_type} onChange={(e) => set("charger_type", e.target.value)} onFocus={focusStyle} onBlur={blurStyle}>
                    <option>AC Charger</option>
                    <option>DC Fast Charger</option>
                    <option>Level 1 (Slow)</option>
                  </select>
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label} htmlFor="power_kw">Power Output (kW)</label>
                  <input id="power_kw" style={S.input} type="number" min="1" max="350" placeholder="e.g. 22" required value={form.power_kw} onChange={(e) => set("power_kw", e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
              </div>

              <div style={S.fieldGrid2}>
                <div style={S.fieldGroup}>
                  <label style={S.label} htmlFor="plug_type">Plug / Connector Type</label>
                  <select id="plug_type" style={S.select} value={form.plug_type} onChange={(e) => set("plug_type", e.target.value)} onFocus={focusStyle} onBlur={blurStyle}>
                    <option>Type 2</option>
                    <option>CCS2</option>
                    <option>CHAdeMO</option>
                    <option>GB/T</option>
                    <option>Bharat AC-001</option>
                    <option>3-Pin (Regular)</option>
                  </select>
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label} htmlFor="price_per_kwh">Your Price (₹ / kWh)</label>
                  <input id="price_per_kwh" style={S.input} type="number" min="1" max="50" step="0.5" placeholder="e.g. 5.50" required value={form.price_per_kwh} onChange={(e) => set("price_per_kwh", e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                  <span style={S.helperText}>Avg in Delhi: ₹5–₹7/kWh</span>
                </div>
              </div>

              <div style={S.fieldGroup}>
                <label style={S.label}>Compatible Vehicles</label>
                <div style={S.tagGrid}>
                  {["2-Wheeler", "3-Wheeler", "4-Wheeler"].map((seg) => {
                    const active = form.vehicle_segments.includes(seg);
                    return (
                      <button
                        key={seg}
                        type="button"
                        style={S.tag(active)}
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            vehicle_segments: active
                              ? prev.vehicle_segments.filter((s) => s !== seg)
                              : [...prev.vehicle_segments, seg],
                          }));
                        }}
                      >
                        {active ? "✓ " : ""}{seg}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 — Location */}
          <div style={S.section}>
            <div style={S.sectionTitle}>
              <div style={S.sectionIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              Location
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={S.fieldGroup}>
                <label style={S.label} htmlFor="address">Street Address</label>
                <input id="address" style={S.input} placeholder="House/flat number, street name, colony" required value={form.address} onChange={(e) => set("address", e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                <span style={S.helperText}>Exact address shown only to confirmed bookers</span>
              </div>

              <div style={S.fieldGrid2}>
                <div style={S.fieldGroup}>
                  <label style={S.label} htmlFor="city">City</label>
                  <select id="city" style={S.select} value={form.city} onChange={(e) => set("city", e.target.value)} onFocus={focusStyle} onBlur={blurStyle}>
                    {["Delhi", "Mumbai", "Bangalore", "Pune", "Hyderabad", "Chennai", "Ahmedabad", "Kolkata", "Gurgaon", "Noida"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label} htmlFor="area">Neighbourhood / Area</label>
                  <input id="area" style={S.input} placeholder="e.g. Green Park, Bandra West" required value={form.area} onChange={(e) => set("area", e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
              </div>

              <div style={S.fieldGrid2}>
                <div style={S.fieldGroup}>
                  <label style={S.label} htmlFor="pincode">Pincode (6 digits)</label>
                  <input
                    id="pincode"
                    style={S.input}
                    maxLength={6}
                    placeholder="e.g. 110016"
                    required
                    value={form.pincode}
                    onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label} htmlFor="state">State</label>
                  <select id="state" style={S.select} value={form.state} onChange={(e) => set("state", e.target.value)} onFocus={focusStyle} onBlur={blurStyle}>
                    {["Delhi", "Karnataka", "Maharashtra", "Tamil Nadu", "Telangana", "Haryana", "Uttar Pradesh", "West Bengal", "Gujarat", "Kerala", "Rajasthan", "Punjab", "Madhya Pradesh", "Goa"].map((st) => <option key={st}>{st}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 — Availability */}
          <div style={S.section}>
            <div style={S.sectionTitle}>
              <div style={S.sectionIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              </div>
              Availability Hours
            </div>

            <div style={S.fieldGrid2}>
              <div style={S.fieldGroup}>
                <label style={S.label} htmlFor="available_from">Open From</label>
                <input id="available_from" style={S.input} type="time" value={form.available_from} onChange={(e) => set("available_from", e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label} htmlFor="available_to">Open Until</label>
                <input id="available_to" style={S.input} type="time" value={form.available_to} onChange={(e) => set("available_to", e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
            </div>
            <span style={{ ...S.helperText, display: "block", marginTop: "8px" }}>
              Tip: Hosts open 7 AM–10 PM earn 3× more than 9–5 only hosts.
            </span>
          </div>

          {/* Section 4 — Amenities */}
          <div style={S.section}>
            <div style={S.sectionTitle}>
              <div style={S.sectionIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
              </div>
              Amenities &amp; Features
            </div>
            <div style={S.tagGrid}>
              {AMENITY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  style={S.tag(form.amenities.includes(tag))}
                  onClick={() => toggleAmenity(tag)}
                >
                  {form.amenities.includes(tag) ? "✓ " : ""}{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Section 5 — Description */}
          <div style={S.section}>
            <div style={S.sectionTitle}>
              <div style={S.sectionIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
              </div>
              Tell Drivers About Your Setup
            </div>
            <textarea
              id="description"
              style={S.textarea}
              placeholder="Describe your charger setup, parking instructions, gate code method, your vehicle compatibility, etc. Good descriptions get 4× more bookings!"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Section 5 — Photo Upload */}
          <div style={S.section}>
            <div style={S.sectionTitle}>
              <div style={S.sectionIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              </div>
              Charger Photo
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {form.image_url ? (
                <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1.5px solid #d1cdc3" }}>
                  <img src={form.image_url} alt="Charger preview" style={{ width: "100%", height: "200px", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, image_url: "" }))}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: "rgba(0,0,0,0.6)",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "30px",
                      height: "30px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    border: "2px dashed #d1cdc3",
                    borderRadius: "10px",
                    padding: "32px 16px",
                    textAlign: "center",
                    background: "#fafaf8",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={uploading}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: uploading ? "not-allowed" : "pointer",
                    }}
                  />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6e6b63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px auto" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1916" }}>
                    {uploading ? "Uploading image..." : "Upload a photo of your charger setup"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6e6b63", marginTop: "4px" }}>
                    Supports JPEG, PNG, WebP up to 5 MB (Required)
                  </div>
                </div>
              )}
              {uploadError && (
                <div style={{ color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>
                  ⚠️ {uploadError}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ color: "#b91c1c", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="btn-list-submit"
            type="submit"
            disabled={isSubmitting || uploading}
            style={{
              ...S.submitBtn,
              opacity: (isSubmitting || uploading) ? 0.75 : 1,
              cursor: (isSubmitting || uploading) ? "not-allowed" : "pointer",
              transform: (isSubmitting || uploading) ? "scale(0.99)" : "scale(1)",
            }}
          >
            {isSubmitting ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Submitting your listing…
              </>
            ) : uploading ? (
              <>
                Image is uploading…
              </>
            ) : (
              <>
                ⚡ Publish My Charger — It's Free
              </>
            )}
          </button>

          <p style={{ ...S.helperText, textAlign: "center" }}>
            By listing, you agree to our{" "}
            <a href="#" style={{ color: "#1a6b4a", textDecoration: "none" }}>Host Terms</a>.
            Your address is only shared with confirmed bookings.
          </p>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
