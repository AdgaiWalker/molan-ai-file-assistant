# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

## Project layout

Three subprojects in one folder (no workspaces):
- `mobile/` — React Native reader app (Expo SDK 57). Has its own `@mobile/AGENTS.md` with the Expo versioned-docs rule — read it before touching mobile code.
- `desktop/` — Electron + Vite + React reader & converter GUI. Two tabs: reading + conversion. Office↔Markdown conversion uses shared engine with CLI.
- `desktop/cli/` — Node CLI tool (`molan convert`). Office/PDF/PPT/Excel → Markdown, structured JSON output for AI/agent consumption. Main AI entry point.
- Root — early Python prototype (`mdconvert.py`) and the product spec.

`PRD.md` is the product source of truth. Consult the relevant section before implementing any feature (use the `/prd` skill).

## Commands

desktop/ (run inside `desktop/`):
- `npm run dev` — electron-vite dev
- `npm run build` — build
- `npm run build:dist` — build + NSIS installer (bundles pandoc.exe)
- `npm run typecheck` — tsc on node + web configs (main correctness check)

desktop/cli/ (run inside `desktop/cli/`):
- `npm run build` — esbuild bundle → `dist/index.js`
- `npm run typecheck` — tsc
- `node dist/index.js convert <file> --json` — Office → Markdown
- `node dist/index.js check` — verify pandoc is available

mobile/ (run inside `mobile/`):
- `npm run start` — `expo start`
- `npm run android` / `ios` / `web`
- Expo SDK 57 is recent; if writing Expo code, read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ first.

Root:
- `python scripts/download_pandoc.py` — download pandoc binary to `desktop/resources/`

## Architecture

### Conversion engine (shared, desktop + CLI)

`desktop/src/shared/converter.ts` is the single conversion engine used by both the Electron GUI (`electron/main/index.ts`) and the CLI (`cli/src/index.ts`). It wraps pandoc and provides:

- `convertFile(inputPath, outputFormat, outputDir)` → `ConvertResult`
- `convertBatch(inputs, outputFormat, outputDir, concurrency)` → `ConvertResult[]`
- Error codes: `E_PANDOC_MISSING`, `E_UNSUPPORTED_FORMAT`, `E_INPUT_NOT_FOUND`, `E_CONVERT_FAILED`, `E_OUTPUT_FAILED`
- Supported formats: `docx`, `pdf`, `pptx`, `xlsx`, `csv`, `md`, `json`
- `pandocPath()` resolves via: `PANDOC_PATH` env → `resources/pandoc.exe` → system PATH

**Do not duplicate pandoc-calling logic.** Always route through `converter.ts`.

### mobile conversion (separate, offline)

Mobile uses pure JS libraries (no pandoc): `mammoth` (docx→md), `docx` (md→docx), `marked` (md→HTML), `expo-print` (md→PDF). These are in `mobile/src/converter/`. Do not import from `desktop/src/shared/` in mobile.

### Key shared types

- `desktop/src/shared/ipc.ts` — TypeScript interfaces shared between Electron main + renderer. Defines `ConvertTask`, `ReadableFile`, `ipcChannels`. The preload script (`electron/preload/index.ts`) exposes these via `contextBridge`.
- `desktop/src/global.d.ts` — `window.api` type declaration consumed by renderer React code.

### mobile code organization

- `App.tsx` — top-level: state machine (reader vs JSON view), bottom sheet orchestration, file open via `Linking` + `DocumentPicker`
- `src/components/Reader.tsx` — Markdown reader (marked-based), scroll position memory, theme-aware
- `src/components/JsonView.tsx` / `JsonTree.tsx` — JSON tree viewer with collapse/search/copy
- `src/components/EditSheet.tsx` — modal editor: source/preview toggle, JSON validate+format, auto-draft, save-as-copy, save-and-share
- `src/components/PromptSheet.tsx` — prompt library: list/search/import/copy, recent copies section
- `src/components/RecentSheet.tsx` — recent documents list
- `src/components/ConvertSheet.tsx` — format conversion panel
- `src/storage/` — AsyncStorage-backed persistence for prompts (`prompts.ts`) and recent docs (`recentDocs.ts`)
- `src/theme.ts` — day/night theme from system `useColorScheme()`

### desktop GUI code organization

