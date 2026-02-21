"""OpenPlanter Dashboard — consumer-facing web UI.

Wraps the OpenPlanter agent engine with a Flask + SocketIO server that
streams investigation progress in real time to a browser-based dashboard.
"""
from __future__ import annotations

import json
import os
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Ensure the parent directory is on sys.path so `agent` can be imported.
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit

from agent.config import AgentConfig
from agent.builder import build_engine, build_model_factory
from agent.runtime import SessionRuntime, SessionStore
from agent.engine import ExternalContext

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("DASHBOARD_SECRET", "openplanter-dev-key")

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Global state – we keep one config and allow multiple sessions.
_workspace = Path(os.environ.get("OPENPLANTER_WORKSPACE", str(_ROOT))).resolve()
_active_sessions: dict[str, SessionRuntime] = {}
_running_tasks: dict[str, threading.Thread] = {}


def _get_config(**overrides: Any) -> AgentConfig:
    """Build an AgentConfig from environment + any per-request overrides."""
    cfg = AgentConfig.from_env(_workspace)
    for k, v in overrides.items():
        if hasattr(cfg, k) and v is not None:
            setattr(cfg, k, v)
    return cfg


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


# ---------------------------------------------------------------------------
# REST API
# ---------------------------------------------------------------------------

@app.route("/api/sessions", methods=["GET"])
def list_sessions():
    """List existing sessions."""
    cfg = _get_config()
    store = SessionStore(workspace=cfg.workspace, session_root_dir=cfg.session_root_dir)
    sessions = store.list_sessions(limit=50)
    return jsonify(sessions)


@app.route("/api/sessions/<session_id>/events", methods=["GET"])
def get_session_events(session_id: str):
    """Return events for a session."""
    cfg = _get_config()
    store = SessionStore(workspace=cfg.workspace, session_root_dir=cfg.session_root_dir)
    events_path = store._events_path(session_id)
    if not events_path.exists():
        return jsonify([])
    events = []
    for line in events_path.read_text(encoding="utf-8").splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return jsonify(events)


@app.route("/api/config", methods=["GET"])
def get_config():
    """Return current (non-secret) configuration."""
    cfg = _get_config()
    return jsonify({
        "workspace": str(cfg.workspace),
        "provider": cfg.provider,
        "model": cfg.model,
        "reasoning_effort": cfg.reasoning_effort,
        "recursive": cfg.recursive,
        "max_depth": cfg.max_depth,
        "max_steps_per_call": cfg.max_steps_per_call,
        "has_openai_key": bool(cfg.openai_api_key),
        "has_anthropic_key": bool(cfg.anthropic_api_key),
        "has_openrouter_key": bool(cfg.openrouter_api_key),
        "has_cerebras_key": bool(cfg.cerebras_api_key),
        "has_exa_key": bool(cfg.exa_api_key),
    })


@app.route("/api/status", methods=["GET"])
def get_status():
    """Return which sessions are currently running."""
    running = {
        sid: t.is_alive()
        for sid, t in _running_tasks.items()
    }
    return jsonify({
        "active_sessions": list(_active_sessions.keys()),
        "running_tasks": running,
    })


# ---------------------------------------------------------------------------
# WebSocket events
# ---------------------------------------------------------------------------

@socketio.on("connect")
def on_connect():
    emit("connected", {"status": "ok", "workspace": str(_workspace)})


@socketio.on("start_investigation")
def on_start_investigation(data: dict):
    """Launch an investigation.

    Expects: { objective: str, session_id?: str, resume?: bool, provider?: str, model?: str }
    """
    objective = (data.get("objective") or "").strip()
    if not objective:
        emit("error", {"message": "No objective provided."})
        return

    session_id = data.get("session_id")
    resume = data.get("resume", False)
    provider = data.get("provider")
    model = data.get("model")

    overrides: dict[str, Any] = {}
    if provider:
        overrides["provider"] = provider
    if model:
        overrides["model"] = model

    cfg = _get_config(**overrides)

    # Check that we have at least one API key
    if not any([cfg.openai_api_key, cfg.anthropic_api_key, cfg.openrouter_api_key, cfg.cerebras_api_key]):
        emit("error", {
            "message": "No API keys configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY, or CEREBRAS_API_KEY as environment variables."
        })
        return

    # Build engine + session
    try:
        engine = build_engine(cfg)
        engine.model_factory = build_model_factory(cfg)
        runtime = SessionRuntime.bootstrap(
            engine=engine,
            config=cfg,
            session_id=session_id,
            resume=resume,
        )
    except Exception as exc:
        emit("error", {"message": f"Failed to initialize: {exc}"})
        return

    sid = runtime.session_id
    _active_sessions[sid] = runtime

    emit("session_started", {
        "session_id": sid,
        "objective": objective,
        "model": cfg.model,
        "provider": cfg.provider,
    })

    # Run the solve in a background thread, emitting events as we go.
    def _run():
        step_count = 0
        start_time = time.monotonic()

        def on_event(msg: str):
            socketio.emit("event", {
                "session_id": sid,
                "message": msg,
                "elapsed": round(time.monotonic() - start_time, 1),
            })

        def on_step(step_data: dict):
            nonlocal step_count
            step_count += 1
            step_data["session_id"] = sid
            step_data["step_number"] = step_count
            step_data["elapsed"] = round(time.monotonic() - start_time, 1)
            socketio.emit("step", step_data)

        def on_content_delta(delta_type: str, text: str):
            socketio.emit("content_delta", {
                "session_id": sid,
                "type": delta_type,
                "text": text,
            })

        try:
            result = runtime.solve(
                objective=objective,
                on_event=on_event,
                on_step=on_step,
                on_content_delta=on_content_delta,
            )
            socketio.emit("investigation_complete", {
                "session_id": sid,
                "result": result,
                "elapsed": round(time.monotonic() - start_time, 1),
                "steps": step_count,
            })
        except Exception as exc:
            socketio.emit("investigation_error", {
                "session_id": sid,
                "error": str(exc),
                "elapsed": round(time.monotonic() - start_time, 1),
            })
        finally:
            _running_tasks.pop(sid, None)

    thread = threading.Thread(target=_run, daemon=True, name=f"investigation-{sid}")
    _running_tasks[sid] = thread
    thread.start()


@socketio.on("stop_investigation")
def on_stop_investigation(data: dict):
    """Attempt to stop a running investigation by removing its runtime."""
    sid = data.get("session_id", "")
    if sid in _running_tasks:
        # We can't forcefully kill a thread, but we can remove the runtime
        # so subsequent tool calls fail, effectively stopping it.
        _active_sessions.pop(sid, None)
        emit("investigation_stopped", {"session_id": sid})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("DASHBOARD_PORT", "5000"))
    host = os.environ.get("DASHBOARD_HOST", "0.0.0.0")
    debug = os.environ.get("DASHBOARD_DEBUG", "false").lower() in ("1", "true", "yes")

    print(f"\n  OpenPlanter Dashboard")
    print(f"  http://{host}:{port}")
    print(f"  Workspace: {_workspace}\n")

    socketio.run(app, host=host, port=port, debug=debug, allow_unsafe_werkzeug=True)
