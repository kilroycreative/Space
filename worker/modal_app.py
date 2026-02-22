"""OpenPlanter Worker — Modal edition.

Each investigation runs in its own isolated 2 GB container.
No shared memory, no OOM-killing neighbours, scales to zero when idle.

Deploy:
    modal secret create openplanter-secrets \
        CONVEX_URL=https://brazen-alpaca-328.convex.cloud \
        OPENROUTER_API_KEY=sk-or-... \
        EXA_API_KEY=...

    modal deploy worker/modal_app.py

The printed endpoint URL replaces VITE_WORKER_URL in Vercel env.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import modal

# ---------------------------------------------------------------------------
# App + image
# ---------------------------------------------------------------------------

app = modal.App("openplanter-worker")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ripgrep", "git", "curl")
    .pip_install(
        "rich>=13.0", "prompt_toolkit>=3.0", "pyfiglet>=1.0",
        "fastapi[standard]", "pydantic",
    )
    .run_commands("mkdir -p /workspace /app")
    .env({"PYTHONPATH": "/app", "OPENPLANTER_WORKSPACE": "/workspace"})
    .add_local_dir(".", remote_path="/app", ignore=["__pycache__", "*.pyc", ".git", "web", "node_modules"])
)

secret = modal.Secret.from_name("openplanter-secrets")


# ---------------------------------------------------------------------------
# Convex client
# ---------------------------------------------------------------------------

class ConvexClient:
    def __init__(self, url: str):
        self.base = url.rstrip("/")

    def mutation(self, fn_name: str, args: dict[str, Any]) -> Any:
        if not self.base:
            return None
        url = f"{self.base}/api/mutation"
        payload = json.dumps({"path": fn_name, "args": args, "format": "json"}).encode()
        req = urllib.request.Request(
            url, data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode())
        except (urllib.error.URLError, OSError) as exc:
            print(f"[convex] {fn_name} failed: {exc}", file=sys.stderr)
            return None


# ---------------------------------------------------------------------------
# Core investigation — each call gets its own 2 GB container
# ---------------------------------------------------------------------------

@app.function(
    image=image,
    secrets=[secret],
    memory=2048,
    timeout=600,
)
def run_investigation(
    session_id: str,
    objective: str,
    provider: str,
    model_name: str,
    config_overrides: dict[str, Any] | None = None,
):
    from agent.config import AgentConfig
    from agent.builder import build_engine, build_model_factory
    from agent.runtime import SessionRuntime

    convex = ConvexClient(os.environ.get("CONVEX_URL", ""))
    workspace = Path(os.environ.get("OPENPLANTER_WORKSPACE", "/workspace"))

    cfg = AgentConfig.from_env(workspace)
    if provider and provider != "auto":
        cfg.provider = provider
    if model_name:
        cfg.model = model_name

    if config_overrides:
        _allowed = {
            "recursive", "max_depth", "max_steps_per_call",
            "reasoning_effort", "acceptance_criteria", "demo",
        }
        for key, value in config_overrides.items():
            if key in _allowed and hasattr(cfg, key):
                try:
                    setattr(cfg, key, type(getattr(cfg, key))(value))
                except (TypeError, ValueError):
                    pass

    if not any([cfg.openai_api_key, cfg.anthropic_api_key,
                cfg.openrouter_api_key, cfg.cerebras_api_key]):
        convex.mutation("sessions:fail", {
            "sessionId": session_id, "error": "No API keys configured.", "elapsed": 0,
        })
        return

    try:
        engine = build_engine(cfg)
        engine.model_factory = build_model_factory(cfg)
        runtime = SessionRuntime.bootstrap(engine=engine, config=cfg, session_id=session_id)
    except Exception as exc:
        convex.mutation("sessions:fail", {
            "sessionId": session_id, "error": f"Init failed: {exc}", "elapsed": 0,
        })
        return

    seq = [0]
    start_time = time.monotonic()
    step_count = [0]
    event_buffer: list[dict] = []

    def flush():
        if not event_buffer:
            return
        batch = list(event_buffer)
        event_buffer.clear()
        convex.mutation("sessions:pushEvents", {"events": batch})

    def on_event(msg: str):
        seq[0] += 1
        event_buffer.append({
            "sessionId": session_id, "type": "trace",
            "data": {"message": msg, "elapsed": round(time.monotonic() - start_time, 1)},
            "seq": seq[0],
        })
        if len(event_buffer) >= 5:
            flush()

    def on_step(step_data: dict):
        step_count[0] += 1
        seq[0] += 1
        flush()
        convex.mutation("sessions:pushEvent", {
            "sessionId": session_id, "type": "step",
            "data": {k: v for k, v in step_data.items()
                     if isinstance(v, (str, int, float, bool, list, dict, type(None)))},
            "seq": seq[0],
        })
        convex.mutation("sessions:updateProgress", {
            "sessionId": session_id,
            "steps": step_count[0],
            "elapsed": round(time.monotonic() - start_time, 1),
        })

    def on_content_delta(delta_type: str, text: str):
        seq[0] += 1
        convex.mutation("sessions:pushEvent", {
            "sessionId": session_id, "type": "delta",
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
        flush()
        convex.mutation("sessions:complete", {
            "sessionId": session_id, "result": result,
            "steps": step_count[0],
            "elapsed": round(time.monotonic() - start_time, 1),
        })
    except Exception as exc:
        flush()
        convex.mutation("sessions:fail", {
            "sessionId": session_id, "error": str(exc),
            "elapsed": round(time.monotonic() - start_time, 1),
        })


# ---------------------------------------------------------------------------
# FastAPI web layer — all framework imports are inside the function
# so they only execute inside the Modal container, not locally
# ---------------------------------------------------------------------------

@app.function(image=image, secrets=[secret])
@modal.asgi_app()
def fastapi_handler():
    import secrets as _secrets
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel

    web_app = FastAPI()
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class InvestigateRequest(BaseModel):
        objective: str
        provider: str = "openrouter"
        model: str = "anthropic/claude-sonnet-4.6"
        config: dict | None = None

    @web_app.post("/api/investigate")
    async def investigate(body: InvestigateRequest):
        objective = body.objective.strip()
        if not objective:
            raise HTTPException(status_code=400, detail="No objective provided.")

        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        session_id = f"{stamp}-{_secrets.token_hex(3)}"

        convex = ConvexClient(os.environ.get("CONVEX_URL", ""))
        create_args: dict[str, Any] = {
            "sessionId": session_id,
            "objective": objective,
            "provider": body.provider,
            "model": body.model,
        }
        if body.config:
            create_args["config"] = body.config
        convex.mutation("sessions:create", create_args)

        run_investigation.spawn(session_id, objective, body.provider, body.model, body.config)
        return {"session_id": session_id}

    @web_app.post("/api/investigate/{session_id}/stop")
    async def stop(session_id: str):
        convex = ConvexClient(os.environ.get("CONVEX_URL", ""))
        convex.mutation("sessions:fail", {
            "sessionId": session_id, "error": "Stopped by user.", "elapsed": 0,
        })
        return {"status": "stopped"}

    @web_app.get("/api/health")
    async def health():
        return {"status": "ok", "runtime": "modal"}

    return web_app
