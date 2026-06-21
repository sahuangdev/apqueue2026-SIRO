#!/usr/bin/env node
/**
 * ลบ installer เวอร์ชันเก่าทั้งหมดใน dist/ เก็บไว้แค่เวอร์ชันล่าสุด (ตาม package.json
 * ปัจจุบัน ซึ่ง prebuild bump ให้แล้วก่อน build) — กันไฟล์ .exe สะสมจนเปลืองพื้นที่
 */
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const { version } = require('../package.json');
const productName = require('../package.json').build.productName;

if (!fs.existsSync(DIST_DIR)) process.exit(0);

const keepPrefix = `${productName} Setup ${version}.exe`;

for (const name of fs.readdirSync(DIST_DIR)) {
  const isInstallerFile = /^.+ Setup .+\.exe(\.blockmap)?$/.test(name);
  if (!isInstallerFile) continue; // เว้น win-unpacked/, builder-*.yml ไว้
  if (name === keepPrefix || name === keepPrefix + '.blockmap') continue;

  const full = path.join(DIST_DIR, name);
  fs.rmSync(full, { force: true });
  console.log('[clean-old-builds] Removed old build:', name);
}
