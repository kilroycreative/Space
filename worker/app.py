"""OpenPlanter Worker — Python backend that runs investigations
and pushes real-time events to Convex.

The Convex React frontend subscribes to real-time queries; this worker
is the only process that writes to Convex via HTTP mutations.
"""
from __future__ import annotations

import json
import os
import sys
import threading
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Ensure parent dir is on path for agent imports
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from flask import Flask, jsonify, request
from flask_cors import CORS

from agent.config import AgentConfig
from agent.builder import build_engine, build_model_factory
from agent.runtime import SessionRuntime, SessionStore

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CONVEX_URL = os.environ.get("CONVEX_URL", "")  # e.g. https://your-project.convex.cloud
CONVEX_DEPLOY_KEY = os.environ.get("CONVEX_DEPLOY_KEY", "")  # optional, for admin mutations
WORKSPACE = Path(os.environ.get("OPENPLANTER_WORKSPACE", str(_ROOT))).resolve()

app = Flask(__name__)
CORS(app)

_running: dict[str, threading.Thread] = {}


# ---------------------------------------------------------------------------
# Convex HTTP client — pushes mutations to the Convex backend
# ---------------------------------------------------------------------------

class ConvexClient:
    """Minimal HTTP client for calling Convex mutations."""

    def __init__(self, url: str):
        # url should be the Convex deployment URL, e.g. https://foo.convex.cloud
        self.base = url.rstrip("/")

    def mutation(self, fn_name: str, args: dict[str, Any]) -> Any:
        """Call a Convex mutation via the HTTP API."""
        if not self.base:
            return None  # No Convex configured — events still run locally

        url = f"{self.base}/api/mutation"
        payload = json.dumps({
            "path": fn_name,
            "args": args,
            "format": "json",
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode())
        except (urllib.error.URLError, OSError) as exc:
            # Non-fatal — log and continue
            print(f"[convex] mutation {fn_name} failed: {exc}", file=sys.stderr)
            return None


convex = ConvexClient(CONVEX_URL)


# ---------------------------------------------------------------------------
# Investigation runner
# ---------------------------------------------------------------------------

def _run_investigation(
    session_id: str,
    objective: str,
    provider: str,
    model_name: str,
    config_overrides: dict[str, Any] | None = None,
):
    """Run an investigation in a background thread, pushing events to Convex."""
    cfg = AgentConfig.from_env(WORKSPACE)
    if provider and provider != "auto":
        cfg.provider = provider
    if model_name:
        cfg.model = model_name

    # Apply user-supplied config overrides from the guided settings panel
    if config_overrides:
        _allowed = {
            "recursive", "max_depth", "max_steps_per_call",
            "reasoning_effort", "acceptance_criteria", "demo",
        }
        for key, value in config_overrides.items():
            if key in _allowed and hasattr(cfg, key):
                expected_type = type(getattr(cfg, key))
                try:
                    setattr(cfg, key, expected_type(value))
                except (TypeError, ValueError):
                    pass  # skip invalid values silently

    # Verify we have API keys
    if not any([cfg.openai_api_key, cfg.anthropic_api_key, cfg.openrouter_api_key, cfg.cerebras_api_key]):
        convex.mutation("sessions:fail", {
            "sessionId": session_id,
            "error": "No API keys configured.",
            "elapsed": 0,
        })
        return

    try:
        engine = build_engine(cfg)
        engine.model_factory = build_model_factory(cfg)
        runtime = SessionRuntime.bootstrap(
            engine=engine,
            config=cfg,
            session_id=session_id,
        )
    except Exception as exc:
        convex.mutation("sessions:fail", {
            "sessionId": session_id,
            "error": f"Init failed: {exc}",
            "elapsed": 0,
        })
        return

    seq = [0]  # mutable counter for event sequencing
    start_time = time.monotonic()
    step_count = [0]
    event_buffer = []
    buffer_lock = threading.Lock()
    BUFFER_FLUSH_SIZE = 5  # batch events for efficiency

    def flush_buffer():
        with buffer_lock:
            if not event_buffer:
                return
            batch = list(event_buffer)
            event_buffer.clear()
        convex.mutation("sessions:pushEvents", {"events": batch})

    def on_event(msg: str):
        elapsed = round(time.monotonic() - start_time, 1)
        seq[0] += 1
        evt = {
            "sessionId": session_id,
            "type": "trace",
            "data": {"message": msg, "elapsed": elapsed},
            "seq": seq[0],
        }
        with buffer_lock:
            event_buffer.append(evt)
        if len(event_buffer) >= BUFFER_FLUSH_SIZE:
            flush_buffer()

    def on_step(step_data: dict):
        step_count[0] += 1
        elapsed = round(time.monotonic() - start_time, 1)
        seq[0] += 1

        # Push step event
        step_data_clean = {
            k: v for k, v in step_data.items()
            if isinstance(v, (str, int, float, bool, list, dict, type(None)))
        }
        flush_buffer()  # flush pending traces first
        convex.mutation("sessions:pushEvent", {
            "sessionId": session_id,
            "type": "step",
            "data": step_data_clean,
            "seq": seq[0],
        })

        # Update session progress
        convex.mutation("sessions:updateProgress", {
            "sessionId": session_id,
            "steps": step_count[0],
            "elapsed": elapsed,
        })

    def on_content_delta(delta_type: str, text: str):
        seq[0] += 1
        convex.mutation("sessions:pushEvent", {
            "sessionId": session_id,
            "type": "delta",
            "data": {"deltaType": delta_type, "text": text},
            "seq": seq[0],
        })

    try:
        result = runtime.solve(
            objective=objective,
            on_event=on_event,
            on_step=on_step,
            on_content_delta=on_content_delta,
        )
        flush_buffer()
        elapsed = round(time.monotonic() - start_time, 1)
        convex.mutation("sessions:complete", {
            "sessionId": session_id,
            "result": result,
            "steps": step_count[0],
            "elapsed": elapsed,
        })
    except Exception as exc:
        flush_buffer()
        elapsed = round(time.monotonic() - start_time, 1)
        convex.mutation("sessions:fail", {
            "sessionId": session_id,
            "error": str(exc),
            "elapsed": elapsed,
        })
    finally:
        _running.pop(session_id, None)


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@app.route("/api/investigate", methods=["POST"])
def start_investigation():
    """Start a new investigation.

    Body: { objective: str, provider?: str, model?: str }
    Returns: { session_id: str }
    """
    data = request.get_json(force=True)
    objective = (data.get("objective") or "").strip()
    if not objective:
        return jsonify({"error": "No objective provided."}), 400

    provider = data.get("provider", "auto")
    model_name = data.get("model", "")
    config_overrides = data.get("config")  # optional dict of agent config overrides

    # Generate session ID
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    import secrets
    session_id = f"{stamp}-{secrets.token_hex(3)}"

    # Create session in Convex
    create_args: dict[str, Any] = {
        "sessionId": session_id,
        "objective": objective,
        "provider": provider or "auto",
        "model": model_name or "claude-opus-4-6",
    }
    if config_overrides:
        create_args["config"] = config_overrides
    convex.mutation("sessions:create", create_args)

    # Launch investigation thread
    thread = threading.Thread(
        target=_run_investigation,
        args=(session_id, objective, provider, model_name, config_overrides),
        daemon=True,
    )
    _running[session_id] = thread
    thread.start()

    return jsonify({"session_id": session_id})


@app.route("/api/investigate/<session_id>/stop", methods=["POST"])
def stop_investigation(session_id: str):
    """Best-effort stop."""
    _running.pop(session_id, None)
    convex.mutation("sessions:fail", {
        "sessionId": session_id,
        "error": "Stopped by user.",
        "elapsed": 0,
    })
    return jsonify({"status": "stopped"})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "workspace": str(WORKSPACE),
        "convex_configured": bool(CONVEX_URL),
        "running_investigations": len(_running),
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("WORKER_PORT", "5001"))
    host = os.environ.get("WORKER_HOST", "0.0.0.0")

    print(f"\n  OpenPlanter Worker")
    print(f"  http://{host}:{port}")
    print(f"  Workspace: {WORKSPACE}")
    print(f"  Convex: {CONVEX_URL or '(not configured — local only)'}\n")

    app.run(host=host, port=port, debug=False)
