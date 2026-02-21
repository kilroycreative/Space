import React from "react";

export default function Sidebar({ sessions, activeSessionId, onSelectSession, isRunning }) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Sessions</h3>
      </div>
      <div style={styles.list}>
        {sessions.length === 0 && (
          <div style={styles.empty}>No sessions yet</div>
        )}
        {sessions.map((s) => {
          const isActive = s.sessionId === activeSessionId;
          return (
            <div
              key={s.sessionId}
              style={{
                ...styles.item,
                ...(isActive ? styles.itemActive : {}),
              }}
              onClick={() => !isRunning && onSelectSession(s.sessionId)}
            >
              <div
                style={{
                  ...styles.dot,
                  background:
                    s.status === "running"
                      ? "var(--yellow)"
                      : s.status === "completed"
                      ? "var(--green)"
                      : s.status === "error"
                      ? "var(--red)"
                      : "var(--text-muted)",
                }}
              />
              <div style={styles.info}>
                <div style={styles.objective}>
                  {s.objective?.slice(0, 60) || s.sessionId}
                </div>
                <div style={styles.meta}>
                  {s.model} &middot; {s.steps} steps &middot;{" "}
                  {formatDate(s.startedAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = {
  sidebar: {
    display: "flex",
    flexDirection: "column",
    background: "var(--bg-secondary)",
    borderRight: "1px solid var(--border)",
    overflow: "hidden",
  },
  section: { padding: "16px", borderBottom: "1px solid var(--border)" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "var(--text-muted)",
  },
  list: { flex: 1, overflowY: "auto", padding: 8 },
  empty: {
    padding: "10px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--text-muted)",
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 150ms ease",
    marginBottom: 2,
  },
  itemActive: {
    background: "var(--accent-glow)",
    border: "1px solid rgba(59,130,246,0.3)",
  },
  dot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 6 },
  info: { flex: 1, minWidth: 0 },
  objective: {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  meta: { fontSize: 11, color: "var(--text-muted)", marginTop: 2 },
};
