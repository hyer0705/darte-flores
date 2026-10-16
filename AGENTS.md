# Darte Flores — Workspace Subagents & Architecture Guide

이 프로젝트(`darte-flores`)에는 역할별로 분리된 3개의 전문 서브에이전트가 구성되어 있습니다.

## Subagents 목록 (`.agents/agents/`)

1. **`frontend-ui-agent`** (`.agents/agents/frontend-ui-agent.md`)
   - **담당 영역**: 프론트엔드 UI/UX (`src/App.tsx`, `src/components/FloristGuideModal.tsx`) 및 Three.js 3D 뷰어 (`src/components/BouquetCanvas3D.tsx`)
   - **핵심 기준**: `docs/DESIGN.md` (One Screen One Focus, Darte Flores 컬러 팔레트), 스파이럴 핸드타이드 3D 배치, 2D-3D 양방향 동기화

2. **`gemini-backend-agent`** (`.agents/agents/gemini-backend-agent.md`)
   - **담당 영역**: Express API 서버 (`server.ts`) 및 클라이언트 서비스 (`src/services/geminiService.ts`)
   - **핵심 기준**: `@google/genai` SDK 연동, 멀티모달 이미지 적합성 검증, 한국 플라워샵 소매 단가 및 기본 포장비(`7,000원`) 반영, 오프라인/지연 대비 Fallback 데이터

3. **`cloudrun-deploy-agent`** (`.agents/agents/cloudrun-deploy-agent.md`)
   - **담당 영역**: Google Cloud Run 컨테이너 패키징 (`Dockerfile`, `.dockerignore`, `package.json`) 및 Cloud Run MCP 기반 배포/모니터링
   - **핵심 기준**: `NODE_ENV=production` 정적 빌드(`dist`) 서빙 및 `PORT` 바인딩 검증
