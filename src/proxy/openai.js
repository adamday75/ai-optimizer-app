const { OpenAI } = require('openai');

let openaiClient = null;
let openaiClientKey = null;

function getApiKey(settings = {}) {
  return settings.openaiApiKey || process.env.OPENAI_API_KEY || null;
}

function getOpenAI(settings = {}) {
  const apiKey = getApiKey(settings);
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please enter it in the app.');
  }

  if (!openaiClient || openaiClientKey !== apiKey) {
    openaiClient = new OpenAI({ apiKey });
    openaiClientKey = apiKey;
  }

  return openaiClient;
}

module.exports = {
  id: 'openai',
  label: 'OpenAI',

  validateSettings(settings = {}) {
    getOpenAI(settings);
  },

  resetClient() {
    openaiClient = null;
    openaiClientKey = null;
  },

  async processChatCompletion(requestBody, settings = {}) {
    const openai = getOpenAI(settings);
    return openai.chat.completions.create(requestBody);
  },

  async processEmbeddings(requestBody, settings = {}) {
    const openai = getOpenAI(settings);
    return openai.embeddings.create(requestBody);
  },

  async processResponses(requestBody, settings = {}) {
    const openai = getOpenAI(settings);
    return openai.responses.create(requestBody);
  }
};
