/**
 * Logging utility with file and console output
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    this._logDir = null;
    this._logFile = null;
  }

  get logDir() {
    if (!this._logDir) {
      this._logDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(this._logDir)) {
        fs.mkdirSync(this._logDir, { recursive: true });
      }
    }
    return this._logDir;
  }

  get logFile() {
    if (!this._logFile) {
      this._logFile = path.join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    }
    return this._logFile;
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let msg = `[${timestamp}] [${level}] ${message}`;
    if (data) {
      msg += ` ${JSON.stringify(data, null, 2)}`;
    }
    return msg;
  }

  writeToFile(formatted) {
    try {
      fs.appendFileSync(this.logFile, formatted + '\n', 'utf8');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  log(message, data = null) {
    const formatted = this.formatMessage('INFO', message, data);
    console.log(formatted);
    this.writeToFile(formatted);
  }

  warn(message, data = null) {
    const formatted = this.formatMessage('WARN', message, data);
    console.warn(formatted);
    this.writeToFile(formatted);
  }

  error(message, error = null) {
    const data = error instanceof Error 
      ? { message: error.message, stack: error.stack } 
      : error;
    const formatted = this.formatMessage('ERROR', message, data);
    console.error(formatted);
    this.writeToFile(formatted);
  }

  debug(message, data = null) {
    if (!this.isDev) return;
    const formatted = this.formatMessage('DEBUG', message, data);
    console.debug(formatted);
    this.writeToFile(formatted);
  }
}

module.exports = new Logger();
