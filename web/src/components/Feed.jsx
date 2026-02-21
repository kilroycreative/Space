import React, { forwardRef, useState } from "react";

const Feed = forwardRef(function Feed({ events, session }, ref) {
  if (!session && events.length === 0) {
    return (
      <div ref={ref} style={styles.feed}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div ref={ref} style={styles.feed}>
      {session && (
        <div style={styles.objectiveCard}>
          <span style={styles.badge("var(--yellow-dim)", "var(--yellow)")}>
            Investigation
          </span>
          <span style={styles.objectiveText}>{session.objective}</span>
          <span style={styles.meta}>{session.provider}/{session.model}</span>
        </div>
      )}

      {events.map((evt) => (
        <EventItem key={evt._id} event={evt} />
      ))}

      {session?.status === "completed" && session.result && (
        <ResultCard result={session.result} session={session} />
      )}

      {session?.status === "error" && session.error && (
        <div style={styles.errorCard}>
          <div style={styles.errorMessage}>{session.error}</div>
        </div>
      )}
    </div>
  );
});

export default Feed;

function EventItem({ event }) {
  const { type, data } = event;

  if (type === "step") {
    return <StepCard data={data} />;
  }

  if (type === "trace") {
    return (
      <div style={styles.traceItem}>
        <span style={styles.traceTime}>
          {data.elapsed ? formatElapsed(data.elapsed) : ""}
        </span>
        {data.message || JSON.stringify(data)}
      </div>
    );
  }

  if (type === "delta") {
    return (
      <div style={styles.deltaItem}>
        {data.text}
      </div>
    );
  }

  return null;
}

function StepCard({ data }) {
  const [expanded, setExpanded] = useState(false);
  const action = data.action || {};
  const name = action.name || "unknown";
  const args = action.arguments || {};
  const observation = data.observation || "";

  let badgeColor = { bg: "rgba(6,182,212,0.15)", fg: "var(--cyan)" };
  let label = name;
  if (name === "think") { badgeColor = { bg: "var(--purple-dim)", fg: "var(--purple)" }; label = "thinking"; }
  else if (name === "subtask" || name === "execute") { badgeColor = { bg: "var(--yellow-dim)", fg: "var(--yellow)" }; }
  else if (name === "final" || name === "_model_turn") { badgeColor = { bg: "var(--green-dim)", fg: "var(--green)" }; label = name === "_model_turn" ? "model" : "final"; }

  let summary = "";
  if (name === "read_file" || name === "write_file") summary = args.path || "";
  else if (name === "run_shell") summary = args.command || "";
  else if (name === "search_files" || name === "web_search") summary = args.query || "";
  else if (name === "subtask" || name === "execute") summary = args.objective || "";
  else if (name === "think") summary = (args.note || "").slice(0, 120);

  const preview = observation.slice(0, 400);
  const hasMore = observation.length > 400;

  return (
    <div style={styles.stepCard}>
      <div style={styles.stepHeader}>
        <span style={styles.badge(badgeColor.bg, badgeColor.fg)}>{label}</span>
        {summary && (
          <span style={styles.stepToolName}>{truncate(summary, 80)}</span>
        )}
        <span style={styles.meta}>
          d{data.depth ?? 0}/s{data.step ?? 0}
          {data.elapsed_sec ? ` · ${data.elapsed_sec}s` : ""}
        </span>
      </div>
      {observation && (
        <div style={{
          ...styles.stepBody,
          maxHeight: expanded ? "none" : 200,
        }}>
          {expanded ? observation : preview + (hasMore ? "..." : "")}
        </div>
      )}
      {hasMore && (
        <div style={styles.toggle} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : "Show more"}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result, session }) {
  return (
    <div style={styles.resultCard}>
      <h3 style={styles.resultTitle}>Investigation Complete</h3>
      <div style={styles.resultBody}>{result}</div>
      <div style={styles.resultStats}>
        <span>{session.steps} steps</span>
        <span>{formatElapsed(session.elapsed)}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={styles.empty}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3 }}>
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <h2 style={styles.emptyTitle}>Ready to Investigate</h2>
      <p style={styles.emptyText}>
        Enter an investigation objective above. OpenPlanter will autonomously
        analyze datasets, resolve entities, and surface non-obvious connections.
      </p>
    </div>
  );
}

function formatElapsed(sec) {
  if (!sec) return "0s";
  if (sec < 60) return Number(sec).toFixed(1) + "s";
  return Math.floor(sec / 60) + "m " + Math.floor(sec % 60) + "s";
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + "..." : s;
}

const styles = {
  feed: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  objectiveCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    animation: "fadeIn 200ms ease",
  },
  objectiveText: {
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    fontWeight: 600,
    flex: 1,
  },
  badge: (bg, fg) => ({
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    background: bg,
    color: fg,
    whiteSpace: "nowrap",
  }),
  meta: {
    fontSize: 11,
    color: "var(--text-muted)",
    marginLeft: "auto",
    whiteSpace: "nowrap",
  },
  traceItem: {
    padding: "6px 12px",
    borderRadius: 6,
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--text-muted)",
    animation: "fadeIn 200ms ease",
  },
  traceTime: { color: "var(--text-muted)", marginRight: 8, fontSize: 11 },
  deltaItem: {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--purple)",
    opacity: 0.7,
    padding: "2px 12px",
  },
  stepCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 16px",
    margin: "4px 0",
    animation: "fadeIn 200ms ease",
  },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  stepToolName: {
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    minWidth: 0,
  },
  stepBody: {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--text-secondary)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflow: "hidden",
    lineHeight: 1.6,
  },
  toggle: {
    fontSize: 11,
    color: "var(--accent)",
    cursor: "pointer",
    marginTop: 4,
  },
  resultCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--green)",
    borderRadius: 12,
    padding: 20,
    margin: "12px 0",
    animation: "fadeIn 300ms ease",
    boxShadow: "0 0 20px var(--green-dim)",
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--green)",
    marginBottom: 12,
  },
  resultBody: {
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  resultStats: {
    display: "flex",
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid var(--border)",
    fontSize: 12,
    color: "var(--text-muted)",
  },
  errorCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--red)",
    borderRadius: 8,
    padding: 16,
    margin: "8px 0",
    boxShadow: "0 0 20px var(--red-dim)",
  },
  errorMessage: {
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    color: "var(--red)",
    whiteSpace: "pre-wrap",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 16,
    color: "var(--text-muted)",
    textAlign: "center",
    padding: 48,
  },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: "var(--text-secondary)" },
  emptyText: { maxWidth: 400, lineHeight: 1.7 },
};
