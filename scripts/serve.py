"""
一体化开发服务器 — vite build --watch + FastAPI，单端口 8000。

流程：
  1. vite build --watch 后台运行（首次自动构建，之后监听变更增量重建）
  2. 等待构建完成（dist/index.html 出现）
  3. uvicorn 前台运行（端口 8000），提供 API + 前端静态文件
  4. 前端代码变更 → 自动重新构建 → 浏览器自动刷新
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from banner import banner  # type: ignore[import-untyped]


def _wait_for_build(web_dir: str, timeout: float = 30.0) -> bool:
    """Wait until dist/index.html exists (vite initial build done)."""
    index = os.path.join(web_dir, "dist", "index.html")
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if os.path.isfile(index):
            return True
        time.sleep(0.3)
    return False


def main() -> None:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    web_dir = os.path.join(root, "apps", "web")
    api_dir = os.path.join(root, "apps", "api")

    # ── Step 1: vite build --watch in background ─────────────
    # 启动时自动构建一次，之后监听变更增量重建
    vite_env = os.environ.copy()
    vite_env["VITE_DEV_SERVE"] = "true"
    vite_proc = subprocess.Popen(
        ["pnpm", "exec", "vite", "build", "--watch"],
        cwd=web_dir,
        env=vite_env,
    )

    def cleanup() -> None:
        if vite_proc.poll() is None:
            vite_proc.terminate()
            vite_proc.wait()

    # ── Step 2: wait for initial build ───────────────────────
    if not _wait_for_build(web_dir):
        print("ERROR: Frontend build did not complete in time.")
        cleanup()
        sys.exit(1)

    # ── Step 3: uvicorn in foreground via uv ─────────────────
    uvicorn_proc: subprocess.Popen[bytes] | None = None
    try:
        print(banner())

        env = os.environ.copy()
        env["DOUSHABAO_DEV"] = "1"

        uvicorn_proc = subprocess.Popen(
            [
                "uv", "run", "uvicorn", "src.main:app",
                "--reload", "--host", "0.0.0.0", "--port", "8000",
            ],
            cwd=api_dir,
            env=env,
        )

        def sighandler(signum, frame):
            if uvicorn_proc.poll() is None:
                uvicorn_proc.send_signal(signal.SIGTERM)

        signal.signal(signal.SIGTERM, sighandler)
        signal.signal(signal.SIGINT, sighandler)

        uvicorn_proc.wait()
    except KeyboardInterrupt:
        if uvicorn_proc is not None and uvicorn_proc.poll() is None:
            uvicorn_proc.terminate()
            uvicorn_proc.wait()
    finally:
        cleanup()


if __name__ == "__main__":
    main()