- `App.tsx` — two tabs: reader (default), converter. Listens for `open-file` events from Electron main for file-association launch.
- `src/components/ReaderPanel.tsx` — markdown/JSON reader with file picker
- `src/components/ConvertPanel.tsx` — conversion panel: drag-drop, format selection, batch convert via `window.api.convert()`

### desktop main process

`electron/main/index.ts` handles: window creation + IPC handlers for file dialogs, conversion (via `converter.ts`), settings persistence. `GET_PENDING_FILE` serves files opened via OS file association before renderer is ready. `app.on('open-file')` is the Windows file association handler, pushing file to renderer via IPC.

### File association

Mobile `app.json` registers `.md`/`.markdown`/`.json` open-with (iOS `CFBundleDocumentTypes` + Android `intentFilters`). Desktop GUI registers via Electron's `app.on('open-file')` (dev) and `electron-builder.yml` `fileAssociations` (prod). On open, the reader tab auto-loads the file.

## Conversion engine (differs per subproject — don't mix up)
- `desktop/src/shared/converter.ts` — shared conversion engine (CLI + Electron both use it). Wraps pandoc for Office→MD, Office→docx, MD→docx, with structured error codes.
- `desktop/cli/src/index.ts` — `molan` CLI entry point. Commander-based, supports single-file, batch, glob, `--json` output.
- desktop/ Electron main process calls pandoc (bundled at `desktop/resources/pandoc.exe`).
- mobile/ uses JS libs offline: `mammoth` (docx→md), `docx` (md→docx).
- root `mdconvert.py` uses `pypandoc`.

## App identity
- mobile bundle id: `com.mdreader.app` (slug `md-reader`)
- desktop app id: `com.mdreader.desktop`
- mobile `app.json` already registers `.md` open-with (iOS `CFBundleDocumentTypes` + Android intentFilters for `text/markdown` and `.*\.md`).

## Out-of-scope files (do NOT treat as part of the reader app)
- `config.json` — contains plaintext 教务系统 credentials. Gitignored. Never commit, never read into shared context.
- `school_sdk (1).exe`, `analyze_exe.py`, `hello_tool.py` — unrelated personal/exploration files, gitignored.

## Notes
- No lint/format config exists yet (no eslint/prettier/biome). Use `npm run typecheck` (desktop) as the main correctness check.
- TypeScript versions differ: mobile `~6.0.3`, desktop `^5.6.0`.
- Test suite: `mobile/` and `desktop/cli/` use vitest. Run `npm run test` inside each. Mobile tests cover markdown TOC parsing, JSON tree/path generation, and document status merging. CLI test covers the push/pull/read cloud roundtrip.
- `build/`, `dist/`, `logs/`, `.expo/`, `out/`, `release/` are generated — don't edit.

## Testing strategy (enforced)

Tests slow you down when AI writes them reflexively. Don't write tests to "match features 1:1" or to hit coverage. Write tests only when they catch a bug that would otherwise hide. Judge each candidate by one question: **if this breaks, how fast will you notice without the test?**

### Write tests for — do these immediately when the code lands
- **Pure logic with rules and edge cases.** State machines, parsers, path/ID generators, normalization, merge/dedup rules, regex-driven behavior. Examples in this repo: `parseToc` (Chinese punctuation in IDs, inline token recursion), `mergeDocumentStatuses` (unprocessed-removal ordering), `buildJsonRows` (JSONPath with quoted keys/array indices). These have no UI, no side effects, break silently, and are trivial to get wrong.
- **External output contracts.** Anything an AI or external consumer parses: `molan` CLI JSON output (`--json`), MCP responses, cloud/sync API schemas. `cloud.test.ts` is the model — it locks the push→pull→read roundtrip so a renamed field fails CI instead of silently breaking every AI consumer.

### Do NOT write tests for
- **Thin wrappers over the standard library.** Re-asserting what `JSON.parse`/`JSON.stringify` already guarantees is dead weight; TypeScript already covers the return shape. (We deleted `jsonFormat.test.ts` and `markdownSearch.test.ts` for exactly this.)
- **Functions invented only to be tested.** If a helper has zero references in real code, delete the function, not "test it". (We deleted `jsonPath.test.ts` — `getByPath` was never called anywhere.)
- **UI components, sheets, interactions, RN rendering.** V1 mocks cost more than they catch. Use the manual real-device acceptance checklist (TODO D5.1) and screenshot comparison instead.
- **Type-enforceable invariants.** If `tsc` already proves it, a runtime assertion is redundant.

