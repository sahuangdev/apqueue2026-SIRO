#!/usr/bin/env node
/**
 * Main process - Electron app entry point
 * Handles app lifecycle, window management, and IPC
 */
const { app } = require('electron');
const path = require('path');

// Set environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Load modules
const logger = require('./src/logger');
const config = require('./src/config');
const errorHandler = require('./src/error-handler');
const windowManager = require('./src/window');
const ipcManager = require('./src/ipc-handlers');
const serverManager = require('./src/server-manager');
const constants = require('./src/constants');

let isQuitting = false;

/**
 * Initialize application
 */
async function initialize() {
  try {
    // Setup error handling
    errorHandler.setup();
    logger.log('Application starting', {
      version: app.getVersion(),
      isDev: constants.isDev,
      platform: process.platform,
    });

    // Load configuration
    config.load();

    // Register IPC handlers
    ipcManager.register();

    logger.log('Application initialized successfully');
  } catch (err) {
    logger.error('Failed to initialize application', err);
    process.exit(1);
  }
}

/**
 * When Electron has finished initialization
 */
app.on('ready', async () => {
  try {
    await initialize();
    await serverManager.start();
    windowManager.createWindow();
    logger.log('App ready - window created');
  } catch (err) {
    logger.error('Failed to start app', err);
    app.quit();
  }
});

/**
 * When all windows are closed (on macOS, keep app running)
 */
app.on('window-all-closed', () => {
  logger.log('All windows closed');
  // On macOS, applications stay active until user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * When app is reactivated (macOS)
 */
app.on('activate', () => {
  logger.log('App activated');
  if (!windowManager.isValid()) {
    windowManager.createWindow();
  }
});

/**
 * Before quit - cleanup
 */
app.on('before-quit', () => {
  isQuitting = true;
  ipcManager.cleanup();
  serverManager.stop();
  logger.log('Application quitting');
});

/**
 * Prevent multiple instances
 */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  logger.warn('Another instance is already running');
  app.quit();
} else {
  app.on('second-instance', () => {
    logger.log('Second instance attempted');
    if (windowManager.isValid()) {
      const win = windowManager.getWindow();
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// Handle any uncaught exceptions at app level
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception in main process', err);
  if (!isQuitting) {
    app.quit();
  }
});
