'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { sendRawToWindowsPrinter } = require('./winraw');

// path ของ raster-worker.js — ต้องอยู่นอก app.asar เพราะ system node.exe (ไม่ใช่
// Electron) อ่านไฟล์ใน asar ไม่ได้ ตอน packaged จะใช้ไฟล์ที่ extraResources
// คัดลอกออกมาไว้ที่ printer-worker-bundle/ แทน
function resolveWorkerPath() {
  const { app } = require('electron');
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'printer-worker-bundle', 'raster-worker.js');
  }
  return path.join(__dirname, 'raster-worker.js');
}

// หา node.exe ของระบบ (ไม่ใช้ Node ที่ฝังมากับ Electron) สำหรับรัน raster-worker.js
function findNodeExe() {
  const candidates = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const { execSync } = require('child_process');
    const found = execSync('where node', { encoding: 'utf8' }).split(/\r?\n/)[0].trim();
    if (found && fs.existsSync(found)) return found;
  } catch (e) { /* not on PATH */ }
  return null;
}

// ส่ง raw bytes ผ่าน TCP socket
function sendRawTCP(host, port, buffer) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const sock = new net.Socket();
    const timeout = 10000;
    sock.setTimeout(timeout);
    sock.connect(port, host, () => {
      sock.write(buffer, (err) => {
        if (err) { sock.destroy(); return reject(err); }
        // รอสักครู่ให้เครื่องพิมพ์รับข้อมูลครบก่อน destroy
        setTimeout(() => { sock.destroy(); resolve(); }, 300);
      });
    });
    sock.on('error', (err) => { sock.destroy(); reject(err); });
    sock.on('timeout', () => { sock.destroy(); reject(new Error('TCP timeout')); });
  });
}

// =============================================================================
// พิมพ์เป็นภาพ (raster) แทนข้อความ — เครื่องพิมพ์โคลนราคาประหยัดจำนวนมาก
// (เช่น "POS-80" ที่ขายทั่วไป) ไม่มีฟอนต์ไทยฝังในตัวเลย ไม่ว่าจะเลือก code page
// ใดก็จะขึ้นเป็นตัวอักษรภาษาอื่นแทน (เช่นภาษาจีน) — render ด้วยฟอนต์ Sarabun
// เป็นรูปแล้วส่งเป็น ESC/POS raster bit image (GS v 0) จึงไม่พึ่งฟอนต์เครื่องพิมพ์
// =============================================================================
async function buildTicketRasterBuffer(printerCfg, payload) {
  const { renderTicketRasterPNG } = require('./pdf'); // lazy require กัน circular dependency
  const widthDots = Number(printerCfg.rasterWidth) || 576; // 80mm @ ~203dpi

  const png = await renderTicketRasterPNG(payload, widthDots);

  const nodeExe = findNodeExe();
  if (!nodeExe) throw new Error('ไม่พบ Node.js ของระบบ — ติดตั้ง Node.js LTS เพื่อพิมพ์บัตรคิว');

  const tmpDir = os.tmpdir();
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const pngPath = path.join(tmpDir, `ticket_${stamp}.png`);
  const binPath = path.join(tmpDir, `ticket_${stamp}.bin`);
  const workerPath = resolveWorkerPath();

  fs.writeFileSync(pngPath, png);
  try {
    await new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const child = spawn(nodeExe, [workerPath, pngPath, binPath, printerCfg.type || 'epson'], {
        windowsHide: true,
      });
      let stderr = '';
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error('raster-worker failed: ' + (stderr || ('exit code ' + code))));
      });
    });
    return fs.readFileSync(binPath);
  } finally {
    fs.unlink(pngPath, () => {});
    fs.unlink(binPath, () => {});
  }
}

async function printTicket(printerCfg, payload) {
  const profile = payload.profile || {};
  const copies = Number(payload.copies || profile.copies || 1) || 1;
  const ifaceStr = String(printerCfg.interface || '').trim();

  for (let i = 0; i < copies; i++) {
    const buf = await buildTicketRasterBuffer(printerCfg, payload);

    if (/^printer:/i.test(ifaceStr) && process.platform === 'win32') {
      // printer:ชื่อเครื่องพิมพ์ — ส่งผ่าน WinSpool
      const printerName = ifaceStr.replace(/^printer:/i, '');
      await sendRawToWindowsPrinter(printerName, buf);

    } else {
      // tcp://ip:port หรือ ip:port — ส่งผ่าน raw TCP socket
      const tcpMatch = ifaceStr.match(/(?:tcp:\/\/)?([^:]+):(\d+)/);
      if (!tcpMatch) throw new Error(`ไม่รองรับ interface: ${ifaceStr}`);
      const host = tcpMatch[1];
      const port = parseInt(tcpMatch[2], 10);
      await sendRawTCP(host, port, buf);
    }
  }

  return true;
}

function formatTime(iso) {
  if (!iso) return '';
  const t = String(iso).split(' ')[1] || '';
  return t.slice(0, 5);
}

module.exports = { printTicket, formatTime };
