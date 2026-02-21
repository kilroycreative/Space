# OpenPlanter Dashboard — Deployment Guide

## Quick Deploy (Railway / Render / Fly.io)

The dashboard requires a **persistent server** (not serverless). It needs WebSocket support, shell access, and long-running processes.

### Environment Variables (required)

Set at least one LLM API key:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
```

Optional:

```
EXA_API_KEY=...              # Web search capability
DASHBOARD_PORT=5000          # Server port (default: 5000)
OPENPLANTER_WORKSPACE=/workspace
```

### Option 1: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Set env vars
railway variables set ANTHROPIC_API_KEY=sk-ant-...

# Deploy (uses Dockerfile)
railway up
```

### Option 2: Render

1. Connect your GitHub repo
2. Create a **Web Service** (not Static Site)
3. Set Docker as the runtime
4. Set environment variables in the dashboard
5. Deploy

### Option 3: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch
fly launch --dockerfile dashboard/Dockerfile

# Set secrets
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# Deploy
fly deploy
```

### Option 4: Docker (any VPS)

```bash
docker build -f dashboard/Dockerfile -t openplanter .

docker run -d \
  -p 5000:5000 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -v $(pwd)/workspace:/workspace \
  openplanter
```

### Option 5: Local

```bash
pip install flask flask-socketio rich prompt_toolkit pyfiglet
export ANTHROPIC_API_KEY=sk-ant-...
python dashboard/app.py
# Open http://localhost:5000
```

## Architecture Notes

- **Not Vercel-compatible**: The agent needs WebSocket connections, shell access (`/bin/sh`), persistent filesystem for sessions, and long-running processes (investigations run for minutes).
- **Single server**: Everything runs on one process — Flask serves the UI, SocketIO handles real-time streaming, and the agent engine runs investigations in background threads.
- **Session storage**: Sessions are stored on disk in `.openplanter/sessions/`. Mount a persistent volume for data durability across deploys.
- **No database required**: The agent uses flat-file JSON storage. If you want durability beyond the container, mount a volume at `/workspace`.
