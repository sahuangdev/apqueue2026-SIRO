/**
 * Window management
 * Handles window creation, lifecycle, and keyboard shortcuts
 */
const { BrowserWindow, app } = require('electron');
const path = require('path');
const logger = require('./logger');
const config = require('./config');
const constants = require('./constants');

class WindowManager {
  constructor() {
    this.mainWindow = null;
  }

  /**
   * Create the main application window
   */
  createWindow() {
    try {
      const cfg = config.get();
      const useFullscreen = cfg.fullscreen === true;

      this.mainWindow = new BrowserWindow({
        width: cfg.width,
        height: cfg.height,
        useContentSize: true,
        resizable: false,
        fullscreen: useFullscreen,
        kiosk: useFullscreen,
        autoHideMenuBar: true,
        backgroundColor: '#ffffff',
        show: false, // Don't show until ready
        webPreferences: {
          preload: path.join(__dirname, '..', 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          enableRemoteModule: false,
          worldSafeExecuteJavaScript: true,
        },
      });

      this.setupWindowEvents();
      this.setupKeyboardShortcuts();

      // Load the app
      const indexPath = path.join(__dirname, '..', 'renderer', 'index.html');
      this.mainWindow.loadFile(indexPath);

      // Show window when ready
      this.mainWindow.once('ready-to-show', () => {
        this.mainWindow.show();
        logger.log('Main window displayed');
      });

      if (constants.isDev) {
        this.mainWindow.webContents.openDevTools();
      }

      logger.log('Window created', { fullscreen: useFullscreen, width: cfg.width, height: cfg.height });
    } catch (err) {
      logger.error('Failed to create window', err);
      throw err;
    }
  }

  /**
   * Setup window event handlers
   */
  setupWindowEvents() {
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.on('focus', () => {
      logger.debug('Window focused');
    });

    this.mainWindow.on('blur', () => {
      logger.debug('Window blurred');
    });

    // Handle window errors
    this.mainWindow.webContents.on('crashed', () => {
      logger.error('Window content crashed');
      // Optionally restart the window
    });

    this.mainWindow.webContents.on('unresponsive', () => {
      logger.warn('Window became unresponsive');
    });

    this.mainWindow.webContents.on('responsive', () => {
      logger.debug('Window responsive again');
    });
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      // Quit kiosk (Ctrl+Shift+Q)
      if (input.control && input.shift && input.key.toLowerCase() === 'q') {
        logger.log('Admin quit shortcut pressed');
        app.quit();
        return;
      }

      // Open dev tools in development (Ctrl+Shift+D)
      if (constants.isDev && input.control && input.shift && input.key.toLowerCase() === 'd') {
        this.mainWindow.webContents.toggleDevTools();
        return;
      }

      // Open settings (Ctrl+Shift+P)
      if (input.control && input.shift && input.key.toLowerCase() === 'p') {
        logger.log('Settings shortcut pressed');
        this.mainWindow.webContents.send('open-settings');
        return;
      }
    });
  }

  /**
   * Get main window instance
   */
  getWindow() {
    return this.mainWindow;
  }

  /**
   * Check if window exists and is valid
   */
  isValid() {
    return this.mainWindow && !this.mainWindow.isDestroyed();
  }

  /**
   * Send message to renderer
   */
  send(channel, data) {
    if (this.isValid()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

module.exports = new WindowManager();
