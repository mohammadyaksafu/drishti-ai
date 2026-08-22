# DRISHTI AI

**See the road. Detect the danger. Fix the future.**

DRISHTI AI is a crowdsourced AI infrastructure intelligence platform that converts ordinary
smartphone road images into geospatial road-condition data. It automatically detects hazards,
estimates how severe each one is, and helps authorities prioritise maintenance.

Coverage is **Bangladesh only** — submissions and map markers are both constrained to the
national bounding box.

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Why the ML runs locally](#why-the-ml-runs-locally)
- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [Setup](#setup)
  - [1. MongoDB Atlas](#1-mongodb-atlas)
  - [2. Cloudinary](#2-cloudinary)
  - [3. Node backend](#3-node-backend)
  - [4. Frontend](#4-frontend)
  - [5. ML backend](#5-ml-backend)
  - [6. YOLO model](#6-yolo-model)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [End-to-end test](#end-to-end-test)
- [API reference](#api-reference)
- [The severity engine](#the-severity-engine)
- [Accounts and roles](#accounts-and-roles)
- [Deploying to Vercel](#deploying-to-vercel)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

---

## Features

**For citizens**
- Create an account, submit a road photo with GPS coordinates
- Drag-and-drop upload, or open the phone camera directly on mobile
- GPS capture with tap-the-map fallback, locked to Bangladesh
- Live analysis screen that polls until the AI result arrives
- Result page with the original image, the annotated image, per-detection confidence and severity

**For everyone (no account needed)**
- Public feed of every report, filterable by severity, hazard type and repair status
- National OpenStreetMap view with severity-coloured markers and popups
- Authority dashboard with live statistics and charts

**For authorities and admins**
- Mark reports resolved / reopen them, with the lifecycle reflected everywhere
- Repair priority queue sorted worst-first
- Admin panel: manage user accounts and roles, delete reports, watch AI pipeline health
- Live worker status — pending / processing / completed / failed job counts

**The AI**
- Six hazard classes: pothole, road crack, broken road, open manhole, waterlogging, debris
- A severity engine that scores danger separately from detector confidence
- Bounding-box annotation rendered onto the original photo
- Mock inference mode so the whole product runs before the weights are trained

---

## Architecture

```
                         DRISHTI AI
                              |
                +-------------+-------------+
                |                           |
             CITIZEN                    AUTHORITY
                |                           |
                v                           v
        React + Tailwind             Admin Dashboard
                |
                v
       Node.js + Express API
             Vercel
                |
       +--------+---------+
       |                  |
       v                  v
 MongoDB Atlas         Cloudinary
       |
       v
    ML JOB
    PENDING
       |
       v
+--------------------------+
| LOCAL AI MACHINE         |
|                          |
| Python + FastAPI         |
| YOLO + OpenCV            |
|                          |
| 1. Get pending job       |
| 2. Download image        |
| 3. Run YOLO              |
| 4. Calculate severity    |
| 5. Annotate image        |
| 6. Save result MongoDB   |
+------------+-------------+
             |
             v
       MongoDB = COMPLETED
             |
             v
       Node.js API
             |
             v
       React Frontend
             |
             v
       Show AI Result
```

### Why the ML runs locally

A YOLO inference pass takes 30–60 seconds on a laptop. Vercel functions time out long before
that, and they cannot hold a PyTorch model in memory between invocations. So the work is split:

- The **Node API is synchronous and fast**. It uploads the image, writes a `Report`, queues an
  `MLJob` with `status: pending`, and returns immediately.
- The **local Python worker is asynchronous and slow**. It polls MongoDB, claims a job, runs the
  model, and writes the result back.
- The **React frontend polls** `GET /api/reports/:id` every 6 seconds until the status reaches
  `completed` or `failed`.

The local machine only makes *outbound* connections — to MongoDB Atlas and Cloudinary. It never
needs a public IP, a tunnel, or an open port. That is the whole point of the design: the heavy
model can sit on a laptop under a desk while the API is serverless.

Polling rather than websockets is deliberate for this prototype. A 60-second wait costs about ten
cheap requests, and it works with serverless functions that cannot hold a socket open.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, React Leaflet, Recharts, Lucide |
| Maps | Leaflet + OpenStreetMap tiles — **no API key, no billing account** |
| API | Node.js, Express, Mongoose, Multer, Cloudinary, Helmet, express-rate-limit, JWT, bcrypt |
| Database | MongoDB Atlas |
| Media | Cloudinary |
| ML | Python, FastAPI, Uvicorn, Ultralytics YOLO, OpenCV, NumPy, PyMongo |

---

## Folder structure

```
drishti-ai/
├── frontend/
│   ├── src/
│   │   ├── components/      Navbar, Footer, RoadHazardMap, ImageUploader,
│   │   │                    LocationPicker, SeverityMeter, ReportCard, …
│   │   ├── pages/           Home, ReportHazard, ReportDetails, Reports,
│   │   │                    Dashboard, MapView, Login, Register, Profile,
│   │   │                    Admin, NotFound
│   │   ├── context/         AuthContext.jsx
│   │   ├── hooks/           useReportPolling.js
│   │   ├── services/        api.js
│   │   ├── utils/           severity.js, bangladesh.js, format.js
│   │   ├── App.jsx  main.jsx  index.css
│   ├── package.json  vite.config.js  tailwind.config.js  .env.example
│
├── backend/
│   ├── config/              db.js, cloudinary.js
│   ├── controllers/         reportController, dashboardController,
│   │                        jobController, authController, adminController
│   ├── models/              Report.js, MLJob.js, User.js
│   ├── routes/              reportRoutes, dashboardRoutes, jobRoutes,
│   │                        authRoutes, adminRoutes
│   ├── middleware/          errorHandler.js, upload.js, auth.js
│   ├── utils/               constants.js, seed.js
│   ├── server.js  vercel.json  .env.example
│
├── ml-backend/
│   ├── models/              best.pt  (you supply this)
│   ├── inference/           detector.py, severity.py, annotator.py
│   ├── services/            worker.py, pipeline.py
│   ├── main.py  config.py  db.py  cloud.py
│   ├── requirements.txt  .env.example
│
├── README.md
└── .gitignore
```

---

## Setup

### 1. MongoDB Atlas

1. Create a free M0 cluster at <https://cloud.mongodb.com>.
2. **Database Access** → add a user with read/write permissions. Save the password.
3. **Network Access** → add your IP. For a demo on unfamiliar conference wifi, `0.0.0.0/0`
   saves a lot of pain, but tighten it afterwards.
4. **Connect** → *Drivers* → copy the connection string. It looks like:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/drishti_ai?retryWrites=true&w=majority
   ```
   Keep the `/drishti_ai` database name in the path — both the API and the worker expect it.

Collections (`reports`, `mljobs`, `users`) are created automatically on first write.

### 2. Cloudinary

1. Sign up at <https://cloudinary.com> (the free tier is plenty).
2. From the dashboard copy **Cloud name**, **API Key** and **API Secret**.
3. The same three values go in *both* `backend/.env` and `ml-backend/.env` — the API uploads
   originals, the worker uploads annotated images.

### 3. Node backend

```bash
cd backend
npm install
cp .env.example .env      # then fill it in
npm run dev
```

Confirm it is alive at <http://localhost:5000/api/health>. You should see
`"database": "connected"`.

Optionally seed an admin account and demo reports so the dashboard and map are not empty:

```bash
npm run seed
```

This creates `admin@drishti.ai` / `drishti12345` (or whatever `ADMIN_EMAIL` you set) plus 16
sample reports across eight Bangladeshi cities. **Change that password before any public demo.**

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Opens at <http://localhost:5173>.

### 5. ML backend

```bash
cd ml-backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then fill it in
```

Then run **both** of these, in two terminals:

```bash
# terminal A — the FastAPI dev/ops surface
uvicorn main:app --reload --port 8000

# terminal B — the worker that actually processes the queue
python services/worker.py
```

The worker is the one that matters. FastAPI is for health checks and manual job triggers; you
can skip it entirely and the product still works end to end.

> `requirements.txt` pins `ultralytics`, which pulls in PyTorch (~2 GB). If you only want to
> demo in mock mode, comment out that last line before installing.

### 6. YOLO model

Until you have trained weights, leave `USE_MOCK_MODEL=true`. The detector produces realistic
synthetic detections and the entire pipeline — queue, severity scoring, annotation, upload,
polling, map, dashboard — runs exactly as it will with the real model.

When your weights are ready:

```bash
cp path/to/best.pt ml-backend/models/best.pt
```

and set in `ml-backend/.env`:

```
MODEL_PATH=./models/best.pt
USE_MOCK_MODEL=false
```

The model must emit these six classes in this order:

```
0  pothole
1  road_crack
2  broken_road
3  open_manhole
4  waterlogging
5  debris
```

Training sketch:

```bash
yolo detect train data=road_hazards.yaml model=yolov8n.pt imgsz=640 epochs=120 batch=16
cp runs/detect/train/weights/best.pt ml-backend/models/best.pt
```

If `MODEL_PATH` does not exist or the weights fail to load, the detector logs a warning and
falls back to mock mode rather than crashing. A demo should degrade, not die.

---

## Environment variables

**`backend/.env`**

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://…/drishti_ai?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
JWT_SECRET=          # a long random string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173     # comma-separate multiple origins
ADMIN_EMAIL=admin@drishti.ai         # this email registers as an admin
```

**`frontend/.env`**

```
VITE_API_BASE_URL=http://localhost:5000/api
```

**`ml-backend/.env`**

```
MONGODB_URI=          # same cluster as the backend
MONGODB_DB=drishti_ai
MODEL_PATH=./models/best.pt
USE_MOCK_MODEL=true
CONFIDENCE_THRESHOLD=0.35
IOU_THRESHOLD=0.45
MODEL_VERSION=drishti-yolov8n-v1
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
POLL_INTERVAL_SECONDS=6
MAX_ATTEMPTS=3
WORKER_ID=local-gpu-01
```

Anything prefixed `VITE_` is **compiled into the browser bundle and is public**. Never put
`MONGODB_URI`, `CLOUDINARY_API_SECRET` or `JWT_SECRET` in the frontend env file. `.env` is
gitignored; only `.env.example` is committed.

---

## Running locally

Four terminals:

```bash
# 1 — frontend
cd frontend && npm run dev

# 2 — Node API
cd backend && npm run dev

# 3 — FastAPI (optional)
cd ml-backend && uvicorn main:app --reload --port 8000

# 4 — ML worker (required)
cd ml-backend && python services/worker.py
```

The worker prints a status board on start, which doubles as your demo screen:

```
====================================
       DRISHTI AI  ·  LOCAL ML WORKER
====================================

  Model      : MOCK inference engine
  Version    : drishti-yolov8n-v1
  Classes    : 6 (pothole, road_crack, broken_road…)
  Confidence : ≥ 0.35
  Worker id  : local-gpu-01

  MongoDB    : CONNECTED
  Cloudinary : CONNECTED
  Status     : RUNNING   (Ctrl+C to stop)

  Queue      : 0 pending · 0 processing · 12 completed · 0 failed
------------------------------------

10:42:07  Checking for jobs…

10:42:19  Job #a3f9c1 claimed  (attempt 1)
          Report 673f…
          pending → processing
10:42:19  Downloading image…
10:42:19  Running inference…
10:42:21  Detected:
            · pothole         91.2%   sev  87 CRITICAL
            · debris          86.5%   sev  54 MODERATE
10:42:21  Calculating severity…
          Severity : 91/100  CRITICAL
10:42:23  Annotated image uploaded
10:42:23  Updating MongoDB…
10:42:23  ✓ Job #a3f9c1 completed  (4.1s)

10:42:23  Waiting for next job…
```

---

## End-to-end test

1. Open <http://localhost:5173> and create an account.
2. Click **Report a road hazard**.
3. Upload a road photo.
4. Click **Use my location** and allow the GPS prompt. (Outside Bangladesh? Use *Jump to
   division* or tap the map — the app will refuse coordinates outside the country.)
5. Submit. The browser redirects to `/report/:id`.
6. The page shows **AI analysis in progress** with the live pipeline stages and an elapsed timer.
7. Watch terminal 4: the worker claims the job, downloads, infers, scores, annotates, uploads.
8. Within ~10 seconds of the worker finishing, the result page updates on its own — no refresh.
9. Check `/dashboard`: the counts and charts have moved.
10. Check `/map`: the new hazard is a coloured marker; click it for the popup.
11. Sign in as the admin and open `/admin` to mark it resolved. The marker dims, the lifecycle
    rail advances to RESOLVED, and the dashboard resolution rate updates.

---

## API reference

All responses share one shape:

```json
{ "success": true, "data": { } }
```

```json
{ "success": false, "message": "Something went wrong" }
```

### Auth
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | signed in |
| PUT | `/api/auth/me` | signed in |
| PUT | `/api/auth/password` | signed in |

### Reports
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/reports` | signed in (multipart, field `image`) |
| GET | `/api/reports` | public |
| GET | `/api/reports/:id` | public |
| GET | `/api/reports/:id/status` | public (polling) |
| PUT | `/api/reports/:id` | owner or staff |
| DELETE | `/api/reports/:id` | owner or admin |
| POST | `/api/reports/:id/retry` | signed in |

`GET /api/reports` accepts `severity`, `hazard`, `status`, `resolution`, `district`, `search`,
`sort` (`newest` / `oldest` / `severity`), `mine`, `page`, `limit`.

### Dashboard
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/dashboard/statistics` | public |
| GET | `/api/dashboard/hazards` | public |
| GET | `/api/dashboard/map` | public |
| GET | `/api/dashboard/pipeline` | authority / admin |

### Jobs and admin
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/jobs` | authority / admin |
| GET | `/api/jobs/next` | admin |
| POST | `/api/jobs/:id/complete` | admin |
| POST | `/api/jobs/:id/fail` | admin |
| GET | `/api/admin/users` | admin |
| PUT | `/api/admin/users/:id` | admin |
| DELETE | `/api/admin/users/:id` | admin |
| POST | `/api/admin/reports/:id/resolve` | admin |
| DELETE | `/api/admin/reports/:id` | admin |
| GET | `/api/health` | public |

The `/api/jobs/*` endpoints exist so the queue can be driven over HTTP for debugging. The normal
flow does not use them — the worker talks to MongoDB directly.

### Local FastAPI service

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | `{"status": "healthy", "model": "loaded"}` |
| GET | `/model` | active mode, class list, thresholds |
| GET | `/queue` | pending / processing / completed / failed counts |
| POST | `/process/{job_id}` | manually run one queued job |
| POST | `/analyse` | run the pipeline on any image URL |

---

## The severity engine

**Confidence is not severity.** A detector can be 99% certain it sees a hairline crack; that
crack is still a minor hazard. `inference/severity.py` scores actual danger on 0–100 from four
weighted signals:

| Weight | Signal | Rationale |
|---|---|---|
| 40% | Hazard size | Frame area covered, saturating at 30% — past that, bigger stops meaning worse |
| 30% | Hazard type | Intrinsic risk: open manhole 100, broken road 85, pothole 75, waterlogging 65, debris 50, crack 35 |
| 20% | Model confidence | How sure the detector is the defect is there at all |
| 10% | Location risk | Road-class context; currently `unknown` for every report |

Bands:

```
 0–30  LOW        Monitor during routine inspection
31–60  MODERATE   Schedule in the next maintenance cycle
61–80  HIGH       Repair soon
81–100 CRITICAL   Act immediately
```

Multiple hazards in one image: the worst sets the floor, then each extra adds 4 points capped at
+12. Three moderate potholes on one stretch are a worse maintenance problem than one, but not
three times worse.

Every component is its own function, so a trained severity regressor can replace any single
piece without touching the rest. The location term in particular is a stub waiting for an
OpenStreetMap road-class lookup.

---

## Accounts and roles

| Role | Can do |
|---|---|
| `citizen` | Submit reports, edit and delete their own, browse everything public |
| `authority` | Everything above, plus resolve/reopen reports and see pipeline health |
| `admin` | Everything above, plus manage user accounts and delete any report |

The first account registering with the `ADMIN_EMAIL` address becomes an admin automatically.
After that, promote users from the admin panel.

Browsing is fully public — the reports feed, the national map and the dashboard need no account.
Only submitting a report does.

---

## Deploying to Vercel

**Frontend**

- Root directory `frontend`, framework preset *Vite*, build `npm run build`, output `dist`
- Environment variable: `VITE_API_BASE_URL=https://your-api.vercel.app/api`
- Add a rewrite so client-side routes survive a hard refresh:

  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```

**Backend**

- Root directory `backend` (`vercel.json` is already included)
- Add every variable from `backend/.env` in the Vercel dashboard
- Set `CLIENT_URL` to your deployed frontend origin, or CORS will block the browser
- Set `NODE_ENV=production`

**The worker stays on your machine.** Nothing about it is deployed. It reaches Atlas and
Cloudinary outbound, so it works from behind any NAT or campus firewall.

Constraints the code already respects: no local filesystem writes (Multer uses memory storage),
no long-running processes, no local image storage, no ML inference in the API. The Mongoose
connection is cached on the module scope so warm invocations reuse the pool.

---

## Troubleshooting

**Reports stay stuck on "AI analysis in progress"**
The worker is not running, or it cannot reach Atlas. Check terminal 4. After 5 minutes the page
switches to a "taking longer than usual" state rather than spinning forever.

**`MongoServerError: bad auth`**
The password in `MONGODB_URI` is wrong, or contains characters needing URL-encoding (`@` → `%40`).

**Atlas connection times out**
Your IP is not in Network Access. This bites hardest on new wifi.

**CORS errors in the browser console**
`CLIENT_URL` in `backend/.env` does not match the origin you are browsing from.

**Map tiles are blank**
OpenStreetMap needs outbound access to `*.tile.openstreetmap.org`. Some campus networks block it.

**Annotated image never appears**
Cloudinary credentials are missing in `ml-backend/.env`. The worker logs a warning, completes the
job, and the result page explains that no annotation was produced. Detections and severity still
work.

**Worker prints "MODEL_PATH not found — falling back to MOCK mode"**
Expected until you drop in `best.pt`. Set `USE_MOCK_MODEL=false` only after the file exists.

**Upload rejected with 422**
The coordinates are outside Bangladesh. This is intentional.

---

## Roadmap

Not implemented — deliberately kept as future scope.

**More data sources:** dashcams, CCTV, municipality vehicles, public buses, road inspection
vehicles. The asynchronous job architecture means adding a source is adding a producer, not
rewriting the pipeline.

**More AI modules:** road deterioration prediction, traffic impact modelling, weather
correlation, maintenance cost estimation, hazard clustering, road quality forecasting.

**Nearer-term engineering:** a trained severity regressor to replace the weighted heuristic,
OpenStreetMap road-class lookup to make the location term real, duplicate detection so one
pothole photographed by twenty people is one hazard, and offline queueing for poor connectivity.

---

Built as a prototype. Map data © OpenStreetMap contributors.
