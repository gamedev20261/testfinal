# GeoAnnotator (rebuild)

A web app for labelling satellite and aerial images, with three portals:

| Portal | Who | What they do |
|---|---|---|
| **Admin** | `ADMIN` | Users and groups, label classes, projects, image upload, tasks, team, statistics, dataset export |
| **Annotator** | `ANNOTATOR` | Draws boxes and rotated boxes (detection) or polygons (segmentation) on the images of their tasks, then submits them |
| **Auditor** | `AUDITOR` | Approves or rejects each shape and image, then passes or fails the task |

The original app (`gamedev20261/test2`) was only a reference and is never modified.
[PLAN.md](PLAN.md) is the original plan; this file describes what was built.

## Run it

```bash
# 1. Database: PostgreSQL with PostGIS, in Docker…
docker compose up -d
#    …or PostgreSQL installed with pgAdmin (+ PostGIS): see learn/local-postgres.md

# 2. Backend: http://localhost:3001
cd backend
cp .env.example .env   # then set DATABASE_URL (and your own JWT_SECRET)
npm install
npm run db:migrate     # creates the database, PostGIS and all tables
npm run db:seed        # admin from .env + demo annotator/auditor + demo label classes
npm run doctor         # checks the setup; fix any [FAIL] line it shows
npm run dev

# 3. Frontend: http://localhost:5173 (in a second terminal)
cd frontend
npm install
npm run dev
```

After `git pull`, run `npm install` and `npm run db:migrate` again in `backend/` (new packages or tables).
Something not working? Run `npm run doctor` in `backend/` and see [learn/troubleshooting.md](learn/troubleshooting.md).

### Demo accounts (from `npm run db:seed`)

| Email | Password | Role |
|---|---|---|
| `admin@example.com` (or `ADMIN_EMAIL` in `.env`) | `ADMIN_PASSWORD` in `.env` | Admin |
| `annotator@example.com` | `DEMO_PASSWORD` (default `ChangeMe123!`) | Annotator |
| `auditor@example.com` | `DEMO_PASSWORD` (default `ChangeMe123!`) | Auditor |

Set `SEED_DEMO_USERS=false` in `.env` to skip the demo accounts and classes.

## A full round, step by step

1. **Admin** → *New Project* (type *Object Detection* or *Segmentation*, pick label classes).
2. **Admin** → project page → *Upload images* (TIFF / GeoTIFF only). They are processed in the background.
3. **Admin** → *New Task*: a name, 1 annotator, 1 auditor, some images. Both people get a notification.
4. **Annotator** → *Labeling tasks* → *Start*. Draw shapes, then *Submit for review*.
5. **Auditor** → *Labeling tasks* → *Review*. Approve (A) or reject (R) shapes, approve/reject each image,
   or *Pass* / *Fail* the whole task. A failed task goes back to the annotator with the reasons.
6. **Annotator** fixes the rejected shapes (moving or reshaping one sends it back to review) and submits again.
7. **Admin** → *Export* (only tasks that **passed** review), cut into chips of a size the admin chooses
   (whole images, 256–1024 px, or any custom size from 64 to 10 000 px):
   - *Object detection*: YOLO (boxes), YOLO OBB (rotated boxes, 4 corners), COCO, GeoJSON
   - *Segmentation*: **Masks** (PNG, black background), YOLO-seg, COCO, GeoJSON.
     With *Merge all classes* one mask per chip paints each class in its own colour (`masks/`, `classes.json`);
     without it every class gets its own folder of black-and-white masks (`masks/<class>/`, the class white).

## Editor keyboard shortcuts

