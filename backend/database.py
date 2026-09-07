import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Local dev defaults to SQLite (zero setup). On Railway, set DATABASE_URL to the
# Postgres connection string Railway provides and this switches automatically.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./btm_register.db")

# Railway/Heroku-style URLs come as postgres:// or postgresql://. SQLAlchemy needs
# an explicit driver in the scheme - we use psycopg (v3), which has prebuilt wheels
# for current Python versions (unlike psycopg2-binary, which fails to build on
# Railway's newer Python images since it has no matching prebuilt wheel there).
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
