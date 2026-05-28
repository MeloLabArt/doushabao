<p align="center">
  <img src="apps/web/src/assets/images/logo.png" alt="Doushabao 로고" width="160" />
</p>

<h1 align="center">Doushabao（豆沙包）</h1>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.zh-Hant.md">繁體中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <strong>한국어</strong>
</p>

**Doushabao（豆沙包）** 는 오픈 소스, 브라우저 기반 AI 이미지 편집기입니다. 마스코트처럼——한 입 베어 물어 속이 드러난 팥소만——앱은 따뜻하고 친근하며, 중요한 것에 집중합니다. 이미지를 편집할 때마다 조금씩 더 나아지게 하는 것입니다.

강력한 AI 편집을 원하지만 무거운 데스크톱 워크플로는 피하고 싶은 크리에이터를 위해 만들어졌으며, Doushabao 는 브라우저에서만 동작하며 두 가지 상호 보완 모드를 제공합니다.

- **Agent 모드** — 자연어로 원하는 편집을 설명하면, AI 가 이미지를 분석하고 지능형 편집을 자동으로 적용합니다.
- **Editor 모드** — 캔버스에서 영역을 표시하고 정밀하고 국소적인 지시로 세밀한 제어가 가능합니다.

사진 보정, 방해 요소 제거, 디테일 다듬기 등 어떤 작업이든 Doushabao 는 과정을 단순하게 유지합니다. 이미지를 열고, AI 로 편집하고, 결과를출력하기——모두 깔끔한 워크스페이스 UI 안에서 완료됩니다.

오픈 소스. 프라이버시 친화적. 설치 불필요.

## Monorepo

이 저장소는 [pnpm workspace](https://pnpm.io/workspaces) 와 [Turborepo](https://turbo.build/) 로 관리되는 멀티 패키지 monorepo 입니다.

```
.
├── apps/
│   └── web/          # Vue + Vite 웹 앱 (@doushabao/web)
├── packages/
│   ├── agents/       # Agent 오케스트레이션 및 도구 (@doushabao/agents)
│   └── core/         # 공유 TypeScript 라이브러리 (@doushabao/core)
├── pnpm-workspace.yaml
└── turbo.json
```

## 개발

저장소 루트에서 실행:

```bash
pnpm install
pnpm dev          # core + agents (tsc --watch) + web (vite); workspace 패키지를 먼저 한 번 빌드
pnpm build        # 모든 패키지 빌드
pnpm lint         # 모든 패키지 lint
pnpm test:unit    # 단위 테스트 실행
```

단일 앱만 실행할 때(예: `apps/web`):

```bash
pnpm --filter @doushabao/web dev
```

## 라이선스

이 프로젝트는 [MIT License](LICENSE) 로 배포됩니다.
