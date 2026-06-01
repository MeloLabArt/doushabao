# Doushabao Project Structure

## 原则

1. **pnpm** 管理前端（JS/TS）依赖（`apps/web/`）
2. **uv** 管理 Python 后端依赖（`apps/api/`）
3. 从项目根目录使用 `make` 命令
4. **AI 不能打开开发服务器**
5. 架构：Vue 前端（`apps/web/`） → Python FastAPI 后端（`apps/api/`） → AI 提供商（via litellm）
6. 所有业务逻辑（prompts、AI 编排、图片处理）都在 `apps/api/src/core/`——前端是纯 UI 层
7. 类型定义在 `apps/web/src/types/` 中
8. API 密钥可通过 `apps/api/.env` 配置或从前端传入
9. Python 依赖由 uv 管理（`uv sync --directory apps/api`）

## 工作方式

`make serve` 只开一个端口（http://localhost:8000）：

- **首次启动** — `vite build` 全量构建前端
- **后台监听** — `vite build --watch` 静默运行，前端代码变更自动重新构建
- **自动刷新** — 构建完成后浏览器立即自动刷新（无需手动操作）
- **后端热重启** — uvicorn `--reload`，后端代码变更自动重启

## 常用命令

```bash
# 初始安装（前后端一起装）
make setup

# 启动开发服务器（http://localhost:8000，前端自动刷新）
make serve

# 构建前端（生产部署前执行）
make build
```
