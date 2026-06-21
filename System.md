# APQueue 2026 — เอกสารระบบ (System Documentation)

ระบบบริหารคิวผู้ป่วย แผนกรังสีรักษา (Radiation Oncology) — Siriraj Radiation Oncology (SiRO)

ประกอบด้วย 2 ส่วนหลัก:

| ส่วน | เทคโนโลยี | หน้าที่ |
|---|---|---|
| **Server** | Node.js + Express + Socket.io + `node:sqlite` | API, ฐานข้อมูล, หน้าเว็บแอดมินทั้งหมด |
| **Kiosk** | Electron | ตู้กดบัตรคิวสัมผัสหน้าจอ + พิมพ์บัตรคิวจริง |

Kiosk เวอร์ชัน packaged (`Queue2026Kiosk.exe`) จะ **สตาร์ท Server ให้อัตโนมัติ** ภายในตัวเอง ไม่ต้องเปิดสองโปรแกรมแยกกัน

---

## 1. ความต้องการของระบบ (Prerequisites)

| รายการ | เวอร์ชัน | หมายเหตุ |
|---|---|---|
| Windows | 10/11 | ทดสอบบน Windows 10 |
| **Node.js** | **LTS (22+)** | **ต้องติดตั้งแยกแม้ใช้ตัว Kiosk.exe ที่ build แล้ว** เพราะ server ใช้ `node:sqlite` ซึ่งต้องการ Node 22+ และ Electron มี Node ฝังมาเวอร์ชันเก่ากว่านั้น |
| เครื่องพิมพ์ใบเสร็จ 80mm | ESC/POS (USB) | เช่น POS-80 — ติดตั้ง driver ของ Windows ให้เรียบร้อยก่อน |

ติดตั้ง Node.js (ถ้ายังไม่มี):
```powershell
winget install OpenJS.NodeJS.LTS
```
> หลังติดตั้งต้อง**เปิด terminal ใหม่**เพื่อให้ `node`/`npm` เข้า PATH

---

## 2. วิธีติดตั้ง (Installation)

### 2.1 สำหรับ Deploy ใช้งานจริง (แนะนำ)

1. ติดตั้ง Node.js LTS ก่อน (ดูหัวข้อ 1)
2. ดับเบิลคลิก `kiosk\dist\Queue2026Kiosk Setup x.x.x.exe`
3. ตั้งค่าตามตัวติดตั้ง (เลือกโฟลเดอร์ติดตั้งได้ — ค่าเริ่มต้น `C:\Program Files\Queue2026Kiosk`)
4. เปิดแอปจาก Desktop shortcut — ระบบจะ:
   - สตาร์ท Server ให้อัตโนมัติ (ใช้ Node.js ของระบบที่ติดตั้งไว้)
   - เก็บฐานข้อมูล/log ไว้ที่ `%APPDATA%\kiosk\`
   - เปิดหน้าจอ Kiosk แบบ fullscreen

### 2.2 สำหรับพัฒนา/แก้ไขโค้ด (Dev environment)

```bash
git clone <repo>
cd andamnadev
npm install          # ติดตั้ง dependencies ทุก workspace (server + kiosk)
```

โครงสร้าง npm workspaces:
```
andamnadev/
├── server/     ← Backend (Express + Socket.io)
├── kiosk/      ← Electron Kiosk app
└── package.json  ← root, รวมคำสั่งทั้งสอง workspace
```

---

## 3. วิธีรันระบบ (Running)

### 3.1 โหมดพัฒนา (Dev)

รันจาก **root** ของโปรเจกต์ (`andamnadev/`):

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run start` | รัน Server อย่างเดียว (port 8888) |
| `npm run dev` | รัน Server โหมด dev (auto-restart เมื่อโค้ดเปลี่ยน) |
| `npm run kiosk` | รัน Kiosk (production mode, จะ auto-start server เอง) |
| `npm run kiosk:dev` | รัน Kiosk โหมด dev (เปิด DevTools ได้ด้วย `Ctrl+Shift+D`) |
| `npm run start:all` | รัน Server (หน้าต่างใหม่) + Kiosk พร้อมกัน |
| `npm run seed` | สร้างข้อมูลตั้งต้นในฐานข้อมูล (ห้อง, time slot, admin user) |

> **ELECTRON_RUN_AS_NODE**: ถ้ารันจาก VS Code terminal แล้ว Electron ไม่เปิดหน้าต่าง (ทำงานเป็น Node เฉยๆ) ให้เคลียร์ตัวแปรนี้ก่อน — script `start`/`dev` ของ kiosk จัดการให้อัตโนมัติแล้ว

### 3.2 โหมดใช้งานจริง (Production)

