/**
 * Smart routing - cheapest model for the task
 */

// Cost per 1K tokens (input/output) - 2026 pricing
const MODEL_COSTS = {
  'openai': {
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
  },
  'anthropic': {
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 }
  }
};

/**
 * Calculate cost for a model
 * @param {string} provider - 'openai' or 'anthropic'
 * @param {string} model - Model name
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Output token count
 * @returns {number} Cost in dollars
 */
module.exports.calculateCost = function (provider, model, inputTokens, outputTokens) {
  const costs = MODEL_COSTS[provider]?.[model];
  if (!costs) return 0;

  return ((inputTokens / 1000) * costs.input) +
         ((outputTokens / 1000) * costs.output);
}

/**
 * Estimate token count (rough approximation)
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
module.exports.estimateTokens = function (text) {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

/**
 * Analyze request complexity
 * @param {Object} requestBody - API request body
 * @returns {Object} Complexity analysis
 */
module.exports.analyzeComplexity = function (requestBody) {
  const messages = requestBody.messages || [];
  const totalLength = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
  const estimatedTokens = estimateTokens(String(messages));

  // Simple heuristics for complexity
  const hasCode = messages.some(m => m.content?.includes('```'));
  const hasSystemPrompt = messages.some(m => m.role === 'system');
  const conversationDepth = messages.length;

  let level = 'simple';
  if (hasCode || estimatedTokens > 2000 || conversationDepth > 6) {
    level = 'complex';
  } else if (estimatedTokens > 500 || conversationDepth > 3) {
    level = 'medium';
  }

  return {
    level,
    estimatedTokens,
    totalLength,
    hasCode,
    conversationDepth
  };
}

/**
 * Recommend model based on complexity and preferred provider
 * @param {Object} requestBody - API request body
 * @param {string} provider - 'openai' or 'anthropic'
 * @param {string} requestedModel - Original model requested (fallback if needed)
 * @returns {Object} Recommendation
 */
module.exports.recommendModel = function (requestBody, provider, requestedModel) {
  const { level } = analyzeComplexity(requestBody);

  if (provider === 'openai') {
    if (level === 'simple' && requestedModel !== 'gpt-4') {
      return {
        model: 'gpt-3.5-turbo',
        reason: 'Simple task - gpt-3.5 is sufficient',
        savings: calculateSavings(requestBody, 'openai', 'gpt-4', 'gpt-3.5-turbo')
      };
    } else if (level === 'medium') {
      return {
        model: 'gpt-4-turbo',
        reason: 'Medium complexity - gpt-4-turbo balances cost/quality',
        savings: calculateSavings(requestBody, 'openai', 'gpt-4', 'gpt-4-turbo')
      };
    }
    // Complex or explicitly requested - use gpt-4
    return {
      model: 'gpt-4',
      reason: level === 'complex' ? 'Complex task needs gpt-4' : 'Explicit model request',
      savings: 0
    };
  }

  if (provider === 'anthropic') {
    if (level === 'simple') {
      return {
        model: 'claude-3-haiku',
        reason: 'Simple task - claude-3-haiku is sufficient',
        savings: calculateSavings(requestBody, 'anthropic', 'claude-3-opus', 'claude-3-haiku')
      };
    } else if (level === 'medium') {
      return {
        model: 'claude-3-sonnet',
        reason: 'Medium complexity - good balance',
        savings: calculateSavings(requestBody, 'anthropic', 'claude-3-opus', 'claude-3-sonnet')
      };
    }
    return {
      model: 'claude-3-opus',
      reason: 'Complex task needs opus',
      savings: 0
    };
  }

  // Fallback - use requested model
  return { model: requestedModel, reason: 'Fallback to requested', savings: 0 };
}

/**
 * Calculate potential savings between two models
 * @param {Object} requestBody - Request body
 * @param {string} provider - Provider
 * @param {string} expensiveModel - More expensive model
 * @param {string} cheaperModel - Cheaper model
 * @returns {number} Estimated savings
 */
function calculateSavings(requestBody, provider, expensiveModel, cheaperModel) {
  const { estimatedTokens } = analyzeComplexity(requestBody);
  const inputCost = (MODEL_COSTS[provider][expensiveModel].input -
                     MODEL_COSTS[provider][cheaperModel].input) * (estimatedTokens / 1000);
  // Assume similar output tokens for estimation
  const outputCost = (MODEL_COSTS[provider][expensiveModel].output -
                      MODEL_COSTS[provider][cheaperModel].output) * (estimatedTokens / 2000);

  return inputCost + outputCost;
}

// All functions exported via module.exports above