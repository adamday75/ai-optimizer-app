const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function getApiKey(settings = {}) {
  return settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
}

function unsupported(endpoint) {
  const error = new Error(`Anthropic provider does not support ${endpoint} through this V1 proxy.`);
  error.status = 501;
  return error;
}

function normalizeContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (part?.type === 'text') return part.text || '';
      return JSON.stringify(part);
    }).join('\n');
  }
  if (content == null) return '';
  return String(content);
}

function toAnthropicMessages(messages = []) {
  const system = [];
  const anthropicMessages = [];

  for (const message of messages) {
    const role = message.role === 'assistant' ? 'assistant' : 'user';
    const content = normalizeContent(message.content);

    if (message.role === 'system' || message.role === 'developer') {
      if (content) system.push(content);
      continue;
    }

    anthropicMessages.push({ role, content });
  }

  return {
    system: system.join('\n\n') || undefined,
    messages: anthropicMessages
  };
}

function toOpenAIChatCompletion(response) {
  const text = Array.isArray(response.content)
    ? response.content.map((part) => part?.text || '').join('')
    : '';

  return {
    id: response.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: text
        },
        finish_reason: response.stop_reason || 'stop'
      }
    ],
    usage: {
      prompt_tokens: response.usage?.input_tokens || 0,
      completion_tokens: response.usage?.output_tokens || 0,
      total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    },
    provider: 'anthropic'
  };
}

module.exports = {
  id: 'anthropic',
  label: 'Anthropic',

  resetClient() {
    // fetch-based provider; no persistent client to reset
  },

  async processChatCompletion(requestBody, settings = {}) {
    const apiKey = getApiKey(settings);
    if (!apiKey) {
      throw new Error('Anthropic API key not configured. Please enter it in the app.');
    }

    if (requestBody.stream) {
      throw unsupported('streaming chat completions');
    }

    const { system, messages } = toAnthropicMessages(requestBody.messages || []);
    const body = {
      model: requestBody.model,
      messages,
      max_tokens: requestBody.max_tokens || requestBody.max_completion_tokens || 1024
    };

    if (system) body.system = system;
    if (requestBody.temperature !== undefined) body.temperature = requestBody.temperature;
    if (requestBody.top_p !== undefined) body.top_p = requestBody.top_p;
    if (requestBody.stop !== undefined) body.stop_sequences = Array.isArray(requestBody.stop) ? requestBody.stop : [requestBody.stop];

    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || data?.message || `Anthropic API error (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return toOpenAIChatCompletion(data);
  },

  async processEmbeddings() {
    throw unsupported('embeddings');
  },

  async processResponses() {
    throw unsupported('responses');
  }
};
