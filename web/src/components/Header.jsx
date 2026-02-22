import React from "react";

export default function Header({ session, isRunning, isMobile, onToggleSidebar }) {
  const steps = session?.steps ?? 0;
  const elapsed = session?.elapsed ?? 0;

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        {isMobile && (
          <button style={styles.menuBtn} onClick={onToggleSidebar} aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <div style={styles.logo}>
          Open<span style={{ color: "var(--accent)" }}>Planter</span>
        </div>
        {!isMobile && <div style={styles.badge}>Dashboard</div>}
      </div>
      <div style={isMobile ? styles.rightMobile : styles.right}>
        {!isMobile && (
          <div style={styles.counter}>
            Steps: <strong>{steps}</strong>
          </div>
        )}
        {!isMobile && (
          <div style={styles.counter}>
            Elapsed: <strong>{formatElapsed(elapsed)}</strong>
          </div>
        )}
        <div style={styles.status}>
          <div
            style={{
              ...styles.dot,
              background: isRunning ? "var(--yellow)" : "var(--green)",
              boxShadow: isRunning
                ? "0 0 8px var(--yellow)"
                : "0 0 8px var(--green)",
              animation: isRunning ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
          <span style={styles.statusText}>
            {isRunning ? "Investigating..." : session?.status === "completed" ? "Complete" : session?.status === "error" ? "Error" : "Ready"}
          </span>
        </div>
      </div>
    </header>
  );
}

function formatElapsed(sec) {
  if (!sec) return "0s";
  if (sec < 60) return sec.toFixed(1) + "s";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border)",
    zIndex: 100,
    minHeight: 56,
  },
  left: { display: "flex", alignItems: "center", gap: 10 },
  logo: {
    fontFamily: "var(--font-mono)",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    padding: "2px 8px",
    borderRadius: 4,
    background: "var(--accent-glow)",
    color: "var(--accent)",
    border: "1px solid rgba(59,130,246,0.3)",
  },
  menuBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    padding: 6,
    borderRadius: 6,
    WebkitTapHighlightColor: "transparent",
  },
  right: { display: "flex", alignItems: "center", gap: 16 },
  rightMobile: { display: "flex", alignItems: "center", gap: 8 },
  counter: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--text-muted)",
  },
  status: { display: "flex", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: "50%" },
  statusText: { fontSize: 12, color: "var(--text-secondary)" },
};
