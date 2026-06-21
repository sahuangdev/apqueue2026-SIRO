/**
 * test-thai-codepage.js
 * ทดสอบพิมพ์ภาษาไทยด้วย code page ต่างๆ
 * รัน: node test-thai-codepage.js tcp://192.168.1.50:9100
 *  หรือ: node test-thai-codepage.js printer:ชื่อเครื่องพิมพ์
 */
'use strict';
const net = require('net');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ifaceArg = process.argv[2] || '';
if (!ifaceArg) {
  console.error('Usage: node test-thai-codepage.js tcp://IP:PORT');
  console.error('   or: node test-thai-codepage.js printer:PrinterName');
  process.exit(1);
}

// ---- TIS-620 encoder ----
function encodeTIS620(str) {
  const bytes = [];
  for (const ch of String(str || '')) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x0E00 && cp <= 0x0E7F) bytes.push(cp - 0x0E00 + 0xA0);
    else if (cp < 0x80) bytes.push(cp);
    else bytes.push(0x3F);
  }
  return Buffer.from(bytes);
}

// ---- Build test buffer ----
// ทดสอบ code page: 20, 21, 255, และ ESC R 0x14
function buildTest(codePage, label) {
  const parts = [];
  const LF = 0x0A, ESC = 0x1B, GS = 0x1D;

  parts.push(Buffer.from([ESC, 0x40]));           // ESC @ init
  if (codePage === 'ESC_R_14') {
    parts.push(Buffer.from([ESC, 0x52, 0x14]));   // ESC R 20 (Thai in some models)
  } else if (codePage === 'ESC_R_15') {
    parts.push(Buffer.from([ESC, 0x52, 0x15]));   // ESC R 21
  } else {
    parts.push(Buffer.from([ESC, 0x74, codePage])); // ESC t n
  }
  parts.push(Buffer.from([ESC, 0x61, 0x01]));     // center align
  parts.push(encodeTIS620(`=== ${label} ===`));
  parts.push(Buffer.from([LF]));
  parts.push(encodeTIS620('ทดสอบภาษาไทย'));
  parts.push(Buffer.from([LF]));
  parts.push(encodeTIS620('หมายเลขคิว: A001'));
  parts.push(Buffer.from([LF]));
  parts.push(encodeTIS620('เครื่องฉายรังสี L6'));
  parts.push(Buffer.from([LF, LF]));
  parts.push(Buffer.from([GS, 0x56, 0x01]));      // partial cut
  return Buffer.concat(parts);
}

const tests = [
  [20,        'ESC t 20 (PC874/TIS-620)'],
  [21,        'ESC t 21 (TIS-620 alt)'],
  [255,       'ESC t 255 (THAI some models)'],
  ['ESC_R_14','ESC R 0x14 (Thai R-mode)'],
  ['ESC_R_15','ESC R 0x15 (Thai R-mode alt)'],
];

// ---- Send function ----
async function sendTCP(host, port, buf) {
  return new Promise((resolve, reject) => {
    const sock = new net.Socket();
    sock.setTimeout(8000);
    sock.connect(port, host, () => {
      sock.write(buf, (err) => {
        if (err) { sock.destroy(); return reject(err); }
        setTimeout(() => { sock.destroy(); resolve(); }, 500);
      });
    });
    sock.on('error', reject);
    sock.on('timeout', () => { sock.destroy(); reject(new Error('timeout')); });
  });
}

function sendWinSpool(printerName, buf) {
  const tmp = path.join(os.tmpdir(), `thaitest_${Date.now()}.bin`);
  fs.writeFileSync(tmp, buf);
  const script = `
$bytes = [System.IO.File]::ReadAllBytes('${tmp.replace(/'/g,"''")}')
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class RP {
  [StructLayout(LayoutKind.Sequential)]
  public struct DOCINFO { [MarshalAs(UnmanagedType.LPStr)] public string pDocName; [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile; [MarshalAs(UnmanagedType.LPStr)] public string pDataType; }
  [DllImport("winspool.Drv",EntryPoint="OpenPrinterA",SetLastError=true,CharSet=CharSet.Ansi,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)] public static extern bool OpenPrinter(string s,out IntPtr h,IntPtr p);
  [DllImport("winspool.Drv",EntryPoint="ClosePrinter",SetLastError=true,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)] public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.Drv",EntryPoint="StartDocPrinterA",SetLastError=true,CharSet=CharSet.Ansi,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)] public static extern bool StartDocPrinter(IntPtr h,int l,[In] DOCINFO d);
  [DllImport("winspool.Drv",EntryPoint="EndDocPrinter",SetLastError=true,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)] public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.Drv",EntryPoint="StartPagePrinter",SetLastError=true,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)] public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.Drv",EntryPoint="EndPagePrinter",SetLastError=true,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)] public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.Drv",EntryPoint="WritePrinter",SetLastError=true,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)] public static extern bool WritePrinter(IntPtr h,IntPtr b,int c,out int w);
  public static void Send(string name,byte[] bytes){IntPtr hp;DOCINFO di=new DOCINFO();di.pDocName="TEST";di.pDataType="RAW";if(!OpenPrinter(name,out hp,IntPtr.Zero))throw new Exception("OpenPrinter failed");try{if(!StartDocPrinter(hp,1,di))throw new Exception("StartDoc failed");try{StartPagePrinter(hp);IntPtr p=System.Runtime.InteropServices.Marshal.AllocCoTaskMem(bytes.Length);try{System.Runtime.InteropServices.Marshal.Copy(bytes,0,p,bytes.Length);int w;WritePrinter(hp,p,bytes.Length,out w);}finally{System.Runtime.InteropServices.Marshal.FreeCoTaskMem(p);}EndPagePrinter(hp);}finally{EndDocPrinter(hp);}}finally{ClosePrinter(hp);}}
}
"@
[RP]::Send('${printerName.replace(/'/g,"''")}', $bytes)
`;
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 15000, windowsHide: true });
  fs.unlink(tmp, () => {});
}

(async () => {
  const isTCP = /^tcp:\/\//i.test(ifaceArg) || /^\d+\.\d+/.test(ifaceArg);
  const isPrinter = /^printer:/i.test(ifaceArg);

  for (const [cp, label] of tests) {
    console.log(`Sending: ${label}`);
    const buf = buildTest(cp, label);
    try {
      if (isPrinter) {
        sendWinSpool(ifaceArg.replace(/^printer:/i, ''), buf);
      } else {
        const m = ifaceArg.match(/(?:tcp:\/\/)?([^:]+):(\d+)/);
        await sendTCP(m[1], parseInt(m[2]), buf);
      }
      console.log(`  ✓ sent`);
      // รอสักครู่ระหว่าง test แต่ละอัน
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error(`  ✗ error: ${e.message}`);
    }
  }
  console.log('\nดูที่ slip ที่พิมพ์ออกมา แล้วบอกว่า label ไหนที่อ่านออกภาษาไทย');
})();
