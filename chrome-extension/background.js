// Intercept OpenAI API calls and route through proxy
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((details) => {
  console.log('Rule matched:', details);
});

// Log when extension is loaded
console.log('AI Optimizer Extension loaded');

// Listen for extension icon click (optional future feature)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
});
