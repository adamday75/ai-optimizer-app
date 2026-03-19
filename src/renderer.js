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
const apiKeyInput = document.getElementById('api-key');
const saveApiBtn = document.getElementById('save-api-btn');
const apiStatus = document.getElementById('api-status');
const versionSpan = document.getElementById('version');

// Initialize
async function init() {
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
    
    // Load saved API key
    const savedApiKey = await window.electronAPI.loadApiKey();
    if (savedApiKey && savedApiKey.apiKey) {
      apiKeyInput.value = savedApiKey.apiKey;
      apiStatus.style.display = 'flex';
    }
  }
  
  // Set version
  versionSpan.textContent = '1.0.0';
}

// Show license active state
function showLicenseActive(state) {
  licenseStatus.style.display = 'flex';
  licenseStatus.classList.add('active');
  licenseStatus.classList.remove('inactive');
  statusIndicator.classList.add('active');
  statusText.textContent = 'License Active';
  statusEmail.textContent = state.email || '';
  lastChecked.textContent = `Last checked: ${new Date(state.lastChecked).toLocaleString()}`;
  activateBtn.style.display = 'none';
  validateBtn.style.display = 'inline-block';
  apiSection.style.display = 'block';
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
async function handleSaveApiKey() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showMessage('Please enter an API key', 'error');
    return;
  }
  
  // Save via IPC handler
  const saved = await window.electronAPI.saveApiKey(apiKey);
  
  if (saved) {
    apiStatus.style.display = 'flex';
    showMessage('API key saved! ✅', 'success');
  } else {
    showMessage('Failed to save API key', 'error');
  }
}

// Event Listeners
activateBtn.addEventListener('click', handleLicense);
validateBtn.addEventListener('click', handleLicense);
saveApiBtn.addEventListener('click', handleSaveApiKey);

// Initialize on load
init();
