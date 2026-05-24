const openaiProvider = require('./openai.js');
const anthropicProvider = require('./anthropic.js');
const googleProvider = require('./google.js');
const {
  generateCacheKey, getCached, setCached, getDefaultTtlSeconds,
  generatePromptPrefixKey, getPromptCacheEntry, recordPromptCacheHit
} = require('./cache.js');
const { recommendModel, calculateCost } = require('./routing.js');

const providers = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider
};

let activeSettings = {
  provider: 'openai',
  cacheTtlSeconds: 300,
  openaiApiKey: '',
  anthropicApiKey: '',
  googleApiKey: ''
};

let stats = {
  requests: 0,
  cacheHits: 0,          // exact local cache hits
  partialCacheHits: 0,   // requests where OpenAI confirmed cached-token reuse via usage.prompt_tokens_details
  promptTokensReused: 0, // cumulative cached_tokens reported by OpenAI
  estimatedPromptSavings: 0.00, // estimated $ saved from provider-side cached tokens
  totalSaved: 0.00       // estimated $ saved from smart routing (reserved)
};

function normalizeProvider(provider) {
  return providers[provider] ? provider : 'openai';
}

function configureProviders(settings = {}) {
  activeSettings = {
    ...activeSettings,
    ...settings,
    provider: normalizeProvider(settings.provider || activeSettings.provider)
  };
  return activeSettings;
}

function getActiveProvider() {
  const providerId = normalizeProvider(activeSettings.provider);
  return providers[providerId];
}

function recordRequest() {
  stats.requests++;
}

function getStats() {
  return {
    ...stats,
    provider: normalizeProvider(activeSettings.provider),
    cacheTtlSeconds: getDefaultTtlSeconds()
  };
}

function resetStats() {
  stats = {
    requests: 0,
    cacheHits: 0,
    partialCacheHits: 0,
    promptTokensReused: 0,
    estimatedPromptSavings: 0.00,
    totalSaved: 0.00
  };
}

function resetClients() {
  Object.values(providers).forEach((provider) => provider.resetClient?.());
}

async function processChatCompletion(requestBody) {
  const providerId = normalizeProvider(activeSettings.provider);
  const provider = providers[providerId];
  const cacheEnabled = true;
  const smartRouting = false;

  provider.validateSettings?.(activeSettings);

  // Layer 1: exact cache — identical request body returns stored response immediately
  const cacheKey = generateCacheKey(requestBody, providerId);
  if (cacheEnabled) {
    const cached = getCached(cacheKey);
    if (cached) {
      stats.cacheHits++;
      recordRequest();
      console.log(`✅ ${provider.label} exact cache hit (${stats.cacheHits}/${stats.requests})`);
      return cached;
    }
  }

  // Layer 2: prompt prefix tracking — OpenAI only; internal heuristic for logging.
  // A hit is counted only when the provider response confirms real cached-token reuse,
  // NOT from the local prefix guess alone.
  const prefixKey = providerId === 'openai' ? generatePromptPrefixKey(requestBody, providerId) : null;
  if (prefixKey && getPromptCacheEntry(prefixKey)) {
    console.log(`🔁 ${provider.label} prefix seen before (local tracking only — awaiting provider confirmation)`);
  }

  let finalBody = requestBody;
  let finalModel = requestBody.model;

  if (smartRouting) {
    const recommendation = recommendModel(requestBody, providerId, requestBody.model);
    finalModel = recommendation.model;
    finalBody = { ...requestBody, model: finalModel };
  }

  const response = await provider.processChatCompletion(finalBody, activeSettings);

  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;
  const cost = calculateCost(providerId, finalModel, inputTokens, outputTokens);
  const expectedCost = calculateCost(providerId, requestBody.model, inputTokens, outputTokens);
  stats.totalSaved += expectedCost - cost;

  // Accumulate provider-reported cached tokens — OpenAI only.
  // Only OpenAI exposes prompt_tokens_details.cached_tokens; Anthropic/Google do not.
  // Count a partial hit only when this provider evidence is present.
  if (providerId === 'openai') {
    const cachedTokens = response.usage?.prompt_tokens_details?.cached_tokens || 0;
    if (cachedTokens > 0) {
      stats.partialCacheHits++;
      stats.promptTokensReused += cachedTokens;
      // Cached tokens billed at 50% of input price; returns 0 for unknown model prices.
      const fullCachedCost = calculateCost(providerId, finalModel, cachedTokens, 0);
      stats.estimatedPromptSavings += fullCachedCost * 0.5;
    }

    // Record/refresh prefix for subsequent logging heuristic
    if (prefixKey) {
      recordPromptCacheHit(prefixKey, inputTokens);
    }
  }

  recordRequest();
  console.log(
    `📊 ${provider.label} req #${stats.requests} | exact: ${stats.cacheHits} | partial: ${stats.partialCacheHits} | tokens reused: ${stats.promptTokensReused}`
  );

  if (cacheEnabled) {
    setCached(cacheKey, response, getDefaultTtlSeconds());
  }

  return response;
}

async function processEmbeddings(requestBody) {
  const provider = getActiveProvider();
  const response = await provider.processEmbeddings(requestBody, activeSettings);
  recordRequest();
  return response;
}

async function processResponses(requestBody) {
  const provider = getActiveProvider();
  const response = await provider.processResponses(requestBody, activeSettings);
  recordRequest();
  return response;
}

module.exports = {
  configureProviders,
  getStats,
  resetStats,
  resetClients,
  processChatCompletion,
  processEmbeddings,
  processResponses
};
