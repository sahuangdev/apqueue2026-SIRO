/**
 * Configuration management
 * Handles loading, validating, and persisting app configuration
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const logger = require('./logger');
const { DEFAULT_CONFIG } = require('./constants');

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config.json');
    this.samplePath = path.join(__dirname, '..', 'config.sample.json');
    this._userDataPath = null;
    this.config = null;
  }

  get userDataPath() {
    if (!this._userDataPath) {
      this._userDataPath = path.join(app.getPath('userData'), 'config.json');
    }
    return this._userDataPath;
  }

  /**
   * Load configuration from files in order of priority (highest wins):
   * 1. userData (user-saved settings via UI)
   * 2. config.json  (deployment override)
   * 3. config.sample.json (template / default deployment values)
   * 4. DEFAULT_CONFIG (code defaults, lowest priority)
   */
  load() {
    let config = { ...DEFAULT_CONFIG };

    // Base: config.sample.json (deployment template)
    if (fs.existsSync(this.samplePath)) {
      try {
        const sample = JSON.parse(fs.readFileSync(this.samplePath, 'utf8'));
        config = this.merge(config, sample);
        logger.log('Loaded config from sample file', { path: this.samplePath });
      } catch (err) {
        logger.warn('Failed to load sample config', err);
      }
    }

    // Override: local config.json (specific deployment)
    if (fs.existsSync(this.configPath)) {
      try {
        const local = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        config = this.merge(config, local);
        logger.log('Loaded config from local file', { path: this.configPath });
      } catch (err) {
        logger.warn('Failed to load local config', err);
      }
    }

    // Highest priority: userData (saved by user via settings UI)
    if (fs.existsSync(this.userDataPath)) {
      try {
        const userData = JSON.parse(fs.readFileSync(this.userDataPath, 'utf8'));
        config = this.merge(config, userData);
        logger.log('Loaded config from user data', { path: this.userDataPath });
      } catch (err) {
        logger.warn('Failed to load user config', err);
      }
    }

    this.config = this.validate(config);
    logger.log('Configuration loaded successfully', { 
      serverUrl: this.config.serverUrl,
      kioskId: this.config.kioskId,
      fullscreen: this.config.fullscreen,
    });

    return this.config;
  }

  /**
   * Merge config objects, preferring values from source
   */
  merge(target, source) {
    const result = { ...target };
    if (source && typeof source === 'object') {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.merge(result[key] || {}, source[key]);
        } else if (source[key] !== undefined && source[key] !== null) {
          result[key] = source[key];
        }
      }
    }
    return result;
  }

  /**
   * Validate and normalize configuration
   */
  validate(config) {
    const validated = { ...config };

    // Validate serverUrl
    if (typeof validated.serverUrl !== 'string' || !validated.serverUrl) {
      validated.serverUrl = DEFAULT_CONFIG.serverUrl;
    }

    // Validate kioskId
    if (typeof validated.kioskId !== 'string' || !validated.kioskId) {
      validated.kioskId = DEFAULT_CONFIG.kioskId;
    }

    // Validate dimensions
    validated.width = Math.max(480, parseInt(validated.width) || DEFAULT_CONFIG.width);
    validated.height = Math.max(600, parseInt(validated.height) || DEFAULT_CONFIG.height);

    // Validate fullscreen
    validated.fullscreen = validated.fullscreen === true;

    // Validate printer config
    if (!validated.printer || typeof validated.printer !== 'object') {
      validated.printer = {};
    }
    if (!validated.printer.pdfDir) {
      validated.printer.pdfDir = 'tickets-pdf';
    }

    return validated;
  }

  /**
   * Get current config
   */
  get() {
    if (!this.config) {
      this.load();
    }
    return this.config;
  }

  /**
   * Update and persist configuration
   */
  async save(patch) {
    try {
      this.config = this.merge(this.config || {}, patch);
      this.config = this.validate(this.config);
      
      // Ensure directory exists
      const dir = path.dirname(this.userDataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.userDataPath, JSON.stringify(this.config, null, 2), 'utf8');
      logger.log('Configuration saved', { path: this.userDataPath });
      return this.config;
    } catch (err) {
      logger.error('Failed to save configuration', err);
      throw err;
    }
  }

  /**
   * Get specific configuration value
   */
  getValue(path, defaultValue = null) {
    const parts = path.split('.');
    let value = this.config;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }
}

module.exports = new ConfigManager();
