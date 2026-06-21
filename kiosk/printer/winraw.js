'use strict';
/**
 * ส่งข้อมูล ESC/POS แบบ raw bytes ไปยังเครื่องพิมพ์ที่ติดตั้งใน Windows
 * โดยตรงผ่าน WinSpool API (ไม่ต้องพึ่ง native module เช่น `printer`/`electron-printer`
 * ซึ่งต้อง compile ใหม่ให้ตรงกับ Electron ABI — ยุ่งยากเกินไปสำหรับแอปนี้)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function psQuote(s) {
  return String(s).replace(/'/g, "''");
}

function sendRawToWindowsPrinter(printerName, buffer) {
  const tmpFile = path.join(os.tmpdir(), `escpos_${Date.now()}_${Math.random().toString(36).slice(2)}.bin`);
  fs.writeFileSync(tmpFile, buffer);

  const script = `
$bytes = [System.IO.File]::ReadAllBytes('${psQuote(tmpFile)}')
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential)]
  public struct DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static void SendBytesToPrinter(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "ESC/POS Raw Document";
    di.pDataType = "RAW";
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
      throw new Exception("OpenPrinter failed for '" + printerName + "' (Win32 error " + Marshal.GetLastWin32Error() + ")");
    try {
      if (!StartDocPrinter(hPrinter, 1, di))
        throw new Exception("StartDocPrinter failed (Win32 error " + Marshal.GetLastWin32Error() + ")");
      try {
        if (!StartPagePrinter(hPrinter))
          throw new Exception("StartPagePrinter failed (Win32 error " + Marshal.GetLastWin32Error() + ")");
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        try {
          Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
          int written;
          if (!WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out written))
            throw new Exception("WritePrinter failed (Win32 error " + Marshal.GetLastWin32Error() + ")");
        } finally {
          Marshal.FreeCoTaskMem(pUnmanagedBytes);
        }
        EndPagePrinter(hPrinter);
      } finally {
        EndDocPrinter(hPrinter);
      }
    } finally {
      ClosePrinter(hPrinter);
    }
  }
}
"@
[RawPrinterHelper]::SendBytesToPrinter('${psQuote(printerName)}', $bytes)
`;

  try {
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      timeout: 15000,
      windowsHide: true,
    });
  } finally {
    fs.unlink(tmpFile, () => {});
  }
}

module.exports = { sendRawToWindowsPrinter };
