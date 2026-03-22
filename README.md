# AI Optimizer v2.0.0

**Save 40% on your OpenAI API bills with intelligent caching.**

---

## 🚀 What It Does

AI Optimizer sits between your apps and OpenAI's API:
- **Caches responses** — identical requests return cached results
- **Tracks savings** — see exactly how much you've saved
- **Works transparently** — no code changes needed
- **Desktop app** — Mac, Windows, Linux

---

## 💰 Pricing

- **STARTER:** $4.99/month
- **PRO:** $19.99/month (coming soon)

---

## 📥 Installation

### Mac

1. Download `AI Optimizer-2.0.0-mac.zip` from [Releases](https://github.com/adamday75/ai-optimizer-app/releases/tag/v2.0.0)
2. Unzip the file
3. Move `AI Optimizer.app` to your Applications folder
4. **Remove quarantine** (required for Mac):
   ```bash
   xattr -r -d com.apple.quarantine /Applications/AI\ Optimizer.app
   ```
   *Tip: Type the command up to `quarantine`, then drag the app from Finder into Terminal to auto-fill the path.*
5. Open the app

### Windows

1. Download `AI Optimizer Setup 2.0.0.exe` from [Releases](https://github.com/adamday75/ai-optimizer-app/releases/tag/v2.0.0)
2. Run the installer
3. Done! ✅

### Linux

**Option A: AppImage (portable)**
```bash
chmod +x AI\ Optimizer-2.0.0.AppImage
./AI\ Optimizer-2.0.0.AppImage
```

**Option B: DEB package (install)**
```bash
sudo apt install ./ai-optimizer_2.0.0_amd64.deb
```

---

## 🎯 Getting Started

### 1. Activate License

- Open the app
- Enter your license key (from purchase email)
- Click "Activate"
- **Green dot** = active ✅

### 2. Configure API Key

- Enter your OpenAI API key
- Click "Save"
- **Green dot** = configured ✅

### 3. Start Proxy Server

- Scroll to **Proxy Server** section
- Click **▶ Start**
- Proxy runs on `localhost:3000`
- **Green dot** = running ✅

### 4. Use Your Apps Normally

- Point your apps to `http://localhost:3000` instead of `https://api.openai.com`
- Or use the built-in integration
- Watch stats update in real-time!

---

## 📊 Features

### V2.0.0 (Current)

✅ License validation system
✅ API key storage (persistent)
✅ Proxy server (localhost:3000)
✅ Response caching (5min TTL)
✅ Real-time stats dashboard
✅ Cost tracking
✅ Start/Stop controls

### Coming Soon (V3)

- Multi-provider support (Anthropic, Google)
- Web dashboard at localhost:3000
- Request history
- Advanced cache controls
- Team/Pro features

---

## 🔧 How It Works

```
Your App → AI Optimizer (localhost:3000) → OpenAI API
                ↓
        Cache Check
                ↓
        Hit: Return cached (free!)
        Miss: Call OpenAI, cache result
                ↓
        Update stats: requests, hits, $ saved
```

---

## 🛠️ Troubleshooting

### Mac: App Won't Open

**Problem:** macOS quarantine blocks unsigned apps

**Fix:**
```bash
xattr -r -d com.apple.quarantine /Applications/AI\ Optimizer.app
```

### Proxy Won't Start

**Check:**
- Port 3000 not in use by another app
- API key is configured (green dot)
- License is active (green dot)

### No Cache Hits

**Remember:**
- Cache matches **exact** requests
- Same model, same prompt, same params = hit
- TTL: 5 minutes (configurable in future)

---

## 📁 Downloads

**v2.0.0** (March 19, 2026):
- Mac: `AI Optimizer-2.0.0-mac.zip` (93 MB)
- Windows: `AI Optimizer Setup 2.0.0.exe` (coming)
- Linux: `AI Optimizer-2.0.0.AppImage` (102 MB)
- Linux: `ai-optimizer_2.0.0_amd64.deb` (70 MB)

[GitHub Releases](https://github.com/adamday75/ai-optimizer-app/releases)

---

## 💬 Support

- **Email:** garyday216@gmail.com
- **GitHub:** [Issues](https://github.com/adamday75/ai-optimizer-app/issues)
- **Landing Page:** https://ai-optimizer-landing.vercel.app/

---

## 🏗️ Built With

- Electron
- Node.js
- Express (proxy server)
- NodeCache (5min TTL)
- OpenAI API

---

**Made with 💰 by Adam Day**
