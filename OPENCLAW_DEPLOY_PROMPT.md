# OpenClaw Deployment Prompt

Deploy the OpenPlanter Dashboard to a persistent hosting platform (Railway, Render, or Fly.io — NOT Vercel serverless).

## What this is

A Flask + SocketIO web dashboard that wraps the OpenPlanter investigation agent. It needs:
- **WebSocket support** (Socket.IO for real-time streaming)
- **Shell access** (`/bin/sh` — the agent executes shell commands)
- **Persistent filesystem** (sessions stored in `.openplanter/` directory)
- **Long-running processes** (investigations run for minutes, not seconds)
- **Python 3.11+**

## Files

- `dashboard/app.py` — Flask + SocketIO server (entry point)
- `dashboard/templates/index.html` — Frontend SPA
- `dashboard/static/css/dashboard.css` — Styles
- `dashboard/static/js/dashboard.js` — Client JS
- `dashboard/Dockerfile` — Production Docker image
- `agent/` — OpenPlanter engine (Python package)
- `pyproject.toml` — Python project config

## Deploy Steps

1. Use the `dashboard/Dockerfile` as the build config
2. Set these environment variables:
   - `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`, or `OPENROUTER_API_KEY`) — at least one required
   - `EXA_API_KEY` — optional, enables web search
   - `DASHBOARD_PORT=5000`
   - `OPENPLANTER_WORKSPACE=/workspace`
3. Expose port 5000
4. Mount a persistent volume at `/workspace` for session durability
5. The Docker CMD runs gunicorn with eventlet workers and 600s timeout

## Why NOT Vercel

- No WebSocket support for Python
- 60s function timeout (investigations run 5-30 minutes)
- No shell (`/bin/sh`) in serverless runtime
- No persistent filesystem (ephemeral `/tmp` only)
- No background threads (process dies after HTTP response)

## Recommended Platform

**Railway** — easiest for Docker-based Python apps with persistent volumes and WebSocket support. One `railway up` and it's live.

## Health Check

After deploy, verify:
- `GET /` returns the dashboard HTML
- `GET /api/config` returns JSON with workspace and provider info
- WebSocket connects and receives `connected` event
