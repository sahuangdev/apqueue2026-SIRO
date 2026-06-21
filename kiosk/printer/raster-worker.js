'use strict';
// รันแยกจาก Electron main process ด้วย system node.exe — เพราะ printImageBuffer()
// วนลูปต่อพิกเซลหนัก (576x800+ จุด) ถ้ารันใน main process จะ block จนถูก
// watchdog ของ Electron ฆ่าทิ้งกลางทาง (เห็น process ตายเงียบไม่มี error ใดๆ)
// Usage: node raster-worker.js <inputPngPath> <outputBinPath> <printerType>
const fs = require('fs');

async function main() {
  const [, , inputPath, outputPath, typeArg] = process.argv;
  const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
  const TYPE_MAP = {
    epson: PrinterTypes.EPSON,
    star: PrinterTypes.STAR,
    tanca: PrinterTypes.TANCA,
    daruma: PrinterTypes.DARUMA,
    brother: PrinterTypes.BROTHER,
  };

  const png = fs.readFileSync(inputPath);
  const printer = new ThermalPrinter({
    type: TYPE_MAP[(typeArg || 'epson').toLowerCase()] || PrinterTypes.EPSON,
    interface: { execute: async () => {} },
  });
  await printer.printImageBuffer(png);
  // verticalTabAmount default = 2 (feed 4 บรรทัด x 2 = 8 บรรทัดก่อนตัด) ว่างท้ายบัตร
  // มากเกินไป — ลดเหลือ 1 (feed 4 บรรทัด) พอให้ใบมีดตัดไม่โดนตัวอักษร/ภาพ
  printer.cut({ verticalTabAmount: 1 });
  fs.writeFileSync(outputPath, printer.getBuffer());
}

main().catch((e) => {
  process.stderr.write(String((e && e.stack) || e));
  process.exit(1);
});
