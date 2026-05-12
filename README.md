# AI Optimizer v2.2.0

**A local desktop proxy that helps you control, cache, and optimize LLM API traffic with support for both OpenAI and Anthropic.**

---

## What’s New in v2.2.0

Released May 12, 2026.

### New in this release
- Added **Anthropic provider support**
- Added **provider selection** in the desktop UI
- Added **provider-specific API key handling**
- Preserved the local proxy workflow on `localhost:3000`
- Preserved request caching with provider-aware cache separation
- Included updated **Chrome extension**

AI Optimizer now supports **OpenAI + Anthropic** with one active provider at a time.

[Download the latest release](https://github.com/adamday75/ai-optimizer-app/releases/latest)

---

## What AI Optimizer Does

AI Optimizer runs as a local desktop app and proxy in front of model API traffic.

It helps you:
- reduce repeated API spend with caching
- route requests through a local endpoint you control
- switch providers from a simple desktop UI
- enforce license access before proxy usage
- track request volume, cache hits, and estimated savings

Desktop builds are available for **macOS, Windows, and Linux**.

---

## Core Features

### Available now
- Local proxy server on `localhost:3000`
- **OpenAI** provider support
- **Anthropic** provider support
- OpenAI Chat Completions support
- OpenAI Responses API support
- OpenAI Embeddings passthrough support
- Anthropic chat support through the local proxy
- Provider selection in the app UI
- Provider-specific API key storage
- License validation enforcement at the proxy layer
- Real-time stats in the desktop UI
- Start/Stop proxy controls
- Chrome extension download

### Current Anthropic scope
- `POST /v1/chat/completions` works when Anthropic is selected
- Anthropic support in **v2.2.0** is focused on chat completions
- When Anthropic is active, embeddings and responses are not supported in this release

### In progress / planned
- automatic model/provider routing
- deeper cache controls
- expanded request visibility and history
- more provider coverage over time

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
chmod +x AI\ Optimizer-2.2.0.AppImage
./AI\ Optimizer-2.2.0.AppImage
```

**DEB package**
```bash
sudo apt install ./ai-optimizer_2.2.0_amd64.deb
```

### Chrome Extension
A downloadable Chrome extension zip is included in the release assets.

---

## Getting Started

### 1. Activate your license
- Open AI Optimizer
- Enter your license key
- Click **Activate**
- Confirm the license status is active

### 2. Choose your provider
- Select **OpenAI** or **Anthropic** in the app
- The app uses **one active provider at a time**

### 3. Save the API key for that provider
- Paste the API key into the app
- Click **Save**
- Confirm key status is configured

### 4. Start the proxy
- In the Proxy Server section, click **Start**
- The proxy will run on `http://localhost:3000`

### 5. Point your tools at the local proxy
Use `http://localhost:3000` in place of the upstream API base URL where appropriate for your workflow.

---

## Supported Endpoints

### When OpenAI is active
- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /responses`
- `POST /backend-api/codex/responses`
- `POST /v1/embeddings`
- `GET /health`
- `GET /stats`

### When Anthropic is active
- `POST /v1/chat/completions`
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

## Example OpenAI Chat Check

```bash
curl -sS http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello"}]}'
```

## Example Anthropic Chat Check

```bash
curl -sS http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-6","messages":[{"role":"user","content":"Say hello"}]}'
```

## Example OpenAI Embeddings Check

```bash
curl -sS http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"text-embedding-3-small","input":"hello from openclaw memory"}'
```

---

## How It Works

```text
Your App / Tool → AI Optimizer (localhost:3000) → Selected Provider API
                         ↓
                Cache / Validate / Track
                         ↓
             Hit: return cached result
             Miss: call upstream API
                         ↓
              Update stats and behavior
```

---

## Troubleshooting

### App starts but proxy will not start
Check:
- license is active
- the correct provider API key is saved
- port `3000` is not already occupied by another process

### Anthropic request returns model error
Make sure you are using a valid Anthropic model ID, such as:
- `claude-sonnet-4-6`

### macOS app will not open
Run:
```bash
xattr -r -d com.apple.quarantine /Applications/AI\ Optimizer.app
```

### No cache hits yet
Cache hits depend on repeated requests matching closely, including provider, model, and input parameters.

---

## Downloads

### Latest release
- Visit: [GitHub Releases](https://github.com/adamday75/ai-optimizer-app/releases/latest)
- Current release: **v2.2.0**

Release assets include:
- macOS zip
- Linux AppImage
- Linux `.deb`
- Windows build
- Chrome extension zip

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
- Anthropic API

---

**Made with 💰 by Adam Day**
