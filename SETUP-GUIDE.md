# AI Optimizer Setup Guide

**Route your OpenAI requests through the proxy to save 20-40% on API costs!**

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Start the Proxy

**Desktop App:**
1. Open AI Optimizer
2. Enter your OpenAI API key
3. Click **▶ Start Proxy**
4. Proxy runs on `http://localhost:3000` ✅

**CLI (standalone):**
```bash
cd /path/to/ai-optimizer-app
node test-proxy.js
# Proxy runs on http://localhost:3000
```

---

## 🔌 Route Your Requests Through the Proxy

### Option A: Environment Variable (Recommended)

**Set once, works everywhere:**

```bash
# Mac/Linux
export OPENAI_BASE_URL=http://localhost:3000

# Windows (PowerShell)
$env:OPENAI_BASE_URL="http://localhost:3000"

# Windows (CMD)
set OPENAI_BASE_URL=http://localhost:3000
```

**Add to your shell config** (~/.bashrc, ~/.zshrc) to persist:
```bash
echo 'export OPENAI_BASE_URL=http://localhost:3000' >> ~/.bashrc
source ~/.bashrc
```

---

### Option B: Per-Command (CLI Tools)

**OpenAI CLI:**
```bash
OPENAI_BASE_URL=http://localhost:3000 openai chat completion \
  --model gpt-4 \
  --message "Hello"
```

**Codex:**
```bash
# Set before starting Codex
export OPENAI_BASE_URL=http://localhost:3000
codex
# Now all requests route through proxy
```

---

### Option C: Code Integration

**Python:**
```python
import openai

openai.base_url = "http://localhost:3000"

response = openai.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello"}]
)
```

**JavaScript/Node:**
```javascript
const { OpenAI } = require('openai');

const openai = new OpenAI({
  baseURL: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{role: "user", content: "Hello"}]
});
```

**cURL:**
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}'
```

---

### Option D: Chrome Extension

**Auto-intercept for web apps:**

1. Load extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `chrome-extension/` folder

2. Visit ChatGPT or any OpenAI-powered site

3. Extension auto-intercepts requests → routes to proxy

4. Watch stats update in real-time! 📊

---

## 📊 Verify It's Working

### Check Stats Dashboard

**Browser:**
```
http://localhost:3000/stats
```

**CLI:**
```bash
curl http://localhost:3000/stats | jq .
```

**Expected output:**
```json
{
  "requests": 5,
  "cacheHits": 2,
  "totalSaved": 0.00
}
```

### Test Caching

```bash
# First request (cache miss)
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Test"}]}'

# Check stats - should show requests: 1
curl http://localhost:3000/stats | jq .

# Same request again (cache hit!)
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Test"}]}'

# Check stats - should show cacheHits: 1, hitRate: 50%
curl http://localhost:3000/stats | jq .
```

---

## 🎛️ Desktop App Stats

**In the app:**
- **Requests:** Total API calls made
- **Cache Hits:** Requests served from cache (free!)
- **Hit Rate:** Percentage of cached requests
- **Total Saved:** $$ saved on API costs

**Watch these counters tick up in real-time!**

---

## 🚨 Troubleshooting

### Proxy Not Starting

**Check API key:**
```bash
# Desktop app: Settings → API Key → Save
# CLI: export OPENAI_API_KEY=sk-...
```

**Check port:**
```bash
# Should show LISTEN on 3000
lsof -i :3000
# Or
netstat -tlnp | grep 3000
```

### Requests Not Routing

**Verify env var:**
```bash
echo $OPENAI_BASE_URL
# Should show: http://localhost:3000
```

**Test direct connection:**
```bash
curl http://localhost:3000/health
# Should show: {"status":"ok","running":true}
```

### Cache Not Working

**Check cache logic:**
- Same model + same messages + same params = **HIT** ✅
- Different model or message = **MISS** (new request)

**Cache TTL:** 5 minutes (responses expire after 5min)

---

## 💰 How Much Will I Save?

**Depends on your usage pattern:**

| Use Case | Hit Rate | Savings |
|----------|----------|---------|
| Repetitive prompts (chatbots) | 60-80% | ~40% |
| Development/testing | 30-50% | ~20% |
| Unique prompts every time | 0-10% | ~5% |

**Example:**
- 1000 requests/month @ $0.03 each = $30
- 50% cache hits = 500 free requests
- **New cost:** $15 (50% savings!)

---

## 📈 What Gets Cached?

**Cache key = model + messages + params**

**Same request = Cache hit:**
```json
{
  "model": "gpt-4",
  "messages": [{"role": "user", "content": "Hello"}],
  "temperature": 0.7
}
```

**Different request = Cache miss:**
```json
{
  "model": "gpt-4",           // Same
  "messages": [{"role": "user", "content": "Hi"}], // Different!
  "temperature": 0.7          // Same
}
```

---

## 🎯 Production Checklist

- [ ] Proxy running (`http://localhost:3000`)
- [ ] API key configured
- [ ] `OPENAI_BASE_URL` set
- [ ] Test request made (stats show 1+)
- [ ] Duplicate request made (cache hit shown)
- [ ] Stats dashboard responding
- [ ] Desktop app / extension loaded (optional)

**You're ready to save!** 💰

---

## 📞 Support

- **GitHub:** https://github.com/adamday75/ai-optimizer-app
- **Releases:** https://github.com/adamday75/ai-optimizer-app/releases
- **License:** Purchase at https://ai-optimizer-landing.vercel.app

---

**Happy caching!** 🚀
