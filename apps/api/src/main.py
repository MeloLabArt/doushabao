from __future__ import annotations

import logging
import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.types import Receive, Scope, Send

from .config import settings
from .livereload import LiveReload, inject_reload_script
from .models.settings import init_db
from .routers import agent, editor, health, settings, workspaces

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

DEV_MODE = os.environ.get("DOUSHABAO_DEV") == "1"

FRONTEND_DIST = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "web", "dist")
)

_livereload: LiveReload | None = None


class DevStaticFiles(StaticFiles):
    """StaticFiles with no-cache headers."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        original_send = send

        async def send_dev(message: dict) -> None:
            if message["type"] == "http.response.start":
                headers = dict(message.get("headers", []))
                headers[b"cache-control"] = b"no-cache, no-store, must-revalidate"
                message["headers"] = list(headers.items())
            await original_send(message)

        await super().__call__(scope, receive, send_dev)


def _create_app() -> FastAPI:
    app = FastAPI(
        title="Doushabao API",
        version="0.1.0",
        description="Backend service for Doushabao AI Image Editor",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(agent.router)
    app.include_router(editor.router)
    app.include_router(settings.router)
    app.include_router(workspaces.router)

    if DEV_MODE and os.path.isdir(FRONTEND_DIST):
        global _livereload
        _livereload = LiveReload(FRONTEND_DIST)

        # SSE endpoint — registered before static mount
        @app.get("/__reload")
        async def reload_sse():
            from fastapi.responses import StreamingResponse

            assert _livereload is not None
            return StreamingResponse(
                _livereload.sse_generator(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            )

        # Middleware to inject reload script into HTML responses
        @app.middleware("http")
        async def inject_reload(request, call_next):
            response = await call_next(request)
            if isinstance(response, HTMLResponse):
                body = response.body.decode("utf-8")
                if "</body>" in body:
                    return HTMLResponse(
                        inject_reload_script(body),
                        status_code=response.status_code,
                        headers=dict(response.headers),
                    )
            return response

        app.mount("/", DevStaticFiles(directory=FRONTEND_DIST, html=True))
        logger.info("Dev mode: serving from %s with live-reload", FRONTEND_DIST)
    else:
        if os.path.isdir(FRONTEND_DIST):
            app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True))
            logger.info("Serving frontend from %s", FRONTEND_DIST)
        else:
            logger.info("No frontend build found — API-only mode")

    @app.on_event("startup")
    async def startup():
        logger.info("Doushabao API starting up...")
        init_db()
        if _livereload is not None:
            await _livereload.start()

    @app.on_event("shutdown")
    async def shutdown():
        logger.info("Doushabao API shutting down...")

    return app


app = _create_app()


def start():
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )


if __name__ == "__main__":
    start()
