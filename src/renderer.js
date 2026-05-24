// src/renderer.js - UI Logic

// DOM Elements
const licenseKeyInput = document.getElementById('license-key');
const activateBtn = document.getElementById('activate-btn');
const validateBtn = document.getElementById('validate-btn');
const licenseStatus = document.getElementById('license-status');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const statusEmail = document.getElementById('status-email');
const lastChecked = document.getElementById('last-checked');
const messageDiv = document.getElementById('message');
const apiSection = document.getElementById('api-section');
const apiSectionHeading = document.getElementById('api-section-heading');
const providerSelect = document.getElementById('provider-select');
const apiKeyLabel = document.getElementById('api-key-label');
const apiKeyInput = document.getElementById('api-key');
const saveApiBtn = document.getElementById('save-api-btn');
const apiStatus = document.getElementById('api-status');
const apiStatusTitle = document.getElementById('api-status-title');
const apiStatusMessage = document.getElementById('api-status-message');
const versionSpan = document.getElementById('version');

const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    placeholder: 'sk-...',
    keyField: 'openaiApiKey',
    statusMessage: 'Ready to optimize your OpenAI requests'
  },
  anthropic: {
    label: 'Anthropic',
    placeholder: 'sk-ant-...',
    keyField: 'anthropicApiKey',
    statusMessage: 'Ready to optimize your Anthropic requests'
  },
  google: {
    label: 'Google Gemini',
    placeholder: 'AIza...',
    keyField: 'googleApiKey',
    statusMessage: 'Ready to optimize your Google Gemini requests'
  }
};
let appSettings = {
  provider: 'openai',
  cacheTtlSeconds: 300,
  openaiApiKey: '',
  anthropicApiKey: '',
  googleApiKey: ''
};

// Proxy Section Elements (V2)
const proxySection = document.getElementById('proxy-section');
const startProxyBtn = document.getElementById('start-proxy-btn');
const stopProxyBtn = document.getElementById('stop-proxy-btn');
const proxyStatusText = document.getElementById('proxy-status-text');
const proxyStats = document.getElementById('proxy-stats');
const proxyPort = document.getElementById('proxy-port');
const proxyRequests = document.getElementById('proxy-requests');
const proxyCacheHits = document.getElementById('proxy-cache-hits');
const proxyCacheRate = document.getElementById('proxy-cache-rate');
const proxyPartialHits = document.getElementById('proxy-partial-hits');
const proxyTokensReused = document.getElementById('proxy-tokens-reused');
const cacheTtlSelect = document.getElementById('cache-ttl-select');
const cacheTtlNote = document.getElementById('cache-ttl-note');

// Initialize
async function init() {
  await loadAppSettings();

  // Load saved license
  const saved = await window.electronAPI.loadLicense();
  if (saved && saved.licenseKey) {
    licenseKeyInput.value = saved.licenseKey;
    activateBtn.style.display = 'none';
    validateBtn.style.display = 'inline-block';
    showMessage('License key loaded. Click Validate to activate.', 'success');
  }
  
  // Get license state
  const state = await window.electronAPI.getLicenseState();
  if (state.isValid) {
    showLicenseActive(state);
    apiSection.style.display = 'block';
    
    await loadActiveProviderKey();
    if (!getActiveProviderKey()) {
      // Warn if proxy section visible but no API key
      if (proxySection.style.display !== 'none') {
        showMessage(`⚠️ License active but no ${getActiveProviderLabel()} API key configured. Enter your key and click Save before starting the proxy.`, 'warning');
      }
    }
  }

  await syncProxyStatus();
  
  // Set version from package metadata when available
  try {
    const version = window.electronAPI?.getAppVersion
      ? await window.electronAPI.getAppVersion()
      : '2.1.3';
    versionSpan.textContent = version || '2.1.3';
  } catch (err) {
    versionSpan.textContent = '2.1.3';
  }
}

