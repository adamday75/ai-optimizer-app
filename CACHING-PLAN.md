# AI Optimizer - Caching Implementation Plan

**Created:** 2026-03-20
**Priority:** High (direct cost savings + performance)
**Status:** Ready for implementation

---

## Executive Summary

**Current State:**
- ✅ Request-response caching (exact match) working
- ✅ 5-minute TTL with in-memory NodeCache
- ✅ Stats tracking (hits, savings)

**Missing:**
- ❌ Prompt caching (provider KV cache) - ~90% discount on cached tokens
- ❌ Semantic caching (similar meaning queries) - bypasses LLM entirely

**Impact:**
- Prompt caching: 20-50% cost reduction on repeated conversations
- Semantic caching: 60-80% cost reduction on varied queries (support, FAQs)

---

## Phase 1: Prompt Caching (Provider Feature)

### What It Is

Providers cache the *computation state* (KV cache) for repeated prompt prefixes. When you send the same system instructions + different user questions, the provider reuses the cached computation.

**Savings:** ~90% cheaper on cached tokens (input only)

### Provider Support

| Provider | Feature | Status |
|----------|---------|--------|
| OpenAI | Automatic prefix caching | ✅ Available |
| Anthropic | `cache_control` parameter | ✅ Available |
| Google | Automatic | ✅ Available |
| xAI | TBD | ? |

### Implementation Steps

#### 1. Restructure Prompt Templates

**Current (likely):**
```javascript
messages: [
  { role: "user", content: `Hey, about ${topic}...` },
  { role: "system", content: "You are an assistant..." }
]
```

**Fixed (static first):**
```javascript
messages: [
  { 
    role: "system", 
    content: "You are an AI optimizer assistant. Your role is to:\n1. Analyze user requests\n2. Recommend optimal LLM models\n3. Route to cheapest provider\n4. Cache responses when possible\n\n[additional static instructions...]"
  },
  { role: "user", content: `Help me with ${topic}` }
]
```

**Rule:** Static content (system, instructions, context docs) FIRST. Dynamic content (user query, variables) LAST.

#### 2. Enable Anthropic Cache Control

```javascript
// src/proxy/anthropic.js (new file or modify existing)
const { Anthropic } = require('@anthropic-ai/sdk');

module.exports.processChatCompletion = async function(requestBody) {
  const anthropic = new Anthic({ apiKey: getApiKey() });
  
  // Add cache_control to system message
  const messages = requestBody.messages.map((msg, idx) => {
    if (msg.role === 'system' && idx === 0) {
      return {
        ...msg,
        cache_control: { type: 'ephemeral' }
      };
    }
    return msg;
  });
  
  const response = await anthropic.messages.create({
    model: requestBody.model,
    max_tokens: requestBody.max_tokens,
    messages: messages
  });
  
  return response;
}
```

#### 3. OpenAI - Automatic (No Code Changes)

OpenAI automatically caches when it detects repeated prefixes. Just ensure prompt structure is correct (static first).

**Verification:**
```bash
# Check OpenAI usage dashboard
# Look for "cached tokens" in usage stats
# Should show ~90% discount on cached portion
```

#### 4. Update cache.js to Track Provider Caching

```javascript
// Add to cache.js stats
module.exports.getStats = function() {
  return {
    totalKeys: cache.keys().length,
    stats: cache.getStats(),
    providerCaching: {
      enabled: true,
      estimatedSavings: 0.00 // track from API responses
    }
  };
}
```

### Testing

1. **Create test script:**
```bash
# test-prompt-caching.sh
curl -X POST http://localhost:3000/v1/chat/completions \
  -d '{"model":"gpt-4","messages":[...same system..., ...different user...]}'
# Run 10x with same system, different users
# Check logs for cached token usage
```

2. **Verify savings:**
- Check OpenAI/Anthropic dashboard
- Look for cached tokens in usage
- Compare cost per request before/after

### Effort Estimate

- **Code changes:** 1-2 hours
- **Testing:** 1 hour
- **Total:** 2-3 hours

### Files to Modify/Create

