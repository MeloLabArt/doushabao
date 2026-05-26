# doushabao

豆沙包：一款开源的 AI P 图软件

## Monorepo

本仓库使用 [pnpm workspace](https://pnpm.io/workspaces) 与 [Turborepo](https://turbo.build/) 管理多包项目。

```
.
├── apps/
│   └── web/          # Vue + Vite 前端应用 (@doushabao/web)
├── packages/         # 共享库（可按需添加）
├── pnpm-workspace.yaml
└── turbo.json
```

## 开发

在仓库根目录执行：

```bash
pnpm install
pnpm dev          # 启动 apps/web
pnpm build        # 构建所有包
pnpm lint         #  lint 所有包
pnpm test:unit    # 运行单元测试
```

在单个应用中执行（例如 `apps/web`）：

```bash
pnpm --filter @doushabao/web dev
```