เปิดแอป **Queue2026Kiosk** จาก Desktop/Start Menu shortcut — ไม่ต้องรันคำสั่งอะไรเพิ่ม

### 3.3 หน้าเว็บแอดมิน (เปิดด้วย Browser)

| หน้า | URL | ใช้ทำอะไร |
|---|---|---|
| Dashboard | `http://localhost:8888/` | ภาพรวมระบบ, สถิติ realtime |
| **เรียกคิว** | `http://localhost:8888/calling` | หน้าที่เจ้าหน้าที่ใช้เรียกคิวผู้ป่วย |
| จอแสดงผล | `http://localhost:8888/display` | จอทีวีแสดงเลขคิวที่กำลังเรียก (เปิดเต็มจอ) |
| ออกบัตรคิว (web) | `http://localhost:8888/kiosk-web` | เวอร์ชันเว็บของหน้า Kiosk (ทดสอบโดยไม่ต้องเปิด Electron) |
| รายงาน | `http://localhost:8888/reports` | สถิติ/รายงานการใช้งาน |
| **ตั้งค่า** | `http://localhost:8888/settings` | ตั้งค่าห้อง, time slot, โปรไฟล์บัตรคิว, โลโก้ |

**Login เริ่มต้น:** `admin` / `123456`

**เข้าจากเครื่องอื่นในวง LAN เดียวกัน:** เปลี่ยน `localhost` เป็น IP เครื่อง เช่น `http://192.168.1.108:8888/calling`
(ดูวิธีหา IP และเปิด Firewall ในหัวข้อ 6.3)

---

## 4. การทดสอบ (Testing)

### 4.1 ทดสอบ Server (API)
```bash
curl http://localhost:8888/api/rooms
curl http://localhost:8888/api/kiosk/config
```
ควรได้ HTTP 200 พร้อม JSON

### 4.2 ทดสอบหน้า Kiosk
1. เปิด Kiosk แล้วดูว่าไม่มีแถบสีแดง "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" ขึ้น
2. กดเลือกห้อง → เลือกช่วงเวลา → ดูว่าออกบัตรคิว/สั่งพิมพ์ได้

### 4.3 ทดสอบเครื่องพิมพ์
1. แตะมุม**ขวาบน 5 ครั้ง** เพื่อเปิดหน้า "ตั้งค่าระบบ Kiosk"
2. เลือกเครื่องพิมพ์จาก dropdown แล้วกด **"ทดสอบพิมพ์"**
3. ควรเห็นข้อความ "ส่งพิมพ์แล้ว ✓" และได้ใบเสร็จทดสอบจริง (ภาษาไทยถูกต้อง)

### 4.4 จุดแตะลับ (Hidden corner taps)

| มุม | แตะ | ผล |
|---|---|---|
| ซ้ายบน | 5 ครั้ง | เปิดหน้าต่างยืนยัน **ปิดโปรแกรม** |
| ขวาบน | 5 ครั้ง | เปิดหน้า **ตั้งค่าระบบ Kiosk** (IP server / เครื่องพิมพ์ / เวลาปิดเครื่อง) |

คีย์ลัดสำหรับแอดมิน (คีย์บอร์ดเสียบ):
- `Ctrl+Shift+P` — เปิดหน้าตั้งค่าเครื่องพิมพ์ขั้นสูง
- `Ctrl+Shift+Q` — ปิดโปรแกรมทันที
- `Ctrl+Shift+D` — เปิด DevTools (เฉพาะ dev mode)

---

## 5. Flow การทำงานของระบบ (Architecture & Workflow)

### 5.1 ภาพรวมการเชื่อมต่อ

```
┌─────────────────────────────────────────────────┐
│                  Queue2026Kiosk.exe              │
│  ┌─────────────┐        ┌──────────────────────┐ │
│  │  Electron    │ spawn  │  Server (child proc) │ │
│  │  Main Process│───────▶│  node.exe (ระบบ)      │ │
│  │  + Renderer  │        │  Express :8888        │ │
│  └─────┬────────┘        └─────────┬────────────┘ │
│        │ HTTP/Socket.io            │              │
│        └────────────────▶◀─────────┘              │
└─────────────────────────────────────────────────┘
          ▲                          ▲
          │ Browser (LAN)            │ ESC/POS raster
   เจ้าหน้าที่/จอแสดงผล                  ▼
   /calling /display /settings    เครื่องพิมพ์ใบเสร็จ
```

**ทำไม Server ต้องรันด้วย Node.js ของระบบ แยกจาก Electron?**
Server ใช้ `node:sqlite` (ต้องการ Node 22+) แต่ Electron 31 ฝัง Node เวอร์ชันเก่ากว่ามาให้ — จึงต้อง spawn เป็น **child process แยก** โดยใช้ `node.exe` ที่ติดตั้งในระบบจริง (`kiosk/src/server-manager.js`)

