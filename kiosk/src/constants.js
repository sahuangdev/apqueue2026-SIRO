/**
 * Application constants and configuration
 */
module.exports = {
  // Environment
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // IPC Channels
  IPC_CHANNELS: {
    GET_CONFIG: 'get-config',
    GET_APP_CONFIG: 'get-app-config',
    SAVE_APP_CONFIG: 'save-app-config',
    APPLY_SERVER_CONFIG: 'apply-server-config',
    
    // Printer
    PRINT_TICKET: 'print-ticket',
    LIST_PRINTERS: 'list-printers',
    GET_PRINTER_CONFIG: 'get-printer-config',
    SAVE_PRINTER_CONFIG: 'save-printer-config',
    OPEN_PDF_FOLDER: 'open-pdf-folder',
    
    // App lifecycle
    READY_TO_SHOW: 'ready-to-show',
    APP_ERROR: 'app-error',
    APP_CLOSE: 'app-close',
    QUIT_APP: 'quit-app',
  },

  // Default config
  DEFAULT_CONFIG: {
    serverUrl: 'http://localhost:8888',
    kioskId: 'kiosk-1',
    fullscreen: true,
    width: 768,
    height: 1024,
    printer: {},
  },

  // Keyboard shortcuts for admin (production)
  ADMIN_SHORTCUTS: {
    // Ctrl+Shift+Q to quit kiosk
    QUIT: { control: true, shift: true, key: 'q' },
    // Ctrl+Shift+P to open settings
    SETTINGS: { control: true, shift: true, key: 'p' },
    // Ctrl+Shift+D to toggle dev tools (dev only)
    DEV_TOOLS: { control: true, shift: true, key: 'd' },
  },

  // Timeouts (ms)
  TIMEOUTS: {
    CONFIG_LOAD: 5000,
    PRINTER_TIMEOUT: 10000,
    SHUTDOWN_GRACE: 30000,
  },

  // App info
  APP_NAME: 'Queue2026Kiosk',
  APP_ID: 'com.queue2026.kiosk',
  ORGANIZATION: 'Queue 2026',
};
