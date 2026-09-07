from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BtM Digital Register",
    description=(
        "Minimal append-only narcotics (Betaeubungsmittel) stock ledger with "
        "running balance reconciliation per product/batch."
    ),
    version="0.1.0",
)

# Wide open for local dev / POC purposes. Tighten before any real production use.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "service": "btm-digital-register"}


# ---------- Products ----------

@app.post("/products", response_model=schemas.ProductOut)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.get("/products", response_model=List[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.created_at.desc()).all()


# ---------- Ledger entries (append-only: create + read, no update/delete) ----------

@app.post("/entries", response_model=schemas.LedgerEntryOut)
def create_entry(entry: schemas.LedgerEntryCreate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == entry.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Guard against dispensing/disposing more than is currently on hand.
    if entry.entry_type in (models.EntryType.DISPENSE, models.EntryType.DISPOSAL):
        balance = _compute_balance(db, entry.product_id)
        if entry.quantity > balance["current_balance"]:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Rejected: {entry.entry_type} of {entry.quantity}{product.unit} exceeds "
                    f"current balance of {balance['current_balance']}{product.unit}"
                ),
            )

    db_entry = models.LedgerEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@app.get("/entries", response_model=List[schemas.LedgerEntryOut])
def list_entries(product_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.LedgerEntry).order_by(models.LedgerEntry.created_at.desc())
    if product_id:
        query = query.filter(models.LedgerEntry.product_id == product_id)
    return query.all()


# ---------- Balance reconciliation ----------

def _compute_balance(db: Session, product_id: str) -> dict:
    entries = db.query(models.LedgerEntry).filter(models.LedgerEntry.product_id == product_id).all()
    total_receipts = sum(e.quantity for e in entries if e.entry_type == models.EntryType.RECEIPT)
    total_dispensed = sum(e.quantity for e in entries if e.entry_type == models.EntryType.DISPENSE)
    total_disposed = sum(e.quantity for e in entries if e.entry_type == models.EntryType.DISPOSAL)
    total_adjustments = sum(e.quantity for e in entries if e.entry_type == models.EntryType.ADJUSTMENT)
    current_balance = total_receipts + total_adjustments - total_dispensed - total_disposed
    return {
        "total_receipts": total_receipts,
        "total_dispensed": total_dispensed,
        "total_disposed": total_disposed,
        "total_adjustments": total_adjustments,
        "current_balance": round(current_balance, 4),
        "entry_count": len(entries),
    }


@app.get("/balance/{product_id}", response_model=schemas.BalanceOut)
def get_balance(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    balance = _compute_balance(db, product_id)
    return schemas.BalanceOut(
        product_id=product.id,
        product_name=product.name,
        unit=product.unit,
        **balance,
    )
