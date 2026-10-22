from sqlalchemy import Integer, LargeBinary, String, TIMESTAMP, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, deferred

class Base(DeclarativeBase):
    pass

# Image columns are BYTEA in PostgreSQL (LargeBinary) and deferred so list queries never load image bytes.
class General(Base):
    __tablename__ = "general"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bil: Mapped[int | None] = mapped_column(Integer)
    pic = deferred(mapped_column(LargeBinary))
    item: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    in_operation: Mapped[int] = mapped_column(Integer, default=0)
    location: Mapped[str | None] = mapped_column(String(255))

class DecoRoom(Base):
    __tablename__ = "deco_room"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bil: Mapped[int | None] = mapped_column(Integer)
    picture = deferred(mapped_column(LargeBinary))
    item_code: Mapped[str | None] = mapped_column(String(255))
    item_name: Mapped[str] = mapped_column(String(255))
    pcs: Mapped[int] = mapped_column(Integer, default=0)
    location: Mapped[str | None] = mapped_column(String(255))

class ItWriteOff(Base):
    __tablename__ = "it_write_off"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    no: Mapped[str | None] = mapped_column(String(255))
    picture = deferred(mapped_column(LargeBinary))
    item: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    location: Mapped[str | None] = mapped_column(String(255))

class RuijieReyee(Base):
    __tablename__ = "ruijie_reyee"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bil: Mapped[int | None] = mapped_column(Integer)
    serial_number: Mapped[str | None] = mapped_column(String(255))
    kuantiti: Mapped[int] = mapped_column(Integer, default=0)
    location: Mapped[str | None] = mapped_column(String(255))
    picture = deferred(mapped_column(LargeBinary))

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password: Mapped[str] = mapped_column(String(255))
    created_at = mapped_column(TIMESTAMP, server_default=func.current_timestamp())
