.PHONY: serve setup build

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
