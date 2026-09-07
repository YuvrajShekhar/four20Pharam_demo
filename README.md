# BtM Digital Register

A minimal, append-only narcotics (Betaeubungsmittel) stock ledger with running balance
reconciliation per product/batch. Built as a proof of concept for Four 20 Pharma's stack
(Python backend, React frontend, PostgreSQL in production).

**Core idea:** German narcotics recordkeeping (BtMG/BtMVV) requires an auditable trail of
every movement of a scheduled substance. This POC models that as an append-only ledger:
entries can be created and read, but never edited or deleted. Corrections happen by logging
a new `ADJUSTMENT` entry, exactly like a real audit trail would demand. The backend also
rejects any `DISPENSE`/`DISPOSAL` entry that would push the balance negative.

Stack note: built in FastAPI (async Python, same shape as Quart) rather than Quart itself,
since I'm still ramping up on Quart specifically. Swapping the framework doesn't change any
of the business logic here.

## Project structure

```
btm-register/
  backend/     FastAPI + SQLAlchemy + SQLite (local) / PostgreSQL (Railway)
  frontend/    React (Vite)
```

## Run locally

### 1. Backend

```bash
cd backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt   # Windows: venv\Scripts\pip install -r requirements.txt
venv/bin/uvicorn main:app --reload         # Windows: venv\Scripts\uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`. No setup needed for the database - it defaults to
a local SQLite file (`btm_register.db`), created automatically on first run. Interactive API
docs are available at `http://localhost:8000/docs`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and talks to `http://localhost:8000` by default
(see `frontend/.env`).

### 3. Try it

1. Add a product (e.g. "Cannabis Flos Bedrocan 22%", unit `g`, schedule `Anlage III`).
2. Log a `RECEIPT` entry (e.g. 1000g, batch ref `IMP-2026-0091`).
3. Log a `DISPENSE` entry (e.g. 150g, same batch ref).
4. Watch the balance card update to 850g.
5. Try dispensing more than the current balance - the API rejects it with a 400.

## Deploy to Railway

Each folder (`backend/`, `frontend/`) deploys as its own Railway service.

### Backend service

1. In Railway, create a new project → **Deploy from GitHub repo** → point at `backend/` as
   the root directory (or push `backend/` as its own repo).
2. Add a **PostgreSQL** plugin to the project. Railway will inject a `DATABASE_URL` env var
   automatically - `database.py` picks it up with no code changes.
3. Railway auto-detects Python and uses the `Procfile` (`web: uvicorn main:app --host 0.0.0.0
   --port $PORT`).
4. Once deployed, note the public URL Railway gives you (e.g.
   `https://btm-register-backend-production.up.railway.app`).

### Frontend service

1. New Railway service, root directory `frontend/`.
2. Set an environment variable `VITE_API_URL` to the backend's public Railway URL from above.
3. Railway runs `npm run build` (via nixpacks) then `npm run start`, which serves the built
   app with `vite preview` on Railway's assigned `$PORT`.
4. Note the frontend's public URL - that's the link to share.

### CORS note

The backend currently allows all origins (`allow_origins=["*"]`) for POC simplicity. Before
any real use, that should be narrowed to the frontend's actual Railway URL.

## What's intentionally left out (POC scope)

- Authentication / role-based access (who is allowed to log entries)
- Multi-tenant support (currently one flat product list, no site/warehouse concept)
- PDF/export reporting for BfArM audits
- Editing/soft-delete of products (ledger entries are correctly immutable; products
  themselves aren't a compliance-sensitive record, so this was deprioritized for scope)

Kept deliberately to one core feature - the append-only ledger with balance reconciliation -
so it's something I can walk through and defend in detail rather than a broad, shallow demo.
