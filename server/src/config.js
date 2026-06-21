'use strict';
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = process.env.ASSETS_DIR || path.join(ROOT, 'assets');

module.exports = {
  PORT: Number(process.env.PORT) || 8888,
  HOST: process.env.HOST || '0.0.0.0',
  DB_PATH: process.env.DB_PATH || path.join(ROOT, 'data', 'queue.db'),
  PUBLIC_DIR: path.join(ROOT, 'public'),
  ASSETS_DIR,
  LOGO_DIR: path.join(ASSETS_DIR, 'logos'),
  MEDIA_DIR: path.join(ASSETS_DIR, 'media'),
  AUDIO_DIR: path.join(ASSETS_DIR, 'audio'),
  ROOT,
};
