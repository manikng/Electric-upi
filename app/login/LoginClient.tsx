"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Suspense } from "react";
import Link from "next/link";

type LoginClientProps = {
  user: User | null;
};

type Mode = "signin" | "signup";

// ──────────────────────────────────────────────
// Inline style objects (immune to Tailwind/globals overrides)
// ──────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f2419 0%, #1a3d2a 50%, #0d1f14 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    WebkitFontSmoothing: "antialiased",
    position: "relative" as const,
    overflow: "hidden",
  },
  bgOrb1: {
    position: "absolute" as const,
    top: "-20%",
    left: "-10%",
    width: "600px",
    height: "600px",
    background: "radial-gradient(circle, rgba(52, 199, 122, 0.15) 0%, transparent 70%)",
    pointerEvents: "none" as const,
  },
  bgOrb2: {
    position: "absolute" as const,
    bottom: "-20%",
    right: "-10%",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(26, 107, 74, 0.2) 0%, transparent 70%)",
    pointerEvents: "none" as const,
  },
  card: {
    position: "relative" as const,
    zIndex: 1,
    width: "100%",
    maxWidth: "480px",
    background: "rgba(255,255,255,0.97)",
    borderRadius: "20px",
    boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)",
    padding: "40px 40px 36px",
    backdropFilter: "blur(20px)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "28px",
    justifyContent: "center",
  },
  logoIconWrap: {
    width: "40px",
    height: "40px",
    background: "linear-gradient(135deg, #1a6b4a, #34c77a)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#1a1916",
    letterSpacing: "-0.02em",
  },
  heading: {
    fontSize: "26px",
    fontWeight: 700,
    color: "#1a1916",
    textAlign: "center" as const,
    marginBottom: "6px",
  },
  subheading: {
    fontSize: "14px",
    color: "#6e6b63",
    textAlign: "center" as const,
    marginBottom: "28px",
  },
  // ── TABS ──
  tabsWrap: {
    display: "flex",
    background: "#f0f0ee",
    borderRadius: "10px",
    padding: "4px",
    marginBottom: "24px",
    border: "1px solid #e2e0da",
  },
  tabBtn: (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "10px 0",
    fontSize: "14px",
    fontWeight: 600,
    borderRadius: "7px",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    transition: "all 160ms ease",
    background: active ? "#ffffff" : "transparent",
    color: active ? "#1a1916" : "#6e6b63",
    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
    outline: "none",
    userSelect: "none" as const,
    WebkitUserSelect: "none" as const,
    pointerEvents: "auto" as const,
    position: "relative" as const,
    zIndex: 2,
  }),
  // ── GOOGLE BTN ──
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "12px 16px",
    border: "1.5px solid #d8d5ce",
    borderRadius: "10px",
    background: "#ffffff",
    cursor: "pointer",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    fontSize: "14px",
    fontWeight: 600,
    color: "#1a1916",
    transition: "background 160ms ease, border-color 160ms ease",
    marginBottom: "20px",
    outline: "none",
    pointerEvents: "auto" as const,
    zIndex: 2,
    position: "relative" as const,
  },
  // ── DIVIDER ──
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#e2e0da",
  },
  dividerText: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "#a09d96",
    whiteSpace: "nowrap" as const,
  },
  // ── FORM ──
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  fieldHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#1a1916",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
  },
  forgotBtn: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#1a6b4a",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    outline: "none",
    pointerEvents: "auto" as const,
    zIndex: 2,
    position: "relative" as const,
  },
  inputWrap: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute" as const,
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#a09d96",
    pointerEvents: "none" as const,
    zIndex: 1,
    display: "flex",
    alignItems: "center",
  },
  input: {
    display: "block",
    width: "100%",
    height: "52px",
    padding: "0 48px 0 42px",
    border: "1.5px solid #d8d5ce",
    borderRadius: "10px",
    background: "#fafaf8",
    color: "#1a1916",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 160ms ease, box-shadow 160ms ease",
    boxSizing: "border-box" as const,
  },
  // ── EYE TOGGLE ──
  toggleBtn: {
    position: "absolute" as const,
    right: "0",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "52px",
    background: "none",
    border: "none",
    padding: "0",
    cursor: "pointer",
    color: "#a09d96",
    outline: "none",
    zIndex: 3,
    pointerEvents: "auto" as const,
    flexShrink: 0,
  },
  // ── STATUS ──
  statusError: {
    fontSize: "13px",
    color: "#c0392b",
    background: "#fdf2f1",
    border: "1px solid #f5c6c2",
    borderRadius: "8px",
    padding: "10px 14px",
    textAlign: "center" as const,
    maxWidth: "100%",
  },
  statusSuccess: {
    fontSize: "13px",
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "10px 14px",
    textAlign: "center" as const,
    maxWidth: "100%",
  },
  // ── SUBMIT ──
  submitBtn: {
    width: "100%",
    padding: "14px 16px",
    marginTop: "8px",
    background: "linear-gradient(135deg, #1a6b4a, #22914f)",
    color: "#ffffff",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    fontSize: "15px",
    fontWeight: 700,
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow: "0 8px 24px rgba(26,107,74,0.25)",
    transition: "opacity 160ms ease, transform 160ms ease",
    outline: "none",
    pointerEvents: "auto" as const,
    zIndex: 2,
    position: "relative" as const,
    letterSpacing: "0.01em",
  },
  footerNote: {
    marginTop: "20px",
    textAlign: "center" as const,
    fontSize: "12px",
    color: "#a09d96",
    maxWidth: "100%",
  },
  footerLink: {
    color: "#1a6b4a",
    textDecoration: "none" as const,
  },
  // ── SIGNED IN ──
  signedPage: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f2419 0%, #1a3d2a 50%, #0d1f14 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
  },
  signedCard: {
    width: "100%",
    maxWidth: "480px",
    background: "rgba(255,255,255,0.97)",
    borderRadius: "20px",
    boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
    padding: "40px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "20px",
  },
  infoBox: {
    width: "100%",
    border: "1px solid #e2e0da",
    borderRadius: "10px",
    padding: "20px",
    background: "#fafaf8",
    display: "flex",
    flexDirection: "column" as const,
    gap: "14px",
  },
  infoLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#a09d96",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: "2px",
  },
  infoValue: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#1a1916",
    wordBreak: "break-all" as const,
  },
  signOutBtn: {
    width: "100%",
    padding: "13px 16px",
    background: "linear-gradient(135deg, #1a6b4a, #22914f)",
    color: "#ffffff",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    fontSize: "15px",
    fontWeight: 700,
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(26,107,74,0.25)",
    transition: "opacity 160ms ease",
    outline: "none",
    pointerEvents: "auto" as const,
  },
  btnRow: {
    display: "flex",
    gap: "12px",
    width: "100%",
  },
  outlineBtn: {
    flex: 1,
    padding: "13px 16px",
    border: "1.5px solid #d8d5ce",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#1a1916",
    fontFamily: "'Satoshi', 'DM Sans', sans-serif",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
    pointerEvents: "auto" as const,
    transition: "border-color 160ms ease",
  },
} as const;

