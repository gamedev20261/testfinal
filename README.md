# GeoAnnotator (learning rebuild)

A step-by-step rebuild of GeoAnnotator v2, a web app for labelling satellite and aerial
images with three portals: **Admin**, **Annotator** and **Auditor**.

- **Start here:** [PLAN.md](PLAN.md) explains the modules, the technology choices and the folder structure.
- **Learn:** [learn/README.md](learn/README.md) explains how to study each patch. Every code file has an explanation at the same path under `learn/files/`.
- **API tests:** `postman/` (import into Postman, see [learn/postman.md](learn/postman.md))
- **Code:** `backend/` and `frontend/`

The original app (`gamedev20261/test2`) is only a reference and is never modified.

## Run it

```bash
# 1. Database (PostgreSQL in Docker)
docker compose up -d

# 2. Backend: http://localhost:3001
cd backend
cp .env.example .env   # then set your own JWT_SECRET
npm install
npm run db:migrate
npm run db:seed        # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD in .env
npm run dev

# 3. Frontend: http://localhost:5173 (in a second terminal)
cd frontend
npm install
npm run dev
```

## Progress

### Admin portal → Login screen

| Patch | What it adds | Guide |
|---|---|---|
| 01 | Backend: first server (`/api/health`) | [learn/patches/01-backend-first-server.md](learn/patches/01-backend-first-server.md) |
| 02 | Database and first admin user | [learn/patches/02-database-and-first-admin.md](learn/patches/02-database-and-first-admin.md) |
| 03 | Login API + Postman | [learn/patches/03-login-api.md](learn/patches/03-login-api.md) |
| 04 | Frontend: first page | [learn/patches/04-frontend-first-page.md](learn/patches/04-frontend-first-page.md) |
| 05 | Login screen design | [learn/patches/05-login-screen-design.md](learn/patches/05-login-screen-design.md) |
| 06 | Connect the screen to the API | ⏳ |
