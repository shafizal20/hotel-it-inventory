import io
from PIL import Image
from conftest import PW

def png():
    b = io.BytesIO(); Image.new("RGB", (4, 4), "red").save(b, "PNG"); return b.getvalue()
G = {"item": "Switch", "quantity": "5", "in_operation": "3", "location": "Lobby"}

def test_unauthorized(client):
    assert client.get("/api/v1/general").status_code == 401
    assert client.get("/api/v1/dashboard/summary").status_code == 401
    assert client.get("/api/v1/reports/general").status_code == 401

def test_login_logout_me(client):
    assert client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrong"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"username": "admin", "password": PW}).status_code == 200
    me = client.get("/api/v1/auth/me"); assert me.json()["username"] == "admin" and "password" not in me.text
    client.post("/api/v1/auth/logout"); client.cookies.clear()
    assert client.get("/api/v1/auth/me").status_code == 401

def test_login_rate_limit(client):
    for _ in range(5):
        assert client.post("/api/v1/auth/login", json={"username": "admin", "password": "bad"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"username": "admin", "password": PW}).status_code == 429

def test_csrf_header_required(auth):
    assert auth.post("/api/v1/general", data=G, headers={"X-Requested-With": "x"}).status_code == 403

def test_general_crud_and_rules(auth):
    r = auth.post("/api/v1/general", data=G); assert r.status_code == 201
    row = r.json(); assert row["remaining"] == 2 and row["status"] == "partial"
    assert auth.post("/api/v1/general", data={**G, "in_operation": "9"}).status_code == 422
    assert auth.post("/api/v1/general", data={**G, "quantity": "-1"}).status_code == 422
    assert auth.post("/api/v1/general", data={**G, "item": " "}).status_code == 422
    u = auth.put(f"/api/v1/general/{row['id']}", data={**G, "in_operation": "5"}); assert u.json()["status"] == "full"
    assert auth.get("/api/v1/general", params={"q": "swit", "location": "Lobby"}).json()["total"] == 1
    assert auth.get("/api/v1/general", params={"q": "zzz"}).json()["total"] == 0
    assert auth.get("/api/v1/general", params={"sort": "id; DROP TABLE general"}).status_code == 422
    assert auth.delete(f"/api/v1/general/{row['id']}").status_code == 204
    assert auth.get(f"/api/v1/general/{row['id']}").status_code == 404

def test_pagination(auth):
    for i in range(5): auth.post("/api/v1/general", data={**G, "item": f"Item{i}"})
    p = auth.get("/api/v1/general", params={"size": 2, "page": 3, "sort": "item", "order": "desc"}).json()
    assert p["total"] == 5 and len(p["items"]) == 1

def test_images(auth):
    r = auth.post("/api/v1/general", data=G, files={"image": ("a.png", png(), "image/png")}); assert r.status_code == 201
    i = r.json()["id"]; assert r.json()["has_image"] and "pic" not in r.text
    img = auth.get(f"/api/v1/general/{i}/image"); assert img.headers["content-type"] == "image/png" and img.content == png()
    assert auth.post("/api/v1/general", data=G, files={"image": ("a.png", b"junk", "image/png")}).status_code == 422
    auth.put(f"/api/v1/general/{i}", data={**G, "remove_image": "true"})
    assert auth.get(f"/api/v1/general/{i}/image").status_code == 404

def test_other_tables(auth):
    d = auth.post("/api/v1/deco-room", data={"item_name": "Lamp", "item_code": "007-A", "pcs": "4", "location": "Room 1"}).json()
    assert d["item_code"] == "007-A" and auth.get("/api/v1/deco-room", params={"q": "007"}).json()["total"] == 1
    assert auth.post("/api/v1/deco-room", data={"pcs": "1"}).status_code == 422
    n = auth.post("/api/v1/ruijie-reyee", data={"kuantiti": "2", "location": "Rack"}).json()
    assert n["kuantiti"] == 2 and n["serial_number"] is None
    w = auth.post("/api/v1/write-offs", data={"no": "WO-1", "item": "Old PC", "quantity": "1"}).json()
    assert auth.get("/api/v1/write-offs", params={"q": "WO-1"}).json()["total"] == 1
    assert auth.delete(f"/api/v1/write-offs/{w['id']}").status_code == 204

def test_dashboard(auth):
    auth.post("/api/v1/general", data=G); auth.post("/api/v1/deco-room", data={"item_name": "Lamp", "pcs": "4", "location": "Lobby"})
    s = auth.get("/api/v1/dashboard/summary").json()
    assert (s["general_quantity"], s["general_in_operation"], s["general_not_in_operation"]) == (5, 3, 2)
    assert {c["category"]: c["quantity"] for c in s["categories"]}["Deco Room"] == 4
    assert auth.get("/api/v1/dashboard/by-location").json()[0]["location"] == "Lobby"
    assert auth.get("/api/v1/dashboard/operations").json()["partial"] == 1

def test_reports(auth):
    auth.post("/api/v1/general", data={**G, "item": "=cmd|' /C calc'!A0"})
    c = auth.get("/api/v1/reports/general"); assert "'=cmd" in c.text and c.headers["content-type"].startswith("text/csv")
    p = auth.get("/api/v1/reports/export", params={"name": "general", "format": "pdf"}); assert p.content.startswith(b"%PDF")
    assert auth.get("/api/v1/reports/nope").status_code == 404

def test_health(client, monkeypatch):
    from sqlalchemy import create_engine
    import app.db.database as d
    monkeypatch.setattr(d, "engine", create_engine("sqlite://")); assert client.get("/health").status_code == 200
    monkeypatch.setattr(d, "engine", create_engine("sqlite:////nonexistent_dir/x.db")); assert client.get("/health").status_code == 503
