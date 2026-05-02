# Checklist Deploy Dongjin

## Local
- [ ] Frontend jalan: `pnpm dev`
- [ ] Backend jalan: `pnpm start`
- [ ] PostgreSQL lokal bisa connect
- [ ] Login berhasil
- [ ] Halaman utama bisa dibuka

## Database Online
- [ ] Buat PostgreSQL online
- [ ] Copy connection string
- [ ] Pastikan pakai SSL jika diminta: `?sslmode=require`

## Backend Render
- [ ] Root Directory: `api-server`
- [ ] Build Command: `corepack enable && pnpm install && pnpm build`
- [ ] Start Command: `pnpm start`
- [ ] Env `DATABASE_URL`
- [ ] Env `PORT=3000`
- [ ] Test `/api/plant-areas`

## Frontend Vercel
- [ ] Root Directory: `kalibrasi-dongjin`
- [ ] Framework: Vite
- [ ] Env `VITE_API_URL=https://...`
- [ ] Deploy sukses
- [ ] Test frontend online

## After Deploy
- [ ] Cek CORS
- [ ] Cek login
- [ ] Cek dashboard
- [ ] Cek form yang masih localStorage
- [ ] Rencanakan migrasi form ke API
