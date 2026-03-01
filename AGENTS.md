## Cursor Cloud specific instructions

### Project Overview

This is a full-featured banking internal management system (银行内部管理系统) with two services:

| Service | Directory | Port | Stack |
|---------|-----------|------|-------|
| Backend API | `backend/` | 3000 | Express + TypeScript + Prisma + SQLite |
| Frontend Web | `frontend/` | 5173 | React + Vite + Ant Design |

### Running Services

- **Backend**: `npm run dev` in `backend/` — auto-reloads via `tsx watch`
- **Frontend**: `npm run dev` in `frontend/` — Vite dev server with HMR, proxies `/api` to backend
- **Both**: `npm run dev` at root (uses `concurrently`)

### Database

- SQLite database at `backend/prisma/dev.db`
- Migrations: `cd backend && npx prisma migrate dev`
- Seed data: `cd backend && npx tsx prisma/seed.ts`
- Default admin login: `admin` / `admin123`; other users: password `123456`

### Key Commands

- **Lint (frontend)**: `cd frontend && npm run lint`
- **Type check (backend)**: `cd backend && npx tsc --noEmit`
- **Build**: `npm run build` at root

### Caveats

- SQLite does not support `skipDuplicates` in `createMany` — use `upsert` loops instead.
- `@types/express@5` treats `req.params` values as `string | string[]`; wrap with `String()` before `parseInt`.
- Frontend proxies `/api` requests to `http://localhost:3000` — backend must be running for the frontend to function.
- PrismaClient is shared via `backend/src/utils/prisma.ts` singleton — do NOT create new instances in route files.
- System configs are cached with 60s TTL in `backend/src/services/systemConfig.ts`; call `clearConfigCache()` when updating configs.
- Large transactions (>= configurable threshold, default ¥50,000) trigger `PENDING_REVIEW` status and require manager approval.
