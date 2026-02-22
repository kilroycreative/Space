"""OpenPlanter Worker — Modal deployment.

Each investigation runs in its own isolated container with configurable memory.
The frontend POSTs to the Modal web endpoint; the function pushes real-time
events to Convex via HTTP mutations (same as the Flask worker).

Deploy:  modal deploy worker/modal_app.py
Dev:     modal serve worker/modal_app.py
"""
from __future__ import annotations

import modal

# ---------------------------------------------------------------------------
# Modal app & container image
# ---------------------------------------------------------------------------

app = modal.App("openplanter-worker")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ripgrep", "git", "curl")
    .pip_install("rich>=13.0", "prompt_toolkit>=3.0", "pyfiglet>=1.0")
    .add_local_dir("agent", remote_path="/app/agent")
    .add_local_file("pyproject.toml", remote_path="/app/pyproject.toml")
    .run_commands("cd /app && pip install --no-cache-dir -e .", "mkdir -p /workspace")
    .env({
        "OPENPLANTER_WORKSPACE": "/workspace",
    })
)

# Secrets injected at runtime via `modal secret create openplanter-secrets ...`
secrets = [modal.Secret.from_name("openplanter-secrets")]

# ---------------------------------------------------------------------------
# Convex HTTP client (identical to the Flask worker version)
# ---------------------------------------------------------------------------

import json
import sys
import urllib.request
import urllib.error
from typing import Any


class ConvexClient:
    """Minimal HTTP client for calling Convex mutations."""

    def __init__(self, url: str):
        self.base = url.rstrip("/")

    def mutation(self, fn_name: str, args: dict[str, Any]) -> Any:
        if not self.base:
            return None
        url = f"{self.base}/api/mutation"
        payload = json.dumps({
            "path": fn_name,
            "args": args,
            "format": "json",
        }).encode("utf-8")
        req = urllib.request.Request(
            url, data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode())
        except (urllib.error.URLError, OSError) as exc:
            print(f"[convex] mutation {fn_name} failed: {exc}", file=sys.stderr)
            return None


# ---------------------------------------------------------------------------
# Investigation function — one container per investigation, 2 GB memory
# ---------------------------------------------------------------------------

@app.function(
    image=image,
    secrets=secrets,
    memory=2048,
    timeout=600,
    retries=0,
)
def run_investigation(
    session_id: str,
    objective: str,
    provider: str,
    model_name: str,
    convex_url: str,
    config_overrides: dict[str, Any] | None = None,
):
    """Run a full investigation inside an isolated Modal container."""
    import os
    import time
    from pathlib import Path

    # Agent imports (available because we copied the agent/ directory into the image)
    sys.path.insert(0, "/app")
    from agent.config import AgentConfig
    from agent.builder import build_engine, build_model_factory
    from agent.runtime import SessionRuntime

    convex = ConvexClient(convex_url)

    cfg = AgentConfig.from_env(Path("/workspace"))
    if provider and provider not in ("auto", ""):
        cfg.provider = provider
    if model_name:
        cfg.model = model_name

    # Apply user-supplied config overrides
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
                    pass

    # Verify API keys
    if not any([cfg.openai_api_key, cfg.anthropic_api_key,
                cfg.openrouter_api_key, cfg.cerebras_api_key]):
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
            engine=engine, config=cfg, session_id=session_id,
        )
    except Exception as exc:
        convex.mutation("sessions:fail", {
            "sessionId": session_id,
            "error": f"Init failed: {exc}",
            "elapsed": 0,
        })
        return

    seq = [0]
    start_time = time.monotonic()
    step_count = [0]
    event_buffer: list[dict] = []
    BUFFER_FLUSH_SIZE = 5

    def flush_buffer():
        if not event_buffer:
            return
        batch = list(event_buffer)
        event_buffer.clear()
        convex.mutation("sessions:pushEvents", {"events": batch})

    def on_event(msg: str):
        elapsed = round(time.monotonic() - start_time, 1)
        seq[0] += 1
        event_buffer.append({
            "sessionId": session_id,
            "type": "trace",
            "data": {"message": msg, "elapsed": elapsed},
            "seq": seq[0],
        })
        if len(event_buffer) >= BUFFER_FLUSH_SIZE:
            flush_buffer()

    def on_step(step_data: dict):
        step_count[0] += 1
        elapsed = round(time.monotonic() - start_time, 1)
        seq[0] += 1
        step_data_clean = {
            k: v for k, v in step_data.items()
            if isinstance(v, (str, int, float, bool, list, dict, type(None)))
        }
        flush_buffer()
        convex.mutation("sessions:pushEvent", {
            "sessionId": session_id,
            "type": "step",
            "data": step_data_clean,
            "seq": seq[0],
        })
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


# ---------------------------------------------------------------------------
# Web endpoints — drop-in replacements for the Flask routes
# ---------------------------------------------------------------------------

@app.function(image=image, secrets=secrets)
@modal.fastapi_endpoint(method="POST", docs=True)
def investigate(data: dict):
    """Start a new investigation.

    Body: { objective: str, provider?: str, model?: str, config?: dict }
    Returns: { session_id: str }
    """
    import os
    import secrets as _secrets
    from datetime import datetime, timezone

    objective = (data.get("objective") or "").strip()
    if not objective:
        return {"error": "No objective provided."}, 400

    provider = data.get("provider", "")
    model_name = data.get("model", "")
    config_overrides = data.get("config")
    convex_url = os.environ.get("CONVEX_URL", "")

    # Generate session ID
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    session_id = f"{stamp}-{_secrets.token_hex(3)}"

    # Create session in Convex
    convex = ConvexClient(convex_url)
    convex.mutation("sessions:create", {
        "sessionId": session_id,
        "objective": objective,
        "provider": provider or "openrouter",
        "model": model_name or "anthropic/claude-sonnet-4.6",
        **({"config": config_overrides} if config_overrides else {}),
    })

    # Spawn investigation in a separate container (returns immediately)
    run_investigation.spawn(
        session_id=session_id,
        objective=objective,
        provider=provider,
        model_name=model_name,
        convex_url=convex_url,
        config_overrides=config_overrides,
    )

    return {"session_id": session_id}


@app.function(image=image, secrets=secrets)
@modal.fastapi_endpoint(method="POST", docs=True)
def stop(data: dict):
    """Best-effort stop (marks session as failed in Convex)."""
    import os

    session_id = data.get("session_id", "")
    if not session_id:
        return {"error": "No session_id provided."}, 400

    convex_url = os.environ.get("CONVEX_URL", "")
    convex = ConvexClient(convex_url)
    convex.mutation("sessions:fail", {
        "sessionId": session_id,
        "error": "Stopped by user.",
        "elapsed": 0,
    })
    return {"status": "stopped"}


@app.function(image=image, secrets=secrets)
@modal.fastapi_endpoint(method="GET", docs=True)
def health():
    """Health check."""
    import os
    return {
        "status": "ok",
        "runtime": "modal",
        "convex_configured": bool(os.environ.get("CONVEX_URL")),
    }