- `src/proxy/openai.js` (prompt structure)
- `src/proxy/anthropic.js` (create new, add cache_control)
- `src/proxy/cache.js` (add provider caching stats)
- `test-prompt-caching.sh` (test script)

---

## Phase 2: Semantic Caching (Our Implementation)

### What It Is

Use vector embeddings to find and reuse responses for *semantically similar* queries (same meaning, different wording).

**Example:**
- Cached: "How do I reset my password?"
- New query: "Reset password"
- Result: 87% similar → return cached response

**Savings:** 100% on cache hits (bypasses LLM entirely)

### Architecture

```
┌─────────────┐
│ User Query  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Embedding Model │ ← Convert query to vector
│ (text-embedding │
│  -3-small)      │
└──────┬──────────┘
       │ Vector [0.123, 0.456, ...]
       ▼
┌─────────────────┐
│ Vector Store    │ ← Search for similar vectors
│ (In-memory MVP) │   (cosine similarity)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Similarity >    │
│ Threshold?      │
└──────┬──────────┘
       │
    ┌──┴──┐
    │     │
   Yes   No
    │     │
    ▼     ▼
┌────────┐ ┌──────────┐
│ Return │ │ Call LLM │
│ Cached │ │ + Cache  │
└────────┘ └──────────┘
```

### Components

#### A. Embedding Model

**Options:**

| Option | Cost | Latency | Quality |
|--------|------|---------|---------|
| OpenAI `text-embedding-3-small` | $0.02/1K tokens | ~100ms | Excellent |
| OpenAI `text-embedding-3-large` | $0.13/1K tokens | ~150ms | Best |
| Cohere `embed-english-v3.0` | Free tier | ~120ms | Excellent |
| Local (sentence-transformers) | Free | ~50ms | Good |

**Recommendation:** Start with OpenAI `text-embedding-3-small` (we already have API key, great quality/cost balance)

#### B. Vector Store

**MVP (In-Memory):**
```javascript
// Store in cache.js alongside responses
const vectorCache = new Map(); // key: cacheKey, value: { vector, response, timestamp }

// Search function
function findSimilar(queryVector, threshold = 0.85) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [key, entry] of vectorCache.entries()) {
    const similarity = cosineSimilarity(queryVector, entry.vector);
    if (similarity > threshold && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = entry;
    }
  }
  
  return bestMatch; // null if no match above threshold
}
```

**Production (Later):**
- Redis + RedisVL (vector search plugin)
- pgvector (PostgreSQL extension)
- Pinecone / Weaviate (hosted vector DBs)

#### C. Similarity Calculation

```javascript
// Cosine similarity for two vectors
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}
```

### Implementation Steps

#### 1. Add Embedding Function to cache.js

```javascript
// src/proxy/cache.js
const { OpenAI } = require('openai');

// Get embedding for text
async function getEmbedding(text) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 512 // smaller = faster, still good quality
  });
  return response.data[0].embedding;
}

// Add to module.exports
module.exports.getEmbedding = getEmbedding;
module.exports.cosineSimilarity = cosineSimilarity;
module.exports.findSimilar = findSimilar;
```

#### 2. Modify openai.js to Check Semantic Cache

```javascript
// src/proxy/openai.js - before exact cache check
const { getEmbedding, cosineSimilarity, findSimilar } = require('./cache.js');

module.exports.processChatCompletion = async function(requestBody) {
  // Extract user query for embedding
  const userQuery = requestBody.messages.find(m => m.role === 'user')?.content;
  
  // Get embedding
  const queryVector = await getEmbedding(userQuery);
  
  // Check semantic cache
  const semanticMatch = findSimilar(queryVector, 0.85);
  if (semanticMatch) {
    stats.semanticHits++;
    stats.requests++;
    console.log(`🎯 Semantic hit! Score: ${semanticMatch.score}`);
    return semanticMatch.response;
  }
  
  // Fall through to exact cache check...
  const cacheKey = generateCacheKey(requestBody, 'openai');
  const cached = getCached(cacheKey);
  if (cached) {
    // ... existing exact match logic
  }
  
  // Call LLM if no cache hit
  const response = await openai.chat.completions.create({...});
  
  // Store vector with response
  const cacheKey = generateCacheKey(requestBody, 'openai');
  setCached(cacheKey, response, 300);
  setVectorCached(cacheKey, queryVector, response); // new function
  
  return response;
}
```

