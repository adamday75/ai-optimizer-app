// AI Optimizer Content Script - Intercepts OpenAI API calls
(function() {
  console.log('🚀 AI Optimizer: Content script loaded on', window.location.hostname);

  // Store original fetch
  const originalFetch = window.fetch;

  // Override fetch to intercept OpenAI API calls
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    
    // Match AI API domains (OpenAI, OpenRouter, Anthropic, etc.)
    const aiPatterns = [
      'api.openai.com',
      'backend.api.openai.com',
      'chat.openai.com',
      'openrouter.ai',
      'api.anthropic.com'
    ];
    
    const isAICall = aiPatterns.some(pattern => url.includes(pattern));
    
    if (isAICall) {
      console.log('💰 AI Optimizer: Intercepting AI request:', url);
      
      // Rewrite URL to use local proxy (handles openai, openrouter, anthropic)
      const newUrl = url.replace(/https:\/\/[^\/]*(api\.openai\.com|openrouter\.ai|api\.anthropic\.com)/, 'http://localhost:3000');
      
      if (typeof args[0] === 'string') {
        args[0] = newUrl;
      } else if (args[0] && args[0].url) {
        args[0].url = newUrl;
      }
      
      console.log('💰 AI Optimizer: Rerouted to:', newUrl);
    }
    
    // Call original fetch with modified URL
    return originalFetch.apply(this, args);
  };

  // Also override XMLHttpRequest for older code
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
      if (typeof url === 'string' && url.includes('api.openai.com')) {
        console.log('💰 AI Optimizer: Intercepting XHR:', url);
        url = url.replace(/https:\/\/[^\/]*api\.openai\.com/, 'http://localhost:3000');
        console.log('💰 AI Optimizer: Rerouted to:', url);
      }
      return originalOpen.call(this, method, url, ...rest);
    };
    return xhr;
  };

  console.log('✅ AI Optimizer: Fetch and XHR override complete');
})();
