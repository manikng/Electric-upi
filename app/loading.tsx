export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg, #f7f5f0)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        gap: "16px",
        fontFamily: "'Satoshi', 'DM Sans', sans-serif",
      }}
      role="status"
      aria-label="Loading Electric UPI"
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "3px solid #c8dfd4",
          borderTopColor: "#1a6b4a",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
        aria-hidden="true"
      />
      <p style={{ color: "#6e6b63", fontSize: 14, fontWeight: 600 }}>
        Loading Electric UPI…
      </p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
