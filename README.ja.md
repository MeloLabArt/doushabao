<p align="center">
  <img src="apps/web/src/assets/images/logo.png" alt="Doushabao ロゴ" width="160" />
</p>

<h1 align="center">Doushabao（豆沙包）</h1>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.zh-Hant.md">繁體中文</a> ·
  <strong>日本語</strong> ·
  <a href="README.ko.md">한국어</a>
</p>

**Doushabao（豆沙包）** は、オープンソースのブラウザベース AI 画像エディターです。マスコットのように——一口かじったあん入りまんじゅうから、たっぷりのあんがのぞく——アプリは温かみがあり、親しみやすく、大切なことに集中します。画像を、編集のたびに少しずつ良くしていくことです。

強力な AI 編集を求めながら、重いデスクトップワークフローは避けたいクリエイター向けに設計され、Doushabao はブラウザだけで動作し、2 つの補完的なモードを提供します。

- **Agent モード** — 自然言語で望む編集を説明すると、AI が画像を分析し、インテリジェントな編集を自動で適用します。
- **Editor モード** — キャンバス上で領域を指定し、精密で局所的な指示により細かい制御が可能です。

写真のレタッチ、不要物の除去、ディテールの調整など、Doushabao は手順をシンプルに保ちます。画像を開き、AI で編集し、結果を書き出す——すべて、すっきりしたワークスペース UI で完結します。

オープンソース。プライバシーに配慮。インストール不要。

## Monorepo

本リポジトリは、[pnpm workspace](https://pnpm.io/workspaces) と [Turborepo](https://turbo.build/) で管理されるマルチパッケージ monorepo です。

```
.
├── apps/
│   └── web/          # Vue + Vite Web アプリ (@doushabao/web)
├── packages/
│   ├── agents/       # Agent オーケストレーションとツール (@doushabao/agents)
│   └── core/         # 共有 TypeScript ライブラリ (@doushabao/core)
├── pnpm-workspace.yaml
└── turbo.json
```

## 開発

リポジトリのルートで実行：

```bash
pnpm install
pnpm dev          # core + agents (tsc --watch) + web (vite)。先に workspace パッケージを一度ビルド
pnpm build        # すべてのパッケージをビルド
pnpm lint         # すべてのパッケージを lint
pnpm test:unit    # ユニットテストを実行
```

単一アプリのみ（例：`apps/web`）：

```bash
pnpm --filter @doushabao/web dev
```

## ライセンス

本プロジェクトは [MIT License](LICENSE) の下で提供されています。
