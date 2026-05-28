<p align="center">
  <img src="apps/web/src/assets/images/logo.png" alt="豆沙包 logo" width="160" />
</p>

<h1 align="center">豆沙包</h1>

<p align="center">
  <a href="README.md">English</a> ·
  <strong>简体中文</strong> ·
  <a href="README.zh-Hant.md">繁體中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.ko.md">한국어</a>
</p>

**豆沙包（Doushabao）** 是一款开源、基于浏览器的 AI 图像编辑器。就像它的吉祥物——一只被咬了一口的可爱包子，露出饱满的豆沙馅——应用温暖、易用，专注于一件事：让你的图片更好，一次编辑一点进步。

为希望获得强大 AI 编辑能力、又不想被繁重桌面工作流束缚的创作者而打造，豆沙包完全在浏览器中运行，提供两种互补模式：

- **Agent 模式** — 用自然语言描述你想要的效果；AI 会分析图像并自动应用智能编辑。
- **Editor 模式** — 在画布上标记区域，给出精确、局部的指令，实现细粒度控制。

无论是修图、去除干扰物还是打磨细节，豆沙包都让流程保持简单：打开图片、用 AI 编辑、导出结果——一切都在简洁的工作区界面中完成。

开源。注重隐私。无需安装。

## Monorepo

本仓库是由 [pnpm workspace](https://pnpm.io/workspaces) 与 [Turborepo](https://turbo.build/) 管理的多包 monorepo。

```
.
├── apps/
│   └── web/          # Vue + Vite 网页应用 (@doushabao/web)
├── packages/
│   ├── agents/       # Agent 编排与工具 (@doushabao/agents)
│   └── core/         # 共享 TypeScript 库 (@doushabao/core)
├── pnpm-workspace.yaml
└── turbo.json
```

## 开发

在仓库根目录执行：

```bash
pnpm install
pnpm dev          # core + agents (tsc --watch) + web (vite)；会先构建一次 workspace 包
pnpm build        # 构建所有包
pnpm lint         # 对所有包进行 lint
pnpm test:unit    # 运行单元测试
```

仅运行单个应用（例如 `apps/web`）：

```bash
pnpm --filter @doushabao/web dev
```

## 许可证

本项目采用 [MIT License](LICENSE) 授权。
