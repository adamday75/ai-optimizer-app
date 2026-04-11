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

// Logging helper for debugging
const logFile = path.join(__dirname, '../proxy-debug.log');
function logToFile(message) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
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

// Proxy Server IPC Handlers
ipcMain.handle('start-proxy', async (event, port = 3000) => {
  try {
    const started = await proxyServer.startServer(port);
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

// Save API key to local storage
function saveApiKey(apiKey) {
  const configPath = path.join(app.getPath('userData'), 'api-key.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify({
      apiKey,
      savedAt: new Date().toISOString()
    }));
    return true;
  } catch (err) {
    console.error('Error saving API key:', err);
    return false;
  }
}

// Load API key from local storage
function loadApiKey() {
  const configPath = path.join(app.getPath('userData'), 'api-key.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading API key:', err);
  }
  return null;
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

ipcMain.handle('save-api-key', async (event, apiKey) => {
  return saveApiKey(apiKey);
});

ipcMain.handle('load-api-key', async () => {
  return loadApiKey();
});

ipcMain.handle('generate-device-fingerprint', async () => {
  return generateDeviceFingerprint();
});
