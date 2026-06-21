/**
 * Server lifecycle management
 * Spawns the bundled Queue 2026 backend (Express + node:sqlite) using the
 * system Node.js runtime, since node:sqlite requires Node 22+ while
 * Electron's embedded Node is older. Skips spawning if a server is
 * already reachable on the configured port (e.g. dev workflow).
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn, execSync } = require('child_process');
const { app } = require('electron');
const logger = require('./logger');

const PORT = 8888;
const HOST = '127.0.0.1';

class ServerManager {
  constructor() {
    this.child = null;
  }

  /**
   * Locate a system Node.js executable (not Electron's embedded one,
   * which lacks node:sqlite support on this Electron version).
   */
  findNodeExe() {
    const candidates = [
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    try {
      const found = execSync('where node', { encoding: 'utf8' }).split(/\r?\n/)[0].trim();
      if (found && fs.existsSync(found)) return found;
    } catch (e) { /* not on PATH */ }
    return null;
  }

  /**
   * Resolve the server entry point depending on packaged vs dev mode.
   */
  resolveServerRoot() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'server-bundle');
    }
    return path.join(__dirname, '..', '..', 'server');
  }

  copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src)) {
        this.copyRecursive(path.join(src, entry), path.join(dest, entry));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  /**
   * Installed app lives under Program Files (read-only at runtime).
   * Logo/media uploads need a writable assets folder, so copy the
   * bundled assets (audio, default folders) into userData once and
   * point the server there via ASSETS_DIR.
   */
  ensureWritableAssetsDir(serverRoot) {
    const assetsDir = path.join(app.getPath('userData'), 'server-data', 'assets');
    if (!fs.existsSync(assetsDir)) {
      const bundledAssets = path.join(serverRoot, 'assets');
      if (fs.existsSync(bundledAssets)) {
        this.copyRecursive(bundledAssets, assetsDir);
      } else {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
    }
    return assetsDir;
  }

  isPortOpen() {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host: HOST, port: PORT, timeout: 800 });
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('timeout', () => { socket.destroy(); resolve(false); });
      socket.once('error', () => resolve(false));
    });
  }

  async start() {
    if (await this.isPortOpen()) {
      logger.log('Server already running, skipping spawn', { port: PORT });
      return;
    }

    const serverRoot = this.resolveServerRoot();
    const entry = path.join(serverRoot, 'src', 'index.js');
    if (!fs.existsSync(entry)) {
      logger.error('Server entry not found, cannot auto-start', { entry });
      return;
    }

    const nodeExe = this.findNodeExe();
    if (!nodeExe) {
      logger.error('System Node.js not found, cannot auto-start server. Install Node.js LTS.');
      return;
    }

    const dbDir = path.join(app.getPath('userData'), 'server-data');
    fs.mkdirSync(dbDir, { recursive: true });

    const env = { ...process.env, PORT: String(PORT), HOST: '0.0.0.0', DB_PATH: path.join(dbDir, 'queue.db') };
    if (app.isPackaged) {
      env.ASSETS_DIR = this.ensureWritableAssetsDir(serverRoot);
    }

    logger.log('Starting bundled server', { entry, nodeExe, dbDir, assetsDir: env.ASSETS_DIR });

    this.child = spawn(nodeExe, ['--no-warnings=ExperimentalWarning', entry], {
      cwd: serverRoot,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.child.stdout.on('data', (d) => logger.log('[server] ' + d.toString().trim()));
    this.child.stderr.on('data', (d) => logger.warn('[server] ' + d.toString().trim()));
    this.child.on('exit', (code) => {
      logger.log('Server process exited', { code });
      this.child = null;
    });
    this.child.on('error', (err) => logger.error('Failed to spawn server process', err));
  }

  stop() {
    if (this.child) {
      logger.log('Stopping bundled server', { pid: this.child.pid });
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${this.child.pid} /T /F`);
        } else {
          this.child.kill('SIGTERM');
        }
      } catch (e) {
        logger.warn('Error stopping server process', e);
      }
      this.child = null;
    }

    // กวาด node.exe ที่หลงเหลือทั้งหมด (เช่น raster-worker.js ตอนพิมพ์ที่ยังไม่จบ,
    // หรือ server child ที่หลุดการติดตามตอนแอป crash) — กันไม่ให้มี process ค้าง
    // จับ port 8888 ไว้แบบครึ่งตายจนเปิดแอปครั้งต่อไปเชื่อม server ไม่ได้
    if (process.platform === 'win32') {
      try {
        execSync('taskkill /F /IM node.exe /T', { stdio: 'ignore' });
        logger.log('Killed all lingering node.exe processes on quit');
      } catch (e) {
        // exit code ไม่ใช่ 0 ก็ต่อเมื่อไม่มี node.exe เหลืออยู่แล้ว — ไม่ต้อง warn
      }
    }
  }
}

module.exports = new ServerManager();
