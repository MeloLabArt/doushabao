<p align="center">
  <img src="apps/web/src/assets/images/logo.png" alt="豆沙包 logo" width="160" />
</p>

<h1 align="center">豆沙包</h1>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <strong>繁體中文</strong> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.ko.md">한국어</a>
</p>

**豆沙包（Doushabao）** 是一款開源、基於瀏覽器的 AI 圖像編輯器。就像它的吉祥物——一隻被咬了一口的可愛包子，露出飽滿的豆沙餡——應用溫暖、易用，專注於一件事：讓你的圖片更好，一次編輯一點進步。

為希望獲得強大 AI 編輯能力、又不想被繁重桌面工作流程束縛的創作者而打造，豆沙包完全在瀏覽器中運行，提供兩種互補模式：

- **Agent 模式** — 用自然語言描述你想要的效果；AI 會分析圖像並自動套用智慧編輯。
- **Editor 模式** — 在畫布上標記區域，給出精確、局部的指令，實現細粒度控制。

無論是修圖、去除干擾物還是打磨細節，豆沙包都讓流程保持簡單：開啟圖片、用 AI 編輯、匯出結果——一切都在簡潔的工作區介面中完成。

開源。注重隱私。無需安裝。

## Monorepo

本儲存庫是由 [pnpm workspace](https://pnpm.io/workspaces) 與 [Turborepo](https://turbo.build/) 管理的多套件 monorepo。

```
.
├── apps/
│   └── web/          # Vue + Vite 網頁應用 (@doushabao/web)
├── packages/
│   ├── agents/       # Agent 編排與工具 (@doushabao/agents)
│   └── core/         # 共用 TypeScript 函式庫 (@doushabao/core)
├── pnpm-workspace.yaml
└── turbo.json
```

## 開發

在儲存庫根目錄執行：

```bash
pnpm install
pnpm dev          # core + agents (tsc --watch) + web (vite)；會先建置一次 workspace 套件
pnpm build        # 建置所有套件
pnpm lint         # 對所有套件進行 lint
pnpm test:unit    # 執行單元測試
```

僅執行單一應用（例如 `apps/web`）：

```bash
pnpm --filter @doushabao/web dev
```

## 授權條款

本專案採用 [MIT License](LICENSE) 授權。
