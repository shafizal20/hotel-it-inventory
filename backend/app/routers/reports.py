from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import DecoRoom, General, ItWriteOff, RuijieReyee
from app.dependencies.authentication import current_user
from app.services.report_service import make_csv, make_pdf, safe  # noqa: F401  (safe re-exported)

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(current_user)])
SPECS = {
    "general": (General, ["id", "bil", "item", "quantity", "in_operation", "location"], ["item"]),
    "deco-room": (DecoRoom, ["id", "bil", "item_code", "item_name", "pcs", "location"], ["item_code", "item_name"]),
    "ruijie-reyee": (RuijieReyee, ["id", "bil", "serial_number", "kuantiti", "location"], ["serial_number"]),
    "write-offs": (ItWriteOff, ["id", "no", "item", "quantity", "location"], ["item", "no"]),
}

def build(name, q, location, fmt, db):
    if name not in SPECS:
        raise HTTPException(404, "Unknown report")
    model, cols, search = SPECS[name]
    stmt = select(*[getattr(model, c) for c in cols])
    if q:
        stmt = stmt.where(or_(*[getattr(model, c).like(f"%{q}%") for c in search]))
    if location:
        stmt = stmt.where(model.location == location)
    rows = [tuple(r) for r in db.execute(stmt.order_by(model.id))]
    if fmt == "pdf":
        return Response(make_pdf(name, cols, rows), media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{name}-report.pdf"'})
    return Response(make_csv(name, cols, rows), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}-report.csv"'})

@router.get("/export")  # must be declared before /{name}
def export(name: str, q: str | None = None, location: str | None = None,
           format: str = Query("csv", pattern="^(csv|pdf)$"), db: Session = Depends(get_db)):
    return build(name, q, location, format, db)

@router.get("/{name}")
def report(name: str, q: str | None = None, location: str | None = None,
           format: str = Query("csv", pattern="^(csv|pdf)$"), db: Session = Depends(get_db)):
    return build(name, q, location, format, db)
