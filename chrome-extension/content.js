// AI Optimizer Content Script - Intercepts OpenAI API calls
(function() {
  console.log('🚀 AI Optimizer: Content script loaded on', window.location.hostname);

  // Store original fetch
  const originalFetch = window.fetch;

  // Override fetch to intercept ALL requests (debug mode)
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    
    // Log ALL requests to see what's happening
    console.log('🔍 DEBUG FETCH:', url);
    
    // Match AI API domains AND ChatGPT backend
    const aiPatterns = [
      'api.openai.com',
      'backend.api.openai.com',
      'chat.openai.com',
      'openrouter.ai',
      'api.anthropic.com',
      '/backend-api/',  // ChatGPT.com uses relative paths
      'chatgpt.com/backend-api'
    ];
    
    const isAICall = aiPatterns.some(pattern => url.includes(pattern));
    
    console.log('🔍 isAICall:', isAICall, 'URL:', url);
    
    if (isAICall) {
      console.log('💰 AI Optimizer: Intercepting AI request:', url);
      
      // Rewrite URL to use local proxy
      let newUrl;
      if (url.startsWith('/backend-api/')) {
        // Relative path - prepend proxy URL
        newUrl = 'http://localhost:3000' + url;
      } else {
        // Absolute URL - replace domain
        newUrl = url.replace(/https:\/\/[^\/]*(api\.openai\.com|openrouter\.ai|api\.anthropic\.com|chatgpt\.com)/, 'http://localhost:3000');
      }
      
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

  console.log('✅ AI Optimizer: Fetch override complete');
})();
