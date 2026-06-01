.PHONY: serve setup build docker-up docker-up-d docker-down docker-logs docker-build docker-ps

# 一键安装前后端所有依赖
setup:
	uv sync --directory apps/api && pnpm install

# 启动一体化开发服务器（http://localhost:8000）
# vite build --watch 自动重新构建前端，刷新浏览器即可看到变更
serve:
	python scripts/serve.py

# 构建前端（生产部署前执行）
build:
	@python scripts/banner.py
	cd apps/web && pnpm build

# ── Docker 一键部署 ─────────────────────────────────────────────

# 构建并启动 Docker 容器（前台，查看日志用 Ctrl+C 停止）
docker-up:
	docker compose up

# 构建并启动 Docker 容器（后台守护式）
docker-up-d:
	docker compose up -d

# 停止 Docker 容器
docker-down:
	docker compose down

# 查看 Docker 容器日志
docker-logs:
	docker compose logs -f

# 仅重新构建镜像（不启动容器）
docker-build:
	docker compose build

# 查看运行状态
docker-ps:
	docker compose ps
