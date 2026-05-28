<p align="center">
  <img src="apps/web/src/assets/images/logo.png" alt="Doushabao logo" width="160" />
</p>

<p align="center">
  <h1>Doushabao</h1>
</p>

**Doushabao** _(Chinese: 豆沙包 — a sweet red-bean bun)_ is an open-source, web-based AI image editor. Like its mascot — a cheerful steamed bun with a bite taken out to reveal rich red-bean filling — the app is warm, approachable, and focused on what matters: making your images better, one edit at a time.

Built for creators who want powerful AI editing without a heavy desktop workflow, Doushabao runs entirely in the browser and offers two complementary modes:

- **Agent mode** — describe what you want in natural language; the AI analyzes your image and applies intelligent edits automatically.
- **Editor mode** — mark regions on the canvas and give precise, localized instructions for fine-grained control.

Whether you are retouching a photo, cleaning up distractions, or refining details, Doushabao keeps the process simple: open an image, edit with AI, and export the result — all in a clean, workspace-driven interface.

Open source. Privacy-friendly. No install required.

## Monorepo

This repository is a multi-package monorepo managed with [pnpm workspace](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/).

```
.
├── apps/
│   └── web/          # Vue + Vite web app (@doushabao/web)
├── packages/
│   ├── agents/       # Agent orchestration and tools (@doushabao/agents)
│   └── core/         # Shared TypeScript library (@doushabao/core)
├── pnpm-workspace.yaml
└── turbo.json
```

## Development

From the repository root:

```bash
pnpm install
pnpm dev          # core + agents (tsc --watch) + web (vite); workspace packages are built once first
pnpm build        # build all packages
pnpm lint         # lint all packages
pnpm test:unit    # run unit tests
```

For a single app (for example, `apps/web`):

```bash
pnpm --filter @doushabao/web dev
```

## License

This project is licensed under the [MIT License](LICENSE).
