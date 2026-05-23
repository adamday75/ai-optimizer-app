// src/main.js - Electron Main Process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// License validation endpoint
const LICENSE_API_URL = 'https://saas-optimizer.fly.dev/v1/validate';

// Store license state
let licenseState = {
  isValid: false,
  licenseKey: null,
  email: null,
  lastChecked: null
};

// Proxy server state
const proxyServer = require('./proxy/server.js');
let proxyState = {
  isRunning: false,
  port: 3000
};

const DEFAULT_SETTINGS = {
  provider: 'openai',
  cacheTtlSeconds: 300,
  openaiApiKey: '',
  anthropicApiKey: '',
  googleApiKey: ''
};

function normalizeProvider(provider) {
  return ['openai', 'anthropic', 'google'].includes(provider) ? provider : 'openai';
}

function getLegacyApiKey() {
  const configPath = path.join(app.getPath('userData'), 'api-key.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(data);
      return config.apiKey || '';
    }
  } catch (err) {
    console.error('Error loading legacy API key:', err);
  }
  return '';
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeSettings(settings = {}) {
  const sanitized = {
    ...DEFAULT_SETTINGS,
    ...settings,
    provider: normalizeProvider(settings.provider),
    cacheTtlSeconds: parsePositiveInt(settings.cacheTtlSeconds, DEFAULT_SETTINGS.cacheTtlSeconds),
    openaiApiKey: settings.openaiApiKey || '',
    anthropicApiKey: settings.anthropicApiKey || '',
    googleApiKey: settings.googleApiKey || ''
  };

  if (!sanitized.openaiApiKey) {
    sanitized.openaiApiKey = getLegacyApiKey();
  }

  return sanitized;
}

function getEffectiveCacheTtlSeconds(settings) {
  return parsePositiveInt(
    process.env.AI_OPTIMIZER_CACHE_TTL_SECONDS,
    parsePositiveInt(settings.cacheTtlSeconds, DEFAULT_SETTINGS.cacheTtlSeconds)
  );
}

function loadSettings() {
  const settingsPath = getSettingsPath();
  let settings = { ...DEFAULT_SETTINGS };
  let settingsExists = false;

  try {
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      settingsExists = true;
      settings = sanitizeSettings(data);
    } else {
      settings = sanitizeSettings(settings);
    }
  } catch (err) {
    console.error('Error loading settings:', err);
    settings = sanitizeSettings(settings);
  }

  const envCacheTtlSeconds = process.env.AI_OPTIMIZER_CACHE_TTL_SECONDS
    ? parsePositiveInt(process.env.AI_OPTIMIZER_CACHE_TTL_SECONDS, null)
    : null;

  return {
    ...settings,
    effectiveCacheTtlSeconds: getEffectiveCacheTtlSeconds(settings),
    cacheTtlSource: envCacheTtlSeconds ? 'env' : (settingsExists ? 'settings' : 'default'),
    envCacheTtlSeconds
  };
}

function saveSettings(nextSettings = {}) {
  const currentSettings = loadSettings();
  const settings = sanitizeSettings({
    ...currentSettings,
    ...nextSettings,
    provider: nextSettings.provider !== undefined ? nextSettings.provider : currentSettings.provider,
    cacheTtlSeconds: nextSettings.cacheTtlSeconds !== undefined
      ? parsePositiveInt(nextSettings.cacheTtlSeconds, currentSettings.cacheTtlSeconds)
      : currentSettings.cacheTtlSeconds,
    openaiApiKey: nextSettings.openaiApiKey !== undefined ? nextSettings.openaiApiKey : currentSettings.openaiApiKey,
    anthropicApiKey: nextSettings.anthropicApiKey !== undefined ? nextSettings.anthropicApiKey : currentSettings.anthropicApiKey,
    googleApiKey: nextSettings.googleApiKey !== undefined ? nextSettings.googleApiKey : currentSettings.googleApiKey
  });

  delete settings.effectiveCacheTtlSeconds;
  delete settings.cacheTtlSource;
  delete settings.envCacheTtlSeconds;

  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify({
      ...settings,
      savedAt: new Date().toISOString()
    }, null, 2));
    const reloaded = loadSettings();
    proxyServer.updateSettings?.(reloaded);
    return reloaded;
  } catch (err) {
    console.error('Error saving settings:', err);
    return null;
  }
}

// Logging helper for debugging
function getLogFilePath() {
  return path.join(app.getPath('userData'), 'proxy-debug.log');
}

function logToFile(message) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(getLogFilePath(), `[${timestamp}] ${message}\n`);
  } catch (err) {
    console.error('Failed to write to log:', err);
  }
}

// Register license validator with proxy server
proxyServer.setLicenseValidator(() => licenseState.isValid);
logToFile('🔐 License validator registered with proxy server');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'AI Optimizer',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('src/index.html');
  
  // Open DevTools in dev mode
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Load saved license key from local storage
function loadLicense() {
  const configPath = path.join(app.getPath('userData'), 'license.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading license:', err);
  }
  return null;
}

// Save license key to local storage
function saveLicense(licenseKey) {
  const configPath = path.join(app.getPath('userData'), 'license.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify({
      licenseKey,
      savedAt: new Date().toISOString()
    }));
    return true;
  } catch (err) {
    console.error('Error saving license:', err);
    return false;
  }
}

