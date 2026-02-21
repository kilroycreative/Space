/**
 * OpenPlanter Dashboard — Client
 *
 * Real-time investigation dashboard using Socket.IO.
 */

(function () {
    "use strict";

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    const state = {
        socket: null,
        connected: false,
        currentSession: null,
        isRunning: false,
        steps: 0,
        elapsed: 0,
        sessions: [],
    };

    // -----------------------------------------------------------------------
    // DOM refs
    // -----------------------------------------------------------------------
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        statusDot: $(".status-dot"),
        statusText: $(".status-text"),
        objectiveInput: $("#objective-input"),
        startBtn: $("#start-btn"),
        stopBtn: $("#stop-btn"),
        providerSelect: $("#provider-select"),
        modelSelect: $("#model-select"),
        feed: $(".feed"),
        feedEmpty: $(".feed-empty"),
        sessionList: $(".session-list"),
        progressBar: $(".progress-bar"),
        sessionIdDisplay: $("#current-session-id"),
        stepCounter: $("#step-counter"),
        elapsedCounter: $("#elapsed-counter"),
    };

    // -----------------------------------------------------------------------
    // Socket.IO connection
    // -----------------------------------------------------------------------
    function connect() {
        const socket = io();
        state.socket = socket;

        socket.on("connect", () => {
            state.connected = true;
            setStatus("connected", "Connected");
        });

        socket.on("disconnect", () => {
            state.connected = false;
            setStatus("error", "Disconnected");
        });

        socket.on("connected", (data) => {
            console.log("Server workspace:", data.workspace);
        });

        socket.on("error", (data) => {
            appendError(data.message);
        });

        socket.on("session_started", (data) => {
            state.currentSession = data.session_id;
            state.isRunning = true;
            state.steps = 0;
            state.elapsed = 0;
            setStatus("running", "Investigating...");
            updateControls();
            clearFeed();
            appendObjective(data.objective, data.model, data.provider);
            dom.progressBar.classList.add("active");
            if (dom.sessionIdDisplay) dom.sessionIdDisplay.textContent = data.session_id;
            refreshSessions();
        });

        socket.on("event", (data) => {
            state.elapsed = data.elapsed || 0;
            appendEvent(data.message, data.elapsed);
            updateCounters();
        });

        socket.on("step", (data) => {
            state.steps = data.step_number || state.steps + 1;
            state.elapsed = data.elapsed || 0;
            appendStep(data);
            updateCounters();
            scrollFeed();
        });

        socket.on("content_delta", (data) => {
            appendDelta(data.type, data.text);
        });

        socket.on("investigation_complete", (data) => {
            state.isRunning = false;
            state.elapsed = data.elapsed || 0;
            setStatus("connected", "Complete");
            updateControls();
            appendResult(data.result, data.elapsed, data.steps);
            dom.progressBar.classList.remove("active");
            updateCounters();
            scrollFeed();
            refreshSessions();
        });

        socket.on("investigation_error", (data) => {
            state.isRunning = false;
            state.elapsed = data.elapsed || 0;
            setStatus("error", "Error");
            updateControls();
            appendError(data.error);
            dom.progressBar.classList.remove("active");
            refreshSessions();
        });

        socket.on("investigation_stopped", (data) => {
            state.isRunning = false;
            setStatus("connected", "Stopped");
            updateControls();
            dom.progressBar.classList.remove("active");
        });
    }

    // -----------------------------------------------------------------------
    // Status
    // -----------------------------------------------------------------------
    function setStatus(cls, text) {
        dom.statusDot.className = "status-dot " + cls;
        dom.statusText.textContent = text;
    }

    function updateControls() {
        dom.startBtn.disabled = state.isRunning;
        dom.stopBtn.style.display = state.isRunning ? "inline-flex" : "none";
        dom.objectiveInput.disabled = state.isRunning;
    }

    function updateCounters() {
        if (dom.stepCounter) dom.stepCounter.textContent = state.steps;
        if (dom.elapsedCounter) dom.elapsedCounter.textContent = formatElapsed(state.elapsed);
    }

    function formatElapsed(sec) {
        if (sec < 60) return sec.toFixed(1) + "s";
        const m = Math.floor(sec / 60);
        const s = (sec % 60).toFixed(0);
        return m + "m " + s + "s";
    }

    // -----------------------------------------------------------------------
    // Feed rendering
    // -----------------------------------------------------------------------
    function clearFeed() {
        dom.feed.innerHTML = "";
        if (dom.feedEmpty) dom.feedEmpty.style.display = "none";
    }

    function hideFeedEmpty() {
        if (dom.feedEmpty) dom.feedEmpty.style.display = "none";
    }

    function scrollFeed() {
        requestAnimationFrame(() => {
            dom.feed.scrollTop = dom.feed.scrollHeight;
        });
    }

    function appendObjective(objective, model, provider) {
        hideFeedEmpty();
        const el = document.createElement("div");
        el.className = "step-card";
        el.innerHTML = `
            <div class="step-card-header">
                <span class="step-badge subtask">Investigation</span>
                <span class="step-tool-name">${escapeHtml(objective)}</span>
                <span class="step-meta">${provider}/${model}</span>
            </div>
        `;
        dom.feed.appendChild(el);
        scrollFeed();
    }

    function appendEvent(message, elapsed) {
        hideFeedEmpty();
        // Classify the event
        let cls = "event-trace";
        if (message.includes("calling model")) cls = "event-trace";
        else if (message.includes("final answer")) cls = "event-result";
        else if (message.includes("error")) cls = "event-error";
        else if (message.includes("subtask") || message.includes("executing")) cls = "event-tool";

        const el = document.createElement("div");
        el.className = "event-item " + cls;
        el.innerHTML = `<span class="event-time">${formatElapsed(elapsed)}</span>${escapeHtml(message)}`;
        dom.feed.appendChild(el);

        // Keep feed manageable
        while (dom.feed.children.length > 500) {
            dom.feed.removeChild(dom.feed.firstChild);
        }
    }

    function appendStep(data) {
        hideFeedEmpty();
        const action = data.action || {};
        const name = action.name || "unknown";
        const args = action.arguments || {};
        const observation = data.observation || "";
        const elapsed = data.elapsed || 0;
        const depth = data.depth || 0;
        const step = data.step || 0;
        const isFinal = data.is_final;

        // Determine badge type
        let badgeCls = "tool";
        let badgeText = name;
        if (name === "think") { badgeCls = "think"; badgeText = "thinking"; }
        else if (name === "subtask" || name === "execute") { badgeCls = "subtask"; }
        else if (name === "final" || name === "_model_turn") { badgeCls = "final"; badgeText = name === "_model_turn" ? "model" : "final"; }

        // Build argument summary
        let argSummary = "";
        if (name === "read_file" || name === "write_file" || name === "edit_file") {
            argSummary = args.path || "";
        } else if (name === "run_shell") {
            argSummary = args.command || "";
        } else if (name === "search_files") {
            argSummary = args.query || "";
        } else if (name === "web_search") {
            argSummary = args.query || "";
        } else if (name === "subtask" || name === "execute") {
            argSummary = args.objective || "";
        } else if (name === "think") {
            argSummary = (args.note || "").substring(0, 120);
        } else if (name === "final") {
            argSummary = "";
        }

        // Truncate observation for display
        const obsPreview = observation.length > 400
            ? observation.substring(0, 400)
            : observation;
        const hasMore = observation.length > 400;

        const el = document.createElement("div");
        el.className = "step-card";
        el.innerHTML = `
            <div class="step-card-header">
                <span class="step-badge ${badgeCls}">${escapeHtml(badgeText)}</span>
                ${argSummary ? `<span class="step-tool-name">${escapeHtml(truncate(argSummary, 80))}</span>` : ""}
                <span class="step-meta">d${depth}/s${step} &middot; ${formatElapsed(elapsed)}</span>
            </div>
            ${obsPreview ? `<div class="step-card-body">${escapeHtml(obsPreview)}${hasMore ? "..." : ""}</div>` : ""}
            ${hasMore ? `<div class="step-toggle" data-full="${btoa(unescape(encodeURIComponent(observation)))}">Show more</div>` : ""}
        `;

        // Toggle expand
        const toggle = el.querySelector(".step-toggle");
        if (toggle) {
            toggle.addEventListener("click", function () {
                const body = el.querySelector(".step-card-body");
                if (body.classList.contains("expanded")) {
                    body.textContent = obsPreview + "...";
                    body.classList.remove("expanded");
                    this.textContent = "Show more";
                } else {
                    try {
                        body.textContent = decodeURIComponent(escape(atob(this.dataset.full)));
                    } catch {
                        body.textContent = observation;
                    }
                    body.classList.add("expanded");
                    this.textContent = "Show less";
                }
            });
        }

        dom.feed.appendChild(el);
    }

    function appendResult(result, elapsed, steps) {
        hideFeedEmpty();
        const el = document.createElement("div");
        el.className = "result-card";
        el.innerHTML = `
            <h3>Investigation Complete</h3>
            <div class="result-body">${escapeHtml(result)}</div>
            <div class="result-stats">
                <span>${steps} steps</span>
                <span>${formatElapsed(elapsed)}</span>
            </div>
        `;
        dom.feed.appendChild(el);
        scrollFeed();
    }

    function appendError(message) {
        hideFeedEmpty();
        const el = document.createElement("div");
        el.className = "error-card";
        el.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
        dom.feed.appendChild(el);
        scrollFeed();
    }

    let _deltaContainer = null;

    function appendDelta(type, text) {
        if (type === "thinking") {
            if (!_deltaContainer || !_deltaContainer.classList.contains("thinking-stream")) {
                _deltaContainer = document.createElement("div");
                _deltaContainer.className = "thinking-stream";
                dom.feed.appendChild(_deltaContainer);
            }
            _deltaContainer.textContent += text;
        } else {
            _deltaContainer = null;
        }
    }

    // -----------------------------------------------------------------------
    // Sessions sidebar
    // -----------------------------------------------------------------------
    function refreshSessions() {
        fetch("/api/sessions")
            .then((r) => r.json())
            .then((sessions) => {
                state.sessions = sessions;
                renderSessions(sessions);
            })
            .catch(() => {});
    }

    function renderSessions(sessions) {
        dom.sessionList.innerHTML = "";
        if (!sessions.length) {
            dom.sessionList.innerHTML = '<div class="session-item"><div class="session-info"><div class="session-id" style="color: var(--text-muted)">No sessions yet</div></div></div>';
            return;
        }
        sessions.forEach((s) => {
            const isActive = s.session_id === state.currentSession;
            const el = document.createElement("div");
            el.className = "session-item" + (isActive ? " active" : "");
            el.innerHTML = `
                <div class="session-dot ${isActive ? "active" : "idle"}"></div>
                <div class="session-info">
                    <div class="session-id">${escapeHtml(s.session_id)}</div>
                    <div class="session-date">${s.created_at ? formatDate(s.created_at) : "—"}</div>
                </div>
            `;
            el.addEventListener("click", () => loadSession(s.session_id));
            dom.sessionList.appendChild(el);
        });
    }

    function loadSession(sessionId) {
        if (state.isRunning) return;
        state.currentSession = sessionId;
        if (dom.sessionIdDisplay) dom.sessionIdDisplay.textContent = sessionId;
        if (window.innerWidth <= 768) closeMobileSidebar();

        fetch(`/api/sessions/${sessionId}/events`)
            .then((r) => r.json())
            .then((events) => {
                clearFeed();
                events.forEach((evt) => {
                    if (evt.type === "objective") {
                        appendObjective(evt.payload.text, "", "");
                    } else if (evt.type === "step") {
                        appendStep(evt.payload);
                    } else if (evt.type === "result") {
                        appendResult(evt.payload.text, 0, 0);
                    } else if (evt.type === "trace") {
                        appendEvent(evt.payload.message, 0);
                    }
                });
                scrollFeed();
                refreshSessions();
            })
            .catch((err) => appendError("Failed to load session: " + err));
    }

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    function startInvestigation() {
        const objective = dom.objectiveInput.value.trim();
        if (!objective || state.isRunning) return;

        state.socket.emit("start_investigation", {
            objective: objective,
            provider: dom.providerSelect.value || undefined,
            model: dom.modelSelect.value || undefined,
        });
    }

    function stopInvestigation() {
        if (!state.currentSession) return;
        state.socket.emit("stop_investigation", {
            session_id: state.currentSession,
        });
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function truncate(str, len) {
        return str.length > len ? str.substring(0, len) + "..." : str;
    }

    function formatDate(isoStr) {
        try {
            const d = new Date(isoStr);
            return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch {
            return isoStr;
        }
    }

    // -----------------------------------------------------------------------
    // Config loader
    // -----------------------------------------------------------------------
    function loadConfig() {
        fetch("/api/config")
            .then((r) => r.json())
            .then((cfg) => {
                // Update model select options based on provider
                const modelOpts = {
                    auto: ["claude-opus-4-6", "gpt-5.2", "anthropic/claude-sonnet-4-5"],
                    anthropic: ["claude-opus-4-6", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
                    openai: ["gpt-5.2", "gpt-4o", "gpt-4.1"],
                    openrouter: ["anthropic/claude-sonnet-4-5", "anthropic/claude-opus-4-6", "openai/gpt-5.2"],
                    cerebras: ["qwen-3-235b-a22b-instruct-2507"],
                };

                // Populate provider
                dom.providerSelect.value = cfg.provider || "auto";

                // Update model options
                updateModelOptions(cfg.provider || "auto", modelOpts);

                // Set keys indicators
                const keys = [];
                if (cfg.has_anthropic_key) keys.push("Anthropic");
                if (cfg.has_openai_key) keys.push("OpenAI");
                if (cfg.has_openrouter_key) keys.push("OpenRouter");
                if (cfg.has_cerebras_key) keys.push("Cerebras");
                if (cfg.has_exa_key) keys.push("Exa");

                const keysEl = $("#keys-indicator");
                if (keysEl) {
                    keysEl.textContent = keys.length ? keys.join(", ") : "No keys configured";
                    keysEl.style.color = keys.length ? "var(--green)" : "var(--red)";
                }
            })
            .catch(() => {});
    }

    function updateModelOptions(provider, modelOpts) {
        const opts = modelOpts[provider] || modelOpts.auto;
        dom.modelSelect.innerHTML = "";
        opts.forEach((m) => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m;
            dom.modelSelect.appendChild(opt);
        });
    }

    // -----------------------------------------------------------------------
    // Mobile sidebar toggle
    // -----------------------------------------------------------------------
    function closeMobileSidebar() {
        const sidebar = $("#sidebar");
        const overlay = $("#sidebar-overlay");
        if (sidebar) sidebar.classList.remove("open");
        if (overlay) overlay.classList.remove("open");
    }

    function initMobileSidebar() {
        const menuBtn = $("#menu-btn");
        const sidebar = $("#sidebar");
        const overlay = $("#sidebar-overlay");
        const closeBtn = $("#sidebar-close-btn");

        function openSidebar() {
            sidebar.classList.add("open");
            overlay.classList.add("open");
        }

        if (menuBtn) menuBtn.addEventListener("click", openSidebar);
        if (overlay) overlay.addEventListener("click", closeMobileSidebar);
        if (closeBtn) closeBtn.addEventListener("click", closeMobileSidebar);
    }

    // -----------------------------------------------------------------------
    // Init
    // -----------------------------------------------------------------------
    function init() {
        connect();
        loadConfig();
        refreshSessions();
        initMobileSidebar();

        // Event listeners
        dom.startBtn.addEventListener("click", startInvestigation);
        dom.stopBtn.addEventListener("click", stopInvestigation);

        dom.objectiveInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                startInvestigation();
            }
        });

        // Auto-resize textarea
        dom.objectiveInput.addEventListener("input", () => {
            dom.objectiveInput.style.height = "auto";
            dom.objectiveInput.style.height = Math.min(dom.objectiveInput.scrollHeight, 120) + "px";
        });

        // Provider change updates model list
        dom.providerSelect.addEventListener("change", () => {
            const modelOpts = {
                auto: ["claude-opus-4-6", "gpt-5.2", "anthropic/claude-sonnet-4-5"],
                anthropic: ["claude-opus-4-6", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
                openai: ["gpt-5.2", "gpt-4o", "gpt-4.1"],
                openrouter: ["anthropic/claude-sonnet-4-5", "anthropic/claude-opus-4-6", "openai/gpt-5.2"],
                cerebras: ["qwen-3-235b-a22b-instruct-2507"],
            };
            updateModelOptions(dom.providerSelect.value, modelOpts);
        });
    }

    // Boot
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
