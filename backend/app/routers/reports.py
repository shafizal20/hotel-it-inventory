
# backend/app/routers/reports.py

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import DecoRoom, General, ItWriteOff, RuijieReyee
from app.dependencies.authentication import current_user
from app.services.report_service import make_csv, make_pdf, make_xlsx

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(current_user)],
)

# Model, columns to export, searchable columns.
# The picture columns are explicitly selected for export.
SPECS = {
    "general": (
        General,
        ["id", "bil", "pic", "item", "quantity", "in_operation", "location"],
        ["item"],
    ),
    "deco-room": (
        DecoRoom,
        ["id", "bil", "picture", "item_code", "item_name", "pcs", "location"],
        ["item_code", "item_name"],
    ),
    "ruijie-reyee": (
        RuijieReyee,
        ["id", "serial_number", "picture", "kuantiti", "location"],
        ["serial_number"],
    ),
    "write-offs": (
        ItWriteOff,
        ["id", "no", "picture", "item", "quantity", "location"],
        ["item", "no"],
    ),
}


def build(name, q, location, fmt, db):
    if name not in SPECS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown report: {name}",
        )

    model, cols, search_cols = SPECS[name]

    # Explicitly select every requested column, including deferred image data.
    stmt = select(*(getattr(model, col) for col in cols))

    if q:
        stmt = stmt.where(
            or_(*[
                getattr(model, col).ilike(f"%{q}%")
                for col in search_cols
            ])
        )

    if location:
        stmt = stmt.where(model.location == location)

    rows = [
        tuple(result)
        for result in db.execute(stmt.order_by(model.id)).all()
    ]

    # Generate the requested file.
    if fmt == "xlsx":
        content = make_xlsx(name, cols, rows)
        media_type = (
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        )
        extension = "xlsx"

    elif fmt == "pdf":
        content = make_pdf(name, cols, rows)
        media_type = "application/pdf"
        extension = "pdf"

    else:
        content = make_csv(name, cols, rows)
        media_type = "text/csv; charset=utf-8"
        extension = "csv"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{name}-report.{extension}"'
            )
        },
    )


@router.get("/export")
def export(
    name: str,
    q: str | None = None,
    location: str | None = None,
    format: str = Query("csv", pattern="^(csv|pdf|xlsx)$"),
    db: Session = Depends(get_db),
):
    return build(name, q, location, format, db)


@router.get("/{name}")
def report(
    name: str,
    q: str | None = None,
    location: str | None = None,
    format: str = Query("csv", pattern="^(csv|pdf|xlsx)$"),
    db: Session = Depends(get_db),
):
    return build(name, q, location, format, db)
