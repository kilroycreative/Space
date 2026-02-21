import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Feed from "./components/Feed";
import InputBar from "./components/InputBar";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:5001";

export default function App() {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const feedRef = useRef(null);

  // Reactive queries — auto-update when Convex data changes
  const sessions = useQuery(api.sessions.list, { limit: 50 }) ?? [];
  const activeSession = useQuery(
    api.sessions.get,
    activeSessionId ? { sessionId: activeSessionId } : "skip"
  );
  const events = useQuery(
    api.sessions.getEvents,
    activeSessionId ? { sessionId: activeSessionId, limit: 500 } : "skip"
  ) ?? [];

  const isRunning = activeSession?.status === "running";

  // Auto-scroll feed when new events arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events.length]);

  // Start an investigation by calling the Python worker
  async function startInvestigation(objective, provider, model) {
    if (!objective.trim() || isStarting) return;
    setIsStarting(true);

    try {
      const resp = await fetch(`${WORKER_URL}/api/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective, provider, model }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        alert(`Failed to start: ${err.error || err.message || resp.statusText}`);
        return;
      }

      const data = await resp.json();
      setActiveSessionId(data.session_id);
    } catch (err) {
      alert(`Worker unreachable: ${err.message}`);
    } finally {
      setIsStarting(false);
    }
  }

  async function stopInvestigation() {
    if (!activeSessionId) return;
    try {
      await fetch(`${WORKER_URL}/api/investigate/${activeSessionId}/stop`, {
        method: "POST",
      });
    } catch {
      // best effort
    }
  }

  return (
    <div style={styles.app}>
      <Header
        session={activeSession}
        isRunning={isRunning}
      />
      <div style={styles.main}>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          isRunning={isRunning}
        />
        <div style={styles.content}>
          <InputBar
            onSubmit={startInvestigation}
            onStop={stopInvestigation}
            isRunning={isRunning}
            isStarting={isStarting}
          />
          <ProgressBar active={isRunning} />
          <Feed
            ref={feedRef}
            events={events}
            session={activeSession}
          />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ active }) {
  return (
    <div style={styles.progressBar}>
      {active && <div style={styles.progressSlider} />}
    </div>
  );
}

const styles = {
  app: {
    display: "grid",
    gridTemplateRows: "56px 1fr",
    height: "100vh",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    overflow: "hidden",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  progressBar: {
    height: 3,
    background: "var(--bg-tertiary)",
    position: "relative",
    overflow: "hidden",
  },
  progressSlider: {
    position: "absolute",
    top: 0,
    left: "-50%",
    width: "50%",
    height: "100%",
    background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
    animation: "progressSlide 1.5s ease-in-out infinite",
  },
};
