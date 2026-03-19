// src/preload.js - Secure IPC Bridge
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // License management
  loadLicense: () => ipcRenderer.invoke('load-license'),
  saveLicense: (key) => ipcRenderer.invoke('save-license', key),
  validateLicense: (key) => ipcRenderer.invoke('validate-license', key),
  getLicenseState: () => ipcRenderer.invoke('get-license-state'),
  
  // API key management
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  loadApiKey: () => ipcRenderer.invoke('load-api-key'),
  
  // App info
  getVersion: () => process.env.npm_package_version,
  
  // Dialogs
  showError: (message) => ipcRenderer.invoke('show-error', message)
});
