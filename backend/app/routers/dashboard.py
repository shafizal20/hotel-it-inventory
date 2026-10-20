from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import DecoRoom, General, ItWriteOff, RuijieReyee
from app.dependencies.authentication import current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(current_user)])
# (label, model, quantity column) - quantities are NOT summed across categories.
CATS = [("General", General, General.quantity), ("Deco Room", DecoRoom, DecoRoom.pcs),
        ("Ruijie/Reyee", RuijieReyee, RuijieReyee.kuantiti), ("IT Write-Off", ItWriteOff, ItWriteOff.quantity)]

@router.get("/by-category")
def by_category(db: Session = Depends(get_db)):
    return [{"category": n, "records": db.scalar(select(func.count()).select_from(m)),
             "quantity": int(db.scalar(select(func.coalesce(func.sum(q), 0)))) } for n, m, q in CATS]

@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    qty = int(db.scalar(select(func.coalesce(func.sum(General.quantity), 0))))
    op = int(db.scalar(select(func.coalesce(func.sum(General.in_operation), 0))))
    return {"general_quantity": qty, "general_in_operation": op, "general_not_in_operation": qty - op,
            "categories": by_category(db)}

@router.get("/by-location")
def by_location(db: Session = Depends(get_db)):
    res: dict[str, dict] = {}
    for n, m, q in CATS:
        for loc, recs, tot in db.execute(select(m.location, func.count(), func.coalesce(func.sum(q), 0)).group_by(m.location)):
            d = res.setdefault(loc or "(none)", {"location": loc or "(none)"})
            d[n] = {"records": recs, "quantity": int(tot)}
    return sorted(res.values(), key=lambda d: d["location"])

@router.get("/operations")
def operations(db: Session = Depends(get_db)):
    full = db.scalar(select(func.count()).where(General.in_operation == General.quantity, General.quantity > 0))
    none = db.scalar(select(func.count()).where(General.in_operation == 0))
    total = db.scalar(select(func.count()).select_from(General))
    return {"fully_operational": full, "none_operational": none, "partial": total - full - none, "total_records": total}
