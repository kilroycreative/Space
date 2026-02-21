import React, { useState, useRef } from "react";

const EXAMPLES = [
  "Cross-reference vendor payments against lobbying disclosures and flag overlaps",
  "Identify entities connected to campaign contributions over $10,000 and map corporate affiliations",
  "Analyze government contract awards and identify patterns of concentration",
];

export default function InputBar({ onSubmit, onStop, isRunning, isStarting, isMobile }) {
  const [objective, setObjective] = useState("");
  const [provider, setProvider] = useState("auto");
  const [model, setModel] = useState("claude-opus-4-6");
  const textareaRef = useRef(null);

  const MODEL_OPTIONS = {
    auto: ["claude-opus-4-6", "gpt-5.2", "anthropic/claude-sonnet-4-5"],
    anthropic: ["claude-opus-4-6", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
    openai: ["gpt-5.2", "gpt-4o", "gpt-4.1"],
    openrouter: ["anthropic/claude-sonnet-4-5", "anthropic/claude-opus-4-6"],
    cerebras: ["qwen-3-235b-a22b-instruct-2507"],
  };

  function handleProviderChange(e) {
    const p = e.target.value;
    setProvider(p);
    setModel(MODEL_OPTIONS[p]?.[0] ?? "claude-opus-4-6");
  }

  function handleSubmit() {
    if (objective.trim() && !isRunning && !isStarting) {
      onSubmit(objective.trim(), provider, model);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const inputAreaStyle = isMobile
    ? { ...styles.inputArea, padding: "12px" }
    : styles.inputArea;

  const inputRowStyle = isMobile
    ? { ...styles.inputRow, gap: 8 }
    : styles.inputRow;

  const textareaStyle = isMobile
    ? { ...styles.textarea, padding: "10px 12px", fontSize: 14 }
    : styles.textarea;

  const btnStyle = isMobile
    ? { padding: "10px 14px" }
    : {};

  return (
    <div style={inputAreaStyle}>
      <div style={inputRowStyle}>
        <textarea
          ref={textareaRef}
          style={textareaStyle}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isMobile ? "Investigation objective..." : "Describe your investigation objective..."}
          disabled={isRunning}
          rows={1}
        />
        <div style={styles.controls}>
          {isRunning ? (
            <button style={{ ...styles.stopBtn, ...btnStyle }} onClick={onStop}>
              Stop
            </button>
          ) : (
            <button
              style={{
                ...styles.startBtn,
                ...btnStyle,
                opacity: isStarting ? 0.5 : 1,
              }}
              onClick={handleSubmit}
              disabled={isStarting || !objective.trim()}
            >
              {isStarting ? "..." : isMobile ? "Go" : "Investigate"}
            </button>
          )}
        </div>
      </div>
      <div style={styles.configRow}>
        <select style={isMobile ? { ...styles.select, flex: 1 } : styles.select} value={provider} onChange={handleProviderChange}>
          <option value="auto">Auto</option>
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
          <option value="openrouter">OpenRouter</option>
          <option value="cerebras">Cerebras</option>
        </select>
        <select style={isMobile ? { ...styles.select, flex: 1, minWidth: 0 } : styles.select} value={model} onChange={(e) => setModel(e.target.value)}>
          {(MODEL_OPTIONS[provider] ?? MODEL_OPTIONS.auto).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {!isMobile && (
          <div style={styles.examples}>
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                style={styles.exampleBtn}
                onClick={() => setObjective(ex)}
                disabled={isRunning}
              >
                {ex.split(" ").slice(0, 3).join(" ")}...
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  inputArea: {
    padding: "16px 24px",
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  },
  inputRow: { display: "flex", gap: 12, alignItems: "flex-start" },
  textarea: {
    flex: 1,
    padding: "12px 16px",
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    color: "var(--text-primary)",
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    outline: "none",
    resize: "none",
    minHeight: 44,
    maxHeight: 120,
    lineHeight: 1.5,
    minWidth: 0,
  },
  controls: { display: "flex", gap: 8, flexShrink: 0 },
  startBtn: {
    padding: "10px 20px",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    fontWeight: 600,
    background: "var(--accent)",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  stopBtn: {
    padding: "10px 20px",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    fontWeight: 600,
    background: "var(--red-dim)",
    color: "var(--red)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 8,
    cursor: "pointer",
  },
  configRow: {
    display: "flex",
    gap: 10,
    marginTop: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  select: {
    padding: "6px 10px",
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    color: "var(--text-secondary)",
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    outline: "none",
    cursor: "pointer",
  },
  examples: { display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" },
  exampleBtn: {
    padding: "4px 10px",
    fontSize: 11,
    fontFamily: "var(--font-sans)",
    color: "var(--text-muted)",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    cursor: "pointer",
  },
};
