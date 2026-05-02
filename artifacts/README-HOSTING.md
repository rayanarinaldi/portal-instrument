# Dongjin Hosting Starter - Vercel + Render + PostgreSQL Online

Paket ini untuk mulai coba hosting project Dongjin.

Target struktur project lokal:

```txt
E:\WEB INSTRUMENT\Form-Data-Entry\artifacts\
  kalibrasi-dongjin\
  api-server\
```

Rekomendasi hosting:

```txt
Frontend : Vercel
Backend  : Render
Database : Supabase / Neon / Railway PostgreSQL
```

---

## 1. Pasang file frontend

Copy:

```txt
kalibrasi-dongjin\.env.example
```

ke:

```txt
E:\WEB INSTRUMENT\Form-Data-Entry\artifacts\kalibrasi-dongjin\.env.example
```

Copy:

```txt
kalibrasi-dongjin\vercel.json
```

ke:

```txt
E:\WEB INSTRUMENT\Form-Data-Entry\artifacts\kalibrasi-dongjin\vercel.json
```

Copy:

```txt
kalibrasi-dongjin\src\lib\api-client.ts
```

ke:

```txt
E:\WEB INSTRUMENT\Form-Data-Entry\artifacts\kalibrasi-dongjin\src\lib\api-client.ts
```

Untuk local development, buat file:

```txt
E:\WEB INSTRUMENT\Form-Data-Entry\artifacts\kalibrasi-dongjin\.env
```

isi:

```env
VITE_API_URL=http://localhost:3000
```

---

## 2. Pasang file backend

Copy:

```txt
api-server\.env.example
```

ke:

```txt
E:\WEB INSTRUMENT\Form-Data-Entry\artifacts\api-server\.env.example
```

Copy:

```txt
render.yaml
```

ke root project:

```txt
E:\WEB INSTRUMENT\Form-Data-Entry\artifacts\render.yaml
```

---

## 3. Siapkan PostgreSQL online

Buat database PostgreSQL di Supabase / Neon / Railway.

Ambil connection string seperti:

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

Catatan:
- Kalau pakai Supabase/Neon biasanya butuh `?sslmode=require`.
- Jangan masukkan `DATABASE_URL` ke frontend.
- `DATABASE_URL` hanya untuk backend.

---

## 4. Deploy backend ke Render

Di Render:

```txt
New Web Service
Connect GitHub repo
Root Directory: api-server
Build Command: corepack enable && pnpm install && pnpm build
Start Command: pnpm start
```

Environment Variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
```

Setelah deploy, test:

```txt
https://nama-api.onrender.com/api/plant-areas
```

Kalau muncul data atau `[]`, backend sudah online.

---

## 5. Deploy frontend ke Vercel

Di Vercel:

```txt
New Project
Root Directory: kalibrasi-dongjin
Framework: Vite
Build Command: pnpm build
Output Directory: dist
Install Command: pnpm install
```

Environment Variables:

```env
VITE_API_URL=https://nama-api.onrender.com
```

Deploy.

---

## 6. Hal yang perlu dicek kalau error

### Error: DATABASE_URL must be set

Artinya backend belum dapat env `DATABASE_URL`.

Cek di Render:

```txt
Environment > DATABASE_URL
```

### Frontend online tapi data tidak masuk database

Kemungkinan form masih pakai `localStorage`.

Form yang masih perlu disambungkan bertahap ke API:

```txt
Preventive Checklist
Preventive Issues
Daily Report Foreman
Logsheet Shift
Collect Data / PIC Report
```

### CORS error

Tambahkan origin frontend Vercel ke backend CORS.

Contoh:

```ts
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://your-frontend.vercel.app"
  ],
  credentials: true
}));
```

### Build error karena pnpm tidak aktif

Tambahkan command:

```txt
corepack enable && pnpm install && pnpm build
```

---

## 7. Urutan paling aman untuk testing

```txt
1. Push project ke GitHub.
2. Buat database online.
3. Deploy api-server ke Render.
4. Test endpoint API.
5. Deploy kalibrasi-dongjin ke Vercel.
6. Set VITE_API_URL ke URL Render.
7. Test login dan halaman.
8. Baru sambungkan form localStorage ke API satu per satu.
```

---

## 8. Endpoint yang disarankan nanti

Untuk membuat data benar-benar tersimpan online:

```txt
POST   /api/logsheet-shift
GET    /api/logsheet-shift?date=

POST   /api/preventive-checklists
GET    /api/preventive-checklists?from=&to=

GET    /api/preventive-issues
PATCH  /api/preventive-issues/:id

POST   /api/daily-report-foreman
GET    /api/daily-report-foreman?from=&to=

POST   /api/collect-data
GET    /api/collect-data?from=&to=
PATCH  /api/collect-data/:id/status
```

Tahap pertama cukup hosting dulu. Tahap berikutnya baru kita migrasi localStorage ke PostgreSQL.
