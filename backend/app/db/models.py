from sqlalchemy import Integer, String, TIMESTAMP, func
from sqlalchemy.dialects.mysql import INTEGER, LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, deferred

U = INTEGER(unsigned=True)

class Base(DeclarativeBase):
    pass

# BLOB columns are deferred so list queries never load image bytes.
class General(Base):
    __tablename__ = "general"
    id: Mapped[int] = mapped_column(U, primary_key=True, autoincrement=True)
    bil: Mapped[int | None] = mapped_column(Integer)
    pic = deferred(mapped_column(LONGBLOB))
    item: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(U, default=0)
    in_operation: Mapped[int] = mapped_column(U, default=0)
    location: Mapped[str | None] = mapped_column(String(150))

class DecoRoom(Base):
    __tablename__ = "deco_room"
    id: Mapped[int] = mapped_column(U, primary_key=True, autoincrement=True)
    bil: Mapped[int | None] = mapped_column(Integer)
    picture = deferred(mapped_column(LONGBLOB))
    item_code: Mapped[str | None] = mapped_column(String(50))
    item_name: Mapped[str] = mapped_column(String(255))
    pcs: Mapped[int] = mapped_column(U, default=0)
    location: Mapped[str | None] = mapped_column(String(150))

class ItWriteOff(Base):
    __tablename__ = "it_write_off"
    id: Mapped[int] = mapped_column(U, primary_key=True, autoincrement=True)
    no: Mapped[str | None] = mapped_column(String(50))
    picture = deferred(mapped_column(LONGBLOB))
    item: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(U, default=0)
    location: Mapped[str | None] = mapped_column(String(150))

class RuijieReyee(Base):
    __tablename__ = "ruijie_reyee"
    id: Mapped[int] = mapped_column(U, primary_key=True, autoincrement=True)
    bil: Mapped[int | None] = mapped_column(Integer)
    serial_number: Mapped[str | None] = mapped_column(String(100))
    kuantiti: Mapped[int] = mapped_column(U, default=0)
    location: Mapped[str | None] = mapped_column(String(150))
    picture = deferred(mapped_column(LONGBLOB))

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(U, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password: Mapped[str] = mapped_column(String(255))
    created_at = mapped_column(TIMESTAMP, server_default=func.current_timestamp())
