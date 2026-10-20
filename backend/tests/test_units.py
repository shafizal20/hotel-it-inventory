import io, os
os.environ.update(DB_USER="x", DB_PASSWORD="x", SESSION_SECRET="test-secret")
import asyncio, pytest
from fastapi import HTTPException, UploadFile
from PIL import Image
from app.routers.reports import safe
from app.services.image_service import read_validated_image
from app.core.security import hash_password, verify_password, make_session, read_session
from app.routers.general import check

def up(data, name="a.png"): return UploadFile(io.BytesIO(data), filename=name)

def png():
    b = io.BytesIO(); Image.new("RGB", (4, 4)).save(b, "PNG"); return b.getvalue()

def test_csv_injection(): assert safe("=1+1") == "'=1+1" and safe("ok") == "ok" and safe(None) == ""
def test_valid_image(): assert asyncio.run(read_validated_image(up(png())))
def test_fake_image():
    with pytest.raises(HTTPException): asyncio.run(read_validated_image(up(b"not an image", "a.png")))
def test_gif_rejected():
    b = io.BytesIO(); Image.new("RGB", (4, 4)).save(b, "GIF")
    with pytest.raises(HTTPException): asyncio.run(read_validated_image(up(b.getvalue())))
def test_password_and_session():
    h = hash_password("correct horse battery"); assert verify_password(h, "correct horse battery") and not verify_password(h, "x")
    assert read_session(make_session(7)) == 7 and read_session("tampered") is None
def test_quantity_rules():
    check("x", 5, 5)
    for args in [("x", 5, 6), ("x", -1, 0), ("", 1, 0)]:
        with pytest.raises(HTTPException): check(*args)
