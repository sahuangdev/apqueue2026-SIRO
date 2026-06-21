/**
 * IPC (Inter-Process Communication) handlers
 * Manages communication between main and renderer processes
 */
const { ipcMain, dialog, shell, app } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { printTicket } = require('../printer/escpos');
const { saveTicketPdf } = require('../printer/pdf');
const constants = require('./constants');
const logger = require('./logger');
const config = require('./config');
const windowManager = require('./window');

class IPCManager {
  constructor() {
    this.shutdownTimer = null;
  }

  /**
   * Register all IPC handlers
   */
  register() {
    // Configuration handlers
    ipcMain.handle(constants.IPC_CHANNELS.GET_CONFIG, this.handleGetConfig.bind(this));
    ipcMain.handle(constants.IPC_CHANNELS.GET_APP_CONFIG, this.handleGetAppConfig.bind(this));
    ipcMain.handle(constants.IPC_CHANNELS.SAVE_APP_CONFIG, this.handleSaveAppConfig.bind(this));
    ipcMain.handle(constants.IPC_CHANNELS.APPLY_SERVER_CONFIG, this.handleApplyServerConfig.bind(this));
    ipcMain.handle(constants.IPC_CHANNELS.GET_LAN_IP, this.handleGetLanIp.bind(this));

    ipcMain.handle(constants.IPC_CHANNELS.PRINT_TICKET, this.handlePrintTicket.bind(this));
    ipcMain.handle(constants.IPC_CHANNELS.LIST_PRINTERS, this.handleListPrinters.bind(this));
    ipcMain.handle(constants.IPC_CHANNELS.GET_PRINTER_CONFIG, this.handleGetPrinterConfig.bind(this));
    ipcMain.handle(constants.IPC_CHANNELS.SAVE_PRINTER_CONFIG, this.handleSavePrinterConfig.bind(this));
    ipcMain.handle(constants.IPC_CHANNELS.OPEN_PDF_FOLDER, this.handleOpenPdfFolder.bind(this));

    // App lifecycle
    ipcMain.handle(constants.IPC_CHANNELS.QUIT_APP, () => { logger.log('Quit requested from renderer'); app.quit(); });

    logger.log('IPC handlers registered');
  }

  // ===== Configuration Handlers =====

  async handleGetConfig() {
    try {
      const cfg = config.get();
      return {
        serverUrl: cfg.serverUrl,
        kioskId: cfg.kioskId,
      };
    } catch (err) {
      logger.error('Error in getConfig handler', err);
      throw err;
    }
  }

  async handleGetAppConfig() {
    try {
      const cfg = config.get();
      return {
        serverUrl: cfg.serverUrl,
        kioskId: cfg.kioskId,
        fullscreen: cfg.fullscreen,
        width: cfg.width,
        height: cfg.height,
        printer: cfg.printer,
        shutdownTime: cfg.shutdownTime,
      };
    } catch (err) {
      logger.error('Error in getAppConfig handler', err);
      throw err;
    }
  }

  async handleSaveAppConfig(event, patch) {
    try {
      logger.log('Saving app config', { patch });
      const updated = await config.save(patch);
      return { ok: true, config: updated };
    } catch (err) {
      logger.error('Error saving app config', err);
      return { ok: false, error: err.message };
    }
  }

  async handleApplyServerConfig(event, cfg) {
    try {
      logger.log('Applying server config', { cfg });
      
      if (cfg.shutdownTime) {
        this.scheduleShutdown(cfg.shutdownTime);
      }

      // Other server config handling can be added here
      return { ok: true };
    } catch (err) {
      logger.error('Error applying server config', err);
      return { ok: false, error: err.message };
    }
  }

  /**
   * หา LAN IP ของเครื่องนี้ — ใช้แสดงในหน้าตั้งค่าระบบแทน localhost
   * เพื่อให้แอดมินรู้ว่าเครื่องอื่นในวงเดียวกันต้องต่อที่ IP ไหน
   */
  async handleGetLanIp() {
    try {
      const interfaces = os.networkInterfaces();
      const skip = /vEthernet|VMware|VirtualBox|WSL|Loopback|Hyper-V/i;
      for (const name of Object.keys(interfaces)) {
        if (skip.test(name)) continue;
        for (const info of interfaces[name]) {
          if (info.family === 'IPv4' && !info.internal) {
            return info.address;
          }
        }
      }
      return null;
    } catch (err) {
      logger.error('Error getting LAN IP', err);
      return null;
    }
  }

