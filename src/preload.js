// src/preload.js - Secure IPC Bridge
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // License management
  loadLicense: () => ipcRenderer.invoke('load-license'),
  saveLicense: (key) => ipcRenderer.invoke('save-license', key),
  validateLicense: (key) => ipcRenderer.invoke('validate-license', key),
  getLicenseState: () => ipcRenderer.invoke('get-license-state'),
  generateDeviceFingerprint: () => ipcRenderer.invoke('generate-device-fingerprint'),
  
  // API key management
  saveApiKey: (key, provider) => ipcRenderer.invoke('save-api-key', key, provider),
  loadApiKey: (provider) => ipcRenderer.invoke('load-api-key', provider),

  // App settings
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Proxy server management
  startProxy: (port) => ipcRenderer.invoke('start-proxy', port),
  stopProxy: () => ipcRenderer.invoke('stop-proxy'),
  getProxyStatus: () => ipcRenderer.invoke('get-proxy-status'),
  
  // App info
  getVersion: () => process.env.npm_package_version,
  
  // Dialogs
  showError: (message) => ipcRenderer.invoke('show-error', message)
});
