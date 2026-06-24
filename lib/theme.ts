export const COLORS = {
  bg: "#f7f5f0",
  card: "#ffffff",

  primary: "#1a6b4a",
  primaryDark: "#145238",

  border: "#e2dfd8",

  text: "#1a1916",
  muted: "#6e6b63",

  successBg: "#eef6f1",
  successBorder: "#c9ddd2",

  warningBg: "#f8f3e7",
  warningBorder: "#eadfc4",
};

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
    } else if (status === "verified" || status === "active" || status === "charging") {
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
