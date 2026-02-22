import React, { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Feed from "./components/Feed";
import InputBar from "./components/InputBar";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:5001";
const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT
  );
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

export default function App() {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const feedRef = useRef(null);
  const isMobile = useIsMobile();

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

  // Close sidebar on mobile when selecting a session
  const handleSelectSession = useCallback((sessionId) => {
    setActiveSessionId(sessionId);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Start an investigation by calling the Python worker
  async function startInvestigation(objective, provider, model, configOverrides) {
    if (!objective.trim() || isStarting) return;
    setIsStarting(true);

    try {
      const body = { objective, provider, model };
      if (configOverrides && Object.keys(configOverrides).length > 0) {
        body.config = configOverrides;
      }
      const resp = await fetch(`${WORKER_URL}/api/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const mainStyle = isMobile
    ? { ...styles.main, gridTemplateColumns: "1fr" }
    : styles.main;

  return (
    <div style={styles.app}>
      <Header
        session={activeSession}
        isRunning={isRunning}
        isMobile={isMobile}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <div style={mainStyle}>
        {isMobile && sidebarOpen && (
          <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
        )}
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          isRunning={isRunning}
          isMobile={isMobile}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div style={styles.content}>
          <InputBar
            onSubmit={startInvestigation}
            onStop={stopInvestigation}
            isRunning={isRunning}
            isStarting={isStarting}
            isMobile={isMobile}
          />
          <ProgressBar active={isRunning} />
          <Feed
            ref={feedRef}
            events={events}
            session={activeSession}
            isMobile={isMobile}
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
    overflow: "hidden",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    overflow: "hidden",
    position: "relative",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 49,
  },
  progressBar: {
    height: 3,
    background: "var(--bg-tertiary)",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
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