| Key | Action |
|---|---|
| `V` | Select / edit tool |
| `B` / `O` | Detection: Box, Rotated box tool |
| `P` / `M` / `B` | Segmentation: Polygon, Magic pen, Brush tool |
| Middle mouse button (drag) | Move the image, with any tool |
| `1`–`9` | Class for new shapes (or change the selected shape's class) |
| `Delete` | Delete the selected shape |
| `Esc` | Cancel drawing / deselect |
| `Backspace` | Remove the last polygon (or rotated box) corner while drawing |
| `Shift` + brush stroke | Erase from the selected shape |
| `Ctrl+Z` / `Ctrl+Y` (`Ctrl+Shift+Z`) | Undo / redo |
| `[` / `]` | Previous / next image |
| `L` | Show class names on the map |
| `A` / `R` | Auditor: approve / reject the selected shape |

Tools per project type: *object detection* draws **boxes** and **rotated boxes**; *segmentation* only makes
**polygons** (points can no longer be drawn; old ones are still shown).

- Box: press, drag, release.
- Rotated box: click two corners along one side, then click to set the width. Select it and drag its round knob to turn it.
- Polygon: click the corners, double-click to finish.
- Magic pen: click an object; its outline is found by colour (*Tolerance* in the toolbar) and saved as a polygon.
- Brush: paint an object (*Size* in the toolbar). The new shape stays selected, so the next strokes join it;
  `Shift` (or the eraser button) erases from it; `Esc` starts a new shape.

With the select tool: drag a corner to reshape, drag inside a shape to move it.
Segmentation projects show each shape's class name on it (`L` hides them).

## How it works

**Backend** (`backend/`): Node 22+, TypeScript, Express 5, Zod, pino, **Drizzle ORM** on **PostgreSQL + PostGIS**.

- Login: bcrypt password check → signed JWT in an httpOnly cookie. Changing a password or role ends other logins.
- Rules for who may do what: [`backend/src/permissions/access.ts`](backend/src/permissions/access.ts).
- **Images**: saved to `uploads/images/<id>/`, then a background queue makes an 8-bit copy (16-bit and
  multi-band GeoTIFFs get a 2–98 % contrast stretch), a thumbnail, a preview and **Zoomify map tiles** (sharp).
  GeoTIFFs keep their geotransform and EPSG code; PostGIS stores their footprint in longitude/latitude.
- **Shapes** are PostGIS geometries in image pixels. PostGIS rejects self-crossing polygons,
  cuts shapes to the image edge (`ST_Intersection`) and refuses shapes inside other shapes (`ST_Covers`).
  A rotated box is a 4-corner polygon (checked against `ST_OrientedEnvelope`) whose first side gives its angle.
- **Magic pen** (`labels/magic-wand.ts`): sharp reads the pixels around the click, a flood fill collects similar
  colours, the outline is traced along pixel edges and PostGIS makes it a valid, simplified polygon.
  **Brush**: the stroke is widened with `ST_Buffer`, then joined to (`ST_Union`) or cut from (`ST_Difference`) the selected shape.
- **Uploads** must be TIFF files (extension and file header are checked).
- **Export** uses passed tasks only and cuts chips with `ST_Intersection` + `ST_Translate`; segmentation masks are
  drawn pixel by pixel (a pixel belongs to a shape when its centre is inside); GeoJSON puts shapes on the map with
  `ST_Affine` (geotransform) + `ST_Transform` (to EPSG:4326).

**Frontend** (`frontend/`): React 19, Vite, React Router, **TanStack Query** (server data, caching, polling),
React Hook Form + Zod, Tailwind CSS 4, Radix Dialog, sonner toasts, zustand (editor state), **OpenLayers** (editor map).

### Prisma or Drizzle?

This project uses **Drizzle**. Both are good ORMs; the deciding point is PostGIS:

| | Prisma | Drizzle |
|---|---|---|
| PostGIS geometry columns | Not supported: `Unsupported("geometry")`, can't be read or written with the normal API | A custom column type (`db/schema/postgis.ts`), read and written like any column |
| Spatial queries (clip, contains, transform) | Only through raw SQL strings (`$queryRaw`) | `sql\`ST_Intersection(...)\`` mixed into typed queries |
| Queries | Its own object syntax | Reads like SQL, so SQL knowledge carries over |
| Schema | `schema.prisma` (own language) | TypeScript files (`db/schema/*.ts`) |
| Generated client | Yes (`prisma generate` step) | No, types come straight from the schema |

Prisma is great for plain CRUD apps; for an app whose core data is geometry, Drizzle keeps the spatial
code typed and readable.

## Project structure

```
backend/
  drizzle/                 SQL migrations (generated by `npm run db:generate`)
  src/
    server.ts, app.ts      start the server / build the Express app
    config/                settings from .env (checked at startup)
    db/                    Drizzle client, migrate + seed scripts
      schema/              one file per table group; postgis.ts = geometry column types
    lib/                   small helpers: session cookie, password, storage paths, job queue…
    middleware/            requireAuth, requireRole, error handler, request logger
    permissions/access.ts  who may see / change what
    modules/               one folder per feature: *.routes.ts → *.service.ts (+ *.schemas.ts)
      auth, users, label-classes, projects, images (+ processing/), tasks, labels, notifications, export
    scripts/doctor.ts      `npm run doctor`
frontend/src/
  api/                     one file per backend module (axios calls)
  types/                   the shapes of the API's answers
  components/              ui/ (Button, Dialog, Tabs…), layout/ (top bar, sidebar, bell, user menu)
  features/                one folder per screen
    auth/                  login page, route guards
    home/                  project cards
    admin/                 Admin Portal (users, label classes)
    projects/              project page and its tabs, export dialog
    tasks/                 "Labeling tasks" list
    editor/                the annotation editor
      map/                 OpenLayers code (AnnotationMap class, styles, pixel ↔ map coordinates)
      panel/               side panel tabs: classes, objects, images
postman/                   API collection: every endpoint, runs top to bottom
learn/                     lessons for patches 01–06 (setup, login); later code has short comments instead
```

## API tests with Postman

Import `postman/GeoAnnotator.postman_collection.json` and `postman/Local.postman_environment.json`,
select the *GeoAnnotator – Local* environment, and run the folders from top to bottom
(Admin → Annotator → Auditor → Export). Ids such as `projectId` and `taskId` are remembered between
requests. In *Admin · Imagery → Upload images*, choose an image file in the Body tab first.
See [learn/postman.md](learn/postman.md).
