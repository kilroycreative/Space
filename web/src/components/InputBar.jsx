import React, { useState, useRef } from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXAMPLES = [
  "Cross-reference vendor payments against lobbying disclosures and flag overlaps",
  "Identify entities connected to campaign contributions over $10,000 and map corporate affiliations",
  "Analyze government contract awards and identify patterns of concentration",
];

const MODEL_OPTIONS = {
  auto: ["claude-opus-4-6", "gpt-5.2", "anthropic/claude-sonnet-4-5"],
  anthropic: ["claude-opus-4-6", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
  openai: ["gpt-5.2", "gpt-4o", "gpt-4.1"],
  openrouter: ["anthropic/claude-sonnet-4.6", "anthropic/claude-sonnet-4-5", "anthropic/claude-opus-4-6"],
  cerebras: ["qwen-3-235b-a22b-instruct-2507"],
};

// -- Prompt Builder Options --

const DOMAINS = [
  { value: "", label: "Select domain..." },
  { value: "financial", label: "Financial" },
  { value: "political", label: "Political" },
  { value: "corporate", label: "Corporate" },
  { value: "real_estate", label: "Real Estate" },
  { value: "government", label: "Government" },
  { value: "humanitarian", label: "Humanitarian" },
  { value: "osint", label: "OSINT" },
  { value: "environmental", label: "Environmental" },
  { value: "healthcare", label: "Healthcare" },
];

const ACTIONS = [
  { value: "", label: "Select action..." },
  { value: "cross_reference", label: "Cross-reference" },
  { value: "map_connections", label: "Map connections" },
  { value: "identify_patterns", label: "Identify patterns" },
  { value: "track_flows", label: "Track flows" },
  { value: "verify_claims", label: "Verify claims" },
  { value: "build_timeline", label: "Build timeline" },
  { value: "detect_anomalies", label: "Detect anomalies" },
  { value: "assess_risk", label: "Assess risk" },
];

const TIME_WINDOWS = [
  { value: "", label: "Any timeframe" },
  { value: "last_year", label: "Last year" },
  { value: "last_3_years", label: "Last 3 years" },
  { value: "last_5_years", label: "Last 5 years" },
  { value: "last_decade", label: "Last decade" },
  { value: "2020_2024", label: "2020-2024" },
  { value: "2015_2020", label: "2015-2020" },
];

const OUTPUT_FORMATS = [
  { value: "entity_map", label: "Entity map" },
  { value: "evidence_report", label: "Evidence report" },
  { value: "timeline", label: "Timeline" },
  { value: "network_graph", label: "Network graph" },
  { value: "summary_brief", label: "Summary brief" },
];

// -- Surprise Me Templates --

const SURPRISE_LOCATIONS = [
  "Chicago, IL", "Miami, FL", "Houston, TX", "Phoenix, AZ", "Philadelphia, PA",
  "San Antonio, TX", "San Diego, CA", "Dallas, TX", "Detroit, MI", "Memphis, TN",
  "Denver, CO", "Las Vegas, NV", "Atlanta, GA", "New Orleans, LA", "Baltimore, MD",
  "Portland, OR", "Sacramento, CA", "Kansas City, MO", "Cleveland, OH", "Pittsburgh, PA",
  "Washington, DC", "New York, NY", "Los Angeles, CA", "San Francisco, CA", "Seattle, WA",
  "London, UK", "Toronto, Canada", "Mexico City, Mexico", "Berlin, Germany",
  "Sydney, Australia", "Nairobi, Kenya", "Lagos, Nigeria", "Mumbai, India",
  "Singapore", "Dubai, UAE", "Johannesburg, South Africa",
];

const SURPRISE_TEMPLATES = [
  {
    template: "Map the network of campaign donors in {location} who also appear as government contractors over the {timeframe}",
    timeframes: ["last 3 years", "last 5 years", "last decade"],
  },
  {
    template: "Investigate property ownership transfers near {location} and identify any connections to politically exposed persons",
  },
  {
    template: "Analyze public procurement data in {location} and flag contracts awarded without competitive bidding over the {timeframe}",
    timeframes: ["last 3 years", "last 5 years"],
  },
  {
    template: "Build a timeline of corporate entity registrations linked to real estate development in {location} since 2018",
  },
  {
    template: "Cross-reference lobbying expenditure records with legislative voting patterns in {location} over the {timeframe}",
    timeframes: ["last 5 years", "last decade"],
  },
  {
    template: "Identify shell company networks operating in {location} by analyzing corporate registry filings and beneficial ownership data",
  },
  {
    template: "Track the flow of federal grant money to nonprofits in {location} and identify any circular funding patterns",
  },
  {
    template: "Detect anomalies in municipal bond issuances near {location} and cross-reference with political donation records",
  },
  {
    template: "Map the revolving door between government agencies and private contractors in {location} over the {timeframe}",
    timeframes: ["last 5 years", "last decade"],
  },
  {
    template: "Investigate environmental permit violations near {location} and identify corporate entities with repeated offenses",
  },
  {
    template: "Analyze healthcare provider billing patterns in {location} and flag statistical outliers for potential fraud indicators",
  },
  {
    template: "Cross-reference campaign finance records with zoning board decisions in {location} over the {timeframe}",
    timeframes: ["last 3 years", "last 5 years"],
  },
  {
    template: "Map connections between registered lobbyists and government contract recipients in {location}",
  },
  {
    template: "Investigate foreign ownership of agricultural land near {location} and identify any patterns of concentration",
  },
  {
    template: "Track infrastructure spending in {location} and identify which contractors received the largest share of public funds over the {timeframe}",
    timeframes: ["last 5 years", "last decade"],
  },
  {
    template: "Analyze court filing records in {location} to identify entities involved in repeated litigation patterns",
  },
  {
    template: "Investigate the ownership network behind vacant commercial properties in {location} and identify common beneficial owners",
  },
  {
    template: "Cross-reference vehicle fleet registrations with government entities in {location} to identify potential misuse patterns",
  },
  {
    template: "Map the supply chain of humanitarian aid organizations operating near {location} and identify delivery bottlenecks",
  },
  {
    template: "Investigate water rights allocations in {location} and identify entities that control disproportionate shares",
  },
  {
    template: "Analyze public salary data for government employees in {location} and identify positions with anomalous compensation patterns",
  },
  {
    template: "Track corporate mergers and acquisitions activity in {location} over the {timeframe} and map resulting market concentration",
    timeframes: ["last 3 years", "last 5 years", "last decade"],
  },
  {
    template: "Investigate tax lien patterns in {location} and identify entities systematically acquiring distressed properties",
  },
  {
    template: "Cross-reference business license applications with building code violations in {location} to identify compliance risks",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DOMAIN_CONTEXT = {
  financial: "financial records and transactions",
  political: "political records and disclosures",
  corporate: "corporate filings and registrations",
  real_estate: "property records and land transactions",
  government: "government spending and operations data",
  humanitarian: "humanitarian aid and NGO operations data",
  osint: "open-source intelligence and public records",
  environmental: "environmental permits and compliance records",
  healthcare: "healthcare provider and billing data",
};

const ACTION_VERBS = {
  cross_reference: "Cross-reference",
  map_connections: "Map connections within",
  identify_patterns: "Identify patterns in",
  track_flows: "Track the flow of funds through",
  verify_claims: "Verify claims related to",
  build_timeline: "Build a timeline of events involving",
  detect_anomalies: "Detect anomalies in",
  assess_risk: "Assess risk factors across",
};

const TIME_LABELS = {
  last_year: "over the last year",
  last_3_years: "over the last 3 years",
  last_5_years: "over the last 5 years",
  last_decade: "over the last decade",
  "2020_2024": "from 2020 to 2024",
  "2015_2020": "from 2015 to 2020",
};

const OUTPUT_LABELS = {
  entity_map: "entity map",
  evidence_report: "evidence report",
  timeline: "timeline",
  network_graph: "network graph",
  summary_brief: "summary brief",
};

function composeObjective({ domain, action, subject, geoScope, timeWindow, outputFormats }) {
  const parts = [];

  // Action + domain context
  const verb = ACTION_VERBS[action] || "";
  const domainCtx = DOMAIN_CONTEXT[domain] || "";
  if (verb && domainCtx) {
    parts.push(`${verb} ${domainCtx}`);
  } else if (verb) {
    parts.push(verb + " available data sources");
  } else if (domainCtx) {
    parts.push(`Investigate ${domainCtx}`);
  }

  // Subject
  if (subject.trim()) {
    parts.push(`related to ${subject.trim()}`);
  }

  // Geographic scope
  if (geoScope.trim()) {
    parts.push(`in ${geoScope.trim()}`);
  }

  // Time window
  if (timeWindow && TIME_LABELS[timeWindow]) {
    parts.push(TIME_LABELS[timeWindow]);
  }

  let composed = parts.join(" ");
  if (composed) {
    composed = composed.charAt(0).toUpperCase() + composed.slice(1);
    if (!composed.endsWith(".")) composed += ".";
  }

  // Output formats
  if (outputFormats.length > 0) {
    const labels = outputFormats.map((f) => OUTPUT_LABELS[f] || f);
    if (labels.length === 1) {
      const article = /^[aeiou]/i.test(labels[0]) ? "an" : "a";
      composed += ` Produce ${article} ${labels[0]} of key findings.`;
    } else {
      const last = labels.pop();
      composed += ` Produce ${labels.join(", ")} and ${last} of key findings.`;
    }
  }

  return composed;
}

function generateSurprise() {
  const tmpl = SURPRISE_TEMPLATES[Math.floor(Math.random() * SURPRISE_TEMPLATES.length)];
  const loc = SURPRISE_LOCATIONS[Math.floor(Math.random() * SURPRISE_LOCATIONS.length)];
  let prompt = tmpl.template.replace("{location}", loc);
  if (tmpl.timeframes) {
    const tf = tmpl.timeframes[Math.floor(Math.random() * tmpl.timeframes.length)];
    prompt = prompt.replace("{timeframe}", tf);
  }
  return prompt;
}

const DEFAULT_AGENT_CONFIG = {
  recursive: true,
  max_depth: 4,
  max_steps_per_call: 100,
  reasoning_effort: "high",
  acceptance_criteria: true,
  demo: false,
};

function loadSavedConfig() {
  try {
    const saved = localStorage.getItem("openplanter_agent_config");
    if (saved) return { ...DEFAULT_AGENT_CONFIG, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_AGENT_CONFIG };
}

function saveConfig(config) {
  try {
    localStorage.setItem("openplanter_agent_config", JSON.stringify(config));
  } catch {}
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Toggle({ value, onChange, label, description }) {
  return (
    <div style={gs.toggleRow}>
      <div style={gs.toggleInfo}>
        <span style={gs.toggleLabel}>{label}</span>
        {description && <span style={gs.toggleDesc}>{description}</span>}
      </div>
      <button
        style={{
          ...gs.toggleTrack,
          background: value ? "var(--accent)" : "var(--bg-tertiary)",
          borderColor: value ? "var(--accent)" : "var(--border)",
        }}
        onClick={() => onChange(!value)}
      >
        <span
          style={{
            ...gs.toggleThumb,
            transform: value ? "translateX(16px)" : "translateX(0)",
          }}
        />
      </button>
    </div>
  );
}

function SliderField({ value, onChange, label, description, min, max, step = 1, displayValue }) {
  return (
    <div style={gs.sliderRow}>
      <div style={gs.sliderHeader}>
        <div style={gs.toggleInfo}>
          <span style={gs.toggleLabel}>{label}</span>
          {description && <span style={gs.toggleDesc}>{description}</span>}
        </div>
        <span style={gs.sliderValue}>{displayValue ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={gs.slider}
      />
    </div>
  );
}

function TabButton({ active, label, onClick }) {
  return (
    <button
      style={{
        ...gs.tabBtn,
        color: active ? "var(--accent)" : "var(--text-muted)",
        borderBottomColor: active ? "var(--accent)" : "transparent",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ChipSelect({ options, selected, onToggle }) {
  return (
    <div style={gs.chipGroup}>
      {options.map((opt) => {
        const isActive = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            style={{
              ...gs.chip,
              background: isActive ? "var(--accent-glow)" : "var(--bg-tertiary)",
              borderColor: isActive ? "var(--accent)" : "var(--border)",
              color: isActive ? "var(--accent)" : "var(--text-secondary)",
            }}
            onClick={() => onToggle(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guided Panel Sections
// ---------------------------------------------------------------------------

function PromptBuilderTab({ builderState, setBuilderState, onUse, disabled }) {
  const { domain, action, subject, geoScope, timeWindow, outputFormats } = builderState;

  function update(field, value) {
    setBuilderState((prev) => ({ ...prev, [field]: value }));
  }

  function toggleOutput(val) {
    setBuilderState((prev) => ({
      ...prev,
      outputFormats: prev.outputFormats.includes(val)
        ? prev.outputFormats.filter((f) => f !== val)
        : [...prev.outputFormats, val],
    }));
  }

  const preview = composeObjective(builderState);
  const hasContent = domain || action || subject.trim() || geoScope.trim() || timeWindow || outputFormats.length > 0;

  return (
    <div style={gs.tabContent}>
      <div style={gs.builderGrid}>
        <div style={gs.fieldGroup}>
          <label style={gs.fieldLabel}>Domain</label>
          <select style={gs.fieldSelect} value={domain} onChange={(e) => update("domain", e.target.value)} disabled={disabled}>
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div style={gs.fieldGroup}>
          <label style={gs.fieldLabel}>Action</label>
          <select style={gs.fieldSelect} value={action} onChange={(e) => update("action", e.target.value)} disabled={disabled}>
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        <div style={{ ...gs.fieldGroup, gridColumn: "1 / -1" }}>
          <label style={gs.fieldLabel}>Subject</label>
          <input
            style={gs.fieldInput}
            type="text"
            placeholder="e.g. vendor payments and lobbying disclosures"
            value={subject}
            onChange={(e) => update("subject", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div style={gs.fieldGroup}>
          <label style={gs.fieldLabel}>Geographic scope</label>
          <input
            style={gs.fieldInput}
            type="text"
            placeholder="e.g. Cook County, IL"
            value={geoScope}
            onChange={(e) => update("geoScope", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div style={gs.fieldGroup}>
          <label style={gs.fieldLabel}>Time window</label>
          <select style={gs.fieldSelect} value={timeWindow} onChange={(e) => update("timeWindow", e.target.value)} disabled={disabled}>
            {TIME_WINDOWS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div style={{ ...gs.fieldGroup, gridColumn: "1 / -1" }}>
          <label style={gs.fieldLabel}>Output format</label>
          <ChipSelect options={OUTPUT_FORMATS} selected={outputFormats} onToggle={toggleOutput} />
        </div>
      </div>

      {hasContent && (
        <div style={gs.previewSection}>
          <div style={gs.previewHeader}>
            <span style={gs.previewLabel}>Preview</span>
            <button
              style={gs.useBtn}
              onClick={() => onUse(preview)}
              disabled={disabled || !preview.trim()}
            >
              Use this prompt
            </button>
          </div>
          <div style={gs.previewText}>{preview}</div>
        </div>
      )}
    </div>
  );
}

function SurpriseMeTab({ onUse, disabled }) {
  const [generated, setGenerated] = useState("");

  function handleGenerate() {
    const prompt = generateSurprise();
    setGenerated(prompt);
  }

  return (
    <div style={gs.tabContent}>
      <p style={gs.surpriseDesc}>
        Generate a random investigation objective to explore the system's capabilities.
        Each click produces a unique combination of topic, location, and analysis approach.
      </p>
      <button style={gs.surpriseBtn} onClick={handleGenerate} disabled={disabled}>
        Surprise me
      </button>
      {generated && (
        <div style={gs.previewSection}>
          <div style={gs.previewHeader}>
            <span style={gs.previewLabel}>Generated prompt</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={gs.reshuffleBtn} onClick={handleGenerate} disabled={disabled}>
                Reshuffle
              </button>
              <button
                style={gs.useBtn}
                onClick={() => onUse(generated)}
                disabled={disabled}
              >
                Use this prompt
              </button>
            </div>
          </div>
          <div style={gs.previewText}>{generated}</div>
        </div>
      )}
    </div>
  );
}

function AgentTuningTab({ config, setConfig, disabled }) {
  function update(field, value) {
    setConfig((prev) => {
      const next = { ...prev, [field]: value };
      saveConfig(next);
      return next;
    });
  }

  function resetDefaults() {
    setConfig({ ...DEFAULT_AGENT_CONFIG });
    saveConfig(DEFAULT_AGENT_CONFIG);
  }

  return (
    <div style={gs.tabContent}>
      <div style={gs.tuningSection}>
        <div style={gs.tuningSectionHeader}>
          <span style={gs.tuningSectionTitle}>Reasoning & Depth</span>
        </div>
        <Toggle
          label="Recursive mode"
          description="Delegate focused subtasks to faster models for efficiency"
          value={config.recursive}
          onChange={(v) => update("recursive", v)}
        />
        <SliderField
          label="Max depth"
          description="How many levels deep subtask delegation can go"
          value={config.max_depth}
          onChange={(v) => update("max_depth", v)}
          min={1}
          max={6}
        />
        <SliderField
          label="Max steps"
          description="Tool-call budget per investigation"
          value={config.max_steps_per_call}
          onChange={(v) => update("max_steps_per_call", v)}
          min={20}
          max={200}
          step={10}
        />
        <div style={gs.fieldGroup}>
          <label style={gs.toggleLabel}>Reasoning effort</label>
          <span style={gs.toggleDesc}>How much the model thinks before acting</span>
          <div style={{ ...gs.chipGroup, marginTop: 6 }}>
            {["low", "medium", "high"].map((level) => (
              <button
                key={level}
                style={{
                  ...gs.chip,
                  background: config.reasoning_effort === level ? "var(--accent-glow)" : "var(--bg-tertiary)",
                  borderColor: config.reasoning_effort === level ? "var(--accent)" : "var(--border)",
                  color: config.reasoning_effort === level ? "var(--accent)" : "var(--text-secondary)",
                  textTransform: "capitalize",
                }}
                onClick={() => update("reasoning_effort", level)}
                disabled={disabled}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={gs.tuningSection}>
        <div style={gs.tuningSectionHeader}>
          <span style={gs.tuningSectionTitle}>Verification</span>
        </div>
        <Toggle
          label="Acceptance criteria"
          description="Enable independent verification of subtask results"
          value={config.acceptance_criteria}
          onChange={(v) => update("acceptance_criteria", v)}
        />
      </div>

      <div style={gs.tuningSection}>
        <div style={gs.tuningSectionHeader}>
          <span style={gs.tuningSectionTitle}>Output</span>
        </div>
        <Toggle
          label="Demo mode"
          description="Censor entity names in output for sensitive presentations"
          value={config.demo}
          onChange={(v) => update("demo", v)}
        />
      </div>

      <button style={gs.resetBtn} onClick={resetDefaults} disabled={disabled}>
        Reset to defaults
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InputBar({ onSubmit, onStop, isRunning, isStarting }) {
  const [objective, setObjective] = useState("");
  const [provider, setProvider] = useState("openrouter");
  const [model, setModel] = useState("anthropic/claude-sonnet-4.6");
  const [showGuided, setShowGuided] = useState(false);
  const [activeTab, setActiveTab] = useState("build");
  const textareaRef = useRef(null);

  // Builder state
  const [builderState, setBuilderState] = useState({
    domain: "",
    action: "",
    subject: "",
    geoScope: "",
    timeWindow: "",
    outputFormats: [],
  });

  // Agent config state (persisted in localStorage)
  const [agentConfig, setAgentConfig] = useState(loadSavedConfig);

  function handleProviderChange(e) {
    const p = e.target.value;
    setProvider(p);
    setModel(MODEL_OPTIONS[p]?.[0] ?? "anthropic/claude-sonnet-4.6");
  }

  function handleSubmit() {
    if (objective.trim() && !isRunning && !isStarting) {
      // Build sparse config: only include fields that differ from defaults
      const configOverrides = {};
      for (const [key, val] of Object.entries(agentConfig)) {
        if (val !== DEFAULT_AGENT_CONFIG[key]) {
          configOverrides[key] = val;
        }
      }
      onSubmit(objective.trim(), provider, model, configOverrides);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleUsePrompt(prompt) {
    setObjective(prompt);
    if (textareaRef.current) textareaRef.current.focus();
  }

  const disabled = isRunning || isStarting;

  return (
    <div style={styles.inputArea}>
      <div style={styles.inputRow}>
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your investigation objective..."
          disabled={isRunning}
          rows={1}
        />
        <div style={styles.controls}>
          {isRunning ? (
            <button style={styles.stopBtn} onClick={onStop}>
              Stop
            </button>
          ) : (
            <button
              style={{
                ...styles.startBtn,
                opacity: isStarting ? 0.5 : 1,
              }}
              onClick={handleSubmit}
              disabled={isStarting || !objective.trim()}
            >
              {isStarting ? "Starting..." : "Investigate"}
            </button>
          )}
        </div>
      </div>
      <div style={styles.configRow}>
        <select style={styles.select} value={provider} onChange={handleProviderChange}>
          <option value="auto">Auto</option>
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
          <option value="openrouter">OpenRouter</option>
          <option value="cerebras">Cerebras</option>
        </select>
        <select style={styles.select} value={model} onChange={(e) => setModel(e.target.value)}>
          {(MODEL_OPTIONS[provider] ?? MODEL_OPTIONS.auto).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          style={{
            ...styles.guidedToggle,
            color: showGuided ? "var(--accent)" : "var(--text-muted)",
          }}
          onClick={() => setShowGuided((v) => !v)}
        >
          {showGuided ? "Hide guided settings" : "Guided settings"}
        </button>
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
      </div>

      {/* Guided Settings Panel */}
      {showGuided && (
        <div style={gs.panel}>
          <div style={gs.tabBar}>
            <TabButton active={activeTab === "build"} label="Build a Prompt" onClick={() => setActiveTab("build")} />
            <TabButton active={activeTab === "surprise"} label="Surprise Me" onClick={() => setActiveTab("surprise")} />
            <TabButton active={activeTab === "tuning"} label="Agent Tuning" onClick={() => setActiveTab("tuning")} />
          </div>
          {activeTab === "build" && (
            <PromptBuilderTab
              builderState={builderState}
              setBuilderState={setBuilderState}
              onUse={handleUsePrompt}
              disabled={disabled}
            />
          )}
          {activeTab === "surprise" && (
            <SurpriseMeTab onUse={handleUsePrompt} disabled={disabled} />
          )}
          {activeTab === "tuning" && (
            <AgentTuningTab config={agentConfig} setConfig={setAgentConfig} disabled={disabled} />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles — main input area (existing)
// ---------------------------------------------------------------------------

const styles = {
  inputArea: {
    padding: "16px 24px",
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border)",
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
  },
  controls: { display: "flex", gap: 8 },
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
  guidedToggle: {
    padding: "4px 10px",
    fontSize: 11,
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: 6,
    cursor: "pointer",
    transition: "color var(--transition)",
  },
  examples: { display: "flex", gap: 6, marginLeft: "auto" },
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

// ---------------------------------------------------------------------------
// Styles — guided settings panel
// ---------------------------------------------------------------------------

const gs = {
  panel: {
    marginTop: 12,
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    overflow: "hidden",
  },
  tabBar: {
    display: "flex",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-tertiary)",
  },
  tabBtn: {
    padding: "10px 20px",
    fontSize: 12,
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    transition: "color var(--transition)",
  },
  tabContent: {
    padding: 16,
  },

  // -- Builder --
  builderGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  fieldSelect: {
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    color: "var(--text-primary)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    outline: "none",
    cursor: "pointer",
  },
  fieldInput: {
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    color: "var(--text-primary)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    outline: "none",
  },
  chipGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    padding: "5px 12px",
    fontSize: 12,
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    cursor: "pointer",
    transition: "all var(--transition)",
  },

  // -- Preview --
  previewSection: {
    marginTop: 14,
    padding: 12,
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  previewText: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "var(--text-primary)",
    fontFamily: "var(--font-sans)",
  },
  useBtn: {
    padding: "5px 14px",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    color: "white",
    background: "var(--accent)",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  // -- Surprise Me --
  surpriseDesc: {
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    marginBottom: 12,
  },
  surpriseBtn: {
    padding: "10px 24px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    color: "var(--text-primary)",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all var(--transition)",
  },
  reshuffleBtn: {
    padding: "5px 14px",
    fontSize: 11,
    fontWeight: 500,
    fontFamily: "var(--font-sans)",
    color: "var(--text-secondary)",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    cursor: "pointer",
  },

  // -- Agent Tuning --
  tuningSection: {
    marginBottom: 16,
  },
  tuningSectionHeader: {
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: "1px solid var(--border)",
  },
  tuningSectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  toggleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
  },
  toggleInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  toggleDesc: {
    fontSize: 11,
    color: "var(--text-muted)",
    lineHeight: 1.4,
  },
  toggleTrack: {
    position: "relative",
    width: 36,
    height: 20,
    borderRadius: 10,
    border: "1px solid var(--border)",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all var(--transition)",
    padding: 0,
  },
  toggleThumb: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "white",
    transition: "transform var(--transition)",
    pointerEvents: "none",
  },
  sliderRow: {
    padding: "8px 0",
  },
  sliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    color: "var(--accent)",
    minWidth: 32,
    textAlign: "right",
  },
  slider: {
    width: "100%",
    height: 4,
    WebkitAppearance: "none",
    appearance: "none",
    background: "var(--bg-tertiary)",
    borderRadius: 2,
    outline: "none",
    cursor: "pointer",
    accentColor: "var(--accent)",
  },
  resetBtn: {
    padding: "6px 14px",
    fontSize: 11,
    fontWeight: 500,
    fontFamily: "var(--font-sans)",
    color: "var(--text-muted)",
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: 6,
    cursor: "pointer",
    marginTop: 4,
  },
};
