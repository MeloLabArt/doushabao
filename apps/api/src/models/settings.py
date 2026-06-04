from __future__ import annotations

import json
import os

from sqlmodel import Field, Session, SQLModel, create_engine

# ── Data directory (override via DOUSHABAO_DATA_DIR for Docker) ──
_DATA_DIR = os.environ.get("DOUSHABAO_DATA_DIR")
if _DATA_DIR:
    _db_path = os.path.join(_DATA_DIR, "doushabao.db")
    DATABASE_URL = f"sqlite:///{_db_path}"
    WORKSPACE_IMAGES_DIR = os.path.join(_DATA_DIR, "workspace_images")
else:
    DATABASE_URL = "sqlite:///./doushabao.db"
    WORKSPACE_IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "workspace_images")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


class AppConfig(SQLModel, table=True):
    """Singleton table storing all app configuration (one row, always id=1)."""

    __tablename__ = "app_config"

    id: int = Field(default=1, primary_key=True)
    # JSON-serialized AppSettings (providers, models, defaultModelId, etc.)
    app_settings: str = Field(default="{}")
    theme: str = Field(default="light")
    locale: str = Field(default="en")
    last_workspace: str = Field(default="")


class WorkspaceRecord(SQLModel, table=True):
    """Saved workspace metadata (image/video data stored on filesystem)."""

    __tablename__ = "workspaces"

    id: str = Field(primary_key=True)
    title: str = Field(default="未命名")
    created_at: int = Field(default=0)
    updated_at: int = Field(default=0)
    has_source_image: bool = Field(default=False)
    has_source_video: bool = Field(default=False)
    workspace_type: str = Field(default="image")
    video_width: int = Field(default=1080)
    video_height: int = Field(default=1920)


def get_session() -> Session:
    return Session(engine)


def init_db() -> None:
    """Create tables and ensure the singleton row exists."""
    SQLModel.metadata.create_all(engine)
    os.makedirs(WORKSPACE_IMAGES_DIR, exist_ok=True)
    os.makedirs(WORKSPACE_VIDEOS_DIR, exist_ok=True)

    # Migrate: add workspace_type column if missing
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("workspaces")]
    if "workspace_type" not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN workspace_type TEXT NOT NULL DEFAULT 'image'"))
            conn.commit()
    if "video_width" not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN video_width INTEGER NOT NULL DEFAULT 1080"))
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN video_height INTEGER NOT NULL DEFAULT 1920"))
            conn.commit()
    if "has_source_video" not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN has_source_video BOOLEAN NOT NULL DEFAULT false"))
            conn.commit()

    with Session(engine) as session:
        row = session.get(AppConfig, 1)
        if row is None:
            session.add(AppConfig())
            session.commit()


def get_config(session: Session) -> AppConfig:
    row = session.get(AppConfig, 1)
    if row is None:
        row = AppConfig()
        session.add(row)
        session.commit()
        session.refresh(row)
    return row


# ── Workspace image file helpers ───────────────────────────────

def get_workspace_image_path(workspace_id: str) -> str:
    os.makedirs(WORKSPACE_IMAGES_DIR, exist_ok=True)
    return os.path.join(WORKSPACE_IMAGES_DIR, f"{workspace_id}.json")


def save_workspace_image_file(workspace_id: str, data_url: str | None) -> None:
    path = get_workspace_image_path(workspace_id)
    if data_url is None:
        if os.path.isfile(path):
            os.remove(path)
        return
    with open(path, "w") as f:
        json.dump({"dataUrl": data_url}, f)


def load_workspace_image_file(workspace_id: str) -> str | None:
    path = get_workspace_image_path(workspace_id)
    if not os.path.isfile(path):
        return None
    try:
        with open(path) as f:
            data = json.load(f)
            return data.get("dataUrl")
    except (json.JSONDecodeError, KeyError):
        return None


def delete_workspace_image_file(workspace_id: str) -> None:
    save_workspace_image_file(workspace_id, None)


# ── Workspace video file helpers ───────────────────────────────
#
# Videos are stored as raw binary files (not base64 JSON) because
# data URLs for video are impractically large. A sidecar JSON file
# tracks the content type.

if _DATA_DIR:
    WORKSPACE_VIDEOS_DIR = os.path.join(_DATA_DIR, "workspace_videos")
else:
    WORKSPACE_VIDEOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "workspace_videos")


def get_workspace_video_path(workspace_id: str) -> str:
    os.makedirs(WORKSPACE_VIDEOS_DIR, exist_ok=True)
    return os.path.join(WORKSPACE_VIDEOS_DIR, f"{workspace_id}.bin")


def get_workspace_video_meta_path(workspace_id: str) -> str:
    return os.path.join(WORKSPACE_VIDEOS_DIR, f"{workspace_id}.meta.json")


def save_workspace_video_file(
    workspace_id: str,
    raw_bytes: bytes | None,
    content_type: str = "video/mp4",
) -> None:
    """Write raw video bytes + sidecar metadata file."""
    bin_path = get_workspace_video_path(workspace_id)
    meta_path = get_workspace_video_meta_path(workspace_id)

    if raw_bytes is None:
        # Delete both files
        for p in (bin_path, meta_path):
            if os.path.isfile(p):
                os.remove(p)
        return

    with open(bin_path, "wb") as f:
        f.write(raw_bytes)
    with open(meta_path, "w") as f:
        json.dump({"contentType": content_type}, f)


def load_workspace_video_file(workspace_id: str) -> bytes | None:
    """Read raw video bytes. Returns None if not found."""
    path = get_workspace_video_path(workspace_id)
    if not os.path.isfile(path):
        return None
    with open(path, "rb") as f:
        return f.read()


def load_workspace_video_meta(workspace_id: str) -> str | None:
    """Read video content type from sidecar metadata."""
    path = get_workspace_video_meta_path(workspace_id)
    if not os.path.isfile(path):
        return None
    try:
        with open(path) as f:
            data = json.load(f)
            return data.get("contentType")
    except (json.JSONDecodeError, KeyError):
        return None


def delete_workspace_video_file(workspace_id: str) -> None:
    save_workspace_video_file(workspace_id, None)