#### 3. Add Vector Storage Functions

```javascript
// cache.js - new functions
const vectorStore = new Map();

module.exports.setVectorCached = function(key, vector, response) {
  vectorStore.set(key, {
    vector,
    response,
    timestamp: Date.now()
  });
}

module.exports.findSimilar = function(queryVector, threshold = 0.85) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [key, entry] of vectorStore.entries()) {
    const similarity = cosineSimilarity(queryVector, entry.vector);
    if (similarity > threshold && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = {
        key,
        response: entry.response,
        score: similarity
      };
    }
  }
  
  return bestMatch;
}
```

#### 4. Add Stats Tracking

```javascript
// openai.js stats
stats = {
  requests: 0,
  cacheHits: 0,        // exact matches
  semanticHits: 0,     // semantic matches
  totalSaved: 0.00
};
```

#### 5. Configuration Options

```javascript
// config.js or env vars
SEMANTIC_CACHE_ENABLED=true
SEMANTIC_THRESHOLD=0.85
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=512
```

### Testing

#### 1. Unit Tests

```javascript
// test/semantic-cache.test.js
describe('Semantic Caching', () => {
  it('should match similar queries', async () => {
    const vec1 = await getEmbedding('How do I reset password?');
    const vec2 = await getEmbedding('Reset my password');
    const sim = cosineSimilarity(vec1, vec2);
    expect(sim).toBeGreaterThan(0.85);
  });
  
  it('should not match different topics', async () => {
    const vec1 = await getEmbedding('Reset password');
    const vec2 = await getEmbedding('What is the weather?');
    const sim = cosineSimilarity(vec1, vec2);
    expect(sim).toBeLessThan(0.70);
  });
});
```

#### 2. Integration Tests

```bash
# test-semantic-cache.sh
# Send 20 variations of same question
# Verify cache hit rate > 60%
# Verify response quality matches exact cache
```

#### 3. Threshold Tuning

Test different thresholds with real queries:
- 0.90: Very strict, high quality, lower hit rate
- 0.85: Balanced (recommended start)
- 0.80: More hits, risk of wrong answers
- 0.75: Too loose, not recommended

### Effort Estimate

- **Embedding integration:** 2-3 hours
- **Vector storage + search:** 2-3 hours
- **Modify openai.js:** 2 hours
- **Testing + tuning:** 2-3 hours
- **Total:** 8-11 hours

### Files to Modify/Create

- `src/proxy/cache.js` (add embedding + vector functions)
- `src/proxy/openai.js` (add semantic cache check)
- `src/proxy/anthropic.js` (same, when added)
- `test/semantic-cache.test.js` (unit tests)
- `test-semantic-cache.sh` (integration test)
- `.env` (add config vars)

---

## Phase 3: Production Hardening

### When to Migrate to Vector DB

**Signals:**
- > 1000 cached queries
- Memory usage concerns
- Need persistence across restarts
- Multiple instances need shared cache

### Options

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| Redis + RedisVL | Fast, familiar ops | Another infra component | ~$20-50/mo |
| pgvector | Use existing Postgres | Slower than Redis | $0 (included) |
| Pinecone | Fully managed | Vendor lock-in | Free tier, then $25+/mo |
| Weaviate | Open source, fast | Self-host or managed | Varies |

**Recommendation:** Start with pgvector if using Postgres, or Redis if already in stack.

---

## Combined Savings Projection

### Scenario: Customer Support Bot

**1000 queries/day, 50% repeat questions, 30% semantically similar**

| Caching Type | Hit Rate | Cost Savings |
|--------------|----------|--------------|
| No caching | 0% | $0 |
| Request-response only | 50% | ~$15/day |
| + Prompt caching | 50% + cached tokens | ~$25/day |
| + Semantic caching | 80% total | ~$40/day |

**Monthly impact:** $0 → $1,200 savings (depending on volume + models)