function formatTtl(seconds) {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const minutes = seconds / 60;
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

async function loadAppSettings() {
  const settings = await window.electronAPI.loadSettings();
  if (!settings) return;

  appSettings = { ...appSettings, ...settings };
  providerSelect.value = appSettings.provider || 'openai';
  cacheTtlSelect.value = String(appSettings.cacheTtlSeconds || 300);
  updateProviderUi();
  updateCacheTtlNote(settings);
}

function getActiveProviderConfig() {
  return PROVIDERS[appSettings.provider] || PROVIDERS.openai;
}

function getActiveProviderLabel() {
  return getActiveProviderConfig().label;
}

function getActiveProviderKey() {
  const provider = getActiveProviderConfig();
  return appSettings[provider.keyField] || '';
}

function updateProviderUi() {
  const provider = getActiveProviderConfig();
  const savedKey = getActiveProviderKey();
  apiSectionHeading.textContent = `${provider.label} API Key`;
  apiKeyLabel.textContent = `${provider.label} API Key:`;
  apiKeyInput.placeholder = provider.placeholder;
  apiKeyInput.value = savedKey;
  saveApiBtn.textContent = `Save ${provider.label} Key`;
  apiStatusTitle.textContent = `${provider.label} API Key Configured`;
  apiStatusMessage.textContent = provider.statusMessage;
  apiStatus.style.display = savedKey ? 'flex' : 'none';
}

async function loadActiveProviderKey() {
  const savedApiKey = await window.electronAPI.loadApiKey(appSettings.provider);
  if (savedApiKey) {
    const provider = PROVIDERS[savedApiKey.provider] || getActiveProviderConfig();
    appSettings[provider.keyField] = savedApiKey.apiKey || '';
  }
  updateProviderUi();
}

function applyProxyStatus(status = {}) {
  const isRunning = Boolean(status.isRunning);

  startProxyBtn.style.display = isRunning ? 'none' : 'inline-block';
  startProxyBtn.disabled = false;
  startProxyBtn.textContent = '▶ Start';

  stopProxyBtn.style.display = isRunning ? 'inline-block' : 'none';
  stopProxyBtn.disabled = false;
  stopProxyBtn.textContent = '⏹ Stop';

  proxyStatusText.textContent = isRunning ? 'Running' : 'Stopped';
  proxyStats.style.display = isRunning ? 'flex' : 'none';

  if (isRunning) {
    proxyPort.textContent = status.port || 3000;
    if (status.stats) {
      const isOpenAI = status.stats.provider === 'openai';
      proxyRequests.textContent = status.stats.requests;
      proxyCacheHits.textContent = status.stats.cacheHits;
      const rate = status.stats.requests > 0
        ? ((status.stats.cacheHits / status.stats.requests) * 100).toFixed(1)
        : '0';
      proxyCacheRate.textContent = rate;
      proxyPartialHits.textContent = status.stats.partialCacheHits || 0;
      proxyTokensReused.textContent = status.stats.promptTokensReused || 0;
      // Partial cache hits and token reuse are OpenAI-only features; hide for other providers.
      const openAIOnlyDisplay = isOpenAI ? '' : 'none';
      const partialHitsRow = document.getElementById('proxy-partial-hits-row');
      const tokensReusedRow = document.getElementById('proxy-tokens-reused-row');
      if (partialHitsRow) partialHitsRow.style.display = openAIOnlyDisplay;
      if (tokensReusedRow) tokensReusedRow.style.display = openAIOnlyDisplay;
    }
  }
}

async function syncProxyStatus() {
  try {
    const status = await window.electronAPI.getProxyStatus();
    applyProxyStatus(status);

    if (status.isRunning) {
      startStatsPolling();
    } else {
      stopStatsPolling();
    }

    return status;
  } catch (error) {
    stopStatsPolling();
    applyProxyStatus({ isRunning: false, port: 3000, stats: null });
    throw error;
  }
}

function updateCacheTtlNote(settings) {
  if (settings.envCacheTtlSeconds) {
    cacheTtlNote.textContent = `Environment override active: ${formatTtl(settings.envCacheTtlSeconds)}. Saved changes will apply after removing the override and restarting the proxy.`;
    return;
  }

  const effectiveTtl = settings.effectiveCacheTtlSeconds || settings.cacheTtlSeconds || 300;
  cacheTtlNote.textContent = `Saved setting: ${formatTtl(effectiveTtl)}. Restart the proxy to apply changes.`;
}

async function handleCacheTtlChange() {
  const cacheTtlSeconds = Number.parseInt(cacheTtlSelect.value, 10);
  const settings = await window.electronAPI.saveSettings({ cacheTtlSeconds });

  if (settings) {
    appSettings = { ...appSettings, ...settings };
    updateCacheTtlNote(settings);
    showMessage('Cache TTL saved. Restart the proxy to apply it.', 'success');
  } else {
    showMessage('Failed to save cache TTL setting', 'error');
  }
}

// Show license active state
function showLicenseActive(state) {
  licenseStatus.style.display = 'flex';
  licenseStatus.classList.add('active');
  licenseStatus.classList.remove('inactive');
  statusIndicator.classList.add('active');
  statusText.textContent = 'License Active';
  statusEmail.textContent = state.email || '';

  const parsedLastChecked = state.lastChecked ? new Date(state.lastChecked) : null;
  const hasValidLastChecked = parsedLastChecked && !Number.isNaN(parsedLastChecked.getTime());
  lastChecked.textContent = hasValidLastChecked
    ? `Last checked: ${parsedLastChecked.toLocaleString()}`
    : 'Last checked: just now';
  
  // Show device count if available
  if (state.deviceCount !== undefined) {
    lastChecked.textContent += ` | Devices: ${state.deviceCount}/${state.deviceLimit} (${state.plan})`;
  }
  
  activateBtn.style.display = 'none';
  validateBtn.style.display = 'inline-block';
  apiSection.style.display = 'block';
  proxySection.style.display = 'block'; // Show proxy section (V2)
}

// Show license inactive state
function showLicenseInactive() {
  licenseStatus.style.display = 'flex';
  licenseStatus.classList.add('inactive');
  licenseStatus.classList.remove('active');
  statusIndicator.classList.remove('active');
  statusText.textContent = 'License Inactive';
  statusEmail.textContent = '';
  lastChecked.textContent = '';
  activateBtn.style.display = 'inline-block';
  validateBtn.style.display = 'none';
  apiSection.style.display = 'none';
}

// Show message
function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

// Activate/Validate license
async function handleLicense() {
  const licenseKey = licenseKeyInput.value.trim();
  
  if (!licenseKey) {
    showMessage('Please enter a license key', 'error');
    return;
  }
  
  // Save license key
  await window.electronAPI.saveLicense(licenseKey);
  
  // Show loading
  activateBtn.disabled = true;
  activateBtn.textContent = 'Validating...';
  
  // Validate
  const result = await window.electronAPI.validateLicense(licenseKey);
  
  activateBtn.disabled = false;
  activateBtn.textContent = 'Activate';
  
  if (result.valid) {
    showLicenseActive(result);
    showMessage('License activated successfully!', 'success');
  } else {
    showLicenseInactive();
    showMessage(`Activation failed: ${result.reason}`, 'error');
  }
}

// Save API key
async function handleProviderChange() {
  const provider = providerSelect.value;
  const settings = await window.electronAPI.saveSettings({ provider });
  if (!settings) {
    showMessage('Failed to save provider selection', 'error');
    providerSelect.value = appSettings.provider || 'openai';
    return;
  }

  appSettings = { ...appSettings, ...settings };
  await loadActiveProviderKey();
  showMessage(`${getActiveProviderLabel()} selected. The proxy will use this provider.`, 'success');
}

async function handleSaveApiKey() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showMessage(`Please enter a ${getActiveProviderLabel()} API key`, 'error');
    return;
  }
  
  // Save via IPC handler for the active provider
  const saved = await window.electronAPI.saveApiKey(apiKey, appSettings.provider);
  
  if (saved) {
    await loadAppSettings();
    apiStatus.style.display = 'flex';
    showMessage(`${getActiveProviderLabel()} API key saved! ✅`, 'success');
  } else {
    showMessage('Failed to save API key', 'error');
  }
}

