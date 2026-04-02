# AI Optimizer v2.1.0

**Save 40% on your OpenAI API bills with intelligent caching.**

---

## 🔐 SECURITY UPDATE (v2.1.0)

**Critical security patch released April 2, 2026.**

This version fixes a license validation vulnerability where users could bypass license checks. **All users should upgrade immediately** to prevent unauthorized access and protect API costs.

### What Changed:
- ✅ License validation now enforced server-side (proxy level)
- ✅ Returns 401 Unauthorized without valid license
- ✅ All blocked attempts logged for monitoring
- ✅ Prevents unlimited trial abuse

[Download v2.1.0](https://github.com/adamday75/ai-optimizer-app/releases/tag/v2.1.0-security-patch)

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

### Mac — Choose Your Version

**Which Mac do you have?**

- **Intel Mac (2006-2020):** Download `ai-optimizer-macOS-latest.zip`
- **Apple Silicon M1/M2/M3 (2020+):** Download `ai-optimizer-arm64-macOS-latest.zip`

*Not sure? Click Apple logo → About This Mac → Check "Processor" (Intel) or "Chip" (Apple Silicon)*

**Install Steps:**

1. Download the correct version for your Mac from [Releases](https://github.com/adamday75/ai-optimizer-app/releases/tag/v2.1.0-security-patch)
2. Unzip the file
3. Move `AI Optimizer.app` to your Applications folder
4. **Remove quarantine** (required for Mac):
   ```bash
   xattr -r -d com.apple.quarantine /Applications/AI\ Optimizer.app
   ```
   *Tip: Type the command up to `quarantine`, then drag the app from Finder into Terminal to auto-fill the path.*
5. Open the app ✅

### Windows

1. Download `AI Optimizer Setup 2.1.0.exe` from [Releases](https://github.com/adamday75/ai-optimizer-app/releases/tag/v2.1.0-security-patch)
2. Run the installer
3. Done! ✅

### Linux

**Option A: AppImage (portable)**
```bash
chmod +x AI\ Optimizer-2.1.0.AppImage
./AI\ Optimizer-2.1.0.AppImage
```

**Option B: DEB package (install)**
```bash
sudo apt install ./ai-optimizer_2.1.0_amd64.deb
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

### V2.1.0 (Latest - Security Patched) ✅

✅ **Server-side license validation** (NEW - prevents bypass)
✅ License validation system (client + proxy enforcement)
✅ API key storage (persistent)
✅ Proxy server (localhost:3000)
✅ Response caching (5min TTL)
✅ Real-time stats dashboard
✅ Cost tracking
✅ Start/Stop controls
✅ Blocked attempt logging (security monitoring)

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

### **Latest: v2.1.0** (April 2, 2026) - SECURITY PATCH ✅
- Mac (Intel): `AI Optimizer-2.1.0-mac.zip`
- Mac (ARM/M1/M2): `AI Optimizer-2.1.0-arm64-mac.zip` / `.dmg`
- Windows: `AI Optimizer Setup 2.1.0.exe`
- Linux AppImage: `AI Optimizer-2.1.0.AppImage`
- Linux DEB: `ai-optimizer_2.1.0_amd64.deb`

[Download v2.1.0](https://github.com/adamday75/ai-optimizer-app/releases/tag/v2.1.0-security-patch)

### Older Versions

**v2.0.0** (March 22, 2026) - Proxy Server with Caching
- [Download v2.0.0](https://github.com/adamday75/ai-optimizer-app/releases/tag/v2.0.0)

**v1.0.0** (March 18, 2026) - Initial Release
- [Download v1.0.0](https://github.com/adamday75/ai-optimizer-app/releases/tag/v1.0.0)

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