// ──────────────────────────────────────────────
// Inner component (needs Suspense boundary for useSearchParams)
// ──────────────────────────────────────────────
function LoginInner({ user }: LoginClientProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  let supabase: SupabaseClient<any> | null = null;
  try {
    supabase = getSupabaseBrowserClient();
  } catch (err) {
    // Don't crash the whole component if env vars are missing.
    console.error("Supabase client init failed:", err);
  }
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to go after a successful sign-in (defaults to home)
  const nextPath = searchParams.get("next") || "/";

  const syncUserProfile = async (authUser: User) => {
    if (!supabase) return;
    try {
      const defaultName =
        authUser.user_metadata?.full_name ||
        authUser.email?.split("@")[0] ||
        "User";
      await supabase.from("users").upsert({
        id: authUser.id,
        email: authUser.email!,
        full_name: defaultName,
        city: "Delhi",
        trust_score: 100,
      });
    } catch (err) {
      console.error("Failed to sync user profile:", err);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const activeUser = session?.user ?? null;
        setCurrentUser(activeUser);
        if (activeUser) await syncUserProfile(activeUser);
      }
    );
    return () => listener?.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    try {
      if (!supabase) {
        setStatus("Auth is not configured. Missing NEXT_PUBLIC_SUPABASE_ environment variables.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (error) {
          setStatus(error.message);
        } else {
          setStatus("✓ Check your inbox to confirm your account.");
          if (data.user) await syncUserProfile(data.user);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setStatus(error.message);
        } else {
          setStatus("✓ Signed in successfully!");
          if (data.user) await syncUserProfile(data.user);
          router.push(nextPath);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    if (!supabase) {
      setStatus("Auth is not configured. Missing NEXT_PUBLIC_SUPABASE_ environment variables.");
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
        skipBrowserRedirect: false,
      },
    });
  }

  async function handleSignOut() {
    try {
      if (!supabase) {
        setStatus("Auth not configured — cannot sign out.");
        return;
      }
      console.log("LoginClient signOut — cookies before:", document.cookie);
      const { error } = await supabase.auth.signOut({ scope: "local" });
      console.log("LoginClient signOut error:", error);
      if (error) {
        // fallback
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("LoginClient signOut error:", err);
    } finally {
      setCurrentUser(null);
      setEmail("");
      setPassword("");
      setStatus("");
      router.refresh();
    }
  }

  async function handleForgotPassword() {
    setStatus("");
    if (!supabase) {
      setStatus("Auth is not configured. Missing NEXT_PUBLIC_SUPABASE_ environment variables.");
      return;
    }
    if (!email) {
      setStatus("Please enter your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login/update-password`,
    });
    if (error) setStatus(error.message);
    else setStatus("✓ Password reset email sent. Check your inbox.");
  }

  const isSuccess =
    status.startsWith("✓") ||
    status.includes("Check your inbox") ||
    status.includes("successfully");

  /* ── Signed-in view ── */
  if (currentUser) {
    return (
      <div style={S.signedPage}>
        <div style={S.signedCard}>
          {/* Logo */}
          <div style={S.logo}>
            <div style={S.logoIconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
              </svg>
            </div>
            <span style={S.logoText}>Electric UPI</span>
          </div>

          <h2 style={{ ...S.heading, fontSize: "22px" }}>Welcome back! 👋</h2>
          <p style={{ ...S.subheading, marginBottom: "0" }}>
            You are successfully signed in.
          </p>

          <div style={S.infoBox}>
            <div>
              <p style={S.infoLabel}>Email</p>
              <p style={S.infoValue}>{currentUser.email}</p>
            </div>
            <div>
              <p style={S.infoLabel}>User ID</p>
              <p style={{ ...S.infoValue, fontSize: "12px", fontFamily: "monospace" }}>
                {currentUser.id}
              </p>
            </div>
            {currentUser.last_sign_in_at && (
              <div>
                <p style={S.infoLabel}>Last Sign In</p>
                <p style={S.infoValue}>
                  {new Date(currentUser.last_sign_in_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div style={S.btnRow}>
            <Link href="/" style={S.outlineBtn}>
              ← Back to Home
            </Link>
            <button style={S.signOutBtn} onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Auth Form View ── */
  return (
    <div style={S.page}>
      {/* Background orbs */}
      <div style={S.bgOrb1} />
      <div style={S.bgOrb2} />

      <div style={S.card}>
        {/* Logo */}
        <div style={S.logo}>
          <div style={S.logoIconWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
            </svg>
          </div>
          <span style={S.logoText}>Electric UPI</span>
        </div>

        <h1 style={S.heading}>
          {mode === "signin" ? "Welcome back" : "Create account"}
        </h1>
        <p style={S.subheading}>
          {mode === "signin"
            ? "Enter your details to access your account."
            : "Join India's P2P charging network today."}
        </p>

        {/* ── Tab switcher ── */}
        <div style={S.tabsWrap}>
          <button
            id="tab-signin"
            type="button"
            style={S.tabBtn(mode === "signin")}
            onClick={() => {
              setMode("signin");
              setStatus("");
            }}
          >
            Sign In
          </button>
          <button
            id="tab-signup"
            type="button"
            style={S.tabBtn(mode === "signup")}
            onClick={() => {
              setMode("signup");
              setStatus("");
            }}
          >
            Sign Up
          </button>
        </div>

        {/* ── Google login ── */}
        <button
          id="btn-google"
          type="button"
          style={S.googleBtn}
          onClick={handleGoogleLogin}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* ── Divider ── */}
        <div style={S.divider}>
          <div style={S.dividerLine} />
          <span style={S.dividerText}>Or continue with email</span>
          <div style={S.dividerLine} />
        </div>

        {/* ── Form ── */}
        <form style={S.form} onSubmit={handleSubmit} noValidate={false}>
          {/* Email */}
          <div style={S.fieldGroup}>
            <label style={S.label} htmlFor="email">
              Email Address
            </label>
            <div style={S.inputWrap}>
              <span style={S.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={S.input}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#1a6b4a";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,107,74,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d8d5ce";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={S.fieldGroup}>
            <div style={S.fieldHeader}>
              <label style={S.label} htmlFor="password">
                Password
              </label>
              {mode === "signin" && (
                <button
                  id="btn-forgot"
                  type="button"
                  style={S.forgotBtn}
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div style={S.inputWrap}>
              <span style={S.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={S.input}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#1a6b4a";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,107,74,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d8d5ce";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {/* Eye toggle — large enough hit area, absolute positioned */}
              <button
                id="btn-toggle-password"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={S.toggleBtn}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  // Eye-off icon
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // Eye icon
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Status message */}
          {status && (
            <p
              role="status"
              aria-live="polite"
              style={isSuccess ? S.statusSuccess : S.statusError}
            >
              {status}
            </p>
          )}

          {/* Submit */}
          <button
            id="btn-submit"
            type="submit"
            disabled={isSubmitting}
            style={{
              ...S.submitBtn,
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {mode === "signin" ? "Signing in…" : "Creating account…"}
              </>
            ) : (
              <>
                {mode === "signin" ? "Sign In" : "Create Account"}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>

        <p style={S.footerNote}>
          By continuing, you agree to our{" "}
          <a href="#" style={S.footerLink}>Terms of Service</a>
          {" "}and{" "}
          <a href="#" style={S.footerLink}>Privacy Policy</a>.
        </p>
      </div>

      {/* Spinner keyframe — injected via style tag */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Default export used by the route page
export default function LoginClientWrapper(props: LoginClientProps) {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading…</div>}>
      <LoginInner {...props} />
    </Suspense>
  );
}
