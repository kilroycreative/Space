# Deployment Status

## ✅ Done

| Service | URL | Status |
|---------|-----|--------|
| Convex (prod) | https://brazen-alpaca-328.convex.cloud | ✅ Live |
| Frontend (Vercel) | https://monday-cathedral.vercel.app | ✅ Live |
| Worker (Render) | https://monday-cathedral-worker.onrender.com | ⏳ Pending |

## ⏳ One Step Left — Deploy the Worker

1. Go to https://dashboard.render.com
2. Click **New → Blueprint**
3. Select repo: `kilroycreative/Space`, branch: `claude/clone-openplanter-okhLY`
4. When prompted for `OPENROUTER_API_KEY`, paste the "monday-cathedral" key from your OpenRouter dashboard (openrouter.ai/settings/keys)
5. Deploy

Once the worker is live at `https://monday-cathedral-worker.onrender.com`, the frontend will be fully functional.

## Env Vars Reference

### Convex
- Project: `monday-cathedral`
- Dashboard: https://dashboard.convex.dev/t/kilroy/monday-cathedral

### Vercel (monday-cathedral project)
- `VITE_CONVEX_URL` = `https://brazen-alpaca-328.convex.cloud`
- `VITE_WORKER_URL` = `https://monday-cathedral-worker.onrender.com`

### Render Worker
- `CONVEX_URL` = `https://brazen-alpaca-328.convex.cloud`
- `OPENROUTER_API_KEY` = (from openrouter.ai/settings/keys → "monday-cathedral" key)
