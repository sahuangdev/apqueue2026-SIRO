'use strict';
const { printHtmlSilently } = require('./printer/webprint');

(async () => {
  const printerName = 'POS-80'; // ปรับตามชื่อ printer จริง
  const html = `<h1 style="font-family:'Sarabun', sans-serif; color:red;">สวัสดีไทย</h1>`;
  try {
    const res = await printHtmlSilently(printerName, html, { copies: 1 });
    console.log('Print result:', res);
  } catch (e) {
    console.error('Print error:', e);
  }
})();
