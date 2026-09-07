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

### 3. Try it

I have hosted this on the URL : 

## Deploy to Railway

Each folder (`backend/`, `frontend/`) deploys as its own Railway service.

## What's intentionally left out (POC scope)

- Authentication / role-based access (who is allowed to log entries)
- Multi-tenant support (currently one flat product list, no site/warehouse concept)
- PDF/export reporting for BfArM audits
- Editing/soft-delete of products (ledger entries are correctly immutable; products
  themselves aren't a compliance-sensitive record, so this was deprioritized for scope)

