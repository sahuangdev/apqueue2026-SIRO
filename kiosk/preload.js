/**
 * Preload script - Secure bridge between main and renderer processes
 * This script runs in a sandboxed environment with access to Electron APIs
 */
const { contextBridge, ipcRenderer } = require('electron');

// Define the API that will be available to renderer process
const kioskAPI = {
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  getAppConfig: () => ipcRenderer.invoke('get-app-config'),
  saveAppConfig: (patch) => ipcRenderer.invoke('save-app-config', patch),
  applyServerConfig: (cfg) => ipcRenderer.invoke('apply-server-config', cfg),
  getLanIp: () => ipcRenderer.invoke('get-lan-ip'),

  // Printer
  printTicket: (payload) => ipcRenderer.invoke('print-ticket', payload),
  listPrinters: () => ipcRenderer.invoke('list-printers'),
  getPrinterConfig: () => ipcRenderer.invoke('get-printer-config'),
  savePrinterConfig: (patch) => ipcRenderer.invoke('save-printer-config', patch),
  openPdfFolder: () => ipcRenderer.invoke('open-pdf-folder'),

  // App lifecycle
  quitApp: () => ipcRenderer.invoke('quit-app'),

  // Event listeners
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
  onAppError: (callback) => ipcRenderer.on('app-error', callback),
  onReadyToShow: (callback) => ipcRenderer.on('ready-to-show', callback),
  
  // Remove event listeners
  offOpenSettings: (callback) => ipcRenderer.off('open-settings', callback),
  offAppError: (callback) => ipcRenderer.off('app-error', callback),
  offReadyToShow: (callback) => ipcRenderer.off('ready-to-show', callback),
};

// Expose the API to the renderer process
try {
  contextBridge.exposeInMainWorld('kioskAPI', kioskAPI);
} catch (error) {
  console.error('Failed to expose kioskAPI:', error);
}
