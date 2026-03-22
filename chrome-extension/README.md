# AI Optimizer Chrome Extension

**Route OpenAI API calls through your AI Optimizer proxy!**

---

## 🚀 What It Does

- **Intercepts** OpenAI API calls in Chrome
- **Re-routes** to `localhost:3000` (your AI Optimizer proxy)
- **Shows stats** in popup (requests, cache hits, $ saved)

---

## 📥 Installation (Testing)

**1. Load unpacked extension:**

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select this folder: `chrome-extension/`

**2. Extension icon appears** (top right)

**3. Click icon** → See stats!

---

## 🎯 How It Works

**Before:**
```
Browser → api.openai.com
```

**After:**
```
Browser → localhost:3000 → api.openai.com
              ↓
        Cache + Stats
```

---

## 📊 Stats Popup Shows:

- **Requests:** Total API calls
- **Cache Hits:** Cached responses
- **Hit Rate:** Cache efficiency %
- **Total Saved:** $ saved from caching

---

## 🛠️ Production Build

**Package for customers:**

1. Zip the folder:
   ```bash
   zip -r ai-optimizer-extension.zip chrome-extension/
   ```

2. Upload to Chrome Web Store (or distribute directly)

3. Customers install → Route through proxy!

---

## ⚠️ Requirements

- **AI Optimizer desktop app running** (proxy on port 3000)
- **Chrome browser**

---

## 🔧 Future Improvements

- Custom icons
- Request history
- Cache management UI
- Per-site settings
- Manual cache clear

---

**Part of AI Optimizer v2.0.0!**
