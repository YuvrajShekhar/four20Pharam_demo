import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship

from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class BtmSchedule(str, enum.Enum):
    ANLAGE_I = "Anlage I"
    ANLAGE_II = "Anlage II"
    ANLAGE_III = "Anlage III"


class EntryType(str, enum.Enum):
    RECEIPT = "RECEIPT"          # stock coming in (import, production)
    DISPENSE = "DISPENSE"        # stock going out (sale/distribution to pharmacy)
    DISPOSAL = "DISPOSAL"        # destroyed/written off stock
    ADJUSTMENT = "ADJUSTMENT"    # correction (e.g. after physical stocktake), signed value


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    unit = Column(String, nullable=False, default="g")  # g, mg, ml, units
    btm_schedule = Column(Enum(BtmSchedule), nullable=False, default=BtmSchedule.ANLAGE_III)
    created_at = Column(DateTime, default=datetime.utcnow)

    entries = relationship("LedgerEntry", back_populates="product")


class LedgerEntry(Base):
    """
    Append-only. There is deliberately no update/delete endpoint exposed for
    this table - BtM (narcotics) logs must be immutable and auditable, mirroring
    the real recordkeeping obligation under German BtMG / BtMVV.
    """
    __tablename__ = "ledger_entries"

    id = Column(String, primary_key=True, default=gen_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    entry_type = Column(Enum(EntryType), nullable=False)
    quantity = Column(Float, nullable=False)  # always positive; sign is derived from entry_type
    batch_ref = Column(String, nullable=False)
    responsible_person = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="entries")