---

## Implementation Roadmap

### Week 1: Prompt Caching
- [ ] Restructure prompt templates (static first)
- [ ] Add Anthropic cache_control
- [ ] Test and verify with provider dashboards
- [ ] Document best practices

### Week 2-3: Semantic Caching MVP
- [ ] Add embedding function
- [ ] Implement vector storage (in-memory)
- [ ] Add similarity search
- [ ] Integrate into openai.js flow
- [ ] Write tests
- [ ] Tune threshold with real data

### Week 4: Production Prep
- [ ] Load testing
- [ ] Monitor cache hit rates
- [ ] Document configuration options
- [ ] Plan vector DB migration (if needed)

---

## Quick Start Commands

### Test Prompt Caching
```bash
cd /home/adamd/.openclaw/workspace/current_project/ai-optimizer-app
# Run same request 10x with same system prompt
# Check OpenAI dashboard for cached tokens
```

### Test Semantic Caching (after implementation)
```bash
# Send variations of same question
curl -X POST http://localhost:3000/v1/chat/completions \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"How do I reset password?"}]}'

curl -X POST http://localhost:3000/v1/chat/completions \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Reset my password"}]}'

# Should hit semantic cache on 2nd request
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong semantic matches | User gets wrong answer | Start with high threshold (0.85), add confidence logging |
| Embedding API cost | Adds small cost per query | ~$0.0001/query, negligible vs LLM savings |
| Memory usage | In-memory vectors grow | Monitor, migrate to vector DB at 1K queries |
| Cold start | No cache on startup | Warm cache with common queries on deploy |
| **Timestamps in prompts** | **BREAKS cache entirely** | **Audit prompt construction, never inject dynamic data** |

---

## ⚠️ Cache Breakers - What to Avoid

### #1 Enemy: Timestamps in Prompts

**Why:** Cache key = hash of entire prompt. If timestamp changes, hash changes → 0% hit rate.

**❌ BAD (breaks cache):**
```javascript
messages: [
  {
    role: "system",
    content: `Current time: ${new Date()}. You are a helpful assistant...`
  }
]
// Every request has different timestamp → different hash → cache miss
```

**✅ GOOD (preserves cache):**
```javascript
messages: [
  {
    role: "system",
    content: "You are a helpful assistant..." // static, caches
  }
]
// Inject timestamp separately (not in messages hash)
```

### Other Cache Breakers:

1. **UUIDs/Request IDs in messages**
   ```javascript
   // ❌ Breaks cache
   messages: [{ role: "user", content: `Request ${uuid()}: ${query}` }]
   ```

2. **User-specific dynamic data in system prompt**
   ```javascript
   // ❌ Breaks cache
   messages: [
     { role: "system", content: `User: ${user.name}. You are...` }
   ]
   ```

3. **Hashing metadata instead of just messages**
   ```javascript
   // ❌ Breaks cache
   const key = hash(JSON.stringify({
     messages: req.messages,
     timestamp: Date.now(), // don't include!
     requestId: req.id      // don't include!
   }))
   ```

   ```javascript
   // ✅ Fixed
   const key = hash(JSON.stringify({
     provider: 'openai',
     model: req.model,
     messages: req.messages, // only this
     temperature: req.temperature
   }))
   ```

### Current Code Status: ✅ CLEAN

**Audited:** No timestamp injection in ai-optimizer-app
- `cache.js`: Cache key excludes timestamps
- `openai.js`: Messages pass through unchanged
- `server.js`: Pure proxy, no message modification
- `renderer.js`: Timestamps only in UI (not API calls)

**Ongoing:** Audit any new prompt construction code before merging.

---

## Next Steps

1. **Review this plan** with Adam
2. **Start with Phase 1** (prompt caching - quick win)
3. **Implement Phase 2** (semantic caching - bigger payoff)
4. **Measure results** and iterate

**Questions to answer:**
- What are our most common prompt patterns?
- What embedding model to start with?
- What similarity threshold feels right for our use cases?

---

**Created:** 2026-03-20
**Author:** Gary (AI optimizer agent)
**Status:** Ready for implementation
