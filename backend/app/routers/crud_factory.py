"""Generic CRUD + image router for the simple tables (deco_room, ruijie_reyee, it_write_off)."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.dependencies.authentication import current_user
from app.services.image_service import content_type, read_validated_image

def make_router(prefix, model, img, fields, search, tag):
    """fields = {name: (kind 'str'|'int', required, maxlen)}"""
    r = APIRouter(prefix=prefix, tags=[tag], dependencies=[Depends(current_user)])
    img_col = getattr(model, img)
    cols = ["id", *fields]
    sortable = {c: getattr(model, c) for c in cols}

    def out(row, has):
        d = {c: getattr(row, c) for c in cols}
        d["has_image"] = has
        return d

    def has_imgs(db, ids):
        if not ids:
            return set()
        return set(db.scalars(select(model.id).where(model.id.in_(ids), img_col.is_not(None))))

    async def parse(request: Request):
        form = await request.form()
        data = {}
        for name, (kind, req, maxlen) in fields.items():
            v = form.get(name)
            v = v.strip() if isinstance(v, str) else None
            if not v:
                if req and kind == "str":
                    raise HTTPException(422, f"{name} is required")
                data[name] = 0 if (req and kind == "int") else None
            elif kind == "int":
                try:
                    n = int(v)
                except ValueError:
                    raise HTTPException(422, f"{name} must be a whole number")
                if n < 0:
                    raise HTTPException(422, f"{name} cannot be negative")
                data[name] = n
            else:
                if len(v) > maxlen:
                    raise HTTPException(422, f"{name} is too long (max {maxlen})")
                data[name] = v
        f = form.get("image")
        blob = await read_validated_image(f) if f is not None and hasattr(f, "read") and f.filename else None
        return data, blob, form.get("remove_image") in ("true", "1", "on")

    @r.get("")
    def list_(db: Session = Depends(get_db), q: str | None = None, location: str | None = None,
              sort: str = "id", order: str = Query("asc", pattern="^(asc|desc)$"),
              page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100)):
        if sort not in sortable:
            raise HTTPException(422, "Invalid sort column")
        stmt = select(model)
        if q:
            stmt = stmt.where(or_(*[getattr(model, c).ilike(f"%{q}%") for c in search]))
        if location:
            stmt = stmt.where(model.location == location)
        total = db.scalar(select(func.count()).select_from(stmt.subquery()))
        col = sortable[sort]
        rows = db.scalars(stmt.order_by(col.desc() if order == "desc" else col.asc())
                          .offset((page - 1) * size).limit(size)).all()
        imgs = has_imgs(db, [x.id for x in rows])
        return {"items": [out(x, x.id in imgs) for x in rows], "total": total, "page": page, "size": size}

    @r.get("/{id}")
    def get_(id: int, db: Session = Depends(get_db)):
        row = db.get(model, id)
        if not row:
            raise HTTPException(404, "Not found")
        return out(row, id in has_imgs(db, [id]))

    @r.post("", status_code=201)
    async def create(request: Request, db: Session = Depends(get_db)):
        data, blob, _ = await parse(request)
        row = model(**data)
        if blob:
            setattr(row, img, blob)
        db.add(row); db.commit(); db.refresh(row)
        return out(row, bool(blob))

    @r.put("/{id}")
    async def update(id: int, request: Request, db: Session = Depends(get_db)):
        row = db.get(model, id)
        if not row:
            raise HTTPException(404, "Not found")
        data, blob, remove = await parse(request)
        for k, v in data.items():
            setattr(row, k, v)
        if blob:
            setattr(row, img, blob)
        elif remove:
            setattr(row, img, None)
        db.commit()
        return out(row, id in has_imgs(db, [id]))

    @r.delete("/{id}", status_code=204)
    def delete(id: int, db: Session = Depends(get_db)):
        row = db.get(model, id)
        if not row:
            raise HTTPException(404, "Not found")
        db.delete(row); db.commit()

    @r.get("/{id}/image")
    def image(id: int, db: Session = Depends(get_db)):
        data = db.scalar(select(img_col).where(model.id == id))
        if not data:
            raise HTTPException(404, "No image")
        return Response(data, media_type=content_type(data), headers={"Cache-Control": "private, max-age=3600"})

    return r