// Start Proxy Server
async function handleStartProxy() {
  // Pre-flight check: API key must be saved first
  const savedApiKey = await window.electronAPI.loadApiKey(appSettings.provider);
  if (!savedApiKey || !savedApiKey.apiKey || savedApiKey.apiKey.includes('YOUR-KEY') || savedApiKey.apiKey.includes('HERE')) {
    showMessage(`❌ API key not configured! Please enter your ${getActiveProviderLabel()} API key first, then click Save.`, 'error');
    return;
  }
  
  startProxyBtn.disabled = true;
  startProxyBtn.textContent = 'Starting...';
  
  const result = await window.electronAPI.startProxy(3000);
  const status = await syncProxyStatus();
  
  if (result.success && status.isRunning) {
    showMessage('✅ Proxy server started!', 'success');
  } else {
    showMessage(`Failed to start: ${result.error || 'Proxy did not enter running state'}`, 'error');
  }
}

// Stop Proxy Server
async function handleStopProxy() {
  stopProxyBtn.disabled = true;
  stopProxyBtn.textContent = 'Stopping...';
  
  const result = await window.electronAPI.stopProxy();
  const status = await syncProxyStatus();
  
  if (result.success || !status.isRunning) {
    showMessage('Proxy server stopped', 'success');
  } else {
    showMessage(`Failed to stop: ${result.error || 'Proxy still appears to be running'}`, 'error');
  }
}

// Update proxy stats display
async function updateProxyStats() {
  const status = await window.electronAPI.getProxyStatus();
  applyProxyStatus(status);

  if (!status.isRunning) {
    stopStatsPolling();
  }
}

// Poll stats every 2 seconds when running (live updates for demo)
let statsInterval = null;
function startStatsPolling() {
  if (statsInterval) clearInterval(statsInterval);
  statsInterval = setInterval(updateProxyStats, 2000); // 2 second polling for live demo
}
function stopStatsPolling() {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
}

// Event Listeners
activateBtn.addEventListener('click', handleLicense);
validateBtn.addEventListener('click', handleLicense);
providerSelect.addEventListener('change', handleProviderChange);
saveApiBtn.addEventListener('click', handleSaveApiKey);
startProxyBtn.addEventListener('click', handleStartProxy);
stopProxyBtn.addEventListener('click', handleStopProxy);
cacheTtlSelect.addEventListener('change', handleCacheTtlChange);

// Initialize on load
init();
