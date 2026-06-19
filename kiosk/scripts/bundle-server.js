#!/usr/bin/env node
/**
 * เตรียม server ให้พร้อมแพ็กไปกับ Kiosk.exe
 * คัดลอกซอร์ส server (ไม่รวม data/node_modules) มาไว้ที่ kiosk/server-bundle/
 * แล้วติดตั้ง dependencies เฉพาะ production เอง (เพราะตอน build แพ็กเกจ
 * เป็น standalone จะไม่มี node_modules ที่ hoist มาจาก root ให้ใช้)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SERVER_SRC = path.join(__dirname, '..', '..', 'server');
const BUNDLE_DIR = path.join(__dirname, '..', 'server-bundle');

const INCLUDE = ['src', 'public', 'assets', 'package.json'];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('[bundle-server] Cleaning', BUNDLE_DIR);
if (fs.existsSync(BUNDLE_DIR)) {
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}
fs.mkdirSync(BUNDLE_DIR, { recursive: true });

for (const item of INCLUDE) {
  const src = path.join(SERVER_SRC, item);
  const dest = path.join(BUNDLE_DIR, item);
  if (fs.existsSync(src)) {
    console.log('[bundle-server] Copying', item);
    copyRecursive(src, dest);
  }
}

console.log('[bundle-server] Installing production dependencies...');
execSync('npm install --omit=dev --no-audit --no-fund', {
  cwd: BUNDLE_DIR,
  stdio: 'inherit',
});

console.log('[bundle-server] Done ->', BUNDLE_DIR);
