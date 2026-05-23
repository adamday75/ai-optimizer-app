const GOOGLE_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const SUPPORTED_CHAT_FIELDS = new Set([
  'model',
  'messages',
  'temperature',
  'top_p',
  'max_tokens',
  'max_completion_tokens',
  'stop',
  'stream'
]);

function getApiKey(settings = {}) {
  return settings.googleApiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
}

function unsupported(endpoint) {
  const error = new Error(`Google Gemini provider does not support ${endpoint} through this proxy.`);
  error.status = 501;
  return error;
}

function normalizeTextPart(part) {
  if (typeof part === 'string') {
    return { text: part };
  }

  if (part?.type === 'text' || part?.type === 'input_text') {
    return { text: part.text || '' };
  }

  throw unsupported('non-text content');
}

function normalizeContentParts(content) {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  if (Array.isArray(content)) {
    return content.map(normalizeTextPart);
  }

  if (content == null) {
    return [{ text: '' }];
  }

  return [{ text: String(content) }];
}

function toGeminiRequest(messages = []) {
  const systemParts = [];
  const contents = [];

  for (const message of messages) {
    const parts = normalizeContentParts(message.content);

    if (message.role === 'system' || message.role === 'developer') {
      systemParts.push(...parts);
      continue;
    }

    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts
    });
  }

  return {
    systemInstruction: systemParts.length ? { parts: systemParts } : undefined,
    contents
  };
}

function normalizeModel(model) {
  if (!model) return 'gemini-2.5-flash';
  return model.startsWith('models/') ? model : `models/${model}`;
}

function validateChatRequest(requestBody = {}) {
  const unsupportedFields = Object.keys(requestBody).filter((field) => !SUPPORTED_CHAT_FIELDS.has(field));

  if (unsupportedFields.length) {
    const error = unsupported(`chat fields: ${unsupportedFields.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

function extractCandidateText(data) {
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts;

  if (!candidate || !Array.isArray(parts) || parts.length === 0) {
    const error = new Error('Google Gemini returned no text candidate for this chat completion.');
    error.status = 502;
    throw error;
  }

  const text = parts
    .map((part) => typeof part?.text === 'string' ? part.text : '')
    .join('');

  if (!text) {
    const error = new Error('Google Gemini returned an empty text candidate for this chat completion.');
    error.status = 502;
    throw error;
  }

  return { candidate, text };
}

function mapFinishReason(reason) {
  switch (reason) {
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
    case 'RECITATION':
    case 'BLOCKLIST':
    case 'PROHIBITED_CONTENT':
    case 'SPII':
      return 'content_filter';
    default:
      return 'stop';
  }
}

function toOpenAIChatCompletion(data, fallbackModel) {
  const { candidate, text } = extractCandidateText(data);

  return {
    id: data.responseId || `google-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: data.modelVersion || fallbackModel,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: text
        },
        finish_reason: mapFinishReason(candidate.finishReason)
      }
    ],
    usage: {
      prompt_tokens: data?.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data?.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: data?.usageMetadata?.totalTokenCount || 0
    },
    provider: 'google'
  };
}

module.exports = {
  id: 'google',
  label: 'Google Gemini',

  validateSettings(settings = {}) {
    if (!getApiKey(settings)) {
      throw new Error('Google API key not configured. Please enter it in the app.');
    }
  },

  resetClient() {
    // fetch-based provider; no persistent client to reset
  },

  async processChatCompletion(requestBody, settings = {}) {
    const apiKey = getApiKey(settings);
    if (!apiKey) {
      throw new Error('Google API key not configured. Please enter it in the app.');
    }

    validateChatRequest(requestBody);

    if (requestBody.stream) {
      throw unsupported('streaming chat completions');
    }

    const { systemInstruction, contents } = toGeminiRequest(requestBody.messages || []);
    const model = normalizeModel(requestBody.model);
    const body = {
      contents,
      generationConfig: {}
    };

    if (systemInstruction) body.systemInstruction = systemInstruction;
    if (requestBody.temperature !== undefined) body.generationConfig.temperature = requestBody.temperature;
    if (requestBody.top_p !== undefined) body.generationConfig.topP = requestBody.top_p;
    if (requestBody.max_tokens !== undefined) body.generationConfig.maxOutputTokens = requestBody.max_tokens;
    if (requestBody.max_completion_tokens !== undefined) body.generationConfig.maxOutputTokens = requestBody.max_completion_tokens;
    if (requestBody.stop !== undefined) {
      body.generationConfig.stopSequences = Array.isArray(requestBody.stop)
        ? requestBody.stop
        : [requestBody.stop];
    }

    if (!Object.keys(body.generationConfig).length) {
      delete body.generationConfig;
    }

    const response = await fetch(`${GOOGLE_API_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || data?.message || `Google API error (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return toOpenAIChatCompletion(data, model.replace(/^models\//, ''));
  },

  async processEmbeddings() {
    throw unsupported('embeddings');
  },

  async processResponses() {
    throw unsupported('responses');
  }
};
