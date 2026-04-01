const { OpenAI } = require('openai');
const { generateCacheKey, getCached, setCached } = require('./cache.js');
const { recommendModel, calculateCost, estimateTokens } = require('./routing.js');
const path = require('path');
const fs = require('fs');

// Stats tracking
let stats = {
  requests: 0,
  cacheHits: 0,
  totalSaved: 0.00
};

// Lazy initialization - only create client when needed
let openaiClient = null;

// Get API key from Electron app storage (or env var for standalone)
function getApiKey() {
  // Try env var first (for standalone testing)
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  
  // Try local config file (for standalone testing)
  try {
    const localConfigPath = path.join(__dirname, '../../api-key.json');
    if (fs.existsSync(localConfigPath)) {
      const data = fs.readFileSync(localConfigPath, 'utf8');
      const config = JSON.parse(data);
      return config.apiKey;
    }
  } catch (err) {
    console.error('Error loading API key from local config:', err);
  }
  
  // Try Electron app storage
  try {
    const electron = require('electron');
    if (electron && electron.app) {
      const configPath = path.join(electron.app.getPath('userData'), 'api-key.json');
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(data);
        return config.apiKey;
      }
    }
  } catch (err) {
    console.error('Error loading API key from Electron:', err);
  }
  return null;
}

function getOpenAI() {
  if (!openaiClient) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please enter it in the app.');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Get stats (called from UI via IPC)
module.exports.getStats = function () {
  return stats;
};

// Reset stats (called when server restarts)
module.exports.resetStats = function () {
  stats = { requests: 0, cacheHits: 0, totalSaved: 0.00 };
};

/**
 * Process OpenAI chat completion request
 * @param {Object} requestBody - Request body
 * @returns {Object} Response
 */
module.exports.processChatCompletion = async function (requestBody) {
  const cacheEnabled = true; // Always cache in V2
  const smartRouting = false; // Disable for now, enable later

  // Get cache key
  const cacheKey = generateCacheKey(requestBody, 'openai');

  // Check cache first
  if (cacheEnabled) {
    const cached = getCached(cacheKey);
    if (cached) {
      stats.cacheHits++;
      stats.requests++;
      console.log(`✅ Cache hit! (${stats.cacheHits}/${stats.requests})`);
      return cached;
    }
  }

  // Smart routing - recommend cheaper model if applicable
  let finalModel = requestBody.model;
  let recommendation = null;

  if (smartRouting) {
    recommendation = recommendModel(requestBody, 'openai', requestBody.model);
    finalModel = recommendation.model;
  }

  try {
    // Make actual API call
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: finalModel,
      messages: requestBody.messages,
      temperature: requestBody.temperature,
      max_tokens: requestBody.max_tokens,
      stream: requestBody.stream || false
    });

    // Calculate cost
    const totalTokens = response.usage?.total_tokens || 0;
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = calculateCost('openai', finalModel, inputTokens, outputTokens);

    // Calculate savings
    const expectedCost = calculateCost('openai', requestBody.model, inputTokens, outputTokens);
    const savings = expectedCost - cost;
    stats.totalSaved += savings;

    // Update stats
    stats.requests++;
    console.log(`📊 Request #${stats.requests} | Cache: ${stats.cacheHits}/${stats.requests} | Saved: $${stats.totalSaved.toFixed(4)}`);

    // Cache response
    if (cacheEnabled) {
      // Cache for 5 minutes (can be made configurable)
      setCached(cacheKey, response, 300);
    }

    // Return response
    return response;

  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Simple prompt compression (MVP - can be expanded)
 * @param {Array} messages - Chat messages
 * @returns {Array} Compressed messages
 */
module.exports.compressPrompt = function (messages) {
  // Simple compression strategies:
  // 1. Remove duplicate consecutive messages
  // 2. Truncate very long system messages
  // 3. Remove common boilerplate

  if (!Array.isArray(messages)) return messages;

  const compressed = [];
  let prevContent = null;

  messages.forEach(msg => {
    const content = msg.content;

    // Skip duplicates
    if (content === prevContent) return;
    prevContent = content;

    // Truncate very long system messages
    if (msg.role === 'system' && content.length > 1000) {
      compressed.push({
        role: 'system',
        content: content.substring(0, 1000) + '... [truncated]'
      });
    } else {
      compressed.push(msg);
    }
  });

  return compressed;
}

// All functions exported via module.exports above