### 5.2 Flow การออกบัตรคิว (Kiosk → พิมพ์จริง)

```
ผู้ป่วยเลือกห้อง → เลือกช่วงเวลา
        │
        ▼
POST /api/queues  (สร้างเลขคิวในฐานข้อมูล)
        │
        ▼
Kiosk เรียก window.kioskAPI.printTicket(...)
        │
        ▼
ตรวจ printer.mode ใน config
   ├─ mode: "pdf"     → render HTML → บันทึกไฟล์ PDF ลง tickets-pdf/
   └─ mode: "thermal" → render HTML (ฟอนต์ Sarabun) → capture เป็นภาพ PNG
                           │
                           ▼
                    spawn child process (node.exe)
                    แปลงภาพ → ESC/POS raster command (GS v 0)
                           │
                           ▼
                    ส่ง raw bytes ผ่าน WinSpool API (เครื่องพิมพ์ USB)
                    หรือ TCP socket (เครื่องพิมพ์ระบบเครือข่าย)
```

**ทำไมพิมพ์เป็น "ภาพ" ไม่ใช่ "ตัวอักษร"?**
เครื่องพิมพ์ใบเสร็จราคาประหยัด/โคลนจากจีน (เช่น POS-80) ส่วนใหญ่**ไม่มีฟอนต์ไทยฝังในตัวเครื่อง** — ถ้าส่งเป็นตัวอักษรไทยตรงๆ จะขึ้นเป็นภาษาอื่นแทน (เช่นจีน) ไม่ว่าจะตั้ง code page ใดก็ตาม จึง render เป็นภาพด้วยฟอนต์ Sarabun ในเครื่องแล้วส่งเป็นจุดภาพ (raster) ตรงๆ รับประกันว่าตัวอักษรไทยจะถูกต้องเสมอ

**ทำไมต้องแยก process สำหรับแปลงภาพ?**
การแปลงภาพ→ESC/POS ต้องวนลูปทีละพิกเซล (หลักแสนรอบ) ถ้ารันตรงใน Electron main process จะถูกระบบ watchdog ฆ่าทิ้งกลางทาง จึงแยกไปรันใน Node.js child process ต่างหาก (`kiosk/printer/raster-worker.js`)

### 5.3 Flow การเรียกคิว (เจ้าหน้าที่)

```
เจ้าหน้าที่เปิด /calling (browser)
        │
        ▼
กดเรียกคิว → POST /api/queues/:id/call
        │
        ▼
Server บันทึกสถานะ + emit Socket.io event "queue:update"
        │
        ▼
ทุก client ที่เชื่อมต่ออยู่ (จอแสดงผล /display, หน้าอื่นๆ) อัปเดตทันที
        │
        ▼
จอแสดงผลเล่นเสียงประกาศ (ไฟล์เสียงใน assets/audio/th/)
```

### 5.4 การตั้งค่าที่ Sync ผ่าน Socket.io

เมื่อแอดมินบันทึกการตั้งค่า (โปรไฟล์บัตรคิว, ห้อง, time slot) ที่หน้า `/settings` → server emit `settings:changed` → Kiosk และหน้าอื่นๆที่เปิดอยู่จะดึงค่าใหม่ทันที ไม่ต้อง refresh เอง

---

## 6. การ Build / Deploy

### 6.1 Build installer ใหม่

รันจาก root:
```bash
npm run build
```

ขั้นตอนที่เกิดขึ้นอัตโนมัติ (เรียงตามลำดับ):
1. **prebuild** — bump เลขเวอร์ชัน patch (`1.0.x` → `1.0.x+1`)
2. **bundle-server** — copy `server/` (ไม่รวม `data/`) + `npm install --omit=dev` แยกชุดไปไว้ที่ `kiosk/server-bundle/`
3. **bundle-printer-worker** — copy `raster-worker.js` + ติดตั้ง `node-thermal-printer` แยกไว้ที่ `kiosk/printer-worker-bundle/`
4. **electron-builder** — สร้างไฟล์ `.exe` (NSIS installer)
5. **postbuild** — ลบไฟล์ installer เวอร์ชันเก่าทั้งหมดใน `dist/` เหลือแค่ตัวล่าสุด

ผลลัพธ์: `kiosk\dist\Queue2026Kiosk Setup x.x.x.exe`

> **ทำไมต้อง bundle server/printer-worker แยก?** เพราะไฟล์เหล่านี้ถูกรันด้วย **system node.exe** (ไม่ใช่ Electron) ซึ่งอ่านไฟล์ใน `app.asar` ไม่ได้ — ต้องเอาออกมาไว้นอก asar ผ่าน `extraResources`

