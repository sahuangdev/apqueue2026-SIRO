#!/usr/bin/env node
/**
 * เตรียม raster-worker.js ให้พร้อมแพ็กไปกับ Kiosk.exe
 * คัดลอกไฟล์มาไว้ที่ kiosk/printer-worker-bundle/ (อยู่นอก app.asar ผ่าน
 * extraResources) เพราะรันด้วย system node.exe ที่อ่านไฟล์ในไฟล์ asar ไม่ได้
 * — ติดตั้ง node-thermal-printer ของตัวเองแยกไว้ในนั้นด้วย
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUNDLE_DIR = path.join(__dirname, '..', 'printer-worker-bundle');

console.log('[bundle-printer-worker] Cleaning', BUNDLE_DIR);
if (fs.existsSync(BUNDLE_DIR)) {
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}
fs.mkdirSync(BUNDLE_DIR, { recursive: true });

console.log('[bundle-printer-worker] Copying raster-worker.js');
fs.copyFileSync(
  path.join(__dirname, '..', 'printer', 'raster-worker.js'),
  path.join(BUNDLE_DIR, 'raster-worker.js')
);

fs.writeFileSync(
  path.join(BUNDLE_DIR, 'package.json'),
  JSON.stringify({ name: 'printer-worker-bundle', private: true, dependencies: { 'node-thermal-printer': '^4.4.4' } }, null, 2)
);

console.log('[bundle-printer-worker] Installing dependencies...');
execSync('npm install --omit=dev --no-audit --no-fund', {
  cwd: BUNDLE_DIR,
  stdio: 'inherit',
});

console.log('[bundle-printer-worker] Done ->', BUNDLE_DIR);
