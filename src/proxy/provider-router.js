const openaiProvider = require('./openai.js');
const anthropicProvider = require('./anthropic.js');
const googleProvider = require('./google.js');
const { generateCacheKey, getCached, setCached, getDefaultTtlSeconds } = require('./cache.js');
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
  cacheHits: 0,
  totalSaved: 0.00
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
  stats = { requests: 0, cacheHits: 0, totalSaved: 0.00 };
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

  const cacheKey = generateCacheKey(requestBody, providerId);
  if (cacheEnabled) {
    const cached = getCached(cacheKey);
    if (cached) {
      stats.cacheHits++;
      recordRequest();
      console.log(`✅ ${provider.label} cache hit! (${stats.cacheHits}/${stats.requests})`);
      return cached;
    }
  }

  let finalBody = requestBody;
  let finalModel = requestBody.model;

  if (smartRouting) {
    const recommendation = recommendModel(requestBody, providerId, requestBody.model);
    finalModel = recommendation.model;
    finalBody = { ...requestBody, model: finalModel };
  }

  const response = await provider.processChatCompletion(finalBody, activeSettings);

  const totalTokens = response.usage?.total_tokens || 0;
  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;
  const cost = calculateCost(providerId, finalModel, inputTokens, outputTokens);
  const expectedCost = calculateCost(providerId, requestBody.model, inputTokens, outputTokens);
  stats.totalSaved += expectedCost - cost;

  recordRequest();
  console.log(`📊 ${provider.label} request #${stats.requests} | Cache: ${stats.cacheHits}/${stats.requests} | Saved: $${stats.totalSaved.toFixed(4)}`);

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
