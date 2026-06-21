const { BrowserWindow } = require('electron');
const path = require('path');

// Resolve absolute path to Sarabun font file (Regular) used for Thai rendering
const sarabunPath = path.join(__dirname, '..', 'renderer', 'fonts', 'Sarabun-Regular.ttf');

/**
 * Wait for a webContents event, with a millisecond timeout fallback.
 * Never hangs — resolves either when the event fires or when timeout expires.
 */
function waitForEvent(webContents, eventName, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    webContents.once(eventName, () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Print given HTML string to a Windows printer silently via webContents (GDI).
 * Measures actual content height and sets pageSize to match 80mm thermal paper.
 *
 * @param {string} printerName  Windows printer name (e.g. "POS-80")
 * @param {string} html         Raw HTML to render (fragment or full document).
 * @param {object} [options]    Optional: copies (default 1).
 */
async function printHtmlSilently(printerName, html, options = {}) {
  const copies = Number(options.copies) || 1;

  const win = new BrowserWindow({
    show: false,
    width: 320,
    height: 1200,
    // offscreen: false — required for webContents.print() to work reliably
    webPreferences: { offscreen: false, sandbox: false },
  });

  // Wrap HTML fragment with full document + Sarabun font + zero page margins
  const fullHtml = /\<\s*html/i.test(html)
    ? html
    : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @font-face {font-family:'Sarabun'; src:url('file:///${sarabunPath.replace(/\\/g, '/')}') format('truetype');}
        @page {margin:0;}
        html,body {font-family:'Sarabun',sans-serif; margin:0; padding:0;}
      </style></head><body>${html}</body></html>`;

  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));

    // Wait for dom-ready with 3s fallback (data: URLs may not fire did-finish-load)
    await waitForEvent(win.webContents, 'dom-ready', 3000);

    // Extra delay for font rendering
    await new Promise(r => setTimeout(r, 600));

    // Measure actual content height so page size matches ticket length exactly
    let contentPx = 600;
    try {
      contentPx = await win.webContents.executeJavaScript(
        'Math.ceil(document.body.getBoundingClientRect().height)'
      );
    } catch (e) { /* use default */ }

    // 80mm thermal paper — 1mm = 1000 microns, screen DPI = 96
    const MICRON_PER_PX = 25400 / 96;
    const widthMicron = 80 * 1000;   // 80 mm
    const heightMicron = Math.max(
      Math.round((Number(contentPx) || 600) * MICRON_PER_PX),
      60 * 1000  // minimum 60 mm
    );

    await new Promise((resolve, reject) => {
      // Safety net: reject if print callback never fires within 30s
      const printTimeout = setTimeout(
        () => reject(new Error('print timed out after 30s')),
        30000
      );

      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printerName,
          copies,
          pageSize: { width: widthMicron, height: heightMicron },
          margins: { marginType: 'printableArea' },
        },
        (success, failureReason) => {
          clearTimeout(printTimeout);
          if (success) resolve();
          else reject(new Error(failureReason || 'print failed'));
        }
      );
    });

    return { ok: true };
  } finally {
    win.destroy();
  }
}

module.exports = { printHtmlSilently };