// Validate license with API
async function validateLicense(licenseKey) {
  try {
    // Generate device fingerprint
    const deviceFingerprint = generateDeviceFingerprint();
    
    const response = await fetch(LICENSE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, deviceFingerprint })
    });
    
    const data = await response.json();
    
    if (data.valid) {
      licenseState = {
        isValid: true,
        licenseKey,
        email: data.email,
        lastChecked: new Date().toISOString(),
        deviceCount: data.deviceCount,
        deviceLimit: data.deviceLimit,
        plan: data.plan
      };
      return { 
        valid: true, 
        email: data.email,
        lastChecked: licenseState.lastChecked,
        deviceCount: data.deviceCount,
        deviceLimit: data.deviceLimit,
        plan: data.plan
      };
    } else {
      licenseState = { isValid: false, licenseKey: null, email: null, lastChecked: null };
      return { 
        valid: false, 
        reason: data.reason || 'Invalid license',
        deviceCount: data.deviceCount,
        deviceLimit: data.deviceLimit,
        message: data.message
      };
    }
  } catch (error) {
    console.error('License validation error:', error);
    return { valid: false, reason: 'Network error' };
  }
}

// IPC Handlers
ipcMain.handle('load-license', async () => {
  return loadLicense();
});

ipcMain.handle('save-license', async (event, licenseKey) => {
  return saveLicense(licenseKey);
});

ipcMain.handle('validate-license', async (event, licenseKey) => {
  return await validateLicense(licenseKey);
});

ipcMain.handle('get-license-state', () => {
  return licenseState;
});

ipcMain.handle('load-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', async (event, settings) => {
  return saveSettings(settings);
});

// Proxy Server IPC Handlers
ipcMain.handle('start-proxy', async (event, port = 3000) => {
  try {
    const settings = loadSettings();
    const started = await proxyServer.startServer(port, settings);
    proxyState.isRunning = started;
    proxyState.port = port;
    return { success: started, port };
  } catch (error) {
    console.error('Failed to start proxy:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-proxy', async () => {
  try {
    const stopped = await proxyServer.stopServer();
    proxyState.isRunning = !stopped;
    return { success: stopped };
  } catch (error) {
    console.error('Failed to stop proxy:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-proxy-status', () => {
  return {
    isRunning: proxyServer.getStatus(),
    port: proxyState.port,
    stats: proxyServer.getStats()
  };
});

// Save API key to durable provider settings
function getProviderKeyField(provider) {
  const activeProvider = normalizeProvider(provider);
  if (activeProvider === 'anthropic') return 'anthropicApiKey';
  if (activeProvider === 'google') return 'googleApiKey';
  return 'openaiApiKey';
}

function saveApiKey(apiKey, provider) {
  const activeProvider = normalizeProvider(provider || loadSettings().provider);
  const keyField = getProviderKeyField(activeProvider);
  return Boolean(saveSettings({ [keyField]: apiKey }));
}

// Load API key from durable provider settings
function loadApiKey(provider) {
  const settings = loadSettings();
  const activeProvider = normalizeProvider(provider || settings.provider);
  return {
    apiKey: settings[getProviderKeyField(activeProvider)] || '',
    provider: activeProvider,
    savedAt: settings.savedAt || null
  };
}

// Generate stable device fingerprint
function generateDeviceFingerprint() {
  const crypto = require('crypto');
  const os = require('os');

  const fingerprintPath = path.join(app.getPath('userData'), 'device-fingerprint.json');

  try {
    if (fs.existsSync(fingerprintPath)) {
      const saved = JSON.parse(fs.readFileSync(fingerprintPath, 'utf8'));
      if (saved && saved.fingerprint) {
        return saved.fingerprint;
      }
    }
  } catch (err) {
    console.error('Error loading saved device fingerprint:', err);
  }

  let machineId = null;

  try {
    if (process.platform === 'linux') {
      const linuxMachineIdPaths = ['/etc/machine-id', '/var/lib/dbus/machine-id'];
      for (const p of linuxMachineIdPaths) {
        if (fs.existsSync(p)) {
          machineId = fs.readFileSync(p, 'utf8').trim();
          if (machineId) break;
        }
      }
    }
  } catch (err) {
    console.error('Error loading Linux machine id:', err);
  }

  const fingerprintData = JSON.stringify({
    namespace: 'ai-optimizer',
    machineId: machineId || null,
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus()[0]?.model,
    totalMem: os.totalmem()
  });

  const fingerprint = crypto.createHash('sha256').update(fingerprintData).digest('hex');

  try {
    fs.writeFileSync(fingerprintPath, JSON.stringify({
      fingerprint,
      savedAt: new Date().toISOString(),
      version: 1
    }));
  } catch (err) {
    console.error('Error saving device fingerprint:', err);
  }

  return fingerprint;
}

ipcMain.handle('save-api-key', async (event, apiKey, provider) => {
  return saveApiKey(apiKey, provider);
});

ipcMain.handle('load-api-key', async (event, provider) => {
  return loadApiKey(provider);
});

ipcMain.handle('generate-device-fingerprint', async () => {
  return generateDeviceFingerprint();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
