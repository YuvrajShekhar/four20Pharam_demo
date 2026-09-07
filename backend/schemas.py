from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from models import BtmSchedule, EntryType


class ProductCreate(BaseModel):
    name: str
    unit: str = "g"
    btm_schedule: BtmSchedule = BtmSchedule.ANLAGE_III


class ProductOut(BaseModel):
    id: str
    name: str
    unit: str
    btm_schedule: BtmSchedule
    created_at: datetime

    class Config:
        from_attributes = True


class LedgerEntryCreate(BaseModel):
    product_id: str
    entry_type: EntryType
    quantity: float = Field(gt=0, description="Always positive - direction comes from entry_type")
    batch_ref: str
    responsible_person: str
    notes: Optional[str] = None


class LedgerEntryOut(BaseModel):
    id: str
    product_id: str
    entry_type: EntryType
    quantity: float
    batch_ref: str
    responsible_person: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BalanceOut(BaseModel):
    product_id: str
    product_name: str
    unit: str
    total_receipts: float
    total_dispensed: float
    total_disposed: float
    total_adjustments: float
    current_balance: float
    entry_count: int