### Pacing
- Logic/contract tests: written in the same change as the code they cover. They ARE the first way you run that code.
- UI/feature tests: deferred to V1.5+ at the earliest, behind a real acceptance script, never as mock-heavy unit tests.
- Each test must fail-meaningfully: break the SUT in your head and confirm the assertion catches it. If it wouldn't, delete the test.

## Frontend working discipline (enforced)

These rules exist because AI's default behavior is the opposite of senior engineering: it writes before reading, adds before deleting, batches instead of slicing. Follow these or you will produce code that fights the existing codebase.

### How to work — the 10 self-checks

Apply these constantly while writing frontend code, not just at the end:

1. **Read before write.** Read the full file before changing it. Never guess content from filename or import path. Before writing a new feature, grep for existing similar code (`search|filter|highlight|copy|toast|error`) and follow its pattern instead of inventing a new one.
2. **Vertical slices, not horizontal layers.** Take one feature from UI → logic → data → test → commit, end-to-end. Do NOT write "all the reading UI first, then all the data layer." Each slice must be runnable on its own.
3. **Skeleton first.** The first version of a feature is the thinnest path that runs end-to-end, even if ugly. Prove the chain works (button → convert → share) before polishing styles or edge cases. Ask mid-way: "can I run this end-to-end now?" If no, stop polishing.
4. **Failure paths before happy paths.** Before writing the normal flow, enumerate: empty, error, slow/large, boundary, cancel. Each must have explicit UI (no white screens, no hangs). The repo's `friendlyOpenError` / `inferExternalSourceLabel` in `mobile/App.tsx` is the model.
5. **Small commits.** Commit per sub-step (UI done, logic done, test added), not per day. Each commit must be runnable and revertable. Never batch a day's work into one "update" commit.
6. **Abstract only on the third occurrence.** Write inline first occurrence, copy-paste second, abstract third. Do NOT build abstraction layers / config systems / plugin hooks "for future reuse." Premature abstraction is debt.
7. **Delete code freely.** Cut features → delete immediately, don't comment out "just in case." Find a better way → delete the old. Low-value tests → delete (we did this). Sunk cost is not a reason to keep bad code.
8. **Reuse before create.** Before writing new logic, grep for existing implementations. Follow the existing pattern. Never let the codebase grow a 2nd search / a 3rd toast / a 4th error-handling style.
9. **Sync docs the moment behavior changes.** After changing code, immediately ask "which docs/comments/TODO entries are now stale?" Stale references (we hit this: deleted tests still cited as evidence) are the top maintenance debt.
10. **Don't fight the type system.** If a type is hard to write, the design is wrong — refactor, don't `any`/`as` around it. A pile of `any` means you haven't designed the data shape. `as unknown as` is a danger signal.

### Separation principles — 7 dimensions

When writing components, self-check these separations. The repo already does some; violations noted below are real and must be fixed going forward.

| # | Principle | Repo status | Rule |
|---|---|---|---|
| 1 | Logic vs render | ✅ done (`markdown/toc.ts`, `json/tree.ts` hold pure logic) | No `try/catch`, `JSON.parse`, complex computation in components — extract pure functions |
| 2 | Data access下沉 | ⚠️ violated (`Reader.tsx`, `EditSheet.tsx` call AsyncStorage directly) | AsyncStorage/localStorage/fetch/IPC never appear in components — go through `storage/` layer |
| 3 | Strings centralized | ❌ not done (text like `'复制成功'`, `'暂无提示词'` hardcoded in JSX) | User-visible strings go in a strings file (`src/constants/strings.ts`), not scattered in JSX |
| 4 | Container vs presentational | ⚠️ partially mixed | If a component both fetches/stores AND renders complex UI, consider splitting Container + View. Don't over-split in V1. |
| 5 | Styles centralized | ✅ done (mobile: `StyleSheet.create`; desktop: className + CSS vars) | No hardcoded colors — mobile via `themes[mode].xxx`, desktop via `var(--xxx)` |
| 6 | Config externalized | ⚠️ partial (`duration: 220`, `width < 380` inline) | Magic numbers (durations, thresholds, scale tiers) become named constants |
| 7 | Platform isolated | ⚠️ partial | iOS/Android/Electron differences don't scatter in business logic — abstract them |

