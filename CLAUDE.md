# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MediHut RxFill** is a two-service web app that takes an Indian pharmacy stock Excel/CSV file, sends each medicine's brand name to an AI provider (Claude, OpenAI, or Gemini), and produces a fully-filled 30-column product catalog Excel output. The app processes medicines in configurable batch sizes and streams progress back to the browser via Server-Sent Events (SSE).

## Commands

### Backend (NestJS — `backend/`)
```bash
npm run start:dev       # development with hot reload
npm run start:prod      # production (requires prior build)
npm run build           # compile TypeScript to dist/
npm run lint            # eslint with auto-fix
npm run test            # jest unit tests
npm run test:e2e        # end-to-end tests
npm run test:cov        # coverage report
```

### Frontend (Next.js — `frontend/`)
```bash
npm run dev             # development server on :3000
npm run build           # production build
npm run lint            # eslint
```

### Running the full stack locally
- Backend runs on `http://localhost:3001`
- Frontend runs on `http://localhost:3000`
- CORS is pre-configured for localhost; set `FRONTEND_URL` env var for production deployments
- Backend `PORT` env var overrides the default 3001

## Architecture

### Backend (`backend/src/`)

Three NestJS modules wired together in `app.module.ts`:

**`ai/`** — All AI provider calls
- `ai.service.ts`: `callProvider()` dispatches to Claude/OpenAI/Gemini, retries up to 3× on rate-limit (429) with 30s/60s exponential backoff. Parses AI JSON responses with a 3-tier fallback (full parse → truncated recovery → object-level extraction).
- `prompts.ts`: System and user prompt templates. The system prompt enforces that Brand Name must be returned character-for-character as provided (critical invariant — AI tends to rename medicines).

**`excel/`** — File I/O
- `excel.service.ts`: In-memory stores for uploads (`Map<uploadId, ParsedExcel>`) and results (`Map<downloadId, buffer>`). Results auto-expire after 30 minutes. Handles header-row auto-detection (first row with ≥3 non-empty cells, searched in first 12 rows). `buildOutput()` constructs the 30-column output defined in `REQUIRED_COLUMNS`.
- `excel.controller.ts`: `POST /api/excel/upload` (multipart, 10MB limit, .xlsx/.xls/.csv) and `GET /api/excel/download/:id`.

**`generate/`** — Orchestration
- `generate.service.ts`: Async generator `generate()` yields `ProgressEvent` objects. After each successful batch, it stores a partial result file so users can download intermediate output. Pause/resume is controlled by `pauseMap`.
- `generate.controller.ts`: `POST /api/generate/start` streams events via SSE. `POST /api/generate/pause` and `/resume` control the in-memory pause flag.

**`common/`**
- `types/index.ts`: All shared TypeScript interfaces (`AiMedicineData`, `ColumnMapping`, `ProgressEvent`, etc.) and the `REQUIRED_COLUMNS` / `FOOTER_KEYWORDS` constants.
- `dto/`: Request validation DTOs using `class-validator`.

### Frontend (`frontend/src/`)

Single-page app with a wizard-style flow (4 steps: Provider → File Upload → Column Mapping + Settings → Progress/Results).

- `app/page.tsx`: Root component. Uses `useReducer` for all wizard state; the reducer is the single source of truth. Auto-detects column mapping from uploaded file headers using hint keywords defined in `lib/types.ts` (`FIELD_MAPPINGS`).
- `lib/api.ts`: API client that calls backend endpoints. SSE consumption for generation progress.
- `lib/types.ts`: Frontend type definitions mirroring the backend, plus `PROVIDERS` (provider metadata, model lists) and `FIELD_MAPPINGS` (column auto-detection hints).
- `components/`: One file per UI panel — `ProviderSelector`, `FileUpload`, `ColumnMappingPanel`, `Settings`, `ProgressPanel`, `ResultsPanel`, `Header`, `StepIndicator`. Each is a pure-ish component that receives props from the root reducer.

### Key Data Flow

1. User uploads Excel → `ExcelService.parseUpload()` → returns `uploadId`
2. User maps columns → stored in frontend state as `ColumnMapping`
3. User clicks Generate → frontend `POST /api/generate/start` with uploadId + columnMapping + AI config
4. Backend streams `ProgressEvent` objects as SSE; after each batch, a `partialDownloadId` is emitted so partial downloads are available
5. On `complete` event, frontend receives `downloadId` → user downloads from `GET /api/excel/download/:id`

### AI Response Handling

The AI is expected to return a JSON array in the same order as input. `matchResults()` in `generate.service.ts` maps results **positionally** (not by name matching) then overwrites the `Brand Name` field with the exact input string to prevent AI renaming. Max tokens scales with batch size: `min(4000, batchSize × 500)`.
