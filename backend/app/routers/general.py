from typing import Annotated
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import General
from app.dependencies.authentication import current_user
from app.services.image_service import content_type, read_validated_image

router = APIRouter(prefix="/general", tags=["general"], dependencies=[Depends(current_user)])
SORTABLE = {"id": General.id, "bil": General.bil, "item": General.item, "quantity": General.quantity,
            "in_operation": General.in_operation, "location": General.location}

def out(r: General, has_image: bool):
    return {"id": r.id, "bil": r.bil, "item": r.item, "quantity": r.quantity,
            "in_operation": r.in_operation, "remaining": r.quantity - r.in_operation,
            "status": ("none" if r.in_operation == 0 else "full" if r.in_operation == r.quantity else "partial"),
            "location": r.location, "has_image": has_image}

def check(item: str, quantity: int, in_operation: int):
    if not item.strip():
        raise HTTPException(422, "Item is required")
    if quantity < 0 or in_operation < 0:
        raise HTTPException(422, "Quantities cannot be negative")
    if in_operation > quantity:
        raise HTTPException(422, "in_operation cannot exceed quantity")

def has_img(db: Session, ids: list[int]) -> set[int]:
    if not ids:
        return set()
    return set(db.scalars(select(General.id).where(General.id.in_(ids), General.pic.is_not(None))))

@router.get("")
def list_general(db: Session = Depends(get_db), q: str | None = None, location: str | None = None,
                 sort: str = "id", order: str = Query("asc", pattern="^(asc|desc)$"),
                 page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100)):
    if sort not in SORTABLE:
        raise HTTPException(422, "Invalid sort column")
    stmt = select(General)
    if q:
        stmt = stmt.where(General.item.ilike(f"%{q}%"))
    if location:
        stmt = stmt.where(General.location == location)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    col = SORTABLE[sort]
    rows = db.scalars(stmt.order_by(col.desc() if order == "desc" else col.asc())
                      .offset((page - 1) * size).limit(size)).all()
    imgs = has_img(db, [r.id for r in rows])
    return {"items": [out(r, r.id in imgs) for r in rows], "total": total, "page": page, "size": size}

@router.get("/{id}")
def get_general(id: int, db: Session = Depends(get_db)):
    r = db.get(General, id)
    if not r:
        raise HTTPException(404, "Not found")
    return out(r, id in has_img(db, [id]))

@router.post("", status_code=201)
async def create_general(item: Annotated[str, Form()], quantity: Annotated[int, Form()] = 0,
                         in_operation: Annotated[int, Form()] = 0, bil: Annotated[int | None, Form()] = None,
                         location: Annotated[str | None, Form()] = None,
                         image: UploadFile | None = File(None), db: Session = Depends(get_db)):
    check(item, quantity, in_operation)
    r = General(item=item.strip(), quantity=quantity, in_operation=in_operation, bil=bil, location=location)
    if image:
        r.pic = await read_validated_image(image)
    db.add(r); db.commit(); db.refresh(r)
    return out(r, bool(image))

@router.put("/{id}")
async def update_general(id: int, item: Annotated[str, Form()], quantity: Annotated[int, Form()],
                         in_operation: Annotated[int, Form()], bil: Annotated[int | None, Form()] = None,
                         location: Annotated[str | None, Form()] = None,
                         remove_image: Annotated[bool, Form()] = False,
                         image: UploadFile | None = File(None), db: Session = Depends(get_db)):
    r = db.get(General, id)
    if not r:
        raise HTTPException(404, "Not found")
    check(item, quantity, in_operation)
    r.item, r.quantity, r.in_operation, r.bil, r.location = item.strip(), quantity, in_operation, bil, location
    if image:
        r.pic = await read_validated_image(image)
    elif remove_image:
        r.pic = None
    db.commit()
    return out(r, id in has_img(db, [id]))

@router.delete("/{id}", status_code=204)
def delete_general(id: int, db: Session = Depends(get_db)):
    r = db.get(General, id)
    if not r:
        raise HTTPException(404, "Not found")
    db.delete(r); db.commit()

@router.get("/{id}/image")
def general_image(id: int, db: Session = Depends(get_db)):
    data = db.scalar(select(General.pic).where(General.id == id))
    if not data:
        raise HTTPException(404, "No image")
    return Response(data, media_type=content_type(data), headers={"Cache-Control": "private, max-age=3600"})