  // ===== Printer Handlers =====

  async handlePrintTicket(event, payload) {
    try {
      const cfg = this.resolvePrinterConfig();
      logger.log('Print ticket request', { mode: cfg.mode, interface: cfg.interface });

      if (cfg.mode === 'pdf') {
        const res = await saveTicketPdf(cfg, payload);
        return { ok: true, mode: 'pdf', file: res.file };
      } else {
        await printTicket(cfg, payload);
        return { ok: true, mode: 'thermal' };
      }
    } catch (err) {
      logger.error('Error printing ticket', err);
      return {
        ok: false,
        error: err.message || String(err),
        mode: this.resolvePrinterConfig().mode,
      };
    }
  }



  async handleListPrinters() {
    try {
      const window = windowManager.getWindow();
      if (!window) {
        logger.warn('No window available for listing printers');
        return [];
      }

      const list = await window.webContents.getPrintersAsync();
      return list.map((p) => ({
        name: p.name,
        displayName: p.displayName,
        isDefault: p.isDefault,
      }));
    } catch (err) {
      logger.error('Error listing printers', err);
      return [];
    }
  }

  async handleGetPrinterConfig() {
    try {
      const cfg = config.get();
      return cfg.printer || {};
    } catch (err) {
      logger.error('Error getting printer config', err);
      throw err;
    }
  }

  async handleSavePrinterConfig(event, patch) {
    try {
      logger.log('Saving printer config', { patch });
      const cfg = config.get();
      cfg.printer = { ...(cfg.printer || {}), ...patch };
      const updated = await config.save(cfg);
      return { ok: true, config: updated.printer };
    } catch (err) {
      logger.error('Error saving printer config', err);
      return { ok: false, error: err.message };
    }
  }

  async handleOpenPdfFolder() {
    try {
      const cfg = this.resolvePrinterConfig();
      const pdfDir = path.resolve(cfg.pdfDir);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      shell.openPath(pdfDir);
      logger.log('Opened PDF folder', { path: pdfDir });
      return { ok: true, path: pdfDir };
    } catch (err) {
      logger.error('Error opening PDF folder', err);
      return { ok: false, error: err.message };
    }
  }

  // ===== Utilities =====

  /**
   * Resolve printer configuration with defaults
   */
  resolvePrinterConfig() {
    const cfg = config.get();
    const printer = cfg.printer || {};
    let mode = printer.mode;

    // Auto-detect mode if not set
    if (!mode) {
      mode = printer.interface ? 'thermal' : 'pdf';
    }

    return {
      ...printer,
      mode,
      pdfDir: printer.pdfDir || 'tickets-pdf',
    };
  }

  /**
   * Schedule system shutdown at specified time
   */
  scheduleShutdown(hhmm) {
    // Clear existing timer
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = null;
    }

    // Validate time format
    if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) {
      logger.warn('Invalid shutdown time format', { hhmm });
      return;
    }

    try {
      const [h, m] = hhmm.split(':').map(Number);
      const now = new Date();
      const target = new Date(now);
      target.setHours(h, m, 0, 0);

      // If target time has passed, schedule for tomorrow
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }

      const ms = target - now;
      logger.log('Shutdown scheduled', { time: hhmm, delayMs: ms });

      this.shutdownTimer = setTimeout(() => {
        logger.log('Executing scheduled shutdown');
        if (process.platform === 'win32') {
          const { exec } = require('child_process');
          exec('shutdown /s /t 30 /c "ปิดเครื่องอัตโนมัติตามกำหนดเวลา"', (err) => {
            if (err) logger.error('Shutdown command failed', err);
          });
        }
      }, ms);
    } catch (err) {
      logger.error('Error scheduling shutdown', err);
    }
  }

  /**
   * Cancel scheduled shutdown
   */
  cancelShutdown() {
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = null;
      logger.log('Scheduled shutdown cancelled');
    }
  }

  /**
   * Cleanup when app closes
   */
  cleanup() {
    this.cancelShutdown();
  }
}

module.exports = new IPCManager();