### 6.2 Build แบบไม่สร้าง installer (ทดสอบเร็ว)
```bash
cd kiosk
npm run build:dir
```
ได้โฟลเดอร์ `kiosk\dist\win-unpacked\` รันตรงได้โดยไม่ต้องติดตั้ง

### 6.3 เปิดให้เข้าถึงจากเครื่องอื่นในวง LAN

Server bind `0.0.0.0` อยู่แล้ว (รับทุก IP) แต่ต้องเปิด Firewall เพิ่ม — รันใน **PowerShell แบบ Administrator**:
```powershell
New-NetFirewallRule -DisplayName "APQueue" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8888 -Profile Private,Domain
```

หา IP เครื่อง:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" }
```
หรือเปิดหน้า "ตั้งค่าระบบ Kiosk" (แตะมุมขวาบน 5 ครั้ง) — ช่อง "IP / ที่อยู่เซิร์ฟเวอร์" จะแสดง LAN IP ให้อัตโนมัติ

---

## 7. การแก้ปัญหาที่พบบ่อย (Troubleshooting)

| ปัญหา | สาเหตุที่พบบ่อย | วิธีแก้ |
|---|---|---|
| Kiosk ขึ้น "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" | ไม่ได้ติดตั้ง Node.js บนเครื่อง / มี `node.exe` ค้างจับ port 8888 | ติดตั้ง Node.js LTS, หรือ kill `node.exe` ทั้งหมดแล้วเปิด Kiosk ใหม่ |
| พิมพ์ไม่ออก / หน้าขาว | เครื่องพิมพ์ driver ไม่รองรับ GDI printing | ใช้ raster ESC/POS (ระบบปัจจุบันใช้วิธีนี้อยู่แล้ว) |
| พิมพ์ออกแต่เป็นภาษาอื่น (เช่นจีน) | เครื่องพิมพ์ไม่มีฟอนต์ไทยในตัว | ระบบปัจจุบันพิมพ์เป็นภาพอยู่แล้วจึงไม่เจอปัญหานี้ — ถ้ายังเจอ ตรวจว่า build เป็นเวอร์ชันล่าสุด |
| ตั้งค่าระยะ/gap แล้วไม่มีผล (ค่าติดลบ) | เวอร์ชันเก่ามีบั๊ก clamp ค่าต่ำสุดไว้ที่ 1px | อัปเดตเป็นเวอร์ชันล่าสุด |
| Build แล้ว `node_modules` พัง / npm install ค้าง | เครือข่ายช้า/ไฟล์ค้างจาก build ก่อนหน้า | ลบ `kiosk/server-bundle`, `kiosk/printer-worker-bundle` แล้ว build ใหม่ |
| Firewall block การเข้าจากเครื่องอื่น | ไม่ได้เปิด inbound rule | รันคำสั่งในหัวข้อ 6.3 แบบ Administrator |

---

## 8. โครงสร้างไฟล์สำคัญ (Reference)

```
andamnadev/
├── server/
│   ├── src/
│   │   ├── index.js          # entry point, ตั้ง Express + Socket.io
│   │   ├── config.js         # PORT, DB_PATH, ASSETS_DIR (override ผ่าน env ได้)
│   │   ├── routes/           # API routes (queues, rooms, profiles, settings, ...)
│   │   └── db/                # schema.sql, connection.js (node:sqlite)
│   └── public/                # หน้าเว็บทั้งหมด (calling, display, settings, kiosk-web, ...)
├── kiosk/
│   ├── main.js                 # Electron entry point
│   ├── preload.js               # IPC bridge (contextBridge)
│   ├── src/
│   │   ├── server-manager.js   # spawn/kill bundled server child process
│   │   ├── ipc-handlers.js     # IPC handlers ทั้งหมด (print, config, ฯลฯ)
│   │   ├── config.js           # โหลด/บันทึก config.json ของ Kiosk
│   │   └── window.js           # สร้างหน้าต่าง BrowserWindow
│   ├── printer/
│   │   ├── escpos.js           # ส่งคำสั่งพิมพ์ raster ไปเครื่องพิมพ์
│   │   ├── raster-worker.js    # child process แปลงภาพ→ESC/POS
│   │   ├── pdf.js               # render HTML บัตรคิว + บันทึก PDF
│   │   └── winraw.js            # ส่ง raw bytes ผ่าน Windows WinSpool API
│   ├── renderer/                # หน้าจอ Kiosk (HTML/CSS/JS)
│   └── scripts/                  # bundle-server.js, bundle-printer-worker.js, clean-old-builds.js
└── package.json                  # root — รวมคำสั่งทุก workspace
```
