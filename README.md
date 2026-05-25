# AI Optimizer v2.4.0

**A local-first desktop proxy that helps you control, cache, and optimize LLM API traffic with support for OpenAI, Anthropic, and Google Gemini.**

---

## What’s New in v2.4.0

Released May 25, 2026.

### New in this release
- Added **truthful OpenAI partial prompt caching visibility**
- Added **Partial Hits (OpenAI)** in the desktop stats
- Added **Tokens Reused (OpenAI)** in the desktop stats
- Kept **exact cache hits** working as before
- Updated the app version and footer display to **v2.4.0**

AI Optimizer now shows provider-side OpenAI prompt reuse **only when OpenAI reports real reused tokens**. If OpenAI does not report reuse, AI Optimizer does not fake a partial hit.

- **Exact Cache Hits** = request fully served from local cache
- **Partial Hits (OpenAI)** = OpenAI reported real provider-side reused prompt tokens
- **Tokens Reused (OpenAI)** = total reused prompt tokens reported by OpenAI

[Download the latest release](https://github.com/adamday75/ai-optimizer-app/releases/latest)

For a simpler customer-facing guide, see:
- [Install & setup guide](https://ai-optimizer.org/install)

---

## What AI Optimizer Does

AI Optimizer runs as a local desktop app and proxy in front of model API traffic.

It helps you:
- reduce repeated API spend with caching
- route requests through a local endpoint you control
- switch providers from a simple desktop UI
- enforce license access before proxy usage
- track request volume, exact cache hits, and OpenAI partial prompt reuse

Desktop builds are available for **macOS, Windows, and Linux**.

---

## Core Features

### Available now
- Local proxy server on `localhost:3000`
- **OpenAI** provider support
- **Anthropic** provider support
- **Google Gemini** provider support
- OpenAI Chat Completions support
- OpenAI Responses API support
- OpenAI Embeddings passthrough support
- Anthropic chat support through the local proxy
- Provider selection in the app UI
- Provider-specific API key storage
- One active provider selection with saved keys for each provider
- License validation enforcement at the proxy layer
- Real-time stats in the desktop UI
- Start/Stop proxy controls
- Chrome extension download

### Current provider scope
- **OpenAI** remains the broadest lane
- `POST /v1/chat/completions` works when Anthropic is selected
- `POST /v1/chat/completions` works when Google Gemini is selected
- Anthropic support is intentionally focused on chat completions
- Google Gemini support is intentionally narrower and focused on repeat-heavy chat-completions style workflows in this app lane
- When Anthropic or Google is active, embeddings and responses are not supported in this release

### Best fit
- repeat-heavy scripts
- local tools
- agent workflows
- cron jobs and automations
- workflows that hit the same API patterns over and over

---

## Installation

Get current installers from the GitHub Releases page:

[https://github.com/adamday75/ai-optimizer-app/releases/latest](https://github.com/adamday75/ai-optimizer-app/releases/latest)

If you want a cleaner end-user walkthrough, use:

[https://ai-optimizer.org/install](https://ai-optimizer.org/install)

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
4. If Windows Defender Firewall asks for permission, allowing **Private networks** is usually enough because the app runs a local proxy on `localhost:3000`

### Linux
**AppImage**
```bash
chmod +x AI\ Optimizer-2.4.0.AppImage
./AI\ Optimizer-2.4.0.AppImage
```

**DEB package**
```bash
sudo apt install ./ai-optimizer_2.4.0_amd64.deb
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
- Select **OpenAI**, **Anthropic**, or **Google Gemini** in the app
- The app uses **one active provider at a time** while still saving keys per provider

### 3. Save the API key for that provider
- Paste the API key into the app
- Click **Save**
- Confirm key status is configured

### 4. Start the proxy
- In the Proxy Server section, click **Start**
- The proxy will run on `http://localhost:3000`

### 5. Point your tools at the local proxy
Use `http://localhost:3000` in place of the upstream API base URL where appropriate for your workflow.

Common example:

```bash
OPENAI_BASE_URL=http://localhost:3000/v1
```

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

### When Google Gemini is active
- `POST /v1/chat/completions`
- `GET /health`
- `GET /stats`

---

## Example Checks

### Health check
```bash
curl -sS http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","running":true}
```

### Stats check
```bash
curl -sS http://localhost:3000/stats
```

### OpenAI chat check
```bash
curl -sS http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello"}]}'
```

### OpenAI exact-cache check
Run the same request twice, then inspect stats:

```bash
curl -sS http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Reply with exactly: CACHE_OK"}]}'

curl -sS http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Reply with exactly: CACHE_OK"}]}'

curl -sS http://localhost:3000/stats
```

### Anthropic chat check
```bash
curl -sS http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-6","messages":[{"role":"user","content":"Say hello"}]}'
```

### Google Gemini chat check
```bash
curl -sS http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"Say hello"}]}'
```

### OpenAI embeddings check
```bash
curl -sS http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"text-embedding-3-small","input":"hello from ai optimizer"}'
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

### OpenAI partial hits are still zero
That can be normal. Partial Hits (OpenAI) only move when OpenAI reports real reused prompt tokens.

### Anthropic request returns model error
Make sure you are using a valid Anthropic model ID, such as:
- `claude-sonnet-4-6`

### Google request returns an auth or model error
Check:
- the saved Google API key is valid
- the requested model is available for your Gemini API account
- you are using `POST /v1/chat/completions` only for Google in this release

### macOS app will not open
Run:
```bash
xattr -r -d com.apple.quarantine /Applications/AI\ Optimizer.app
```

### Windows shows a Defender prompt
That is expected on some machines because AI Optimizer runs a local proxy. In most cases, allowing it on **Private networks** is enough.

### No exact cache hits yet
Exact cache hits depend on repeated requests matching closely, including provider, model, and input parameters.

---

## Downloads

### Latest release
- Visit: [GitHub Releases](https://github.com/adamday75/ai-optimizer-app/releases/latest)
- Current release: **v2.4.0**

Release assets include:
- macOS zip
- Linux AppImage
- Linux `.deb`
- Windows installer / packaged build
- Chrome extension zip

---

## Support

- Email: garyday216@gmail.com
- GitHub Issues: [github.com/adamday75/ai-optimizer-app/issues](https://github.com/adamday75/ai-optimizer-app/issues)
- Landing page: https://ai-optimizer.org
- Install guide: https://ai-optimizer.org/install

---

## Built With

- Electron
- Node.js
- Express
- NodeCache
- OpenAI API
- Anthropic API
- Google Gemini API

---

**Made with 💰 by Adam Day**