**Priority fixes for existing violations**: #2 (data access — extract `storage/readPosition.ts`, `storage/draft.ts`) and #3 (strings — centralize). These are the highest-leverage cleanups.

### Anti-patterns that will be rejected in review

- A component file growing `AsyncStorage.getItem` / `fetch` / `JSON.parse` calls — extract to storage/logic layer.
- User-visible Chinese strings written directly in JSX — centralize them.
- A new "search" / "toast" / "error handler" that duplicates an existing one — reuse.
- `any` or `as unknown as` to silence a type error — refactor the design.
- A 500-line commit titled "update" — split into small runnable commits.
- Commented-out code "kept just in case" — delete it.
- Premature abstraction (config/plugin/factory) for a single use case — inline it.

## Backend working discipline (V2 cloud, S7+)

The repo currently has NO backend — the CLI's `push`/`pull`/`read` commands simulate a cloud inbox on the local filesystem (`~/.molan/cloud/`). Real backend work starts at S7 (P2). These rules apply when that work begins. Until then: keep the CLI's `--json` output contract stable so future backend integration doesn't break AI consumers.

### 10 self-checks for backend work

1. **Data model is shared, not reinvented.** The 9 concepts in TODO §19.1 (users, devices, prompts, documents, document_versions, file_objects, sync_events, conversion_jobs, ai_jobs) are frozen. Backend tables/objects map directly to these — never define a parallel schema.
2. **Contract = doc = test.** The CLI `--json` shape (`ok`/`results`/`errorCode`/`error`) is the API AI consumes. Define the backend API contract first (TS interfaces / OpenAPI), write contract tests first (`cloud.test.ts` is the model — extend it to the real backend), then implement. A renamed field silently breaks every AI consumer.
3. **Explicit state machines, not boolean combos.** No `isActive && !isDeleted && isSynced`. Use enumerated states. The file state machine (unprocessed/read/copied/edited/converted/shared/archived/synced/conflict) must be unified across mobile, CLI, and backend (TODO D4.3).
4. **Idempotency is a first-class citizen.** Offline queues mean the same request can be replayed after network recovery. `push` the same file twice → one version, not two. Use client-generated IDs or content hashes as idempotency keys.
5. **Conflict is the default, not an error.** Multi-device edits will happen. Design for it upfront: keep both versions / auto-merge / let user choose. Never overwrite, never throw, never lose data. (TODO S7-BACKUP-005, D3.3.)
6. **Privacy is architecture, not a setting.** "Default no upload, user explicitly opts in" (PRD core positioning) is a data-flow principle: the first question when designing any flow is "should this data leave the device?" File content stays local by default; backend stores metadata only; sensitive fields (token/secret/key) are flagged locally, never silently uploaded; delete means really delete (including backups).
7. **Offline-first, sync is background.** The client is the source of truth; the cloud is a merge point. Sync is an async queue, never blocking UI. The client may go a week offline and arrive with a pile of local changes — the backend handles that, not rejects it. (TODO S7-BACKEND-003.)
8. **Object storage and metadata are separate.** File content (Markdown/JSON) goes to object storage (S3/OSS/local files); the DB stores only metadata + pointers. `file_objects` is already a distinct concept — keep it that way.
9. **Observable but minimal logging.** Structured JSON logs with request id / user id / action / result. Log "who, when, what, outcome" — never log file content (privacy). Errors carry explicit codes aligned with the CLI `errorCode` system. Key metrics: sync success rate, conflict rate, upload volume.
10. **Runnable locally, testable in isolation.** The backend must start with one command (docker-compose or in-memory DB). Unit tests don't depend on external services. Follow the pattern `cloud.test.ts` already set: it runs against a temp dir, no real infra needed.

### What "no backend yet" means right now

- Do NOT start backend code until S7 tasks are actively in progress.
- The CLI's `push`/`pull`/`read` local-simulation behavior is correct for now — its value is keeping the JSON contract stable.
- When S7 begins: the first task is S7-BACKEND-001 (tech selection design doc), not writing endpoints. Node.js + TypeScript is already decided (TODO §0.5, cloud-workflow doc §推荐技术路线).
