// Standalone Optimizer Test Server
const express = require('express');
const { OpenAI } = require('openai');
const crypto = require('crypto');

// Load API key from api-key.json (users must add their own!)
const fs = require('fs');
const path = require('path');
const keyPath = path.join(__dirname, 'api-key.json');
let API_KEY = '';
if (fs.existsSync(keyPath)) {
  const keys = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  API_KEY = keys.apiKey || '';
}
if (!API_KEY || API_KEY === 'sk-proj-YOUR-OPENAI-API-KEY-HERE') {
  console.error('⚠️  No API key found! Add your key to api-key.json');
  process.exit(1);
}
const openai = new OpenAI({ apiKey: API_KEY });

// Simple in-memory cache
const cache = new Map();
let stats = { requests: 0, cacheHits: 0, totalSaved: 0.00 };

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', running: true }));

app.get('/stats', (req, res) => res.json(stats));

app.post('/v1/chat/completions', async (req, res) => {
  stats.requests++;
  
  // Generate cache key from model + messages
  const cacheKey = crypto.createHash('sha256')
    .update(JSON.stringify({ model: req.body.model, messages: req.body.messages }))
    .digest('hex');
  
  // Check cache
  if (cache.has(cacheKey)) {
    stats.cacheHits++;
    console.log(`✅ CACHE HIT (${stats.cacheHits}/${stats.requests} = ${Math.round(stats.cacheHits/stats.requests*100)}%)`);
    return res.json(cache.get(cacheKey));
  }
  
  // Cache miss - call OpenAI
  console.log(`❌ CACHE MISS (${stats.cacheHits}/${stats.requests})`);
  try {
    const response = await openai.chat.completions.create({
      model: req.body.model,
      messages: req.body.messages
    });
    
    cache.set(cacheKey, response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Optimizer running on port ${PORT}!`));
