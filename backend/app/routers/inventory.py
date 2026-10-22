from app.db.models import DecoRoom, ItWriteOff, RuijieReyee
from app.routers.crud_factory import make_router

deco = make_router("/deco-room", DecoRoom, "picture", {
    "bil": ("int", False, 0), "item_code": ("str", False, 50), "item_name": ("str", True, 255),
    "pcs": ("int", True, 0), "location": ("str", False, 150)}, ["item_code", "item_name"], "deco-room")

ruijie = make_router("/ruijie-reyee", RuijieReyee, "picture", {
    "bil": ("int", False, 0), "serial_number": ("str", False, 100),
    "kuantiti": ("int", True, 0), "location": ("str", False, 150)}, ["serial_number"], "ruijie-reyee")

writeoff = make_router("/write-offs", ItWriteOff, "picture", {
    "no": ("str", False, 50), "item": ("str", True, 255),
    "quantity": ("int", True, 0), "location": ("str", False, 150)}, ["item", "no"], "write-offs")
