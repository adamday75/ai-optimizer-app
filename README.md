# AI Optimizer v2.1.3

**Save on OpenAI API usage with a desktop proxy that adds caching, license enforcement, and a simple local control panel.**

---

## What’s New in v2.1.3

Released April 20, 2026.

### Fixes in this release
- Fixed OpenAI **Responses API** proxying for `/v1/responses`
- Fixed compatibility for `/responses` and Codex-style response routes
- Confirmed **embeddings passthrough** works for OpenClaw memory use
- Fixed the app UI to correctly display **Version 2.1.3**

If you are using newer OpenAI clients, Codex-style tooling, or local memory/embedding flows, this is the version you want.

[Download the latest release](https://github.com/adamday75/ai-optimizer-app/releases/latest)

---

## What AI Optimizer Does

AI Optimizer runs as a local desktop app and proxy in front of the OpenAI API.

It helps you:
- reduce repeated API spend with caching
- enforce license access before proxy usage
- route traffic through a local endpoint you control
- track request volume, cache hits, and estimated savings

Desktop builds are available for **macOS, Windows, and Linux**.

---

## Core Features

### Available now
- Local proxy server on `localhost:3000`
- OpenAI Chat Completions support
- OpenAI Responses API support
- OpenAI Embeddings passthrough support
- License validation enforcement at the proxy layer
- Persistent API key storage
- Real-time stats in the desktop UI
- Cost/savings tracking
- Start/Stop proxy controls

### In progress / planned
- broader provider coverage
- deeper cache controls
- expanded request visibility and history
- higher-tier/team features

---

## Installation

Get current installers from the GitHub Releases page:

[https://github.com/adamday75/ai-optimizer-app/releases/latest](https://github.com/adamday75/ai-optimizer-app/releases/latest)

### macOS
1. Download the current macOS archive from Releases
2. Unzip it
3. Move `AI Optimizer.app` into `Applications`
4. If macOS blocks launch, remove quarantine:
   ```bash
   xattr -r -d com.apple.quarantine /Applications/AI\ Optimizer.app
   ```
5. Open the app

### Windows
1. Download the latest Windows build from Releases
2. Run the installer or packaged executable
3. Launch AI Optimizer

### Linux
**AppImage**
```bash
chmod +x AI\ Optimizer-2.1.3.AppImage
./AI\ Optimizer-2.1.3.AppImage
```

**DEB package**
```bash
sudo apt install ./ai-optimizer_2.1.3_amd64.deb
```

---

## Getting Started

### 1. Activate your license
- Open AI Optimizer
- Enter your license key
- Click **Activate**
- Confirm the license status is active

### 2. Save your OpenAI API key
- Paste your OpenAI API key into the app
- Click **Save**
- Confirm API key status is configured

### 3. Start the proxy
- In the Proxy Server section, click **Start**
- The proxy will run on `http://localhost:3000`

### 4. Point your tools at the local proxy
Use `http://localhost:3000` in place of `https://api.openai.com` where appropriate for your workflow.

---

## Supported Endpoints

Current validated paths include:
- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /responses`
- `POST /backend-api/codex/responses`
- `POST /v1/embeddings`
- `GET /health`
- `GET /stats`

---

## Example Health Check

```bash
curl -sS http://localhost:3000/health
```

Expected response:

```json
{"status":"ok","running":true}
```

## Example Embeddings Check

```bash
curl -sS http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"text-embedding-3-small","input":"hello from openclaw memory"}'
```

## Example Responses Check

```bash
curl -sS http://localhost:3000/v1/responses \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","input":"Reply with exactly: ok"}'
```

---

## How It Works

```text
Your App → AI Optimizer (localhost:3000) → OpenAI API
                ↓
           Cache / Validate
                ↓
      Hit: return cached result
      Miss: call upstream API
                ↓
       Update stats and savings
```

---

## Troubleshooting

### App starts but proxy will not start
Check:
- license is active
- API key is saved
- port `3000` is not already occupied by another process

### macOS app will not open
Run:
```bash
xattr -r -d com.apple.quarantine /Applications/AI\ Optimizer.app
```

### No cache hits yet
Cache hits depend on repeated requests matching closely, including model and input parameters.

---

## Downloads

### Latest release
- Visit: [GitHub Releases](https://github.com/adamday75/ai-optimizer-app/releases/latest)
- Current release: **v2.1.3**

---

## Support

- Email: garyday216@gmail.com
- GitHub Issues: [github.com/adamday75/ai-optimizer-app/issues](https://github.com/adamday75/ai-optimizer-app/issues)
- Landing page: https://ai-optimizer-landing.vercel.app/

---

## Built With

- Electron
- Node.js
- Express
- NodeCache
- OpenAI API

---

**Made with 💰 by Adam Day**
