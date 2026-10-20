import io
from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from app.core.config import settings

ALLOWED = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}

async def read_validated_image(file: UploadFile) -> bytes:
    limit = settings.max_upload_size_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"Image exceeds {settings.max_upload_size_mb} MB")
    try:
        with Image.open(io.BytesIO(data)) as im:
            fmt = im.format
            im.verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "File is not a valid image")
    if fmt not in ALLOWED:
        raise HTTPException(422, "Only JPEG, PNG and WebP are allowed")
    return data

def content_type(data: bytes) -> str:
    with Image.open(io.BytesIO(data)) as im:
        return ALLOWED.get(im.format, "application/octet-stream")
